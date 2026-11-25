import {canonical,validate,render,parseIssue,inspectQueue,publicationDecision} from "./bus.mjs";

function runTests() {
  const snap={control_ref:"academy/orchestration-v1",revision:1,accepted_ids:[],pending_ids:[]},authors=["operator"];
  const mk=(over={},channel="live")=>({bus_version:1,channel,handoff:{handoff_version:1,handoff_id:"daily_mentor/LAB-001/recommendation/20261126",from:"daily_mentor",to:"orchestrator",task_id:"LAB-001",event:"recommendation",observed_state_revision:1,control_ref:snap.control_ref,observed_control_commit:null,artifact_ref:"training/lead-cohort-01",artifact_commit:null,result:"not_applicable",summary:"Synthetic",evidence:[],proposed_status:null,next_action:"Review",limitations:[],...over}});
  const issue=(n,e=mk(),state="open",login="operator")=>({number:n,state,user:{login},...render(e)});
  const tests=[];
  const test=(name,fn)=>{try{if(!fn())throw Error("assertion false");tests.push({name,pass:true})}catch(e){tests.push({name,pass:false,error:String(e)})}};
  const status=(rows,s=snap)=>inspectQueue(rows,s,authors)[0]?.status;
  test("valid roundtrip",()=>parseIssue(issue(1)).kind==="message");
  test("ready only for manual review",()=>status([issue(1)])==="ready_for_review");
  test("duplicate deterministic primary",()=>{const x=inspectQueue([issue(9),issue(3)],snap,authors)[0];return x.primary===3&&x.duplicate_numbers[0]===9});
  test("same id different content quarantined",()=>status([issue(1),issue(2,mk({summary:"Different"}))])==="collision");
  test("accepted replay",()=>status([issue(1)],{...snap,accepted_ids:[mk().handoff.handoff_id]})==="already_accepted");
  test("pending replay",()=>status([issue(1)],{...snap,pending_ids:[mk().handoff.handoff_id]})==="already_pending");
  test("closed without receipt quarantined",()=>status([issue(1,mk(),"closed")])==="closed_unreconciled");
  test("stale revision",()=>status([issue(1,mk({observed_state_revision:2}))])==="stale");
  test("wrong ref",()=>status([issue(1,mk({control_ref:"main"}))])==="stale");
  test("untrusted author",()=>status([issue(1,mk(),"open","unknown")])==="untrusted");
  test("malformed message",()=>status([{...issue(1),body:"bad"}])==="invalid");
  test("test channel isolated",()=>inspectQueue([issue(1,mk({},"test"))],snap,authors).length===0);
  test("role cannot advance state",()=>validate(mk({proposed_status:"completed"})).length>0);
  test("blocked null revision",()=>status([issue(1,mk({event:"blocked",handoff_id:"daily_mentor/LAB-001/blocked/20261126",result:"blocked",observed_state_revision:null,control_ref:null}))])==="blocked_report");
  test("first publish",()=>publicationDecision([],mk(),authors).action==="create");
  test("publish retry no duplicate",()=>publicationDecision([issue(1)],mk(),authors).action==="existing");
  test("publish collision fail closed",()=>publicationDecision([issue(1,mk({summary:"Different"}))],mk(),authors).action==="conflict");
  test("snapshot unchanged",()=>{const s=canonical(snap);inspectQueue([issue(1)],snap,authors);return canonical(snap)===s});
  test("unknown snapshot fails closed",()=>{try{inspectQueue([],{},authors);return false}catch{return true}});
  test("title mismatch rejected",()=>parseIssue({...issue(1),title:"[handoff:v1] other"}).kind==="invalid");
  test("test evidence separate from live",()=>inspectQueue([issue(1,mk({},"test"))],snap,authors,"test")[0].status==="ready_for_review");
  return tests;
}
const results=runTests();for(const r of results)console.log((r.pass?"PASS ":"FAIL ")+r.name+(r.error?" — "+r.error:""));if(results.some(r=>!r.pass))process.exitCode=1;
