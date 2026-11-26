"""Offline bridge. Analyzer raw schema is not assumed; map verified findings into v1 explicitly."""
import argparse, json
from pathlib import Path
from learning_store import Store, identity, validate

def normalize_report(report,bank):
    if not isinstance(report,dict) or set(report)!={"schema_version","kind","reviews"} or type(report["schema_version"]) is not int or report["schema_version"]!=1 or report["kind"]!="academy_analyzer_review":
        raise ValueError("Expected academy_analyzer_review schema v1; raw analysis.json is not this contract")
    if not isinstance(report["reviews"],list) or not 1<=len(report["reviews"])<=100:
        raise ValueError("Invalid review count")
    records=[]
    for e in report["reviews"]:
        if not isinstance(e,dict) or e.get("kind")!="review_proposal": raise ValueError("Review proposal required")
        records.append(validate(e,bank))
    return {"schema_version":1,"events":records}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("report",type=Path)
    p.add_argument("--apply",action="store_true")
    args=p.parse_args()
    if args.report.stat().st_size>2*1024*1024: raise ValueError("Report too large")
    store=Store()
    normalized=normalize_report(json.loads(args.report.read_text(encoding="utf-8")),store.bank)
    if args.apply: print(store.import_data(normalized))
    else: print(json.dumps({"status":"preview_only","proposals":len(normalized["events"]),"verification":"unverified"},ensure_ascii=False))
if __name__=="__main__": main()
