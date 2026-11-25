function canonical(value) {
  if (Array.isArray(value)) return "["+value.map(canonical).join(",")+"]";
  if (value && typeof value==="object") return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
  return JSON.stringify(value);
}

function validate(envelope) {
  const err=[];
  const isObj=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
  const str=x=>typeof x==="string"&&x.trim().length>0;
  const nullableStr=x=>x===null||str(x);
  const sha=x=>x===null||typeof x==="string"&&/^[0-9a-f]{40}$/.test(x);
  if(!isObj(envelope)||envelope.bus_version!==1||!["live","test"].includes(envelope.channel)||!isObj(envelope.handoff)) return ["invalid envelope"];
  const h=envelope.handoff;
  const roles=["daily_mentor","knowledge_examiner","technical_interviewer","production_chaos_agent","career_intelligence","lab_engineer","code_reviewer","system_architect","student","orchestrator"];
  const events=["submitted","reviewed","examined","blocked","recommendation"];
  const results=["pass","fail","partial","blocked","not_applicable"];
  const keys=["handoff_version","handoff_id","from","to","task_id","event","observed_state_revision","control_ref","observed_control_commit","artifact_ref","artifact_commit","result","summary","evidence","proposed_status","next_action","limitations"];
  if(Object.keys(envelope).some(k=>!["bus_version","channel","handoff"].includes(k)))err.push("unknown envelope field");
  if(keys.some(k=>!Object.hasOwn(h,k))||Object.keys(h).some(k=>!keys.includes(k)))err.push("missing/unknown handoff fields");
  if(h.handoff_version!==1||!roles.includes(h.from)||h.to!=="orchestrator"||!events.includes(h.event)||!results.includes(h.result))err.push("invalid version/role/event/result");
  if(typeof h.task_id!=="string"||!/^[A-Z][A-Z0-9-]{0,63}$/.test(h.task_id))err.push("invalid task id");
  const prefix=[h.from,h.task_id,h.event].join("/")+"/";
  if(typeof h.handoff_id!=="string"||!h.handoff_id.startsWith(prefix)||!/^[A-Za-z0-9_.:-]{1,100}$/.test(h.handoff_id.slice(prefix.length)))err.push("invalid stable id");
  if(!(h.observed_state_revision===null||Number.isSafeInteger(h.observed_state_revision)&&h.observed_state_revision>=1)||!nullableStr(h.control_ref)||!sha(h.observed_control_commit)||!nullableStr(h.artifact_ref)||!sha(h.artifact_commit))err.push("invalid revision/ref/sha");
  if(h.event!=="blocked"&&(h.observed_state_revision===null||!str(h.control_ref)))err.push("non-blocked event needs state");
  if(!str(h.summary)||!str(h.next_action)||!Array.isArray(h.limitations)||!h.limitations.every(str))err.push("invalid summary/action/limitations");
  if(!Array.isArray(h.evidence)||!h.evidence.every(e=>isObj(e)&&Object.keys(e).length===3&&["commit","test_output","review","exam","source"].includes(e.kind)&&str(e.location)&&str(e.details)))err.push("invalid evidence");
  if(["pass","fail"].includes(h.result)&&(!Array.isArray(h.evidence)||h.evidence.length===0))err.push("result requires evidence");
  if(h.event==="blocked"&&(h.result!=="blocked"||h.proposed_status!==null)||h.result==="blocked"&&h.event!=="blocked")err.push("invalid blocked event");
  if(h.proposed_status!==null&&!["in_progress","awaiting_review","revision_required","awaiting_exam","completed","blocked","deferred"].includes(h.proposed_status))err.push("invalid proposed status");
  if(["daily_mentor","production_chaos_agent","career_intelligence"].includes(h.from)&&h.proposed_status!==null)err.push("role may not propose transition");
  if(h.from==="production_chaos_agent"&&!/^INC-\d{8}$/.test(h.task_id)||h.from==="career_intelligence"&&!/^MARKET-\d{8}$/.test(h.task_id))err.push("invalid parallel task id");
  if(JSON.stringify(envelope).length>24000)err.push("payload too large");
  return err;
}

