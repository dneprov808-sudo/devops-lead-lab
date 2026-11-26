import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const {bank,profiles,plan,valid}=new Function(read('./web/interview-bank.js')+'\n'+read('./web/mock-v11.js')+';return {bank:INTERVIEW_PRO_BANK,profiles:V11_PROFILES,plan:v11MockPlan,valid:v11MockDraftValid}')();
for(const [name,p] of Object.entries(profiles))for(const seed of [0,0.25,0.5,0.75,0.99]){
 const selected=plan(name,bank,()=>seed);
 assert.equal(selected.length,p.size);
 assert.equal(new Set(selected.map(q=>q.id)).size,p.size);
 assert.ok(selected.filter(q=>q.level==='lead').length>=p.lead);
 assert.ok(p.must.every(t=>selected.some(q=>q.topic===t)));
 assert.ok(valid({profile:name,ids:selected.map(q=>q.id),answers:selected.map(()=>''),started:0,index:0,finished:false},bank));
}
assert.throws(()=>plan('lead',[]));
console.log('Structured mock quota contract PASS');
