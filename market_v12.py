"""Explicit HH public vacancy search, no application or candidate data. Review suggestions before import."""
import argparse, datetime as dt, json, os, pathlib, re, uuid, hashlib, urllib.request, urllib.parse
from learning_store import Store, validate, ROOT, canonical
TOPICS={"Kubernetes":r"\bkubernetes\b|\bk8s\b","Linux":r"\blinux\b","Networking":r"\btcp\b|\bdns\b|сетев","Terraform":r"\bterraform\b|\bopentofu\b","Ansible":r"\bansible\b","CI/CD & GitOps":r"ci/cd|gitlab|jenkins|argocd|gitops","Docker":r"\bdocker\b","Observability":r"prometheus|grafana|zabbix|observability","Kafka":r"\bkafka\b","PostgreSQL & Patroni":r"postgres|patroni","Redis":r"\bredis\b","Helm":r"\bhelm\b","DevSecOps":r"devsecops|vault|security","SRE & Incident Management":r"\bsre\b|incident|\bslo\b","System Design & Platform Engineering":r"platform engineer|архитектур","Leadership":r"\blead\b|руководител"}
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):raise ValueError("Redirect refused")
def normalize_item(item,day):
    if not isinstance(item,dict) or not re.fullmatch(r"[0-9]+",str(item.get("id",""))):raise ValueError("Invalid vacancy")
    if item.get("archived") is True:return None
    snippet=item.get("snippet") or {}
    text=re.sub(r"<[^>]*>"," "," ".join(str(x or "") for x in (item.get("name"),snippet.get("requirement"),snippet.get("responsibility")))).lower()
    topics=[k for k,v in TOPICS.items() if re.search(v,text,re.I)]
    if not topics:return None
    salary=item.get("salary") or {}
    if salary.get("currency")!="RUR":salary={}
    return {"title":str(item["name"])[:200],"company":str(item["employer"]["name"])[:200],"source":"https://hh.ru/vacancy/"+str(item["id"]),"observed":day,"salary_min":salary.get("from"),"salary_max":salary.get("to"),"basis":"gross" if salary.get("gross") is True else "net" if salary.get("gross") is False else "unknown","topics":topics}
def search(query):
    token=os.environ.get("HH_ACCESS_TOKEN");agent=os.environ.get("HH_USER_AGENT")
    if not token or not agent:raise ValueError("HH_ACCESS_TOKEN and HH_USER_AGENT required; official authorized access only")
    params=urllib.parse.urlencode({"text":query,"area":"1","per_page":50,"period":30,"page":0})
    op=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
    req=urllib.request.Request("https://api.hh.ru/vacancies?"+params,headers={"Authorization":"Bearer "+token,"HH-User-Agent":agent,"User-Agent":agent})
    with op.open(req,timeout=20) as response:raw=response.read(4*1024*1024+1)
    if len(raw)>4*1024*1024:raise ValueError("Response too large")
    return json.loads(raw)
def main():
    p=argparse.ArgumentParser();s=p.add_subparsers(dest="action",required=True)
    fetch=s.add_parser("search");fetch.add_argument("output",type=pathlib.Path);fetch.add_argument("--query",default="DevOps");fetch.add_argument("--confirm-public-search",action="store_true",required=True)
    imp=s.add_parser("import");imp.add_argument("input",type=pathlib.Path);imp.add_argument("--confirm-reviewed",action="store_true",required=True,help="Review source, actual requirement topics and monthly RUB salary; remove non-matching vacancies")
    a=p.parse_args()
    if a.action=="search":
        if a.output.resolve().is_relative_to(ROOT) and not a.output.resolve().is_relative_to(ROOT/".academy-data"):raise ValueError("Keep market snapshot outside repository")
        raw=search(a.query);day=dt.date.today().isoformat();rows=[]
        for item in raw.get("items",[]):
            value=normalize_item(item,day)
            if value:rows.append(value)
        fd=os.open(a.output,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
        with os.fdopen(fd,"w",encoding="utf-8") as f:json.dump({"schema_version":1,"kind":"vacancy_candidates","observed":day,"items":rows,"note":"Keyword suggestions only; review actual vacancy and monthly salary basis before import."},f,ensure_ascii=False,indent=2)
        print("Candidates:",len(rows))
    else:
        if a.input.stat().st_size>2*1024*1024:raise ValueError("Input too large")
        data=json.loads(a.input.read_text(encoding="utf-8"))
        if data.get("schema_version")!=1 or data.get("kind")!="vacancy_candidates" or not isinstance(data.get("items"),list) or len(data["items"])>200:raise ValueError("Invalid market snapshot")
        store=Store();rows=[]
        for item in data["items"]:
            ident=str(uuid.UUID(bytes=hashlib.sha256(canonical(item).encode()).digest()[:16],version=4))
            created=item["observed"]+"T00:00:00+00:00"
            rows.append(validate({"id":ident,"kind":"vacancy","created_at":created,"data":item},store.bank))
        print(store.import_data({"schema_version":1,"events":rows}))
if __name__=="__main__":main()
