#!/usr/bin/env python3
"""Academy DX v1: local, deliberately no GitHub write operations."""
import argparse
import hashlib
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
LAB = ROOT / "labs/01-http-probe"
CONTROL = "academy/orchestration-v1"
STUDENT = "student/lab-001"
ORIGINS = {"https://github.com/dneprov808-sudo/devops-lead-lab.git",
           "https://github.com/dneprov808-sudo/devops-lead-lab",
           "git@github.com:dneprov808-sudo/devops-lead-lab.git"}
FIXTURES = {
    "README.md": "3ac774f8a72f6f949311199cabe1ed73de9120c7",
    "server.py": "f627ee152d63e45a95201d00bf57ba6029832cd8",
    "test_healthcheck.py": "bc132775aa7ae7ebaae100b3babd7c9cfdfe8376",
}
MODES = {20: "5 min recall / 10 min practice / 5 min check",
         60: "10 min recall / 35 min practice / 10 min diagnosis / 5 min check",
         120: "20 min recall / 60 min practice / 25 min failure cases / 15 min defense"}

def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True).strip()

def verify_fixtures():
    for name, expected in FIXTURES.items():
        data = (LAB / name).read_bytes()
        actual = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        if actual != expected:
            raise ValueError("Original lab fixture changed: " + name)

def doctor():
    missing = [x for x in ("git", "bash", "curl", "python3") if not shutil.which(x)]
    try:
        import yaml
    except ImportError:
        missing.append("python3-yaml")
    if missing:
        raise ValueError("Missing: " + ", ".join(missing) +
                         ". On Ubuntu: sudo apt install git bash curl python3 python3-yaml")
    print("Dependencies OK; no automatic installation.")

def state():
    import yaml
    if git("remote", "get-url", "origin") not in ORIGINS:
        raise ValueError("Unexpected origin; use the Academy repository.")
    git("fetch", "--no-tags", "origin", "refs/heads/" + CONTROL)
    commit = git("rev-parse", "FETCH_HEAD")
    try:
        data = yaml.safe_load(git("show", commit + ":orchestration/STATE.yaml"))
    except yaml.YAMLError as e:
        raise ValueError("Invalid YAML in canonical STATE") from e
    if (not isinstance(data, dict) or data.get("schema_version") != 1
            or data.get("control", {}).get("ref") != CONTROL
            or data.get("control", {}).get("repository") != "dneprov808-sudo/devops-lead-lab"
            or type(data.get("revision")) is not int or data["revision"] < 1):
        raise ValueError("Invalid canonical STATE")
    print("Control commit:", commit, "| revision:", data["revision"])
    return data

def current_lab(data):
    t = data["current_task"]
    if (t["id"], t["ref"], t["path"]) != ("LAB-001", "training/lead-cohort-01", "labs/01-http-probe"):
        raise ValueError("DX v1 supports LAB-001 only; consult Orchestrator for new labs.")
    return t

def start(minutes):
    t = current_lab(state())
    if t["status"] not in ("assigned", "in_progress", "revision_required"):
        raise ValueError("Current status requires review/exam/Orchestrator: " + t["status"])
    verify_fixtures()
    branch = git("branch", "--show-current")
    if branch != STUDENT:
        if branch not in ("academy/dx-v1", "academy/web-portal-v1", "academy/practice-v2") or git("status", "--porcelain"):
            raise ValueError("Use a clean DX/portal checkout or existing student branch; no reset.")
        exists = git("branch", "--list", STUDENT)
        if not exists and git("ls-remote", "--heads", "origin", "refs/heads/" + STUDENT):
            raise ValueError("Remote student branch exists. Fetch and switch to it explicitly; no duplicate branch.")
        git("switch", STUDENT) if exists else git("switch", "-c", STUDENT)
        verify_fixtures()
    print("LAB-001 |", MODES[minutes])
    print("Edit labs/01-http-probe/healthcheck.sh and REPORT.md.")
    print("Optional foreground server: python3 academy.py serve (Ctrl-C to stop).")
    print("Run: python3 academy.py test")

def test():
    verify_fixtures()
    print("HEAD:", git("rev-parse", "HEAD"), flush=True)
    print("Working tree:", git("status", "--porcelain") or "clean", flush=True)
    return subprocess.run([sys.executable, "test_healthcheck.py"], cwd=LAB).returncode

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("command", choices=["setup", "doctor", "status", "start", "serve", "test", "report", "submit"])
    p.add_argument("--minutes", type=int, choices=sorted(MODES), default=60)
    a = p.parse_args()
    try:
        if a.command in ("setup", "doctor"):
            doctor()
        elif a.command == "status":
            d = state()
            t = d["current_task"]
            print(t["id"], t["status"], "|", d["next_action"]["task"])
        elif a.command == "start":
            doctor()
            start(a.minutes)
        elif a.command == "serve":
            verify_fixtures()
            return subprocess.run([sys.executable, "server.py"], cwd=LAB).returncode
        elif a.command == "test":
            return test()
        elif a.command == "report":
            print(LAB / "REPORT.md")
            print("Edit the existing template; record actual test command, output and exit code.")
        elif a.command == "submit":
            if git("branch", "--show-current") != STUDENT:
                raise ValueError("Submit from " + STUDENT)
            if test() != 0:
                raise ValueError("Tests failed; do not submit as passed.")
            print("Review REPORT.md and diff. No commit or push was executed.")
            print("git add labs/01-http-probe/healthcheck.sh labs/01-http-probe/REPORT.md")
            print('git commit -m "lab: implement LAB-001"')
            print("python3 academy.py test  # recheck exact committed revision")
            print("git push -u origin student/lab-001")
            print("git rev-parse HEAD  # send SHA and actual test output to reviewer")
    except (OSError, ValueError, KeyError, TypeError, AttributeError, subprocess.CalledProcessError, ImportError) as e:
        print("BLOCKED:", e, file=sys.stderr)
        return 2
    return 0

if __name__ == "__main__":
    sys.exit(main())
