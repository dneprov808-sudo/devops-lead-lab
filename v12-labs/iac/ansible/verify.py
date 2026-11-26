"""Run the student's local playbook twice in an isolated temporary directory."""
import os,pathlib,re,subprocess,tempfile,sys
ROOT=pathlib.Path(__file__).resolve().parent
def main():
    with tempfile.TemporaryDirectory(prefix="academy-ansible-") as temp:
        env=dict(os.environ,ANSIBLE_NOCOLOR="1",ANSIBLE_CONFIG=str(ROOT/"ansible.cfg"))
        cmd=["ansible-playbook","-i","localhost,","-c","local",str(ROOT/"playbook.yml"),"--extra-vars","academy_work="+temp]
        for attempt in (1,2):
            p=subprocess.run(cmd,cwd=ROOT,env=env,text=True,capture_output=True,timeout=60)
            if p.returncode: raise RuntimeError("Playbook failed")
            if attempt==2 and not re.search(r"localhost\s+:.*changed=0\s+.*failed=0",p.stdout): raise RuntimeError("Second run not idempotent")
        path=pathlib.Path(temp)/"service.conf"
        if path.read_text()!="mode=production-like\n" or path.stat().st_mode&0o777!=0o640:raise RuntimeError("Wrong content or mode")
    print("PASS: expected content, permissions, idempotence")
if __name__=="__main__":main()
