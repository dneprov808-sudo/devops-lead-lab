"""Local release gate. --full requires real browser and Compose validation; no cloud."""
import argparse, json, pathlib, subprocess, sys, time
root = pathlib.Path(__file__).resolve().parents[1]

def commands(full=False):
    cmds = [[sys.executable,"-m","unittest","discover","-v","-p","test_*.py"]]
    cmds += [["node",str(p.relative_to(root))] for p in sorted(root.glob("test_*.mjs"))]
    cmds += [["node","--test",str(p.relative_to(root))] for p in sorted((root/"orchestration/bus").glob("test_*.mjs"))]
    cmds += [[sys.executable,"release/security_check.py"]]
    if full:
        cmds += [[sys.executable,"release/browser_e2e.py"]]
        for p in sorted(root.glob("*/compose.yaml")):
            cmds += [["docker","compose","-f",str(p.relative_to(root)),"--profile","*","config","--quiet"]]
    return cmds

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--full",action="store_true")
    args=parser.parse_args()
    rows=[]
    for cmd in commands(args.full):
        started=time.monotonic()
        try:
            rc=subprocess.run(cmd,cwd=root,timeout=180).returncode
        except (OSError,subprocess.TimeoutExpired):
            rc=125
        rows.append({"command":cmd,"exit":rc,"seconds":round(time.monotonic()-started,2)})
    print(json.dumps({"profile":"full" if args.full else "core","checks":rows,
                      "omitted":[] if args.full else ["real browser","Compose config"],
                      "runtime_note":"Compose config is not a live service test"},indent=2))
    return int(any(r["exit"] for r in rows))
if __name__=="__main__":
    sys.exit(main())
