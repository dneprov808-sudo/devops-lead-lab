import {canonical,parseIssue} from "./bus.mjs";

function planConsumer(issues,snapshot,verified={},options={}) {
  const {complete=false,finalStateBlob=null,channel="live"}=options;
  const out={mode:"dry-run",status:"BLOCKED",revision:snapshot?.revision??null,state_blob:snapshot?.state_blob??null,journal:[],proposals:[],writes:0};
  const sha=x=>typeof x==="string"&&/^[a-f0-9]{40}$/.test(x);
  const states=["assigned","in_progress","awaiting_review","revision_required","awaiting_exam","completed","blocked","deferred"];
  const ids=x=>Array.isArray(x)&&x.every(s=>typeof s==="string"&&s.length>0);
  if(!complete||!Array.isArray(issues)||!snapshot||snapshot.control_ref!=="academy/orchestration-v1"||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<1||!sha(snapshot.state_blob)||!sha(snapshot.control_commit)||!ids(snapshot.accepted_ids)||!ids(snapshot.pending_ids)||snapshot.accepted_ids.some(x=>snapshot.pending_ids.includes(x))||typeof snapshot.task_id!=="string"||typeof snapshot.task_ref!=="string"||!states.includes(snapshot.task_status)||!["live","test"].includes(channel)||finalStateBlob!==snapshot.state_blob||!verified||typeof verified!=="object"){out.reason="incomplete/inconsistent snapshot or state changed";return out;}
  const groups=new Map(),ignored=[];
  for(const raw of issues){
    const row={...raw,number:raw?.number??raw?.issue_number};
    if(typeof row.title!=="string"){out.reason="unhydrated issue";return out;}
    const prefix=channel==="test"?"[handoff:test:v1] ":"[handoff:v1] ";
    if(!row.title.startsWith(prefix)){ignored.push(row.number);continue;}
    const id=row.title.slice(prefix.length);
    if(!groups.has(id))groups.set(id,[]);
    groups.get(id).push({row,p:parseIssue(row)});
  }
  for(const [id,group] of groups){
    const numbers=[...new Set(group.map(g=>g.row.number))].sort((a,b)=>a-b);
    const entry={handoff_id:id,issues:numbers,status:null,reason:null,proposal:null};
    const bad=group.some(g=>g.p.kind!=="message"||g.p.envelope.channel!==channel||g.p.author!=="dneprov808-sudo");
    if(bad){entry.status="quarantined";entry.reason="invalid envelope, untrusted author or metadata";}
    else if(new Set(group.map(g=>canonical(g.p.envelope))).size!==1||group.some(g=>group.some(k=>k.row.number===g.row.number&&k.row.state!==g.row.state))){entry.status="collision";entry.reason="same ID with conflicting payload or metadata";}
    else {
      const p=group[0].p,h=p.envelope.handoff;
      entry.role=h.from;entry.task_id=h.task_id;entry.duplicates=numbers.slice(1);
      if(channel==="test"){entry.status="test_only";entry.reason="no live review or transition";}
      else if(snapshot.accepted_ids.includes(id)){entry.status="already_accepted";entry.reason="never reapply; reconcile original fingerprint manually";}
      else if(snapshot.pending_ids.includes(id)){entry.status="already_pending";entry.reason="await existing review";}
      else if(group.some(g=>g.row.state==="closed")){entry.status="closed_unreconciled";entry.reason="closed is not acceptance";}
      else if(h.event==="blocked"){entry.status="blocked_report";entry.reason="manual blocker review";}
      else if(h.control_ref!==snapshot.control_ref||h.observed_state_revision!==snapshot.revision){entry.status="stale";entry.reason="fresh preflight required";}
      else if(h.proposed_status===null){entry.status="review_only";entry.reason="recommendation/evidence needs human review; no transition requested";}
      else if(h.task_id!==snapshot.task_id){entry.status="rejected_transition";entry.reason="not active task";}
      else {
        const gate=[
          ["assigned","in_progress","student","submitted",["start_confirmation"]],
          ["revision_required","in_progress","student","submitted",["correction_confirmation"]],
          ["in_progress","awaiting_review","student","submitted",["implementation","original_tests_pass","report"]],
          ["awaiting_review","revision_required","code_reviewer","reviewed",["review_fail"]],
          ["awaiting_review","awaiting_exam","code_reviewer","reviewed",["review_pass","original_tests_pass","report"]],
          ["awaiting_exam","completed","knowledge_examiner","examined",["exam_pass","review_pass"]],
          ["awaiting_exam","revision_required","knowledge_examiner","examined",["exam_fail","review_pass"]]
        ].find(g=>g[0]===snapshot.task_status&&g[1]===h.proposed_status&&(g[2]===h.from||g[2]==="knowledge_examiner"&&h.from==="technical_interviewer")&&g[3]===h.event);
        const expectedResult=h.proposed_status==="revision_required"?"fail":h.proposed_status==="in_progress"?null:"pass";
        if(!gate||expectedResult&&h.result!==expectedResult){entry.status="rejected_transition";entry.reason="invalid state/role/event/result; blocked/deferred/resume require separate human decision";}
        else {
          const proof=Object.hasOwn(verified,id)?verified[id]:null;
          const needsSha=!["assigned","revision_required"].includes(snapshot.task_status);
          const sameSha=sha(h.artifact_commit)&&h.artifact_ref===snapshot.task_ref&&proof?.artifact_commit===h.artifact_commit&&(snapshot.task_status==="in_progress"||snapshot.implementation_commit===h.artifact_commit);
          const checksOk=proof&&proof.source==="independent_operator_review"&&proof.envelope_canonical===canonical(p.envelope)&&proof.state_blob===snapshot.state_blob&&proof.control_commit===snapshot.control_commit&&typeof proof.review_ref==="string"&&proof.review_ref.trim()&&Array.isArray(proof.checks)&&gate[4].every(x=>proof.checks.includes(x));
          if(!checksOk||needsSha&&!sameSha){entry.status="needs_evidence";entry.reason="independent evidence, exact payload/state/commit binding or gate missing";}
          else {entry.status="candidate";entry.reason="manual approval only";entry.proposal={from:snapshot.task_status,to:h.proposed_status,expected_revision:snapshot.revision,expected_state_blob:snapshot.state_blob,handoff_id:id,issue_numbers:numbers,artifact_commit:h.artifact_commit};}
        }
      }
    }
    out.journal.push(entry);
  }
  out.journal.sort((a,b)=>(a.issues[0]??0)-(b.issues[0]??0));
  const candidates=out.journal.filter(x=>x.status==="candidate");
  if(candidates.length>1){for(const x of candidates){x.status="competing_proposals";x.proposal=null;x.reason="multiple candidates against one revision; reconcile manually";}}
  else if(candidates.length===1)out.proposals.push(candidates[0].proposal);
  out.status="DRY_RUN";out.ignored_count=ignored.length;out.counts=out.journal.reduce((a,x)=>(a[x.status]=(a[x.status]??0)+1,a),{});
  return out;
}
export {planConsumer};
