import {readFileSync} from "node:fs";
function checkSource(app,html){
 const errors=[];
 try{new Function(app)}catch(e){errors.push("syntax: "+String(e))}
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 const references=[...app.matchAll(/(?:\$\(|text\()"([^"]+)"/g)].map(x=>x[1]);
 if(new Set(ids).size!==ids.length)errors.push("duplicate ids");
 for(const id of new Set(references))if(!ids.includes(id))errors.push("missing id "+id);
 const run=new Function(app.split("\nconst $=id=>")[0]+`\nreturn {reviewRecord,reviewOrder,questionLevel,BANK};`)();
 const checks=[
 ["JS syntax / DOM IDs",errors.length===0],
 ["32 questions across 16 topics",run.BANK.length===16&&run.BANK.every(x=>x.length===3)],
 ["interval 0",run.reviewRecord("x",0,new Date("2026-11-26T12:00:00Z")).due.slice(0,10)==="2026-11-27"],
 ["interval 4",run.reviewRecord("x",4,new Date("2026-11-26T12:00:00Z")).due.slice(0,10)==="2026-12-10"],
 ["adaptive level",run.questionLevel({score:3})===1&&run.questionLevel({score:2})===0],
 ["due priority",run.reviewOrder([{score:0,due:"2030-01-01"},{score:4,due:"2020-01-01"}],new Date("2026-11-26"))[0].score===4],
 ["invalid rating rejected",(()=>{try{run.reviewRecord("x",5);return false}catch{return true}})()]
 ];
 return {checks,errors};
}
const r=checkSource(readFileSync(new URL("./web/app.js",import.meta.url),"utf8"),readFileSync(new URL("./web/index.html",import.meta.url),"utf8"));for(const [name,ok] of r.checks)console.log((ok?"PASS ":"FAIL ")+name);if(r.checks.some(x=>!x[1])){console.error(r.errors);process.exitCode=1;}
