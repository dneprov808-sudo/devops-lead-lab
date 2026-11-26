"""Opt-in URL reachability triage. No auth, no redirect following, no private addresses."""
import argparse, concurrent.futures, datetime as dt, ipaddress, json, os, pathlib, socket, urllib.error, urllib.request
from urllib.parse import urlsplit
from learning_store import questions, ROOT
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*a,**kw):return None
def check(url):
    u=urlsplit(url)
    if u.scheme!="https" or not u.hostname or u.username or u.password or u.port not in (None,443):return {"url":url,"status":"blocked_url"}
    try:
        addresses=socket.getaddrinfo(u.hostname,443,type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):return {"url":url,"status":"blocked_address"}
        op=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
        req=urllib.request.Request(url,method="HEAD",headers={"User-Agent":"AcademyDocumentationReview/1.0"})
        with op.open(req,timeout=8) as res:return {"url":url,"status":"reachable","http":res.status}
    except urllib.error.HTTPError as e:
        return {"url":url,"status":"redirect_review" if 300<=e.code<400 else "manual_get_review" if e.code in (403,405,429) else "http_error","http":e.code}
    except (OSError,ValueError):return {"url":url,"status":"unknown"}
def main():
    p=argparse.ArgumentParser();p.add_argument("output",type=pathlib.Path);p.add_argument("--confirm-public-requests",action="store_true",required=True);p.add_argument("--limit",type=int,default=460);a=p.parse_args()
    if not 1<=a.limit<=460:raise ValueError("Limit 1..460")
    if a.output.resolve().is_relative_to(ROOT) and not a.output.resolve().is_relative_to(ROOT/".academy-data"):raise ValueError("Use local output outside repo")
    urls=sorted({q["source"] for q in questions().values()})
    # Each URL is from the tracked study bank, not an arbitrary request input. Redirects never followed.
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: rows=list(pool.map(check,urls[:a.limit]))
    fd=os.open(a.output,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    with os.fdopen(fd,"w") as f:json.dump({"checked_at":dt.datetime.now(dt.timezone.utc).isoformat(),"total":len(urls),"checked":len(rows),"items":rows,"note":"HEAD reachability is not source accuracy; redirects/403/405 require human review"},f,indent=2)
if __name__=="__main__":main()
