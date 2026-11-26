"""Local-only, append-only study evidence. No remote writes or automatic competency grades."""
import contextlib
import datetime as dt
import json
import os
from pathlib import Path
import re
import sqlite3
import uuid
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parent
SCHEMA=1
MAX_EVENTS=10000
MAX_BODY=2*1024*1024
ID=re.compile(r"[A-Z][A-Z0-9-]{1,80}")
SHA=re.compile(r"[a-f0-9]{40}")
INTERVALS=(1,1,3,7,14)

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def string(value, maximum, nonempty=True):
    if not isinstance(value,str) or len(value)>maximum or (nonempty and not value.strip()):
        raise ValueError("Invalid text")
    return value

def identity(value):
    if not isinstance(value,str) or str(uuid.UUID(value))!=value or uuid.UUID(value).version!=4:
        raise ValueError("Invalid UUID")
    return value

def qid(value, ids):
    if not isinstance(value,str) or not ID.fullmatch(value) or value not in ids:
        raise ValueError("Unknown question ID")
    return value

def score(value, nullable=False):
    if nullable and value is None: return value
    if type(value) is not int or not 0<=value<=4: raise ValueError("Invalid score")
    return value

def timestamp(value):
    string(value,64)
    parsed=dt.datetime.fromisoformat(value.replace("Z","+00:00"))
    if parsed.tzinfo is None or parsed>dt.datetime.now(dt.timezone.utc)+dt.timedelta(minutes=5):
        raise ValueError("Invalid timestamp")
    return parsed.astimezone(dt.timezone.utc).isoformat()

def questions(root=ROOT):
    raw=(root/"web/interview-bank.js").read_text(encoding="utf-8")
    match=re.search(r"const INTERVIEW_PRO_BANK = (\[[\s\S]*\]);\s*$",raw)
    if not match: raise ValueError("Bank unavailable")
    bank=json.loads(match.group(1))
    return {q["id"]:q for q in bank}

def canonical(value):
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"),allow_nan=False)

