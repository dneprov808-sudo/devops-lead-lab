import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const {bank,validate,filter,select,plan,exportResult}=new Function(read('./web/interview-bank.js')+'\n'+read('./web/interview-pro.js')+'\n'+read('./web/mock.js')+';return {bank:INTERVIEW_PRO_BANK,validate:proValidate,filter:proFilter,select:mockSelectPool,plan:mockPlan,exportResult:mockExport}')();
const tf=bank.filter(q=>q.topic==='Terraform');
assert.equal(tf.length,50);
assert.ok(validate(bank));
assert.ok(tf.every((q,i)=>q.id==='TF-'+String(i+1).padStart(3,'0')));
assert.ok(tf.every(q=>q.answer.length>=100&&q.practice.length>=20&&q.rubric.length>=20));
assert.equal(filter(bank,{topic:'Terraform',query:'TF-001'}).length,1);
assert.equal(filter(bank,{topic:'Terraform',section:'state'}).length,13);
assert.equal(filter(bank,{topic:'Terraform',section:'lifecycle'}).length,4);
assert.equal(filter(bank,{topic:'Terraform',level:'lead'}).length,5);
assert.equal(select('topic:Terraform',bank,[]).length,50);
assert.equal(select('pro',bank,[]).length,bank.length);
for(const [minutes,count] of [[30,6],[60,12],[90,18]]){
 for(const seed of [0,0.25,0.5,0.75,0.99]){
  const qs=plan(minutes,select('topic:Terraform',bank,[]),()=>seed);
  assert.equal(qs.length,count);
  assert.equal(new Set(qs.map(q=>q[4])).size,count);
  assert.ok(qs.every(q=>q[0]==='Terraform'));
  const result=exportResult(minutes,qs,['test'],0,1000);
  assert.equal(result.assessment,'unassessed');
  assert.equal(result.responses[0].question_id,qs[0][4]);
 }
}
console.log('Terraform interview contract PASS');
