import json, pathlib, subprocess
ROOT=pathlib.Path(__file__).resolve().parent
def check(d,s):
    status=d.get("status",{}); spec=d["spec"]
    ready={e["targetRef"]["uid"] for item in s["items"] for e in item.get("endpoints",[]) if e.get("conditions",{}).get("ready") is True and e.get("targetRef",{}).get("kind")=="Pod" and e.get("targetRef",{}).get("uid")}
    return (status.get("observedGeneration")==d["metadata"]["generation"] and
        status.get("updatedReplicas")==spec["replicas"]==2 and status.get("availableReplicas")==2 and len(ready)==2 and
        spec["template"]["spec"]["containers"][0]["image"]=="nginx:1.28-alpine")
def main():
    cfg=ROOT/"academy-v11.kubeconfig"
    if not cfg.is_file(): raise SystemExit("Dedicated kubeconfig required")
    k=["kubectl","--kubeconfig",str(cfg),"--context","kind-academy-v11"]
    endpoint=subprocess.check_output(k+["config","view","--minify","-o","jsonpath={.clusters[0].cluster.server}"],text=True,timeout=10)
    if not endpoint.startswith("https://127.0.0.1:"): raise SystemExit("Unexpected endpoint")
    k+=["-n","academy-v11"]
    def get(*args): return json.loads(subprocess.check_output(k+["get",*args,"-o","json"],timeout=20))
    if not check(get("deploy","academy-v11-api"),get("endpointslices","-l","kubernetes.io/service-name=academy-v11-api")): raise SystemExit("FAIL: rollout, image or ready endpoints")
    subprocess.run(k+["exec","deployment/academy-v11-api","--","wget","-qO-","http://academy-v11-api"],check=True,timeout=20)
    print("PASS: desired rollout, 2 endpoints, HTTP service")
if __name__=="__main__": main()
