#!/usr/bin/env python3
"""Pull a verified stable release into /srv/academy. No credentials or root access."""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

REPO = "dneprov808-sudo/devops-lead-lab"
REMOTE = "https://github.com/" + REPO + ".git"
API = "https://api.github.com/repos/" + REPO
BRANCH = "academy/stable"
REF = "refs/heads/" + BRANCH
WORKFLOW = "academy-release.yml"
JOB = "academy-release-gate"
ROOT = Path("/srv/academy")
SHA = re.compile(r"[0-9a-f]{40}\Z")
FILES = {"index.html", "library.html", "interview.html", "architecture.html",
         "site.css", "progress.js", "course.css", "course.js"}
MAX_RELEASES = 20
MAX_FILE = 10 * 1024 * 1024


def require(ok, message):
    if not ok:
        raise ValueError(message)


def git(*args, cwd=None):
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0", GIT_CONFIG_NOSYSTEM="1",
               GIT_CONFIG_GLOBAL="/dev/null")
    return subprocess.check_output(
        ["git", "-c", "core.hooksPath=/dev/null", *args],
        cwd=cwd, env=env, timeout=180, text=True).strip()


def stable_sha():
    fields = git("ls-remote", "--exit-code", REMOTE, REF).split()
    require(len(fields) == 2 and fields[1] == REF and SHA.fullmatch(fields[0]),
            "Could not identify exact stable revision")
    return fields[0]


def api(path):
    req = urllib.request.Request(API + path, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "academy-pull-deploy/1",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    with urllib.request.urlopen(req, timeout=20) as response:
        raw = response.read(2 * 1024 * 1024 + 1)
    require(len(raw) <= 2 * 1024 * 1024, "Unexpected API response size")
    return json.loads(raw)


def choose_run(payload, sha):
    require(SHA.fullmatch(sha), "Invalid SHA")
    runs = payload["workflow_runs"]
    require(isinstance(runs, list), "Invalid runs response")
    matching = [r for r in runs if
                r.get("head_sha") == sha and r.get("head_branch") == BRANCH
                and r.get("event") == "push"
                and r.get("head_repository", {}).get("full_name") == REPO
                and r.get("path", "").split("@", 1)[0] == ".github/workflows/" + WORKFLOW]
    if not matching:
        return None
    newest = max(matching, key=lambda r: (r["run_number"], r["run_attempt"]))
    if newest.get("status") != "completed" or newest.get("conclusion") != "success":
        return None
    require(type(newest["id"]) is int and newest["id"] > 0
            and type(newest["run_attempt"]) is int and newest["run_attempt"] > 0,
            "Invalid run identifier")
    return newest


def required_job(payload):
    jobs = [j for j in payload["jobs"] if j.get("name") == JOB]
    return len(jobs) == 1 and jobs[0].get("status") == "completed" and jobs[0].get("conclusion") == "success"


def verified(sha):
    query = urllib.parse.urlencode({"branch": BRANCH, "event": "push",
                                   "head_sha": sha, "per_page": 10})
    run = choose_run(api("/actions/workflows/" + WORKFLOW + "/runs?" + query), sha)
    if run is None:
        return None
    jobs = api(f"/actions/runs/{run['id']}/attempts/{run['run_attempt']}/jobs?per_page=100")
    return run["id"] if required_job(jobs) else None


def validate_release(directory, sha):
    require(directory.is_dir() and not directory.is_symlink(), "Invalid release directory")
    require({p.name for p in directory.iterdir()} == FILES | {"manifest.json"},
            "Unexpected or missing static release files")
    for p in directory.iterdir():
        require(p.is_file() and not p.is_symlink() and p.stat().st_size <= MAX_FILE,
                "Unsafe release file: " + p.name)
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    require(manifest["schema_version"] == 1 and manifest["commit"] == sha,
            "Manifest revision mismatch")
    require(set(manifest["outputs"]) == FILES, "Manifest output list mismatch")
    for name, digest in manifest["outputs"].items():
        require(hashlib.sha256((directory / name).read_bytes()).hexdigest() == digest,
                "Digest mismatch: " + name)
    return manifest


def publish(root, sha, candidate):
    validate_release(candidate, sha)
    releases = root / "releases"
    releases.mkdir(exist_ok=True)
    require(releases.is_dir() and not releases.is_symlink(), "Unsafe releases path")
    releases.chmod(0o755)
    dest = releases / sha
    if dest.exists() or dest.is_symlink():
        require(validate_release(dest, sha) == validate_release(candidate, sha),
                "Existing release differs")
    else:
        require(len(list(releases.iterdir())) < MAX_RELEASES,
                "Release retention limit reached; owner must review old releases")
        # Only static files with manifest; never expose the checkout or credentials.
        with tempfile.TemporaryDirectory(prefix=".stage-", dir=root) as tmp:
            stage = Path(tmp) / "release"
            stage.mkdir()
            for name in FILES | {"manifest.json"}:
                shutil.copyfile(candidate / name, stage / name)
                (stage / name).chmod(0o644)
            validate_release(stage, sha)
            stage.chmod(0o755)
            stage.rename(dest)
    dest.chmod(0o755)
    current = root / "current"
    require(not current.exists() or current.is_symlink(), "current must be a symlink")
    # Temporary symlink and atomic rename; previous release stays on disk.
    with tempfile.TemporaryDirectory(prefix=".switch-", dir=root) as tmp:
        link = Path(tmp) / "current"
        link.symlink_to("releases/" + sha)
        os.replace(link, current)
    return dest


def deploy(root=ROOT):
    require(os.geteuid() != 0, "Refusing root execution")
    require(root.is_dir() and not root.is_symlink(), "Dedicated deployment root required")
    sha = stable_sha()
    current = root / "current"
    if current.is_symlink() and os.readlink(current) == "releases/" + sha:
        validate_release(root / "releases" / sha, sha)
        print("NO_CHANGES", sha, flush=True)
        return
    run_id = verified(sha)
    if run_id is None:
        print("WAITING_FOR_CI", sha, flush=True)
        return
    with tempfile.TemporaryDirectory(prefix=".build-", dir=root) as tmp:
        checkout = Path(tmp) / "checkout"
        checkout.mkdir()
        git("init", "-q", cwd=checkout)
        git("fetch", "--no-tags", "--depth=1", REMOTE, sha, cwd=checkout)
        git("checkout", "--detach", "FETCH_HEAD", cwd=checkout)
        require(git("rev-parse", "HEAD", cwd=checkout) == sha, "Checkout revision mismatch")
        subprocess.run([sys.executable, "site/build.py"], cwd=checkout, check=True,
                       timeout=180, env=dict(os.environ, PYTHONDONTWRITEBYTECODE="1"))
        candidate = checkout / "site-dist" / sha
        validate_release(candidate, sha)
        require(stable_sha() == sha, "Stable advanced during build; retry next tick")
        require(verified(sha) == run_id, "CI evidence changed during build")
        publish(root, sha, candidate)
    print("DEPLOYED", sha, "CI run", run_id, flush=True)


if __name__ == "__main__":
    try:
        deploy()
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        print("BLOCKED:", error, file=sys.stderr)
        sys.exit(1)
