"""Opt-in bounded local HA drill. No volume deletion, host network manipulation or production target."""
import argparse, concurrent.futures, json, os, subprocess, time, urllib.error, urllib.request, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parent
SERVICES={"worker","publisher","kafka","kafka2","kafka3","redis","redis2","redis3","api","api2","etcd1","etcd2","etcd3","pg1","pg2"}
BASE="http://127.0.0.1:18112"
def run(*args):
    return subprocess.check_output(["docker",*args],text=True,timeout=60).strip()
def verify_context():
    if os.environ.get("DOCKER_HOST") or os.environ.get("DOCKER_CONTEXT"): raise ValueError("Explicit local default Docker context required")
    name=run("context","show")
    if not run("context","inspect",name,"--format","{{.Endpoints.docker.Host}}").startswith("unix://"): raise ValueError("Not a local Unix socket")
def compose(*args):
    return run("compose","-p","academy-v12-ha","-f",str(ROOT/"compose.yaml"),"-f",str(ROOT/"compose.ha.yaml"),"-f",str(ROOT/"compose.v12.yaml"),"--profile","ha",*args)
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): raise ValueError("Unexpected HTTP redirect")
def req(path,body=None):
    raw=None if body is None else json.dumps(body).encode()
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
    with opener.open(urllib.request.Request(BASE+path,data=raw,headers={"Content-Type":"application/json"}),timeout=8) as res:
        return json.load(res)
def until(pred,seconds=120):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        try:
            data=req("/stats")
            if pred(data): return data
        except (OSError,ValueError):pass
        time.sleep(1)
    raise RuntimeError("Recovery deadline exceeded")
def check_ids(ids,call=req):
    missing=[];pending=[];unknown=[]
    for key in ids:
        try:
            r=call("/verify/"+key)
            if not isinstance(r,dict) or r.get("id")!=key or r.get("source")!="database" or type(r.get("done")) is not bool:
                unknown.append(key)
            elif not r["done"]: pending.append(key)
        except urllib.error.HTTPError as e:
            (missing if e.code==404 else unknown).append(key)
        except (OSError,ValueError,KeyError):unknown.append(key)
    return {"acknowledged":len(ids),"missing":missing,"pending":pending,"unknown":unknown}
def accepted(key,call=req):
    result=call("/orders",{"id":key})
    return isinstance(result,dict) and result.get("id")==key and result.get("created") is True

def evaluate(evidence,acks,unconfirmed,limit,post_recovery_ok):
    recovery="PASS" if post_recovery_ok and not any(evidence[k] for k in ("missing","pending","unknown")) else "FAIL"
    availability="PASS" if acks>0 and unconfirmed<=limit else "FAIL"
    return {"recovery":recovery,"fault_window_availability":availability,"overall":"PASS" if recovery==availability=="PASS" else "FAIL"}

def main():
    p=argparse.ArgumentParser();p.add_argument("--stop",choices=sorted(SERVICES));p.add_argument("--orders",type=int,default=10);p.add_argument("--max-unconfirmed",type=int,default=0,help="Explicit fault-window availability budget; at least one ACK always required");p.add_argument("--confirm-local-lab",action="store_true",required=True);a=p.parse_args()
    if not 1<=a.orders<=100 or not 0<=a.max_unconfirmed<a.orders: raise ValueError("Invalid orders or availability budget")
    verify_context()
    if req("/health")["profile"]!="v12-ha": raise ValueError("Unexpected stack profile")
    before=until(lambda d:d["pending"]==0 and d["pending_publish"]==0)
    if a.stop:
        running=compose("ps","--status","running","--services").splitlines()
        if a.stop not in running: raise ValueError("Chosen service not running")
    # Establish acknowledged pre-fault records so loss can be detected after recovery.
    pre=["v12-"+uuid.uuid4().hex for _ in range(3)]
    for key in pre:
        if not accepted(key): raise ValueError("Unexpected pre-existing ID")
    until(lambda d:d["pending"]==0 and d["accepted"]==before["accepted"]+3)
    started=time.monotonic();acks=[];unconfirmed=[]
    try:
        if a.stop:
            compose("stop",a.stop)
            if a.stop in compose("ps","--status","running","--services").splitlines(): raise RuntimeError("Fault not observed: target remains running")
        ids=["v12-"+uuid.uuid4().hex for _ in range(a.orders)]
        def submit(key):
            try:return key if accepted(key) else None
            except (OSError,ValueError):return None
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            for key,result in zip(ids,pool.map(submit,ids)):
                (acks if result else unconfirmed).append(key)
    finally:
        if a.stop: compose("start",a.stop)
    recovered_started=time.monotonic()
    after=until(lambda d:d["pending"]==0 and d["pending_publish"]==0)
    recovery_id="v12-"+uuid.uuid4().hex
    try: post_recovery_ok=accepted(recovery_id)
    except (OSError,ValueError): post_recovery_ok=False
    if post_recovery_ok:
        after=until(lambda d:d["pending"]==0 and d["pending_publish"]==0)
    evidence=check_ids(pre+acks+([recovery_id] if post_recovery_ok else []))
    verdict=evaluate(evidence,len(acks),len(unconfirmed),a.max_unconfirmed,post_recovery_ok)
    print(json.dumps({"scenario":a.stop or "bounded-load","baseline":before,"recovered":after,"acknowledged_validation":evidence,"fault_window_acks":len(acks),"unconfirmed_ids":unconfirmed,"max_unconfirmed":a.max_unconfirmed,"fresh_recovery_ack":post_recovery_ok,"verdict":verdict,"fault_to_check_seconds":round(time.monotonic()-started,2),"restart_to_check_seconds":round(time.monotonic()-recovered_started,2),"note":"Missing acknowledged IDs measure observed loss count, not universal RPO; unconfirmed requests are unknown. Elapsed checks are not measured continuous service RTO."},indent=2))
    if verdict["overall"]!="PASS": raise SystemExit(1)
if __name__=="__main__":main()
