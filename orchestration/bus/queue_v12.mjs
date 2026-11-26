// Read-only planner: live Consumer results only, never an authority to transition STATE.
export function planQueue(snapshot,consumer){
 const sha=s=>typeof s==="string"&&/^[a-f0-9]{40}$/.test(s);
 const blocked=reason=>({status:"BLOCKED",queue:[],writes:0,reason});
 if(!snapshot||snapshot.control_ref!=="academy/orchestration-v1"||!sha(snapshot.control_commit)||!sha(snapshot.state_blob)||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<1||!consumer||consumer.mode!=="dry-run"||consumer.channel!=="live"||consumer.status!=="DRY_RUN"||consumer.writes!==0||consumer.revision!==snapshot.revision||consumer.state_blob!==snapshot.state_blob||consumer.control_commit!==snapshot.control_commit||consumer.task_id!==snapshot.task_id||consumer.task_status!==snapshot.task_status||!Array.isArray(consumer.journal)||!Array.isArray(consumer.proposals))return blocked("Incomplete, test-only or stale snapshot/consumer");
 const tasks={assigned:["student","Implement active lab independently"],in_progress:["student","Submit implementation SHA, original test evidence and report"],revision_required:["student","Correct independently after review"],awaiting_review:["code_reviewer","Check exact implementation and original tests"],awaiting_exam:["knowledge_examiner","Independently examine learner"],completed:["orchestrator","Review next roadmap task"],blocked:["orchestrator","Resolve documented blocker"],deferred:["orchestrator","Review explicit deferral"]};
 if(!Object.hasOwn(tasks,snapshot.task_status)||typeof snapshot.task_id!=="string"||!snapshot.task_id.trim())return blocked("Unknown task");
 const actionStatuses=new Set(["collision","competing_proposals","quarantined","stale","needs_evidence","closed_unreconciled","blocked_report","review_only","already_pending","rejected_transition"]);
 const passive=new Set(["already_accepted","candidate"]);
 const ids=new Set();
 for(const row of consumer.journal){
  if(!row||typeof row.handoff_id!=="string"||!row.handoff_id||ids.has(row.handoff_id)||!actionStatuses.has(row.status)&&!passive.has(row.status))return blocked("Unknown or duplicate journal entry");
  ids.add(row.handoff_id);
 }
 const candidates=consumer.journal.filter(x=>x.status==="candidate");
 if(candidates.length!==consumer.proposals.length||candidates.length>1)return blocked("Inconsistent candidate list");
 const binding={task_id:snapshot.task_id,revision:snapshot.revision,state_blob:snapshot.state_blob,control_commit:snapshot.control_commit};
 const queue=consumer.journal.filter(x=>actionStatuses.has(x.status)).map(row=>({...binding,role:"orchestrator",action:"Reconcile "+row.status,handoff_id:row.handoff_id,blocking:true}));
 if(candidates.length===1){
  const p=consumer.proposals[0],row=candidates[0];
  if(!p||p.handoff_id!==row.handoff_id||p.expected_revision!==snapshot.revision||p.expected_state_blob!==snapshot.state_blob||p.from!==snapshot.task_status||!Object.hasOwn(tasks,p.to)||JSON.stringify(p)!==JSON.stringify(row.proposal))return blocked("Candidate binding mismatch");
  queue.push({...binding,role:"orchestrator",action:"Independently approve or reject candidate; no automatic transition",handoff_id:p.handoff_id,blocking:true});
 }
 if(!queue.length){const [role,action]=tasks[snapshot.task_status];queue.push({...binding,role,action,blocking:false});}
 return {status:"review_required",queue,writes:0};
}