def validate(record, ids):
    if not isinstance(record,dict) or set(record)!={"id","kind","created_at","data"}:
        raise ValueError("Invalid envelope")
    ident=identity(record["id"])
    created=timestamp(record["created_at"])
    kind=record["kind"]; data=record["data"]
    if not isinstance(data,dict): raise ValueError("Invalid data")
    if kind=="attempt":
        if set(data)!={"question_id","answer","score","error"}: raise ValueError("Attempt fields")
        qid(data["question_id"],ids); string(data["answer"],12000,False)
        score(data["score"],True); string(data["error"],3000,False)
    elif kind=="mock":
        if set(data)!={"profile","minutes","started_at","responses"}: raise ValueError("Mock fields")
        string(data["profile"],80)
        if type(data["minutes"]) is not int or data["minutes"] not in (15,20,30,45,60,90,180):
            raise ValueError("Mock duration")
        if timestamp(data["started_at"])>created: raise ValueError("Mock start")
        if not isinstance(data["responses"],list) or not 1<=len(data["responses"])<=36: raise ValueError("Mock responses")
        seen=set()
        for row in data["responses"]:
            if not isinstance(row,dict) or set(row)!={"question_id","answer"}: raise ValueError("Response fields")
            q=qid(row["question_id"],ids)
            if q in seen: raise ValueError("Repeated question")
            seen.add(q); string(row["answer"],12000,False)
    elif kind=="review_proposal":
        if set(data)!={"attempt_id","question_id","score","reviewer","evidence","error","commit"}: raise ValueError("Review fields")
        identity(data["attempt_id"]); qid(data["question_id"],ids); score(data["score"])
        string(data["reviewer"],200); string(data["evidence"],6000); string(data["error"],3000,False)
        if data["commit"] is not None and (not isinstance(data["commit"],str) or not SHA.fullmatch(data["commit"])):
            raise ValueError("Invalid commit")
    elif kind=="design":
        if set(data)!={"title","rps","per_replica","util_percent","zones","db_gb","restore_mbps","decision","alternatives","verification"}: raise ValueError("Design fields")
        for k in ("title","decision","alternatives","verification"): string(data[k],6000)
        for k,low,high in (("rps",1,10**9),("per_replica",1,10**7),("util_percent",1,100),("zones",2,20),("db_gb",1,10**7),("restore_mbps",1,10**6)):
            if type(data[k]) is not int or not low<=data[k]<=high: raise ValueError("Design number")
    elif kind=="vacancy":
        if set(data)!={"title","company","source","observed","salary_min","salary_max","basis","topics"}: raise ValueError("Vacancy fields")
        string(data["title"],200); string(data["company"],200); string(data["source"],2048)
        u=urlsplit(data["source"])
        if u.scheme!="https" or not u.hostname or u.username or u.password: raise ValueError("Source URL")
        day=dt.date.fromisoformat(data["observed"])
        if day.isoformat()!=data["observed"] or day>dt.date.today(): raise ValueError("Vacancy date")
        for k in ("salary_min","salary_max"):
            if data[k] is not None and (type(data[k]) is not int or not 0<data[k]<=100000000): raise ValueError("Salary in RUB/month")
        if data["salary_min"] is not None and data["salary_max"] is not None and data["salary_min"]>data["salary_max"]: raise ValueError("Salary range")
        if data["basis"] not in ("gross","net","unknown"): raise ValueError("Salary basis")
        topics={q.get("topic") for q in ids.values()}
        if not isinstance(data["topics"],list) or not data["topics"] or not all(isinstance(t,str) and t in topics for t in data["topics"]) or len(set(data["topics"]))!=len(data["topics"]): raise ValueError("Vacancy topics")
    elif kind=="portfolio":
        if set(data)!={"title","topic","impact","evidence","commit"}: raise ValueError("Portfolio fields")
        for k in ("title","impact","evidence"): string(data[k],6000)
        if data["topic"] not in {q.get("topic") for q in ids.values()}: raise ValueError("Unknown topic")
        if data["commit"] is not None and (not isinstance(data["commit"],str) or not SHA.fullmatch(data["commit"])): raise ValueError("Invalid SHA")
    else: raise ValueError("Unknown event kind")
    return {"id":ident,"kind":kind,"created_at":created,"data":data}

