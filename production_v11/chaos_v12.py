"""Instructor-only scenario selector. Learner sees symptoms; stop targets are explicit opt-in."""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def main():
    p=argparse.ArgumentParser()
    p.add_argument("id")
    p.add_argument("--inject-and-verify",action="store_true")
    p.add_argument("--confirm-local-lab",action="store_true")
    a=p.parse_args()
    cases=json.loads((ROOT/"chaos_v12.json").read_text())
    row=next((x for x in cases if x["id"]==a.id),None)
    if row is None: raise ValueError("Unknown scenario")
    print(json.dumps({k:v for k,v in row.items() if k!="operator_target"},ensure_ascii=False))
    if not a.inject_and_verify:return
    if not a.confirm_local_lab or row["execution"]=="manual_isolated":raise ValueError("Manual isolated drill or explicit confirmation required")
    cmd=[sys.executable,str(ROOT/"ha_drill_v12.py"),"--orders","10","--confirm-local-lab"]
    if row["execution"]=="local_stop":cmd+=["--stop",row["operator_target"]]
    subprocess.run(cmd,check=True,timeout=600)
if __name__=="__main__":main()
