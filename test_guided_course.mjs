import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const source=read("./site/templates/course.js");
const course=JSON.parse(read("./learning/course.json"));
const guides=JSON.parse(read("./learning/knowledge.json"));
const manifest=JSON.parse(read("./learning/hub.json"));
const labs=JSON.parse(read("./practice/catalog.json"));
const html=read("./site/templates/course.html");
const runbooks=[...read("./web/index.html").matchAll(/<article class="deploy-card" id="([^"]+)">([\s\S]*?)<\/article>/g)].map(([,id,markup])=>({id,title:id,intro:"Synthetic DOM test",result:"Synthetic result",steps:[...markup.matchAll(/<div class="deploy-command"><h4>([^<]*)<\/h4><pre>([\s\S]*?)<\/pre>/g)].map(([,title,code])=>({title,code}))}));
const data={course,guides,manifest,labs,runbooks};
const api=new Function(source+"\nreturn {courseRoute,courseReading,courseStart,courseMark,courseStats,courseLag,courseBudget,courseReadiness,courseScenario};")();
const route=api.courseRoute(data),topics=course.modules.flatMap(m=>m.topics),n=guides.flatMap(g=>g.chapters).length;
assert.equal(course.modules.length,10);
assert.equal(new Set(topics.map(t=>t.id)).size,guides.length);
assert.deepEqual([...topics.map(t=>t.id)].sort(),guides.map(g=>g.id).sort());
assert.equal(route.length,n+3*guides.length);
assert.equal(new Set(route.map(s=>s.id)).size,route.length);
assert.equal(route[0].id,"intro:linux");
for(const t of topics){
  const steps=route.filter(s=>s.topic.id===t.id);
  assert.equal(steps[0].kind,"intro");
  assert.equal(steps.at(-2).kind,"scenario");
  assert.equal(steps.at(-1).kind,"practice");
  assert.equal(steps.filter(s=>s.kind==="chapter").length,guides.find(g=>g.id===t.id).chapters.length);
  const order=steps.filter(s=>s.chapter).map(s=>["foundation","senior","lead"].indexOf(s.chapter.level));
  assert.ok(order.every((v,i)=>i===0||v>=order[i-1]));
  assert.ok(t.overview.length>=3&&t.walkthrough.length>=3);
  assert.ok(t.practice.runbook===null||runbooks.some(r=>r.id===t.practice.runbook));
  assert.equal(t.scenario.feedback.length,t.scenario.choices.length);
  assert.ok(api.courseScenario(t.scenario,t.scenario.correct).correct);
  assert.equal(api.courseScenario(t.scenario,-1),null);
}
assert.ok(topics.flatMap(t=>[...t.overview,...t.walkthrough]).join(" ").split(/\s+/).length>=4000);
const empty=api.courseReading("bad JSON");
assert.deepEqual(empty,{seen:[],last:null});
assert.equal(api.courseStart(route,empty,null),0);
const first=route[1],marked=api.courseMark(empty,first);
assert.deepEqual(marked.seen,[first.chapter.id]);
assert.equal(api.courseMark(marked,first).seen.length,1);
assert.deepEqual(api.courseMark(marked,route[0]),marked);
assert.deepEqual(api.courseStats(route,marked),{total:n,done:1});
assert.equal(api.courseStart(route,marked,"missing"),2);
assert.equal(api.courseStart(route,marked,"scenario:linux"),route.findIndex(s=>s.id==="scenario:linux"));
assert.equal(api.courseLag(800,620,5),54000);
assert.equal(api.courseLag(100,200,10),0);
assert.deepEqual(api.courseBudget(100000,150,99.9),{allowed:100,spent:150,success:99.85});
assert.equal(api.courseReadiness([true,false,true]),2);
assert.equal(api.courseReadiness([false,false,false]),0);

