import importlib.metadata as m
import json, shutil, subprocess, sys
def check():
    errors=[]
    if not (sys.version_info >= (3,12) and sys.version_info < (3,15)): errors.append("Supported Python baseline: 3.12–3.14")
    try:
        major=int(subprocess.check_output(["node","--version"],text=True,timeout=5).strip().lstrip("v").split(".")[0])
        if major!=22: errors.append("Supported Node baseline: 22")
    except (OSError,ValueError,subprocess.SubprocessError): errors.append("Node unavailable")
    for pkg,expected in (("PyYAML","6.0.3"),):
        try:
            if m.version(pkg)!=expected: errors.append(pkg+" differs from pinned baseline "+expected)
        except m.PackageNotFoundError: errors.append(pkg+" missing")
    return errors
if __name__=="__main__":
    errors=check()
    print(json.dumps({"status":"BLOCKED" if errors else "PASS","errors":errors}))
    sys.exit(125 if errors else 0)
