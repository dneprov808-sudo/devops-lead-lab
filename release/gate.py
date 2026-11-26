"""Local release gate. --full requires real browser and Compose validation; no cloud."""
import argparse, json, pathlib, subprocess, sys, time, os, tempfile, datetime as dt
if __package__:
    from .gate_evidence import snapshot, run_check, classify, save_report
else:
    from gate_evidence import snapshot, run_check, classify, save_report
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
    parser.add_argument("--report",type=pathlib.Path,help="Create-only JSON evidence outside the repository")
    args=parser.parse_args()
    before=snapshot(root)
    if args.report and (args.report.resolve().is_relative_to(root) or args.report.exists() or not args.report.parent.is_dir()):
        parser.error("Report must be a new file outside the checkout, in an existing private directory")
    if args.report and (before["commit"] is None or before["tracked_clean"] is not True or before["untracked_clean"] is not True):
        parser.error("Evidence requires a clean checkout (including unignored untracked files) at a known Git SHA")
    rows=[]
    # Unit/E2E runs never inherit the user's real SQLite directory.
    with tempfile.TemporaryDirectory(prefix="academy-gate-") as tmp:
        env=dict(os.environ,ACADEMY_DATA_DIR=tmp,PYTHONDONTWRITEBYTECODE="1")
        for cmd in commands(args.full,args.live_production,args.k8s_live,args.security):
            rows.append(run_check(cmd,root,env))
    after=snapshot(root)
    report={"schema_version":1,"created_at":dt.datetime.now(dt.timezone.utc).isoformat(),"profile":"full" if args.full else "core","commit":before["commit"],"tracked_clean":before["tracked_clean"],"untracked_clean":before["untracked_clean"],"same_clean_commit":before==after and before["commit"] is not None and before["tracked_clean"] is True and before["untracked_clean"] is True,"python":sys.version.split()[0],"checks":rows,
                      "omitted":([] if args.full else ["real browser","Compose config"])+([] if args.live_production else ["live production light drill"])+([] if args.k8s_live else ["live Kubernetes verification"])+["HA failover drill"]+([] if args.security else ["vulnerability scanners"]),
                      "runtime_note":"Compose config is not a live service test"}
    report["status"]=classify(rows,report["same_clean_commit"],args.report is not None)
    if args.report: save_report(args.report,report)
    print(json.dumps(report,indent=2))
    return {"PASS":0,"FAIL":1,"BLOCKED":125}[report["status"]]
if __name__=="__main__":
    sys.exit(main())
