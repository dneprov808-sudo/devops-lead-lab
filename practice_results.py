"""Save explicit structured results to an isolated Git branch, never STATE."""
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent
DEST = "refs/heads/student/practice-results"
BASE = "refs/heads/academy/practice-v2"
ORIGINS = {"https://github.com/dneprov808-sudo/devops-lead-lab.git",
           "https://github.com/dneprov808-sudo/devops-lead-lab",
           "git@github.com:dneprov808-sudo/devops-lead-lab.git"}

class SaveError(ValueError):
    pass

def normalize(payload, catalog):
    if not isinstance(payload, dict):
        raise SaveError("Invalid result")
    kind = payload.get("kind")
    attempt = payload.get("attempt")
    if not isinstance(attempt, str) or not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", attempt):
        raise SaveError("Invalid attempt ID")
    if kind == "practice":
        if set(payload) != {"kind", "attempt", "module", "checks", "score"}:
            raise SaveError("Unexpected result fields")
        module = payload["module"]
        entry = next((m for m in catalog if m["id"] == module), None)
        checks, score = payload["checks"], payload["score"]
        if (entry is None or not isinstance(checks, list) or
                any(type(i) is not int or not 0 <= i < len(entry["evidence"]) for i in checks) or
                len(set(checks)) != len(checks) or
                not (score is None or type(score) is int and 0 <= score <= 4)):
            raise SaveError("Invalid practice result")
        return {**payload, "checks": sorted(checks), "verification": "self_reported"}
    if kind == "lab_test":
        if set(payload) != {"kind", "attempt", "module", "head", "dirty", "exit_code", "output_sha256"} or payload["module"] != "LAB-001":
            raise SaveError("Invalid test result fields")
        if (not isinstance(payload["head"], str) or not re.fullmatch(r"[0-9a-f]{40}", payload["head"]) or
                not isinstance(payload["output_sha256"], str) or not re.fullmatch(r"[0-9a-f]{64}", payload["output_sha256"]) or
                type(payload["dirty"]) is not bool or type(payload["exit_code"]) is not int or not -128 <= payload["exit_code"] <= 255):
            raise SaveError("Invalid test metadata")
        return {**payload, "verification": "local_test_only"}
    raise SaveError("Unknown result kind")

def save(payload, catalog, root=ROOT, origins=ORIGINS):
    record = normalize(payload, catalog)
    raw = (json.dumps(record, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    path = "practice-results/" + record["module"] + "/" + record["attempt"] + ".json"
    def git(*args, input=None, index=None, permit=False):
        env = dict(os.environ, GIT_TERMINAL_PROMPT="0", GH_PROMPT_DISABLED="1")
        for key in ("GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR"):
            env.pop(key, None)
        if index is not None:
            env["GIT_INDEX_FILE"] = str(index)
        proc = subprocess.Popen(["git", "-C", str(root), *args], env=env,
                                stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, start_new_session=True)
        try:
            out, _ = proc.communicate(input, timeout=25)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.communicate()
            if permit:
                return 124, b""
            raise SaveError("Git timed out; inspect remote before retry")
        if proc.returncode and not permit:
            raise SaveError("Git operation failed; check authentication, identity and network")
        return proc.returncode, out
    def tip(ref, optional=False):
        rc, data = git("ls-remote", "--exit-code", "--refs", "origin", ref, permit=True)
        if rc == 2 and optional:
            return None
        parts = data.decode().split()
        if rc or len(parts) != 2 or parts[1] != ref or not re.fullmatch(r"[0-9a-f]{40}", parts[0]):
            raise SaveError("Remote ref unavailable; no blind write")
        git("fetch", "--no-tags", "--no-write-fetch-head", "origin", parts[0])
        return parts[0]
    def existing(commit):
        _, row = git("ls-tree", commit, "--", path)
        if not row:
            return False
        if not row.startswith(b"100644 blob "):
            raise SaveError("Result path collision")
        _, data = git("show", commit + ":" + path)
        if data != raw:
            raise SaveError("Attempt ID collision; keep original payload")
        return True
    _, origin = git("remote", "get-url", "origin")
    _, push_origin = git("remote", "get-url", "--push", "--all", "origin")
    if origin.decode().strip() not in origins or push_origin.decode().splitlines() != [origin.decode().strip()]:
        raise SaveError("Unexpected origin or push URL")
    parent = tip(DEST, optional=True)
    if parent is not None and existing(parent):
        return {"status": "already_saved", "commit": parent, "path": path, "branch": DEST.removeprefix("refs/heads/")}
    parent = parent or tip(BASE)
    if existing(parent):
        raise SaveError("Unexpected result already present in base")
    with tempfile.TemporaryDirectory(prefix="academy-index-") as tmp:
        index = Path(tmp) / "index"
        git("read-tree", parent, index=index)
        _, blob = git("hash-object", "-w", "--stdin", input=raw)
        git("update-index", "--add", "--cacheinfo", "100644," + blob.decode().strip() + "," + path, index=index)
        _, tree = git("write-tree", index=index)
        _, commit = git("commit-tree", tree.decode().strip(), "-p", parent, "-m", "practice: save " + record["module"], index=index)
    sha = commit.decode().strip()
    rc, _ = git("push", "--porcelain", "origin", sha + ":" + DEST, permit=True)
    try:
        verified = tip(DEST, optional=True)
        if verified and existing(verified):
            return {"status": "saved" if rc == 0 else "already_saved", "commit": verified, "path": path, "branch": DEST.removeprefix("refs/heads/")}
    except SaveError:
        pass
    raise SaveError("DELIVERY_UNKNOWN: keep the same attempt and payload; inspect remote before retry")
