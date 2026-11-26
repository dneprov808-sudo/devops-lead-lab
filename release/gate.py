"""Local release gate. --full requires real browser and Compose validation; no cloud."""
import argparse, json, pathlib, subprocess, sys, time
root = pathlib.Path(__file__).resolve().parents[1]

def commands(full=False,live_production=False,k8s_live=False,security=False):
    cmds = [[sys.executable,"release/compatibility.py"],[sys.executable,"-m","unittest","discover","-v","-p","test_*.py"]]
    cmds += [["node",str(p.relative_to(root))] for p in sorted(root.glob("test_*.mjs"))]
    cmds += [["node","--test",str(p.relative_to(root))] for p in sorted((root/"orchestration/bus").glob("test_*.mjs"))]
    cmds += [[sys.executable,"release/security_check.py"],["node","release/knowledge_audit.mjs"],["node","release/knowledge_v12.mjs"]]
    if full:
        cmds += [[sys.executable,"release/browser_e2e.py"]]
        for p in sorted(root.glob("*/compose.yaml")):
            cmds += [["docker","compose","-f",str(p.relative_to(root)),"--profile","*","config","--quiet"]]
        if (root/"production_v11/compose.ha.yaml").exists():
            cmds += [["docker","compose","-f","production_v11/compose.yaml","-f","production_v11/compose.ha.yaml","--profile","ha","config","--quiet"]]
        if (root/"production_v11/compose.v12.yaml").exists():
            cmds += [["docker","compose","-p","academy-v12-ha","-f","production_v11/compose.yaml","-f","production_v11/compose.ha.yaml","-f","production_v11/compose.v12.yaml","--profile","ha","config","--quiet"]]
    if live_production: cmds += [[sys.executable,"production_v11/smoke.py"]]
    if k8s_live: cmds += [[sys.executable,"v11-labs/k8s/verify.py"]]
    if security: cmds += [[sys.executable,"release/security_v12.py"]]
    return cmds

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--full",action="store_true")
    parser.add_argument("--live-production",action="store_true",help="Explicit local light-stack worker stop/recovery drill")
    parser.add_argument("--k8s-live",action="store_true",help="Verify existing dedicated kind-academy-v11 cluster")
    parser.add_argument("--security",action="store_true",help="Explicit local scanners; may download public vulnerability databases")
    args=parser.parse_args()
    rows=[]
    for cmd in commands(args.full,args.live_production,args.k8s_live,args.security):
        started=time.monotonic()
        try:
            rc=subprocess.run(cmd,cwd=root,timeout=1000).returncode
        except (OSError,subprocess.TimeoutExpired):
            rc=125
        rows.append({"command":cmd,"exit":rc,"seconds":round(time.monotonic()-started,2)})
    print(json.dumps({"profile":"full" if args.full else "core","checks":rows,
                      "omitted":([] if args.full else ["real browser","Compose config"])+([] if args.live_production else ["live production light drill"])+([] if args.k8s_live else ["live Kubernetes verification"])+["HA failover drill"]+([] if args.security else ["vulnerability scanners"]),
                      "runtime_note":"Compose config is not a live service test"},indent=2))
    return int(any(r["exit"] for r in rows))
if __name__=="__main__":
    sys.exit(main())
