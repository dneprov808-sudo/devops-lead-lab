import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const source=read('./web/interview-bank.js');
const {bank,validate,filter,select,plan,exportResult}=new Function(source+'\n'+read('./web/interview-pro.js')+'\n'+read('./web/mock.js')+';return {bank:INTERVIEW_PRO_BANK,validate:proValidate,filter:proFilter,select:mockSelectPool,plan:mockPlan,exportResult:mockExport}')();
const expected={
  "Kubernetes": 138,
  "Linux": 60,
  "Networking": 50,
  "Terraform": 50,
  "CI/CD & GitOps": 60,
  "Docker": 40,
  "Ansible": 44,
  "Observability": 40,
  "Kafka": 30,
  "PostgreSQL & Patroni": 35,
  "Redis": 20,
  "Helm": 25,
  "SRE & Incident Management": 35,
  "DevSecOps": 30,
  "System Design & Platform Engineering": 45,
  "Leadership": 36
};
assert.equal(bank.length,738);
assert.ok(validate(bank));
assert.equal(new Set(bank.map(q=>q.topic)).size,Object.keys(expected).length);
assert.ok(bank.every(q=>q.answer.length>=100&&q.practice.length>=20&&q.rubric.length>=20));
for(const [topic,count] of Object.entries(expected)){
 assert.equal(filter(bank,{topic}).length,count);
 const pool=select('topic:'+topic,bank,[]);
 assert.equal(pool.length,count);
 for(const [minutes,size] of [[30,6],[60,12],[90,18]])for(const seed of [0,0.5,0.99]){
  const chosen=plan(minutes,pool,()=>seed);
  assert.equal(chosen.length,size);
  assert.equal(new Set(chosen.map(q=>q[4])).size,size);
  assert.ok(chosen.every(q=>q[0]===topic));
  const result=exportResult(minutes,chosen,['answer'],0,1000);
  assert.equal(result.assessment,'unassessed');
  assert.equal(result.responses[0].question_id,chosen[0][4]);
  assert.ok(result.responses.every(q=>!Object.hasOwn(q,'rubric')));
 }
}
console.log('Complete 738-question bank contract PASS');
