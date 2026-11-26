"""Explicit local fault/recovery drill. Requires running LIGHT stack and no concurrent load."""
import json, os, subprocess, time, urllib.request, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def compose(*args):
    if os.environ.get("DOCKER_HOST") or os.environ.get("DOCKER_CONTEXT"): raise RuntimeError("Use an explicitly verified local default Docker context")
    context=subprocess.check_output(["docker","context","show"],text=True).strip()
    endpoint=subprocess.check_output(["docker","context","inspect",context,"--format","{{.Endpoints.docker.Host}}"],text=True).strip()
    if not endpoint.startswith("unix://"): raise RuntimeError("Not a local Unix socket")
    subprocess.run(["docker","compose","-p","academy-v11-production","-f",str(ROOT/"compose.yaml"),"--profile","light",*args],check=True,timeout=60)
def req(path,body=None):
    raw=None if body is None else json.dumps(body).encode()
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:18111"+path,data=raw,headers={"Content-Type":"application/json"}),timeout=5) as r:
        return json.load(r)
def until(pred,seconds=120):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        try:
            data=req("/stats")
            if pred(data): return data
        except OSError: pass
        time.sleep(1)
    raise RuntimeError("Recovery deadline exceeded")
def main():
    before=until(lambda d:d["pending"]==0 and d["pending_publish"]==0)
    ids=["v11-"+uuid.uuid4().hex for _ in range(5)]
    compose("stop","worker")
    try:
        for key in ids:
            assert req("/orders",{"id":key})["created"]
            assert not req("/orders",{"id":key})["created"]
        during=until(lambda d:d["accepted"]==before["accepted"]+len(ids) and d["pending"]==len(ids) and d["pending_publish"]==0)
    finally: compose("start","worker")
    started=time.monotonic()
    after=until(lambda d:d["processed"]==before["processed"]+len(ids) and d["pending"]==0 and d["pending_publish"]==0)
    assert all(req("/orders/"+key)["done"] for key in ids)
    print(json.dumps({"baseline":before,"fault":during,"recovered":after,"worker_recovery_seconds":round(time.monotonic()-started,2),"synthetic_ids":ids}))
if __name__=="__main__": main()