class Store:
    def __init__(self, path=None, bank=None):
        directory=Path(os.environ.get("ACADEMY_DATA_DIR",ROOT/".academy-data"))
        self.path=Path(path) if path else directory/"learning.sqlite3"
        self.bank=questions() if bank is None else bank

    @contextlib.contextmanager
    def connect(self):
        self.path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
        # Create private file before SQLite opens it (existing permissions are not modified).
        fd=os.open(self.path,os.O_CREAT|os.O_WRONLY,0o600); os.close(fd)
        con=sqlite3.connect(self.path,timeout=5)
        try:
            con.execute("PRAGMA busy_timeout=5000")
            con.execute("BEGIN IMMEDIATE")
            version=con.execute("PRAGMA user_version").fetchone()[0]
            if version not in (0,SCHEMA): raise ValueError("Unsupported database schema")
            con.execute("CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL)")
            con.execute("CREATE INDEX IF NOT EXISTS events_created ON events(created_at,id)")
            if version==0: con.execute("PRAGMA user_version=1")
            yield con
            con.commit()
        except BaseException:
            con.rollback(); raise
        finally: con.close()

    def add(self,record):
        return self.import_data({"schema_version":SCHEMA,"events":[record]})

    def import_data(self,payload):
        if not isinstance(payload,dict) or set(payload)!={"schema_version","events"} or type(payload["schema_version"]) is not int or payload["schema_version"]!=SCHEMA:
            raise ValueError("Unsupported backup schema")
        if not isinstance(payload["events"],list) or len(payload["events"])>MAX_EVENTS:
            raise ValueError("Invalid event count")
        rows=[validate(x,self.bank) for x in payload["events"]]
        inserted=0
        with self.connect() as con:
            for row in rows:
                text=canonical(row)
                existing=con.execute("SELECT payload FROM events WHERE id=?",(row["id"],)).fetchone()
                if existing:
                    if existing[0]!=text: raise ValueError("Event ID collision; no partial import")
                    continue
                con.execute("INSERT INTO events VALUES (?,?,?,?)",(row["id"],row["created_at"],row["kind"],text))
                inserted+=1
            if con.execute("SELECT count(*) FROM events").fetchone()[0]>MAX_EVENTS:
                raise ValueError("Local store limit reached")
            # A proposal must refer to a real local attempt for the same question.
            for row in rows:
                if row["kind"]!="review_proposal": continue
                data=row["data"]
                target=con.execute("SELECT payload FROM events WHERE id=?",(data["attempt_id"],)).fetchone()
                if not target: raise ValueError("Review attempt missing")
                attempt=json.loads(target[0])
                valid=(attempt["kind"]=="attempt" and attempt["data"]["question_id"]==data["question_id"]) or (attempt["kind"]=="mock" and any(x["question_id"]==data["question_id"] for x in attempt["data"]["responses"]))
                if not valid: raise ValueError("Review question mismatch")
        return {"inserted":inserted,"existing":len(rows)-inserted}

    def export(self):
        with self.connect() as con:
            rows=con.execute("SELECT payload FROM events ORDER BY created_at,id").fetchall()
        return {"schema_version":SCHEMA,"events":[json.loads(row[0]) for row in rows]}

    def summary(self):
        events=self.export()["events"]
        latest={}; errors=[]; proposals=0; mocks=0; by_topic={}; reviews=[]
        for e in events:
            d=e["data"]
            if e["kind"]=="attempt":
                topic=self.bank[d["question_id"]].get("topic","unknown")
                item=by_topic.setdefault(topic,{"attempts":0,"questions":set(),"proposals":0})
                item["attempts"]+=1; item["questions"].add(d["question_id"])
                if d["score"] is not None:
                    day=dt.datetime.fromisoformat(e["created_at"]).astimezone(dt.timezone(dt.timedelta(hours=3))).date()
                    latest[d["question_id"]]={"question_id":d["question_id"],"score":d["score"],"due":(day+dt.timedelta(days=INTERVALS[d["score"]])).isoformat(),"verification":"self_reported"}
                if d["error"]: errors.append({"id":e["id"],"question_id":d["question_id"],"error":d["error"]})
            elif e["kind"]=="review_proposal":
                proposals+=1
                topic=self.bank[d["question_id"]].get("topic","unknown")
                by_topic.setdefault(topic,{"attempts":0,"questions":set(),"proposals":0})["proposals"]+=1
                reviews.append({"id":e["id"],"question_id":d["question_id"],"score":d["score"],"reviewer":d["reviewer"],"status":"unverified_proposal"})
            elif e["kind"]=="mock": mocks+=1
        return {"events":len(events),"self_reviews":list(latest.values()),"errors":errors[-100:],"review_proposals":proposals,"mock_sessions":mocks,"canonical_grade":"unchanged","by_topic":{k:{**v,"questions":len(v["questions"])} for k,v in by_topic.items()},"proposals":reviews[-100:]}

    def health(self):
        with self.connect() as con:
            return {"status":"ok","schema_version":con.execute("PRAGMA user_version").fetchone()[0]}

    def backup(self,destination):
        destination=Path(destination)
        if destination.resolve()==self.path.resolve(): raise ValueError("Backup must be separate")
        fd=os.open(destination,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600); os.close(fd)
        try:
            # Initialize/migrate separately; backup cannot run inside an active write transaction.
            with self.connect(): pass
            with contextlib.closing(sqlite3.connect(self.path)) as src, contextlib.closing(sqlite3.connect(destination)) as dst:
                src.backup(dst)
                if dst.execute("PRAGMA integrity_check").fetchone()[0]!="ok": raise ValueError("Backup integrity failed")
        except BaseException:
            destination.unlink(missing_ok=True); raise
