import {readFileSync} from "node:fs";
async function smokeHub(js,html,bank,data){
 const ids=new Map();let calledPractice=null,calledTopic=null,calledPage=null,alerts=[];
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.hidden=false;this.value="";this.textContent="";this.disabled=false}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=nodes;if(this.tag==="select")this.value=nodes[0]?.value??""}
  get options(){return this.children}
  setAttribute(){}
  addEventListener(event,fn){this.listeners[event]=fn}
  scrollIntoView(){}
  async click(){return this.listeners.click?.()}
 }
 for(const [,id] of html.matchAll(/\bid="([^"]+)"/g))ids.set(id,new Node(id==="hub-group"?"select":"div"));
 const document={getElementById:id=>ids.get(id),createElement:tag=>new Node(tag)};
 const fetch=async path=>({ok:path in data,status:path in data?200:404,json:async()=>data[path]});
 const window={academyOpenPractice:async id=>{calledPractice=id;return true},academyOpenIncident:async()=>true};
 const page=id=>{calledPage=id};const nextQuestion=()=>{calledTopic=ids.get("topic").value};
 new Function("document","fetch","window","BANK","page","nextQuestion","copy","alertMsg",readFileSync(new URL("./web/learning.js",import.meta.url),"utf8").split("\n(() => {")[0]+"\n"+js)(document,fetch,window,bank,page,nextQuestion,()=>{},x=>alerts.push(x));
 for(let i=0;i<20;i++)await Promise.resolve();
 const grid=ids.get("hub-grid"),body=ids.get("hub-detail-body");
 const walk=(n)=>[n,...n.children.flatMap(walk)];
 const findButton=(n,label)=>walk(n).find(x=>x.tag==="button"&&x.textContent===label);
 const checks=[["render 20 technology cards",grid.children.length===20]];
 const kafka=grid.children[0];await findButton(kafka,"Открыть материалы →").click();
 checks.push(["Kafka detail rendered",ids.get("hub-detail-title").textContent==="Kafka"&&body.children.length===5]);
 checks.push(["all three Kafka theory chapters rendered",walk(body.children[0]).filter(n=>n.className==="theory-chapter").length===3&&walk(body.children[0]).some(n=>n.textContent.includes("transactional outbox"))]);
 checks.push(["catalog hidden, theory visible",ids.get("hub-catalog").hidden===true&&body.children[0].hidden===false&&body.children.slice(1).every(n=>n.hidden)]);
 await ids.get("hub-detail-nav").children[1].click();
 checks.push(["practice tab isolated",body.children[1].hidden===false&&body.children.filter(n=>!n.hidden).length===1]);
 checks.push(["Kafka task and question text rendered",walk(body).some(n=>n.textContent.includes("PR-KAFKA-03"))&&walk(body).some(n=>n.textContent.includes("INC-KAFKA-01"))]);
 await findButton(body,"Выполнить и сохранить результат").click();checks.push(["practice click opens exact module",calledPractice==="PR-KAFKA-01"]);
 await findButton(body,"Запустить тренажёр: Kafka").click();checks.push(["interview click opens exact topic",calledTopic==="Kafka"&&calledPage==="interview"]);
 await ids.get("hub-detail-nav").children[2].click();
 const details=walk(body).find(n=>n.tag==="details"&&n.children[0]?.textContent.startsWith("Вопрос 1"));
 const reveal=findButton(details,"Показать критерии");const rubric=details.children.find(n=>n.className==="hub-rubric");
 await reveal.click();checks.push(["empty answer does not reveal rubric",rubric.hidden===true]);
 details.children.find(n=>n.tag==="textarea").value="synthetic answer";await reveal.click();checks.push(["nonempty answer reveals rubric",rubric.hidden===false]);
 await ids.get("hub-close").click();
 checks.push(["back restores catalog",!ids.get("hub-catalog").hidden&&ids.get("hub-detail").hidden]);
 ids.get("hub-search").value="postgresql";ids.get("hub-search").listeners.input();checks.push(["search filters cards",grid.children.length>0&&grid.children.length<20&&walk(grid).some(x=>x.textContent==="PostgreSQL")]);
 return checks;
}
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const bank=new Function(read("./web/app.js").split("\nconst $=id=>")[0]+"\nreturn BANK;")();
const data=Object.fromEntries([["/api/hub","./learning/hub.json"],["/api/knowledge","./learning/knowledge.json"],["/api/practice-catalog","./practice/catalog.json"],["/api/incidents","./learning/incidents.json"],["/api/design","./learning/design.json"]].map(([url,path])=>[url,JSON.parse(read(path))]));
const checks=await smokeHub(read("./web/hub.js"),read("./web/index.html"),bank,data);for(const [n,ok] of checks)console.log((ok?"PASS ":"FAIL ")+n);if(checks.some(x=>!x[1]))process.exitCode=1;
