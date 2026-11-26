import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const {bank,validate,filter,select,plan,exportResult}=new Function(read('./web/interview-bank.js')+'\n'+read('./web/interview-pro.js')+'\n'+read('./web/mock.js')+';return {bank:INTERVIEW_PRO_BANK,validate:proValidate,filter:proFilter,select:mockSelectPool,plan:mockPlan,exportResult:mockExport}')();
const topic='CI/CD & GitOps', ci=bank.filter(q=>q.topic===topic);
assert.equal(ci.length,60);
assert.ok(validate(bank));
assert.ok(ci.every((q,i)=>q.id==='CICD-'+String(i+1).padStart(3,'0')));
assert.ok(ci.every(q=>q.answer.length>=100&&q.practice.length>=20&&q.rubric.length>=20));
assert.equal(filter(bank,{topic,query:'CICD-001'}).length,1);
assert.equal(filter(bank,{topic,section:'gitlab'}).length,10);
assert.equal(filter(bank,{topic,section:'jenkins'}).length,10);
assert.equal(filter(bank,{topic,section:'github-actions'}).length,8);
assert.equal(filter(bank,{topic,section:'gitops'}).length,10);
assert.equal(filter(bank,{topic,level:'lead'}).length,12);
assert.equal(select('topic:'+topic,bank,[]).length,60);
assert.equal(select('pro',bank,[]).length,bank.length);
for(const [minutes,count] of [[30,6],[60,12],[90,18]]){
 for(const seed of [0,0.25,0.5,0.75,0.99]){
  const qs=plan(minutes,select('topic:'+topic,bank,[]),()=>seed);
  assert.equal(qs.length,count);
  assert.equal(new Set(qs.map(q=>q[4])).size,count);
  assert.ok(qs.every(q=>q[0]===topic));
  const result=exportResult(minutes,qs,['test'],0,1000);
  assert.equal(result.assessment,'unassessed');
  assert.equal(result.responses[0].question_id,qs[0][4]);
 }
}
console.log('CI/CD and GitOps interview contract PASS');
