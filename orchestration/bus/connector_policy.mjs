function connectorDecision({title, body, role, acceptedIds, pendingIds, recent, search, limit, owner, sameRevision, isRetryUnknown=false}) {
  if(!sameRevision) return "BLOCKED_STALE";
  if(!Array.isArray(acceptedIds)||!Array.isArray(pendingIds)||!Array.isArray(recent)||!Array.isArray(search)||!Number.isSafeInteger(limit)||limit<1||recent.length>=limit||search.length>=limit||!owner)return "BLOCKED_INCOMPLETE";
  let envelope;
  try{const m=body.match(/^<!-- academy-handoff:v1 -->\n```json\n([\s\S]+)\n```\s*$/);envelope=JSON.parse(m[1]);}catch{return "BLOCKED_PAYLOAD";}
  const h=envelope?.handoff;
  if(!h||!["live","test"].includes(envelope.channel)||h.from!==role||typeof h.handoff_id!=="string"||title!==`[handoff:${envelope.channel==="test"?"test:":""}v1] ${h.handoff_id}`)return "BLOCKED_PAYLOAD";
  if(acceptedIds.includes(h.handoff_id)||pendingIds.includes(h.handoff_id))return "ALREADY_TRACKED";
  const matches=[...recent,...search].filter(x=>x.title===title);
  // Candidate records must be hydrated by direct issue read, not search snippets.
  if(matches.some(x=>x.hydrated!==true||!Number.isSafeInteger(x.number)||x.author!==owner||x.body!==body))return "BLOCKED_CONFLICT";
  if(matches.length)return "REUSE";
  if(isRetryUnknown)return "BLOCKED_UNKNOWN_WRITE";
  return "CREATE_ONCE";
}

function deliveryDecision(expected,actual,owner) {
  if(!actual||actual.hydrated!==true||!Number.isSafeInteger(actual.number)||actual.number<1||actual.author!==owner||actual.title!==expected.title||actual.body!==expected.body||actual.state!=="open")return "UNCONFIRMED";
  return "DELIVERED";
}
export {connectorDecision,deliveryDecision};