function render(envelope) {
  const errors=validate(envelope);if(errors.length)throw Error(errors.join("; "));
  return {title:"[handoff:"+ (envelope.channel==="test"?"test:":"")+"v1] "+envelope.handoff.handoff_id,body:"<!-- academy-handoff:v1 -->\n```json\n"+JSON.stringify(envelope,null,2)+"\n```"};
}

function parseIssue(issue) {
  if(typeof issue?.title!=="string"||!/^\[handoff:(?:test:)?v1\] /.test(issue.title))return {kind:"ignore"};
  try {
    if(typeof issue.body!=="string"||issue.body.length>60000)throw Error("invalid body size");
    const match=issue.body.match(/^<!-- academy-handoff:v1 -->\r?\n```json\r?\n([\s\S]+)\r?\n```\s*$/);
    if(!match)throw Error("invalid envelope framing");
    const envelope=JSON.parse(match[1]);const errors=validate(envelope);if(errors.length)throw Error(errors.join("; "));
    if(render(envelope).title!==issue.title)throw Error("title/id mismatch");
    if(!Number.isSafeInteger(issue.number)||issue.number<1||!["open","closed"].includes(issue.state))throw Error("invalid issue metadata");
    if(issue.pull_request)throw Error("pull request is not an inbox issue");
    return {kind:"message",envelope,number:issue.number,state:issue.state,author:issue.user?.login??null};
  } catch(e){return {kind:"invalid",number:issue.number??null,error:String(e.message??e)};}
}

function inspectQueue(issues,snapshot,allowedAuthors,channel="live") {
  if(!Array.isArray(issues)||!snapshot||typeof snapshot.control_ref!=="string"||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<1||!Array.isArray(snapshot.accepted_ids)||!snapshot.accepted_ids.every(x=>typeof x==="string")||!Array.isArray(snapshot.pending_ids)||!snapshot.pending_ids.every(x=>typeof x==="string")||!Array.isArray(allowedAuthors)||!allowedAuthors.length||!allowedAuthors.every(x=>typeof x==="string"&&x)||!["live","test"].includes(channel))throw Error("invalid snapshot/author allowlist");
  const groups=new Map(),out=[];
  for(const issue of issues) {
    const p=parseIssue(issue);
    if(p.kind==="ignore")continue;
    if(p.kind==="invalid"){out.push({status:"invalid",numbers:[p.number],reason:p.error});continue;}
    if(p.envelope.channel!==channel)continue;
    if(!allowedAuthors.includes(p.author)){out.push({status:"untrusted",numbers:[p.number],id:p.envelope.handoff.handoff_id});continue;}
    const id=p.envelope.handoff.handoff_id;
    if(!groups.has(id))groups.set(id,[]);
    groups.get(id).push(p);
  }
  for(const [id,rows] of groups) {
    rows.sort((a,b)=>a.number-b.number);
    const first=rows[0],h=first.envelope.handoff,numbers=rows.map(x=>x.number);
    let status;
    if(new Set(rows.map(x=>canonical(x.envelope))).size!==1)status="collision";
    else if(snapshot.accepted_ids.includes(id))status="already_accepted";
    else if(snapshot.pending_ids.includes(id))status="already_pending";
    else if(rows.some(x=>x.state==="closed"))status="closed_unreconciled";
    else if(h.event==="blocked")status="blocked_report";
    else if(h.control_ref!==snapshot.control_ref||h.observed_state_revision!==snapshot.revision)status="stale";
    else status="ready_for_review";
    out.push({id,status,numbers,primary:first.number,duplicate_numbers:numbers.slice(1),handoff:h});
  }
  return out.sort((a,b)=>(a.numbers[0]??0)-(b.numbers[0]??0));
}

function publicationDecision(issues,envelope,allowedAuthors) {
  const target=render(envelope);
  const matches=issues.filter(x=>x.title===target.title);
  if(!matches.length)return {action:"create",...target};
  const parsed=matches.map(parseIssue);
  if(parsed.some(x=>x.kind!=="message"||!allowedAuthors.includes(x.author)||canonical(x.envelope)!==canonical(envelope)))return {action:"conflict",numbers:matches.map(x=>x.number)};
  return {action:"existing",numbers:matches.map(x=>x.number).sort((a,b)=>a-b)};
}

export {canonical,validate,render,parseIssue,inspectQueue,publicationDecision};
