import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const {backup,restore}=new Function(read('./web/mock-v11.js')+'\n'+read('./web/drafts-v12.js')+';return {backup:draftBackup,restore:restoreDrafts}')();
function storage(){const m=new Map();return {get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
const s=storage(),t=storage(),bank=[{id:'Q-001'}];
s.setItem('academy-v11-draft:Q-001',JSON.stringify('private'));
const b=backup(s,bank);
assert.equal(restore(t,bank,b).restored,1);
assert.equal(restore(t,bank,b).existing,1);
assert.equal(t.getItem('academy-v11-draft:Q-001'),'"private"');
assert.throws(()=>restore(t,bank,{...b,items:{'Q-001':'different'}}));
assert.throws(()=>restore(t,bank,{...b,items:{unknown:'x'}}));
const pending={id:'00000000-0000-4000-8000-000000000001',kind:'lead_case',created_at:'2026-01-01T00:00:00Z',data:{case_id:'LEAD-SIM-01',choice:'A',rationale:'private'}};
s.setItem('academy-v11-draft:pending:LEAD-SIM-01',JSON.stringify(pending));
assert.equal(restore(t,bank,backup(s,bank)).restored,1);
assert.equal(t.getItem('academy-v11-draft:pending:LEAD-SIM-01'),JSON.stringify(pending));
assert.throws(()=>restore(storage(),bank,{schema_version:1,kind:'academy_drafts',items:{'pending:LEAD-SIM-02':pending}}));
console.log('Draft backup contract PASS');
