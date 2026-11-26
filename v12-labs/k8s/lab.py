"""Dedicated kind lab runner. Fixed namespace and allowlisted operations; no production context."""
import argparse,json,pathlib,subprocess,sys
ROOT=pathlib.Path(__file__).resolve().parent
CFG=ROOT.parent.parent/"v11-labs/k8s/academy-v11.kubeconfig"
def call(args,check=True):
    return subprocess.run(args,text=True,capture_output=True,timeout=40,check=check)
def kube():
    if not CFG.is_file():raise ValueError("Create dedicated kind-academy-v11 first using v11 lab")
    k=["kubectl","--kubeconfig",str(CFG),"--context","kind-academy-v11"]
    endpoint=call(k+["config","view","--minify","-o","jsonpath={.clusters[0].cluster.server}"]).stdout
    if not endpoint.startswith("https://127.0.0.1:"):raise ValueError("Unexpected API endpoint")
    if "academy-v11" not in call(["kind","get","clusters"]).stdout.splitlines():raise ValueError("Dedicated kind cluster not found")
    return k
def value(data,path):
    for key in path:data=data[key]
    return data
def check_rule(k,ns,rule):
    def get(resource,name,namespace=ns):
        return json.loads(call(k+["-n",namespace,"get",resource,name,"-o","json"]).stdout)
    t=rule["type"]
    if t in ("field","present","condition","exists"):
        row=get(rule["resource"],rule["name"])
        if t=="field":return value(row,rule["path"])==rule["value"]
        if t=="present":return value(row,rule["path"]) is not None
        if t=="exists":return True
        return any(x.get("type")==rule["condition"] and x.get("status")==rule["status"] for x in row.get("status",{}).get("conditions",[]))
    if t=="exec":
        # A negative test must prove the Pod exists and is running; transport failure is not a network-policy pass.
        pod=get("pod",rule["pod"])
        if pod.get("status",{}).get("phase")!="Running":return False
        p=call(k+["-n",ns,"exec",rule["pod"],"--",*rule["argv"]],False)
        if rule.get("nonzero"):
            return p.returncode==1 and ("timed out" in p.stderr.lower() or "timeout" in p.stderr.lower() or "connection refused" in p.stderr.lower())
        return p.returncode==rule.get("exit",0) and rule["contains"] in p.stdout
    if t=="auth":
        p=call(k+["-n",ns,"auth","can-i",rule["verb"],rule["resource"],"--as=system:serviceaccount:"+ns+":reader"],False)
        return p.stdout.strip()==("yes" if rule["allowed"] else "no")
    if t=="distinct_nodes":
        pods=json.loads(call(k+["-n",ns,"get","pods","-l",rule["selector"],"-o","json"]).stdout)["items"]
        return len({p["spec"]["nodeName"] for p in pods if p.get("status",{}).get("phase")=="Running" and p["spec"].get("nodeName")})>=rule["count"]
    if t=="csi":
        pvc=get("pvc",rule["claim"]);pv=json.loads(call(k+["get","pv",pvc["spec"]["volumeName"],"-o","json"]).stdout)
        return bool(pv["spec"].get("csi",{}).get("driver")) and pv["spec"]["claimRef"]["namespace"]==ns
    if t=="endpoints":
        slices=json.loads(call(k+["-n",ns,"get","endpointslices","-l","kubernetes.io/service-name="+rule["service"],"-o","json"]).stdout)["items"]
        ready={e.get("targetRef",{}).get("uid") for s in slices for e in s.get("endpoints",[]) if e.get("conditions",{}).get("ready") is True and e.get("targetRef",{}).get("uid")}
        return len(ready)==rule["count"]
    if t=="helm":
        p=call(["helm","--kubeconfig",str(CFG),"--kube-context","kind-academy-v11","-n",ns,"status",rule["name"],"-o","json"])
        return json.loads(p.stdout)["info"]["status"]=="deployed"
    if t=="argo":
        app=get("applications.argoproj.io",rule["name"],"argocd")
        return app["spec"]["destination"]["namespace"]==ns and app["spec"]["source"]["path"]=="v11-labs/k8s/chart" and app["spec"]["source"]["repoURL"].rstrip("/").removesuffix(".git")=="https://github.com/dneprov808-sudo/devops-lead-lab" and "automated" not in app["spec"].get("syncPolicy",{}) and app["status"]["sync"]["status"]=="Synced" and app["status"]["health"]["status"]=="Healthy"
    if t=="etcd_health":
        prefix=k+["-n","kube-system","exec","etcd-academy-v11-control-plane","--","etcdctl","--endpoints=https://127.0.0.1:2379","--cacert=/etc/kubernetes/pki/etcd/ca.crt","--cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt","--key=/etc/kubernetes/pki/etcd/healthcheck-client.key"]
        return "healthy" in call(prefix+["endpoint","health"]).stdout and bool(call(prefix+["member","list"]).stdout.strip())
    raise ValueError("Unknown verifier rule")
def main():
    p=argparse.ArgumentParser();p.add_argument("action",choices=["list","setup","verify"]);p.add_argument("id",nargs="?");p.add_argument("--confirm-local-lab",action="store_true");a=p.parse_args()
    cases=json.loads((ROOT/"catalog.json").read_text())
    if a.action=="list":
        for row in cases:print(row["id"],row["title"])
        return
    if not a.confirm_local_lab:raise ValueError("Explicit local lab confirmation required")
    row=next((x for x in cases if x["id"]==a.id),None)
    if row is None:raise ValueError("Unknown lab")
    ns=row["namespace"];k=kube()
    if a.action=="setup":
        print(row["task"],row["prerequisites"])
        call(k+["create","namespace",ns])
        call(k+["-n",ns,"apply","-f",str(ROOT/row["fixture"])])
        return
    results=[]
    for rule in row["checks"]:
        try:ok=check_rule(k,ns,rule)
        except (KeyError,IndexError,TypeError,ValueError,OSError,subprocess.SubprocessError):ok=False
        results.append({"type":rule["type"],"status":"PASS" if ok else "FAIL"})
    print(json.dumps({"id":row["id"],"results":results,"verification":"live local checks only; no canonical grade"}))
    sys.exit(not all(x["status"]=="PASS" for x in results))
if __name__=="__main__":main()
