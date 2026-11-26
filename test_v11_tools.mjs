import assert from 'node:assert/strict';
import fs from 'node:fs';
const {capacity,market}=new Function(fs.readFileSync(new URL('./web/tools-v11.js',import.meta.url),'utf8')+';return {capacity:v11Capacity,market:v11Market}')();
assert.deepEqual(capacity(12000,500,75,3,2000,200),{perZone:16,total:48,remainingCapacity:12000,restoreSeconds:10000});
for(const args of [[0,500,75,3,1,1],[100,0,75,3,1,1],[100,100,101,3,1,1],[100,100,75,1,1,1]])assert.throws(()=>capacity(...args));
assert.equal(market([{kind:'vacancy',data:{topics:['Kubernetes']}},{kind:'portfolio',data:{topic:'Linux'}}],['Linux','Kubernetes'])[0].mentions,1);
console.log('v11 design and career models PASS');
