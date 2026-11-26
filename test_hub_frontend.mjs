import {readFileSync} from "node:fs";
function checkHub(js,html,manifest,knowledge,practice,incidents,design,bank){
 const errors=[];try{new Function(js)}catch(e){errors.push(String(e))}
 const api=new Function(js.split("\n(() => {")[0]+"\nreturn {hubJoin,hubFilter,hubCounts};")();
 const rows=api.hubJoin(manifest,knowledge,practice,incidents,design,bank);
 const c=api.hubCounts(rows);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 const refs=[...js.matchAll(/by\("([^"]+)"\)/g)].map(x=>x[1]);
 for(const id of refs)if(!ids.includes(id))errors.push("missing "+id);
 const find=id=>rows.find(x=>x.id===id);
 return {counts:c,errors,checks:[
 ["syntax, static DOM IDs",errors.length===0&&new Set(ids).size===ids.length],
 ["dashboard default, catalog separate",html.includes('<section id="home" class="page">')&&html.includes('<section id="hub" class="page" hidden>')&&html.includes('<section id="overview" class="page" hidden>')&&html.includes('data-page="home" class="active"')],
 ["all 20 unique guides",c.topics===20&&c.guides===knowledge.length&&new Set(manifest.map(x=>x.id)).size===manifest.length],
 ["all practice tasks reached",c.labs===practice.length&&practice.every(p=>rows.some(r=>r.labs.some(l=>l.id===p.id)))],
 ["all questions reached",c.questions===bank.reduce((n,q)=>n+q.length-1,0)],
 ["all incidents reached",c.cases===incidents.length],
 ["all design exercises reached",c.designs===design.length],
 ["Kafka first and complete",rows[0].id==="kafka"&&find("kafka").labs.length===3&&find("kafka").cases.length===2&&find("kafka").bank[0].length===5],
 ["PostgreSQL and Patroni",find("postgres").labs.length===4&&find("patroni").labs.length===3&&find("patroni").bank.length===2],
 ["search names and concepts",api.hubFilter(rows,"kafka","").some(x=>x.id==="kafka")&&api.hubFilter(rows,"MVCC WAL","").some(x=>x.id==="postgres")],
 ["group filter",api.hubFilter(rows,"","Данные и очереди").length===5&&api.hubFilter(rows,"impossible-unmatched-12345","").length===0],
 ["source paths fixed",["/api/hub","/api/knowledge","/api/practice-catalog","/api/incidents","/api/design"].every(p=>js.includes('"'+p+'"'))],
 ["uses existing workflow",js.includes("window.academyOpenPractice(m.id)")&&js.includes('page("interview")')&&js.includes("window.academyOpenIncident(i.id)")],
 ["rubrics require own attempt",js.includes('if(!a.value.trim())')&&js.includes('result.hidden=false')],
 ["no credential or unsafe HTML",!js.includes("innerHTML")&&!js.includes("Authorization")]
 ]};
}
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const bank=new Function(read("./web/app.js").split("\nconst $=id=>")[0]+"\nreturn BANK;")();
const r=checkHub(read("./web/hub.js"),read("./web/index.html"),...["./learning/hub.json","./learning/knowledge.json","./practice/catalog.json","./learning/incidents.json","./learning/design.json"].map(p=>JSON.parse(read(p))),bank);for(const [n,ok] of r.checks)console.log((ok?"PASS ":"FAIL ")+n);console.log(r.counts);if(r.checks.some(x=>!x[1])){console.error(r.errors);process.exitCode=1;}
