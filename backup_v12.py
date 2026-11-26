"""Local trusted SQLite backup verification and non-overwriting recovery."""
import argparse
import contextlib
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import tempfile

MAX_BYTES=128*1024*1024
MAX_ROWS=10000

def canonical(value):
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"),allow_nan=False)

def read_snapshot(source):
    source=Path(source).resolve(strict=True)
    if not source.is_file() or not 0<source.stat().st_size<=MAX_BYTES:
        raise ValueError("Invalid backup size")
    if any(Path(str(source)+s).exists() for s in ("-wal","-shm","-journal")):
        raise ValueError("Use a completed standalone SQLite backup, not a live database")
    with contextlib.closing(sqlite3.connect(source.as_uri()+"?mode=ro",uri=True,timeout=5)) as con:
        con.execute("PRAGMA trusted_schema=OFF")
        con.execute("PRAGMA query_only=ON")
        con.execute("BEGIN")
        if con.execute("PRAGMA user_version").fetchone()[0]!=1:
            raise ValueError("Unsupported schema")
        schema=con.execute("SELECT type,name FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'").fetchall()
        expected={("table","events"),("index","events_created")}
        if set(schema) not in (expected,expected|{("table","review_decisions")}):
            raise ValueError("Unexpected backup schema")
        if con.execute("PRAGMA integrity_check").fetchall()!=[("ok",)]:
            raise ValueError("SQLite integrity check failed")
        rows=con.execute("SELECT id,created_at,kind,payload FROM events ORDER BY id LIMIT ?",(MAX_ROWS+1,)).fetchall()
        if len(rows)>MAX_ROWS: raise ValueError("Too many events")
        events=[]
        for ident,created,kind,raw in rows:
            row=json.loads(raw)
            if not isinstance(row,dict) or (ident,created,kind)!=(row.get("id"),row.get("created_at"),row.get("kind")) or raw!=canonical(row):
                raise ValueError("Event metadata mismatch")
            events.append(row)
        decisions=[]
        if ("table","review_decisions") in schema:
            rows=con.execute("SELECT proposal_id,payload FROM review_decisions ORDER BY proposal_id LIMIT ?",(MAX_ROWS+1,)).fetchall()
            if len(rows)>MAX_ROWS: raise ValueError("Too many review decisions")
            for ident,raw in rows:
                d=json.loads(raw)
                if not isinstance(d,dict) or ident!=d.get("proposal_id") or raw!=canonical(d):
                    raise ValueError("Decision metadata mismatch")
                decisions.append(d)
    return {"schema_version":1,"events":events,"decisions":decisions}

def fingerprint(snapshot):
    return hashlib.sha256(canonical(snapshot).encode("utf-8")).hexdigest()

def restore(source,destination,*,bank=None,apply=False):
    from learning_store import Store, timestamp, identity, string
    from assessment_v12 import binding, table, validate_operator
    snapshot=read_snapshot(source)
    dest=Path(destination).absolute()
    if dest.exists() or dest.is_symlink():
        raise FileExistsError("Recovery never overwrites an existing database")
    if not dest.parent.is_dir():
        raise ValueError("Create an empty private destination directory first")
    if any(Path(str(dest)+s).exists() for s in ("-wal","-shm","-journal")):
        raise ValueError("Destination has SQLite sidecar files")
    with tempfile.TemporaryDirectory(prefix=".academy-restore-",dir=dest.parent) as temp:
        candidate=Path(temp)/"learning.sqlite3"
        store=Store(candidate,bank)
        store.import_data({"schema_version":1,"events":snapshot["events"]})
        with store.connect() as con:
            table(con)
            for d in snapshot["decisions"]:
                if set(d)!={"proposal_id","binding_sha256","decision","operator","review_ref","decided_at"}:
                    raise ValueError("Invalid decision envelope")
                identity(d["proposal_id"])
                validate_operator(d["operator"],d["review_ref"])
                if d["decision"] not in ("accept","reject") or timestamp(d["decided_at"])!=d["decided_at"]:
                    raise ValueError("Invalid decision")
                _,_,actual=binding(con,d["proposal_id"],enforce_score=d["decision"]=="accept")
                if actual!=d["binding_sha256"]:
                    raise ValueError("Decision evidence mismatch")
                con.execute("INSERT INTO review_decisions VALUES (?,?)",(d["proposal_id"],canonical(d)))
        restored=read_snapshot(candidate)
        if fingerprint(restored)!=fingerprint(snapshot):
            raise ValueError("Recovery verification mismatch")
        if apply:
            # Atomic create-only publication on the same filesystem. Never replace a live DB.
            os.link(candidate,dest)
    return {"status":"restored" if apply else "validated_only","events":len(snapshot["events"]),"decisions":len(snapshot["decisions"]),"snapshot_sha256":fingerprint(snapshot),"canonical_grade":"unchanged"}

def main():
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest="action",required=True)
    b=sub.add_parser("backup");b.add_argument("output",type=Path)
    v=sub.add_parser("restore");v.add_argument("source",type=Path);v.add_argument("destination",type=Path)
    v.add_argument("--confirm-trusted-backup",action="store_true",required=True)
    v.add_argument("--apply",action="store_true")
    a=p.parse_args()
    if a.action=="backup":
        from learning_store import Store
        Store().backup(a.output)
        s=read_snapshot(a.output)
        result={"status":"backed_up","events":len(s["events"]),"decisions":len(s["decisions"]),"snapshot_sha256":fingerprint(s)}
    else:
        result=restore(a.source,a.destination,apply=a.apply)
    print(json.dumps(result,ensure_ascii=False))
if __name__=="__main__": main()
