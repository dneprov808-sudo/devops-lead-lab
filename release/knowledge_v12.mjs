import fs from "node:fs";
function v12Quality(bank,metadata){
 const words=s=>s.toLowerCase().match(/[\p{L}\p{N}_]+/gu)||[];
 const norm=s=>words(s).join(" ");
 const grams=s=>{const w=words(s);return new Set(w.slice(1).map((x,i)=>w[i]+" "+x))};
 const ids=new Set(),sources=new Set(),errors=[],exactAnswer=[],seen=new Map(),candidates=[],rows=[];
 const m=new Map(metadata.records.map(x=>[x.id,x]));
 for(const q of bank){
  if(ids.has(q.id)||!m.has(q.id))errors.push(q.id);ids.add(q.id);sources.add(q.source);
  const key=norm(q.answer);if(seen.has(key))exactAnswer.push([seen.get(key),q.id]);else seen.set(key,q.id);
  rows.push({id:q.id,topic:q.topic,grams:grams(q.question),answerWords:words(q.answer).length,review:m.get(q.id)?.review_status||"missing"});
 }
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const a=rows[i],b=rows[j];if(Math.min(a.grams.size,b.grams.size)<3)continue;
  let n=0;for(const g of a.grams)if(b.grams.has(g))n++;
  const score=n/(a.grams.size+b.grams.size-n);
  if(score>=.42)candidates.push({a:a.id,b:b.id,cross_topic:a.topic!==b.topic,score:Math.round(score*100)/100});
 }
 return {questions:bank.length,unique_sources:sources.size,exact_answer_matches:exactAnswer,phrase_candidates:candidates.sort((a,b)=>b.score-a.score||a.a.localeCompare(b.a)),short_answer_triage:rows.filter(x=>x.answerWords<30).map(x=>x.id),pending_review:rows.filter(x=>x.review!=="reviewed").length,errors,limitations:"All records checked mechanically; phrase similarity is not semantic verification. Technical review and URL reachability separate."};
}

const read=p=>fs.readFileSync(new URL(p,import.meta.url),"utf8");
const bank=new Function(read("../web/interview-bank.js")+";return INTERVIEW_PRO_BANK")();
const result=v12Quality(bank,JSON.parse(read("../learning/question_metadata.json")));
console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;
