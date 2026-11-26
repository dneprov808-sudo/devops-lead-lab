// Pure work-queue planner. Never writes canonical STATE or GitHub.
export function planQueue(snapshot,consumer){
 const sha=s=>typeof s==="string"&&/^[a-f0-9]{40}$/.test(s);
 if(!snapshot||snapshot.control_ref!=="academy/orchestration-v1"||!sha(snapshot.control_commit)||!sha(snapshot.state_blob)||!Number.isSafeInteger(snapshot.revision)||!consumer||consumer.status==="BLOCKED"||consumer.writes!==0||consumer.revision!==snapshot.revision||consumer.state_blob!==snapshot.state_blob||!Array.isArray(consumer.journal)||!Array.isArray(consumer.proposals))return {status:"BLOCKED",queue:[],writes:0,reason:"Incomplete or stale snapshot/consumer"};
 const tasks={assigned:["student","Implement active lab independently"],in_progress:["student","Submit implementation SHA, original test evidence and report"],revision_required:["student","Correct independently after review"],awaiting_review:["code_reviewer","Check exact implementation and original tests"],awaiting_exam:["knowledge_examiner","Independently examine learner"],completed:["orchestrator","Review next roadmap task"],blocked:["orchestrator","Resolve documented blocker"],deferred:["orchestrator","Review explicit deferral"]};
 if(!tasks[snapshot.task_status]||typeof snapshot.task_id!=="string")return {status:"BLOCKED",queue:[],writes:0};
 const conflicts=consumer.journal.filter(x=>["collision","competing_proposals","quarantined","stale","needs_evidence","closed_unreconciled"].includes(x.status));
 const binding={task_id:snapshot.task_id,revision:snapshot.revision,state_blob:snapshot.state_blob,control_commit:snapshot.control_commit};
 let queue=[];
 for(const row of conflicts)queue.push({...binding,role:"orchestrator",action:"Reconcile "+row.status,handoff_id:row.handoff_id,blocking:true});
 if(consumer.proposals.length>1)return {status:"BLOCKED",queue,writes:0,reason:"Multiple candidates"};
 if(consumer.proposals.length===1)queue.push({...binding,role:"orchestrator",action:"Independently approve or reject candidate; no automatic transition",handoff_id:consumer.proposals[0].handoff_id,blocking:true});
 if(!queue.length){const [role,action]=tasks[snapshot.task_status];queue.push({...binding,role,action,blocking:false});}
 return {status:"review_required",queue,writes:0};
}
