"""Local release evidence helpers; no log output, credentials or answer data in report."""
import json, os, pathlib, re, subprocess, time

def snapshot(root):
    try:
        sha=subprocess.check_output(["git","rev-parse","--verify","HEAD"],cwd=root,text=True,stderr=subprocess.DEVNULL,timeout=10).strip()
        clean=subprocess.run(["git","diff","--quiet","HEAD","--"],cwd=root,stderr=subprocess.DEVNULL,timeout=20).returncode
        untracked=subprocess.check_output(["git","ls-files","--others","--exclude-standard","-z"],cwd=root,stderr=subprocess.DEVNULL,timeout=20)
        return {"untracked_clean":not bool(untracked),"commit":sha if re.fullmatch(r"[a-f0-9]{40}",sha) else None,"tracked_clean":True if clean==0 else False if clean==1 else None}
    except (OSError,subprocess.SubprocessError):
        return {"commit":None,"tracked_clean":None,"untracked_clean":None}

def run_check(cmd,root,env,timeout=1300):
    started=time.monotonic()
    try:
        rc=subprocess.run(cmd,cwd=root,env=env,timeout=timeout).returncode
    except (OSError,subprocess.TimeoutExpired):
        rc=125
    return {"command":[str(x) for x in cmd],"exit":rc,"status":"PASS" if rc==0 else "BLOCKED" if rc==125 else "FAIL","seconds":round(time.monotonic()-started,2)}

def classify(rows,same_clean_commit,require_snapshot):
    if any(r["status"]=="FAIL" for r in rows):return "FAIL"
    if not rows or any(r["status"]!="PASS" for r in rows) or require_snapshot and not same_clean_commit:return "BLOCKED"
    return "PASS"

def save_report(path,report):
    # No replacement, no world-readable report. Caller enforces destination outside checkout.
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,"w",encoding="utf-8") as f:
        json.dump(report,f,ensure_ascii=False,indent=2);f.write("\n")
