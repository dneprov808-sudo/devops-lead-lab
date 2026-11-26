"""Explicit local backup CLI. Restore is a validated merge, never overwrite."""
import argparse, json, os
from pathlib import Path
from learning_store import Store

def main():
    p=argparse.ArgumentParser()
    p.add_argument("action",choices=["export","import","backup"])
    p.add_argument("file",type=Path)
    a=p.parse_args(); store=Store()
    if a.action=="backup": store.backup(a.file)
    elif a.action=="export":
        fd=os.open(a.file,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
        with os.fdopen(fd,"w",encoding="utf-8") as f: json.dump(store.export(),f,ensure_ascii=False)
    else:
        if a.file.stat().st_size>100*1024*1024: raise ValueError("Backup too large")
        print(store.import_data(json.loads(a.file.read_text(encoding="utf-8"))))
if __name__=="__main__": main()
