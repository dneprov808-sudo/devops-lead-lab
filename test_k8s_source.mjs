import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const {bank,validate,filter,pool,plan}=new Function(read('./web/interview-bank.js')+'\n'+read('./web/interview-pro.js')+'\n'+read('./web/mock.js')+';return {bank:INTERVIEW_PRO_BANK,validate:proValidate,filter:proFilter,pool:proMockPool,plan:mockPlan}')();
const k8s=bank.filter(q=>q.topic==='Kubernetes');
assert.equal(k8s.length,138);
assert.ok(validate(bank));
assert.ok(k8s.every((q,i)=>q.id==='K8S-'+String(i+1).padStart(3,'0')));
const prompts=k8s.flatMap(q=>(q.source_prompts||[]).map(p=>({...p,id:q.id}))).sort((a,b)=>a.number-b.number);
assert.equal(prompts.length,126);
assert.ok(prompts.every((p,i)=>p.number===i+1));
let hash=2166136261;
for(const ch of prompts.map(p=>p.number+':'+p.question).join('\n'))hash=Math.imul(hash^ch.codePointAt(0),16777619)>>>0;
assert.equal(hash.toString(16).padStart(8,'0'),'598b370e');
for(const p of prompts)assert.ok(filter(bank,{query:p.question}).some(q=>q.id===p.id));
const first=bank.find(q=>q.source_prompts?.length);
assert.equal(validate([{...first,source_prompts:[{number:1,question:''}]}]),false);
assert.equal(validate([{...first,source_prompts:[{number:1,question:'a'},{number:1,question:'b'}]}]),false);
for(const duration of [30,60,90]){
 const items=plan(duration,pool(k8s),()=>0.5);
 assert.equal(new Set(items.map(x=>x[4])).size,items.length);
}
console.log('Kubernetes source mapping PASS');
