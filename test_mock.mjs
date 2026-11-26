import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('./web/mock.js',import.meta.url),'utf8');
const {plan,remaining,exportResult}=new Function(source+';return {plan:mockPlan,remaining:mockRemaining,exportResult:mockExport}')();
const bank=Array.from({length:24},(_,i)=>['topic'+i,'question'+i,'follow'+i,'rubric'+i]);
for(const [minutes,count] of [[30,6],[60,12],[90,18]]){
 const questions=plan(minutes,bank,()=>0.5);
 assert.equal(questions.length,count);
 assert.equal(new Set(questions.map(q=>q[0])).size,count);
}
assert.throws(()=>plan(45,bank));
assert.throws(()=>plan(90,bank.slice(0,10)));
assert.equal(remaining(1001,0),2);
assert.equal(remaining(1000,1001),0);
const result=exportResult(30,bank.slice(0,2),['answer'],0,1000);
assert.equal(result.assessment,'unassessed');
assert.equal(result.responses[0].answer,'answer');
assert.equal(result.responses[1].answer,'');
assert.ok(!JSON.stringify(result).includes('rubric'));
console.log('Mock contract PASS');
