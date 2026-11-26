"""Explicit operator decisions; no API write and no automatic canonical competency changes."""
import argparse
import datetime as dt
import hashlib
import json
import re
from learning_store import Store, canonical, identity, now, string, INTERVALS

RUBRIC={0:"No usable answer",1:"Terms only; major errors",2:"Partially correct; material gaps",3:"Correct with verification and safe trade-offs",4:"Correct, justified, handles failure and edge cases"}

def digest(value):
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()

def table(con):
    con.execute("""CREATE TABLE IF NOT EXISTS review_decisions(
      proposal_id TEXT PRIMARY KEY, payload TEXT NOT NULL)""")

def event(con, ident):
    row=con.execute("SELECT payload FROM events WHERE id=?",(identity(ident),)).fetchone()
    if not row: raise ValueError("Unknown event")
    return json.loads(row[0])

def binding(con, proposal_id):
    p=event(con,proposal_id)
    if p["kind"]!="review_proposal": raise ValueError("Expected review proposal")
    a=event(con,p["data"]["attempt_id"])
    q=p["data"]["question_id"]
    if a["kind"]=="attempt" and a["data"]["question_id"]==q:
        answer=a["data"]["answer"]
    elif a["kind"]=="mock":
        answers=[x["answer"] for x in a["data"]["responses"] if x["question_id"]==q]
        if len(answers)!=1: raise ValueError("Review question mismatch")
        answer=answers[0]
    else: raise ValueError("Review attempt mismatch")
    if not answer.strip() and p["data"]["score"]!=0: raise ValueError("Blank response can only receive zero")
    return p,a,digest({"proposal":p,"attempt":a})

def decide(store, proposal_id, expected_hash, decision, operator, review_ref):
    """Local trusted operator action, NOT cryptographic identity or canonical approval."""
    if decision not in ("accept","reject"): raise ValueError("Invalid decision")
    string(operator,200);string(review_ref,2000)
    if operator.strip().lower() in ("student","ollama","ai","self","llm"):
        raise ValueError("Independent human reviewer required")
    with store.connect() as con:
        table(con)
        p,a,actual=binding(con,proposal_id)
        if actual!=expected_hash: raise ValueError("Stale review binding")
        existing=con.execute("SELECT payload FROM review_decisions WHERE proposal_id=?",(proposal_id,)).fetchone()
        record={"proposal_id":proposal_id,"binding_sha256":actual,"decision":decision,"operator":operator,"review_ref":review_ref}
        if existing:
            old=json.loads(existing[0])
            if {k:v for k,v in old.items() if k!="decided_at"}!=record:
                raise ValueError("Decision already exists; do not overwrite")
            return old
        record["decided_at"]=now()
        con.execute("INSERT INTO review_decisions VALUES (?,?)",(proposal_id,canonical(record)))
        return record

def report(store):
    with store.connect() as con:
        table(con)
        decisions=[json.loads(x[0]) for x in con.execute("SELECT payload FROM review_decisions")]
        accepted={}; conflicts=set()
        for d in decisions:
            if d["decision"]!="accept": continue
            p,a,b=binding(con,d["proposal_id"])
            if b!=d["binding_sha256"]: raise ValueError("Review evidence changed")
            v=p["data"];key=(a["id"],v["question_id"])
            row={"question_id":v["question_id"],"attempt_id":a["id"],"score":v["score"],"created_at":a["created_at"],"proposal_id":p["id"],"verification":"operator_reviewed_local","review_ref":d["review_ref"]}
            if key in accepted and accepted[key]["score"]!=row["score"]: conflicts.add(key)
            elif key not in accepted: accepted[key]=row
        for key in conflicts: accepted.pop(key,None)
        latest={}
        for row in sorted(accepted.values(),key=lambda x:(x["created_at"],x["attempt_id"])):
            day=dt.datetime.fromisoformat(row["created_at"]).astimezone(dt.timezone(dt.timedelta(hours=3))).date()
            latest[row["question_id"]]={**row,"due":(day+dt.timedelta(days=INTERVALS[row["score"]])).isoformat()}
        topics={}
        for q,r in latest.items():
            topic=store.bank.get(q,{}).get("topic","unknown")
            topics.setdefault(topic,[]).append(r["score"])
        exams=[]
        for (raw,) in con.execute("SELECT payload FROM events WHERE kind='mock' ORDER BY created_at,id"):
            e=json.loads(raw);v=e["data"];profile=v["profile"]
            if profile not in ("entry","lead","full"): continue
            ids=[x["question_id"] for x in v["responses"]]
            required={"entry":(18,2,{"Linux","Networking","Docker","Kubernetes","Terraform","Ansible","CI/CD & GitOps","SRE & Incident Management"}),"lead":(18,6,{"Kubernetes","Leadership","System Design & Platform Engineering","SRE & Incident Management","CI/CD & GitOps","DevSecOps"}),"full":(36,10,{q.get("topic") for q in store.bank.values()})}[profile]
            count,lead,mandatory=required
            valid=v["minutes"]==(180 if profile=="full" else 90) and len(ids)==len(set(ids))==count and sum(store.bank.get(q,{}).get("level")=="lead" for q in ids)>=lead and mandatory<={store.bank.get(q,{}).get("topic") for q in ids}
            scores=[accepted[(e["id"],q)]["score"] for q in ids if (e["id"],q) in accepted]
            status="invalid_profile" if not valid else "awaiting_review" if len(scores)!=count else "reviewed_pass_candidate" if min(scores)>=2 and sum(scores)>=3*count else "reviewed_revision_required"
            exams.append({"id":e["id"],"profile":profile,"reviewed":len(scores),"expected":count,"status":status})
    return {"rubric":RUBRIC,"reviewed_questions":list(latest.values()),"topics":{t:{"count":len(v),"average":round(sum(v)/len(v),2)} for t,v in topics.items()},"exams":exams,"conflicts":len(conflicts),"canonical_grade":"unchanged","trust":"local operator attestation; not authenticated reviewer identity"}

def main():
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest="action",required=True)
    inspect=sub.add_parser("inspect");inspect.add_argument("proposal")
    approve=sub.add_parser("decide");approve.add_argument("proposal");approve.add_argument("sha256");approve.add_argument("decision",choices=["accept","reject"]);approve.add_argument("--operator",required=True);approve.add_argument("--review-ref",required=True);approve.add_argument("--confirm-independent-review",action="store_true",required=True)
    sub.add_parser("report")
    args=p.parse_args();store=Store()
    if args.action=="inspect":
        with store.connect() as con:
            proposal,attempt,sha=binding(con,args.proposal)
            out={"proposal":proposal,"attempt":attempt,"binding_sha256":sha,"rubric":RUBRIC}
    elif args.action=="decide": out=decide(store,args.proposal,args.sha256,args.decision,args.operator,args.review_ref)
    else: out=report(store)
    print(json.dumps(out,ensure_ascii=False,indent=2))
if __name__=="__main__": main()
