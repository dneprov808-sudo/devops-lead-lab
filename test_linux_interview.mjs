import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const {bank,validate,filter,select,plan,exportResult}=new Function(read('./web/interview-bank.js')+'\n'+read('./web/interview-pro.js')+'\n'+read('./web/mock.js')+';return {bank:INTERVIEW_PRO_BANK,validate:proValidate,filter:proFilter,select:mockSelectPool,plan:mockPlan,exportResult:mockExport}')();
const linux=bank.filter(q=>q.topic==='Linux');
assert.equal(linux.length,60);
assert.ok(validate(bank));
assert.ok(linux.every((q,i)=>q.id==='LNX-'+String(i+1).padStart(3,'0')));
assert.ok(linux.every(q=>q.answer.length>=100&&q.practice.length>=20&&q.rubric.length>=20));
assert.equal(filter(bank,{topic:'Linux',query:'LNX-001'}).length,1);
assert.equal(filter(bank,{topic:'Linux',section:'systemd'}).length,9);
assert.ok(filter(bank,{topic:'Linux',level:'lead'}).length>0);
const legacy=[['legacy','question','follow','rubric']];
assert.equal(select('legacy',bank,legacy),legacy);
assert.equal(select('pro',bank,legacy).length,bank.length);
assert.equal(select('topic:Linux',bank,legacy).length,60);
assert.equal(select('topic:Kubernetes',bank,legacy).length,138);
assert.throws(()=>select('invalid',bank,legacy));
assert.throws(()=>plan(30,select('topic:unknown',bank,legacy)));
for(const [minutes,count] of [[30,6],[60,12],[90,18]]){
 for(const topic of ['Linux','Kubernetes']){
  const questions=plan(minutes,select('topic:'+topic,bank,legacy),()=>0.5);
  assert.equal(questions.length,count);
  assert.equal(new Set(questions.map(q=>q[4])).size,count);
  assert.ok(questions.every(q=>q[0]===topic));
  const result=exportResult(minutes,questions,['test'],0,1000);
  assert.equal(result.assessment,'unassessed');
  assert.equal(result.responses[0].question_id,questions[0][4]);
 }
}
console.log('Linux interview and topic selection PASS');
