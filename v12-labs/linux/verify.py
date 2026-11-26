"""Read-only checks in dedicated network namespace. No host network mutation."""
import argparse,json,os,pathlib,socket,subprocess,sys
def run(*args):
    return subprocess.check_output(args,text=True,timeout=10,stderr=subprocess.STDOUT)
def guard():
    parent=os.environ.get("ACADEMY_PARENT_NET")
    if not parent or os.readlink("/proc/self/ns/net")==parent or not os.environ.get("ACADEMY_WORK"):raise ValueError("Use dedicated sandbox")
    return pathlib.Path(os.environ["ACADEMY_WORK"])
def check(kind):
    work=guard()
    if kind=="route":
        row=json.loads(run("ip","-j","route","get","198.51.100.200"))[0]
        return row.get("dev")=="academy0" and row.get("prefsrc")=="192.0.2.10"
    if kind=="dns":
        return run("dig","+short","+time=2","+tries=1","@127.0.0.1","-p","15353","api.academy.test","A").strip()=="192.0.2.10"
    if kind=="firewall":
        def connect(port):
            with socket.socket() as s:
                s.settimeout(1)
                return s.connect_ex(("127.0.0.1",port))
        # both local listeners must be running; verify actual listener with ss.
        listeners=run("ss","-ltn")
        if not all(":"+str(p) in listeners for p in (18080,18081)):return False
        return connect(18080)==0 and connect(18081)!=0 and "academy" in run("nft","list","ruleset")
    if kind=="tls":
        return "OK" in run("openssl","verify","-CAfile",str(work/"ca.pem"),"-verify_hostname","api.academy.test",str(work/"server.pem"))
    if kind=="capture":
        out=run("tcpdump","-nn","-r",str(work/"trace.pcap"),"tcp","port","18080")
        return "Flags [S]" in out and ("Flags [S.]" in out or "Flags [.]" in out)
    raise ValueError("Unknown case")
def main():
    p=argparse.ArgumentParser();p.add_argument("kind",choices=["route","dns","firewall","tls","capture"]);a=p.parse_args()
    try:ok=check(a.kind)
    except (OSError,ValueError,KeyError,subprocess.SubprocessError):ok=False
    print(json.dumps({"case":a.kind,"status":"PASS" if ok else "FAIL","scope":"local isolated namespace"}))
    sys.exit(not ok)
if __name__=="__main__":main()