// Run the actual UI source with a minimal DOM double. No browser APIs or shell execution.
class Node {
  constructor(tag="div"){this.tag=tag;this.children=[];this.attributes={};this.style={};this.listeners={};this._text="";this.disabled=false;this.hidden=false;}
  set textContent(v){this._text=String(v);this.children=[]}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join("")}
  append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n)}}
  replaceChildren(...nodes){this.children=[];this._text="";this.append(...nodes)}
  setAttribute(k,v){this.attributes[k]=String(v)}
  addEventListener(k,fn){this.listeners[k]=fn}
  focus(){}
  scrollIntoView(){}
  click(){if(!this.disabled)return this.listeners.click?.()}
}
const walk=n=>[n,...n.children.flatMap(walk)];
const button=(n,text)=>walk(n).find(x=>x.tag==="button"&&x.textContent===text);
const classNode=(n,cls)=>walk(n).find(x=>x.className===cls);
const store=new Map();
const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
let clipboard="";
const navigator={clipboard:{writeText:async text=>{clipboard=text}}};
function init(){
  const ids=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(([,id])=>[id,new Node()]));
  ids.dataset.textContent=JSON.stringify(data);
  const meter=new Node();meter.append(ids["course-meter"]);
  ids["course-storage"].textContent="";
  const document={getElementById:id=>ids[id],createElement:tag=>new Node(tag)};
  new Function("document","localStorage","navigator",source)(document,localStorage,navigator);
  return ids;
}
let ui=init(),root=ui["course-content"],weeks=ui["course-weeks"];
assert.ok(root.textContent.includes("Linux / Bash"));
assert.equal(walk(root).filter(x=>x.className==="course-walk-step").length,3);
assert.equal(ui["course-count"].textContent,"0 / "+n);
button(ui["course-nav"],"Следующий шаг →").click();
assert.ok(root.textContent.includes(first.chapter.explanation));
button(root,"Следующая часть →").click();
assert.ok(root.textContent.includes(first.chapter.production));
button(root,"Следующая часть →").click();
assert.ok(root.textContent.includes(first.chapter.question));
await button(root,"Копировать").click();
assert.equal(clipboard,first.chapter.commands);
button(root,"Отметить ознакомление и продолжить →").click();
assert.equal(ui["course-count"].textContent,"1 / "+n);
assert.equal(JSON.parse(store.get("academy-site-reading-v1")).seen[0],first.chapter.id);
assert.equal(store.get("academy-site-course-position-v1"),route[2].id);
ui=init();root=ui["course-content"];weeks=ui["course-weeks"];
assert.ok(root.textContent.includes(route[2].chapter.title));
button(weeks,"Самопроверка").click();
const q=topics.find(t=>t.id==="linux").scenario;
assert.ok(button(root,"К практике →").disabled);
button(root,q.choices.find((_,i)=>i!==q.correct)).click();
assert.ok(button(root,"К практике →").disabled);
button(root,q.choices[q.correct]).click();
assert.ok(!button(root,"К практике →").disabled);
assert.ok(root.textContent.includes(q.feedback[q.correct]));
button(root,"К практике →").click();
assert.ok(walk(root).some(x=>x.href?.includes("training/lead-cohort-01/labs/01-http-probe/README.md")));
assert.ok(root.textContent.includes("Критерий результата"));
assert.equal(ui["course-count"].textContent,"1 / "+n);
button(weeks,guides.find(g=>g.id==="k8s").topic).click();
const pods=classNode(root,"course-model-grid");
assert.ok(classNode(root,"course-model-result").textContent.includes("3/3"));
pods.children[0].click();
assert.ok(classNode(root,"course-model-result").textContent.includes("2/3"));
button(weeks,guides.find(g=>g.id==="kafka").topic).click();
assert.ok(classNode(root,"course-model-result").textContent.replace(/\s/g,"").includes("54000"));
const sliders=walk(root).filter(x=>x.tag==="input"&&x.type==="range");
sliders[1].value="900";sliders[1].listeners.input();
assert.ok(classNode(root,"course-model-result").textContent.includes("lag: 0"));
button(weeks,guides.find(g=>g.id==="terraform").topic).click();
assert.ok(button(root,"Применить сохранённый plan").disabled);
const desired=walk(root).find(x=>x.tag==="input"&&x.type==="range");
desired.value="3";desired.listeners.input();
button(root,"Рассчитать plan").click();
assert.ok(classNode(root,"course-model-result").textContent.includes("update 2 → 3"));
button(root,"Применить сохранённый plan").click();
assert.ok(classNode(root,"course-model-result").textContent.includes("Факт: 3"));
button(weeks,guides.find(g=>g.id==="sre").topic).click();
const bad=walk(root).find(x=>x.tag==="input"&&x.type==="range");
bad.value="150";bad.listeners.input();
assert.ok(classNode(root,"course-model-result").textContent.includes("150%"));
assert.ok(classNode(root,"course-model-result").textContent.includes("SLO нарушен"));
assert.equal(ui["course-count"].textContent,"1 / "+n);
console.log("Guided course PASS: "+route.length+" steps, "+n+" original chapters, "+topics.length+" scenarios; actual UI handlers and four models exercised.");
