import {readFileSync,writeFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
import {planConsumer} from "./consumer.mjs";
export function journalRecord(input,createdAt=new Date().toISOString()){
 const result=planConsumer(input.issues,input.snapshot,input.verified,input.options);
 if(result.writes!==0)throw Error("Read-only contract violated");
 const fingerprint=createHash("sha256").update(JSON.stringify(input)).digest("hex");
 return {schema_version:1,created_at:createdAt,input_sha256:fingerprint,mode:"dry-run",result};
}
export function saveJournal(inputPath,outputPath){
 if(statSync(inputPath).size>4*1024*1024)throw Error("Input too large");
 const entry=journalRecord(JSON.parse(readFileSync(inputPath,"utf8")));
 writeFileSync(outputPath,JSON.stringify(entry,null,2)+"\n",{flag:"wx",mode:0o600});
 return entry;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 try{if(process.argv.length!==4)throw Error("Usage: node journal.mjs INPUT.json OUTPUT.json");const j=saveJournal(process.argv[2],process.argv[3]);console.log(JSON.stringify({status:j.result.status,writes:j.result.writes,input_sha256:j.input_sha256}));if(j.result.status==="BLOCKED")process.exitCode=2}catch(e){console.error("BLOCKED: invalid input or output already exists");process.exitCode=2}
}
