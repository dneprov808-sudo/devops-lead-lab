import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {journalRecord,saveJournal} from "./journal.mjs";
const a=journalRecord({issues:[],snapshot:null,verified:{},options:{}});
assert.equal(a.result.status,"BLOCKED");assert.equal(a.result.writes,0);assert.equal(a.input_sha256.length,64);
const dir=mkdtempSync(join(tmpdir(),"academy-journal-"));
try{const i=join(dir,"input.json"),o=join(dir,"journal.json");writeFileSync(i,JSON.stringify({issues:[],snapshot:null}));saveJournal(i,o);assert.equal(JSON.parse(readFileSync(o)).result.writes,0);assert.throws(()=>saveJournal(i,o));}finally{rmSync(dir,{recursive:true,force:true})}
