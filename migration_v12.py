"""Lossless migration of old structured results, not question-level competence."""
import argparse, hashlib, json, re
from pathlib import Path
from learning_store import Store, canonical, ROOT
from practice_results import normalize
from practice_history import PATH

def validate_legacy(data):
    if not isinstance(data,dict) or set(data)!={"record","digest"}: raise ValueError("Legacy envelope")
    record=data["record"]
    if not isinstance(record,dict): raise ValueError("Legacy record")
    catalog=json.loads((ROOT/"practice/catalog.json").read_text(encoding="utf-8"))
    clean=normalize({k:v for k,v in record.items() if k not in ("verification","due")},catalog)
    if clean!=record or hashlib.sha256(canonical(clean).encode()).hexdigest()!=data["digest"]:
        raise ValueError("Legacy record mismatch")
    return clean

def convert(history):
    if not isinstance(history,dict) or history.get("status") not in ("read","empty") or history.get("truncated") is not False or history.get("invalid")!=0:
        raise ValueError("Complete valid history required; no partial migration")
    if not isinstance(history.get("items"),list) or len(history["items"])>10000: raise ValueError("Invalid history size")
    if history["status"]=="read" and not re.fullmatch(r"[a-f0-9]{40}",history.get("commit") or ""): raise ValueError("Missing source commit")
    if history["status"]=="empty" and history["items"]: raise ValueError("Nonempty history")
    events=[]
    for row in history["items"]:
        if not isinstance(row,dict): raise ValueError("Invalid item")
        match=PATH.fullmatch(row.get("path",""))
        record={k:v for k,v in row.items() if k!="path"}
        if not match or match.groups()!=(record.get("module"),record.get("attempt")): raise ValueError("Legacy path mismatch")
        data={"record":record,"digest":hashlib.sha256(canonical(record).encode()).hexdigest()}
        validate_legacy(data)
        # Unknown legacy dates use a sentinel only for stable event ordering, never a review date.
        created=record.get("assessed","2020-01-01")+"T00:00:00+00:00"
        events.append({"id":record["attempt"],"kind":"legacy_result","created_at":created,"data":data})
    return {"schema_version":1,"events":events}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("history",type=Path,nargs="?")
    p.add_argument("--from-git",action="store_true")
    p.add_argument("--apply",action="store_true")
    a=p.parse_args()
    if bool(a.history)==a.from_git: p.error("Choose one of history JSON or --from-git")
    if a.from_git:
        import portal, academy, practice_history, practice_results
        history=practice_history.read_history(portal.git,portal.command,academy.ORIGINS,practice_results.normalize,portal.catalog(),ROOT,limit=10000)
    else:
        if a.history.stat().st_size>64*1024*1024: raise ValueError("History too large")
        history=json.loads(a.history.read_text(encoding="utf-8"))
    payload=convert(history)
    result=Store().import_data(payload) if a.apply else {"would_import":len(payload["events"]),"verification":"legacy_only"}
    print(json.dumps({"source_commit":history.get("commit"),"result":result}))
if __name__=="__main__": main()
