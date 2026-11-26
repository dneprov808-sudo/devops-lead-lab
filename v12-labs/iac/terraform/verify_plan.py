"""Inspect reviewed plan JSON; do not apply or edit state automatically."""
import json, pathlib, sys
def check(plan):
    rows=[x for x in plan.get("resource_changes",[]) if x.get("address")=="local_file.service"]
    return len(rows)==1 and rows[0]["change"]["actions"] in (["create"],["update"],["delete","create"],["create","delete"]) and rows[0]["change"]["after"]["content"]=="version=v2\n"
if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("Usage: verify_plan.py plan.json")
    p=pathlib.Path(sys.argv[1]);assert p.stat().st_size<=2*1024*1024
    ok=check(json.loads(p.read_text()));print("PASS" if ok else "FAIL");raise SystemExit(not ok)
