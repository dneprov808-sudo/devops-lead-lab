import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RELEASE = "Academy v11-dev"

def version():
    def read(*args):
        try:
            return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True, stderr=subprocess.DEVNULL, timeout=3).strip()
        except (OSError, subprocess.SubprocessError):
            return None
    dirty = read("status", "--porcelain")
    return {"release": RELEASE, "branch": read("branch", "--show-current") or None,
            "commit": read("rev-parse", "HEAD"), "dirty": None if dirty is None else bool(dirty)}
