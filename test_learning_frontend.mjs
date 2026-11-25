import {readFileSync} from "node:fs";
function checkLearning(js,html,knowledge,incidents,design){
 const errors=[];try{new Function(js)}catch(e){errors.push(String(e))}
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 const refs=[...js.matchAll(/(?:by|txt)\("([^"]+)"/g)].map(x=>x[1]);
 for(const id of refs)if(!ids.includes(id))errors.push("missing "+id);
 const m=new Function(js.split("\n(() => {")[0]+"\nreturn {matchText,budget,drain,diskTime,quorum,historyMatches};")();
 const reject=fn=>{try{fn();return false}catch{return true}};
 const unique=(rows,n)=>rows.length===n&&new Set(rows.map(x=>x.id)).size===n;
 return {errors,checks:[
 ["JS syntax / DOM ids",errors.length===0&&ids.length===new Set(ids).size],
 ["20 substantial knowledge guides",unique(knowledge,20)&&knowledge.every(x=>["concept","commands","diagnosis","pitfalls","question","source"].every(k=>typeof x[k]==="string"&&x[k].length>15)&&x.source.startsWith("https://"))],
 ["17 scenarios with distinct IDs",unique(incidents,17)&&incidents.every(x=>["symptoms","evidence","hint","task","debrief"].every(k=>typeof x[k]==="string"&&x[k].length>10)&&knowledge.some(k=>k.id===x.topic))],
 ["5 architecture exercises",unique(design,5)&&design.every(x=>x.requirements.length===4&&x.deliverables.length===3&&x.rubric.length===4)],
 ["multi-word search",m.matchText({topic:"PostgreSQL",concept:"MVCC WAL"},"postgresql wal")&&!m.matchText({topic:"Kafka"},"wal")],
 ["budget",Math.abs(m.budget(99.9,30,1).minutes-43.2)<1e-8&&Math.abs(m.budget(99.9,30,1).burn-10)<1e-8],
 ["invalid SLO",reject(()=>m.budget(100,30,1))&&reject(()=>m.budget(99.9,0,1))],
 ["lag",m.drain(100000,800,1200)===250],
 ["lag cannot drain",m.drain(100,100,100)===null&&m.drain(0,100,100)===0],
 ["invalid rates",reject(()=>m.drain(1,-1,2))],
 ["disk",m.diskTime(50,5)===10&&m.diskTime(5,0)===null],
 ["quorum",m.quorum(5).required===3&&m.quorum(5).tolerated===2&&m.quorum(4).tolerated===1],
 ["invalid quorum",reject(()=>m.quorum(0))&&reject(()=>m.quorum(2.5))],
 ["history filter",m.historyMatches({module:"PR-PG-01",kind:"practice",verification:"self_reported",attempt:"x"},"pg self")],
 ["debrief guarded",js.includes('if(!by("incident-answer").value.trim())')&&js.includes('by("incident-debrief").hidden=false')],
 ["no innerHTML or browser Git token",!js.includes("innerHTML")&&!js.includes("Authorization")]
 ]};
}
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const r=checkLearning(read("./web/learning.js"),read("./web/index.html"),JSON.parse(read("./learning/knowledge.json")),JSON.parse(read("./learning/incidents.json")),JSON.parse(read("./learning/design.json")));for(const [name,ok] of r.checks)console.log((ok?"PASS ":"FAIL ")+name);if(r.checks.some(x=>!x[1])){console.error(r.errors);process.exitCode=1;}
