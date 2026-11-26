"""Opt-in free local security scanners; absent scanner or stale DB is a failure, not a pass."""
import pathlib, shutil, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
def main():
    for tool in ("trivy","pip-audit"):
        if not shutil.which(tool):
            print("BLOCKED: install "+tool+" in the dedicated review environment",file=sys.stderr)
            return 125
    commands=[
        ["pip-audit","--strict","--requirement","requirements-v11-dev.txt"],
        ["pip-audit","--strict","--requirement","production_v11/requirements.txt"],
        ["trivy","fs","--scanners","vuln,misconfig,secret","--severity","HIGH,CRITICAL","--exit-code","1","--skip-dirs",".academy-data","--skip-dirs",".venv","--skip-dirs",".git","."],
    ]
    codes=[]
    for cmd in commands:
        try: codes.append(subprocess.run(cmd,cwd=ROOT,timeout=300).returncode)
        except (OSError,subprocess.TimeoutExpired): codes.append(125)
    return int(any(codes))
if __name__=="__main__": sys.exit(main())
