function receiptBody(envelope,digest) {
  if(!envelope?.handoff?.handoff_id||!/^[a-f0-9]{64}$/.test(digest))throw Error("invalid receipt identity");
  return "<!-- academy-received:v1 -->\n"+JSON.stringify({bus_version:1,channel:envelope.channel,handoff_id:envelope.handoff.handoff_id,payload_sha256:digest,receipt:"received_only"});
}

function receiptDecision(comments,body,author) {
  if(!Array.isArray(comments))throw Error("incomplete comments");
  const marker="<!-- academy-received:v1 -->\n";
  const expected=JSON.parse(body.slice(marker.length));
  let found=false;
  for(const c of comments){
    if(c.user?.login!==author||typeof c.body!=="string"||!c.body.startsWith(marker))continue;
    let m;try{m=JSON.parse(c.body.slice(marker.length))}catch{continue}
    if(m.handoff_id!==expected.handoff_id)continue;
    if(c.body!==body)return "conflict";
    found=true;
  }
  return found?"existing":"create";
}

function pages(value) {
  if(!Array.isArray(value)||!value.every(Array.isArray))throw Error("invalid paginated API response");
  return value.flat();
}
export {receiptBody,receiptDecision,pages};
