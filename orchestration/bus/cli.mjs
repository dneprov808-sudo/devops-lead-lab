import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {canonical,parseIssue,inspectQueue,publicationDecision} from "./bus.mjs";
import {receiptBody,receiptDecision,pages} from "./transport.mjs";

const repo="dneprov808-sudo/devops-lead-lab";
const owner="dneprov808-sudo";
const base="repos/"+repo;
const output=x=>console.log(JSON.stringify(x,null,2));
function api(endpoint,{paginate=false,post=null}={}) {
  const args=["api","--hostname","github.com",endpoint];
  if(paginate)args.push("--paginate","--slurp");
  if(post!==null)args.push("--method","POST","--input","-");
  try{
    const result=JSON.parse(execFileSync("gh",args,{encoding:"utf8",input:post===null?undefined:JSON.stringify(post),stdio:["pipe","pipe","pipe"],timeout:120000,maxBuffer:32*1024*1024,env:{...process.env,GH_PROMPT_DISABLED:"1"}}));
    return paginate?pages(result):result;
  }catch{
    throw Error(post===null?"BLOCKED: GitHub read failed; no decision from incomplete data.":"BLOCKED: write outcome unknown. Retain the exact payload; inspect remote records before retrying. No automatic retry.");
  }
}
function issues(){return api(base+"/issues?state=all&per_page=100",{paginate:true}).filter(x=>!x.pull_request);}
function comments(n){return api(base+"/issues/"+n+"/comments?per_page=100",{paginate:true});}
function numberArg(s){if(!/^[1-9][0-9]*$/.test(s??"")||!Number.isSafeInteger(Number(s)))throw Error("invalid issue number");return Number(s);}
function jsonFile(p){return JSON.parse(readFileSync(p,"utf8"));}
function requireOwner(){if(api("user").login!==owner)throw Error("BLOCKED: unexpected authenticated GitHub account");}
function main(){
  const [cmd,arg,flag,...extra]=process.argv.slice(2);
  if(extra.length||!arg)throw Error("usage: inspect SNAPSHOT.json [--test] | publish ENVELOPE.json [--apply] | comments NUMBER | ack-received NUMBER [--apply]");
  requireOwner();
  if(cmd==="inspect"&&(!flag||flag==="--test")){
    output(inspectQueue(issues(),jsonFile(arg),[owner],flag==="--test"?"test":"live"));return;
  }
  if(cmd==="publish"&&(!flag||flag==="--apply")){
    const e=jsonFile(arg),d=publicationDecision(issues(),e,[owner]);
    if(d.action==="conflict")throw Error("conflicting event ID; manual reconciliation required");
    if(d.action!=="create"||flag!=="--apply"){output(d);return;}
    const created=api(base+"/issues",{post:{title:d.title,body:d.body}});
    if(!Number.isSafeInteger(created.number))throw Error("BLOCKED: missing issue number; inspect remote before retry");
    const actual=parseIssue(api(base+"/issues/"+created.number));
    if(actual.kind!=="message"||actual.author!==owner||canonical(actual.envelope)!==canonical(e))throw Error("BLOCKED: write read-back mismatch; inspect remote");
    output({action:"created",number:created.number,url:created.html_url});return;
  }
  if(cmd==="comments"&&!flag){output(comments(numberArg(arg)));return;}
  if(cmd==="ack-received"&&(!flag||flag==="--apply")){
    const n=numberArg(arg),p=parseIssue(api(base+"/issues/"+n));
    if(p.kind!=="message"||p.author!==owner||p.state!=="open")throw Error("BLOCKED: invalid/untrusted/closed inbox issue");
    const digest=createHash("sha256").update(canonical(p.envelope)).digest("hex");
    const body=receiptBody(p.envelope,digest);
    const action=receiptDecision(comments(n),body,owner);
    if(action==="conflict")throw Error("conflicting transport receipt; manual reconciliation required");
    if(action==="existing"||flag!=="--apply"){output({action,number:n,body});return;}
    const created=api(base+"/issues/"+n+"/comments",{post:{body}});
    if(receiptDecision(comments(n),body,owner)!=="existing")throw Error("BLOCKED: receipt read-back mismatch");
    output({action:"created",number:n,comment_id:created.id,url:created.html_url,receipt:"received_only"});return;
  }
  throw Error("invalid command/flag");
}
try{main();}catch(e){console.error(e.message);process.exitCode=1;}
