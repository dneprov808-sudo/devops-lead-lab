import fs from 'node:fs';
// Offline content audit. Similarity is a triage heuristic, not semantic proof.
function knowledgeAudit(bank,metadata){
 const errors=[],ids=new Set(),prompts=new Set(),urls=new Set(),hosts=new Set(),candidates=[];
 const map=new Map(metadata.records.map(x=>[x.id,x]));
 const tokens=s=>new Set(s.toLowerCase().match(/[\p{L}\p{N}_]+/gu)||[]);
 const normal=s=>s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
 const rows=bank.map(q=>{
  if(ids.has(q.id)||prompts.has(normal(q.question)))errors.push("exact duplicate "+q.id);
  ids.add(q.id);prompts.add(normal(q.question));
  const m=map.get(q.id);
  if(!m||m.source!==q.source||!m.competency_id||!["pending_independent_review","reviewed"].includes(m.review_status)||(m.review_status==="reviewed"&&!m.reviewed_at))errors.push("metadata mismatch "+q.id);
  // Pure JS lexical HTTPS check (Node URL validation is performed separately by the native CLI).
  const match=q.source.match(/^https:\/\/([a-z0-9.-]+)(?:[/?#]|$)/i);
  if(!match)errors.push("invalid URL "+q.id);else{urls.add(q.source);hosts.add(match[1].toLowerCase())}
  if(q.answer.length<100||q.rubric.length<20||q.practice.length<20)errors.push("short content "+q.id);
  return {id:q.id,topic:q.topic,words:tokens(q.question)};
 });
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const a=rows[i],b=rows[j];if(a.topic!==b.topic||Math.min(a.words.size,b.words.size)<5)continue;
  let common=0;for(const w of a.words)if(b.words.has(w))common++;
  const similarity=common/(a.words.size+b.words.size-common);
  if(similarity>=0.60)candidates.push({a:a.id,b:b.id,similarity:Math.round(similarity*100)/100});
 }
 if(metadata.schema_version!==1||map.size!==bank.length||metadata.records.length!==bank.length)errors.push("metadata count");
 return {questions:bank.length,uniqueSources:urls.size,sourceHosts:hosts.size,pendingReview:metadata.records.filter(x=>x.review_status!=="reviewed").length,versionReferenceKnown:metadata.records.filter(x=>x.technology_version).length,nearDuplicateCandidates:candidates.sort((a,b)=>b.similarity-a.similarity||a.a.localeCompare(b.a)),errors,limitations:"Lexical similarity, URL syntax and length only; no full semantic, technical or live link review."};
}

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const bank=new Function(read('../web/interview-bank.js')+';return INTERVIEW_PRO_BANK')();
const metadata=JSON.parse(read('../learning/question_metadata.json'));
const report=knowledgeAudit(bank,metadata);
for(const q of bank){try{const u=new URL(q.source);if(u.protocol!=='https:'||u.username||u.password)throw Error()}catch{report.errors.push('invalid URL '+q.id)}}
console.log(JSON.stringify(report,null,2));
if(report.errors.length)process.exitCode=1;
