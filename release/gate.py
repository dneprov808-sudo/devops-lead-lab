"""Local release gate; no cloud, no automatic merge."""
import subprocess, sys, pathlib, json
root=pathlib.Path(__file__).resolve().parents[1]
def main():
    commands=[[sys.executable,"-m","unittest","discover","-v","-p","test_*.py"]]
    commands += [["node",str(p.relative_to(root))] for p in sorted(root.glob("test_*.mjs"))]
    commands += [["node","--test",str(p.relative_to(root))] for p in sorted((root/"orchestration/bus").glob("test_*.mjs"))]
    rows=[]
    for cmd in commands:
        try:
            rc=subprocess.run(cmd,cwd=root,timeout=180).returncode
        except (OSError,subprocess.TimeoutExpired):
            rc=125
        rows.append({"command":cmd,"exit":rc})
    print(json.dumps(rows,indent=2))
    return int(any(r["exit"] for r in rows))
if __name__=="__main__":
    sys.exit(main())
