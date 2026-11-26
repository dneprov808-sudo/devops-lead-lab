// Canonical question IDs; legacy bank remains a separate compatibility view.
function hubProQuestions(id,bank){
 const topics={kafka:["Kafka"],postgres:["PostgreSQL & Patroni"],patroni:["PostgreSQL & Patroni"],redis:["Redis"],k8s:["Kubernetes","Helm"],docker:["Docker"],terraform:["Terraform"],ansible:["Ansible"],cicd:["CI/CD & GitOps"],git:["CI/CD & GitOps"],linux:["Linux"],net:["Networking"],prom:["Observability"],logs:["Observability"],sre:["SRE & Incident Management"],dr:["System Design & Platform Engineering"],security:["DevSecOps"],lead:["Leadership","System Design & Platform Engineering"]};
 return bank.filter(q=>{
  if(!(topics[id]||[]).includes(q.topic))return false;
  if(id==="postgres")return q.section!=="patroni";
  if(id==="patroni")return q.section==="patroni";
  if(id==="logs")return q.section==="telemetry";
  return true;
 });
}
function hubJoin(manifest,knowledge,practice,incidents,design,bank,proBank=[]){
  return manifest.map(m=>({
    ...m,guide:knowledge.find(k=>k.id===m.id)||null,
    labs:practice.filter(p=>m.profiles.includes(p.profile)),
    cases:incidents.filter(i=>i.topic===m.id),
    designs:design.filter(d=>m.designs.includes(d.id)),
    bank:bank.filter(q=>m.questions.includes(q[0])),
    proQuestions:hubProQuestions(m.id,proBank)
  }));
}
function hubFilter(rows,query,group){
  const words=query.toLocaleLowerCase("ru-RU").trim().split(/\s+/).filter(Boolean);
  return rows.filter(row=>{
    if(group&&row.group!==group)return false;
    // Search questions and symptoms, not hidden answers.
    const hay=JSON.stringify([row.title,row.group,row.aliases,row.guide,row.labs,row.cases.map(x=>[x.title,x.symptoms]),row.designs,row.bank.map(q=>[q[0],...q.slice(1).map(x=>x[0])]),row.proQuestions.map(q=>[q.id,q.question,q.section])]).toLocaleLowerCase("ru-RU");
    return words.every(w=>hay.includes(w));
  });
}
function hubCounts(rows){
  const unique=arr=>new Set(arr).size;
  return {topics:rows.length, guides:unique(rows.flatMap(x=>x.guide?[x.guide.id]:[])),
    chapters:unique(rows.flatMap(x=>(x.guide?.chapters||[]).map(c=>c.id))),
    labs:unique(rows.flatMap(x=>x.labs.map(a=>a.id))),
    cases:unique(rows.flatMap(x=>x.cases.map(a=>a.id))),
    designs:unique(rows.flatMap(x=>x.designs.map(a=>a.id))),
    questions:unique(rows.flatMap(x=>x.bank.flatMap(q=>q.slice(1).map((_,i)=>q[0]+":"+i)))),proQuestions:unique(rows.flatMap(x=>x.proQuestions.map(q=>q.id)))};
}
(() => {
"use strict";
const by=id=>document.getElementById(id);
const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n};
const btn=(name,fn,cls="secondary")=>{const b=el("button",name,cls);b.type="button";b.addEventListener("click",fn);return b};
const link=(name,url)=>{const a=el("a",name);if(typeof url==="string"&&url.startsWith("https://"))a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a};
const list=(items,tag="ul")=>{const n=el(tag);for(const x of items)n.append(el("li",x));return n};
const block=(title,items)=>{const d=el("div",undefined,"hub-block");d.append(el("h3",title),...items);return d};
const details=(title,children)=>{const d=el("details",undefined,"hub-fold");d.append(el("summary",title),...children);return d};
let rows=[],chosen=null,loadGeneration=0;
const sections=[["theory","Теория и команды"],["practice","Практические задания"],["interview","Собеседования"],["incidents","Инциденты"],["design","Архитектура"]];
function updateGrid(){
 const matched=hubFilter(rows,by("hub-search").value,by("hub-group").value);
 by("hub-grid").replaceChildren();
 for(const row of matched){
   const c=el("article",undefined,"hub-tile");
   const top=el("div",undefined,"hub-tile-top");
   top.append(el("span",row.mark,"hub-mark"),el("span",row.group,"hub-category"));
   c.append(top,el("h3",row.title),el("p",row.guide?.title||"Справочник недоступен","dim"));
   const meta=el("div",undefined,"hub-counts");
   for(const [n,s] of [[row.guide?.chapters?.length||0,"глав"],[row.labs.length,"практик"],[row.proQuestions.length||row.bank.reduce((a,q)=>a+q.length-1,0),"вопросов"],[row.cases.length,"кейсов"]])meta.append(el("span",n+" "+s));
   c.append(meta,btn("Открыть материалы →",()=>openTopic(row),"hub-open"));
   by("hub-grid").append(c);
 }
 if(!matched.length)by("hub-grid").append(el("p","По запросу ничего не найдено. Измени поиск или направление.","dim"));
}
function showTopicSection(id){
 const index=sections.findIndex(s=>s[0]===id);
 if(index<0)return;
 const buttons=by("hub-detail-nav").children;
 const panels=by("hub-detail-body").children;
 for(let i=0;i<sections.length;i++){
   panels[i].hidden=i!==index;
   buttons[i].setAttribute("aria-pressed",String(i===index));
 }
}
function closeTopic(){
 by("hub-detail").hidden=true;
 by("hub-catalog").hidden=false;
 chosen=null;
}
function openTopic(row){
 chosen=row;
 by("hub-catalog").hidden=true;
 by("hub-detail").hidden=false;
 by("hub-detail-meta").textContent=row.group+" / "+row.mark;
 by("hub-detail-title").textContent=row.title;
 by("hub-detail-nav").replaceChildren(...sections.map(([id,name])=>btn(name,()=>showTopicSection(id))));
 const target=by("hub-detail-body");target.replaceChildren();
 const section=(id,title,children)=>{const d=block(title,children);d.id="hub-section-"+id;target.append(d)};
 const k=row.guide;
 const lesson=k?.lesson;
 const intro=lesson?details("Проверить себя — один вопрос",(()=>{const q=lesson.quiz;const feedback=el("p","Выбери вариант ответа.","dim");feedback.setAttribute("role","status");return [el("p",q.question),...q.options.map((option,i)=>btn(option,()=>{feedback.textContent=(i===q.correct?"Верно. ":"Не совсем. ")+q.explanation;})),feedback,el("p","Это самопроверка, результат не влияет на оценку компетенции.","dim")];})()):null;
 section("theory","01 · Теория и команды",k?[
   el("p",k.level,"dim"),el("h3",k.title),theoryChapters(k,el,btn,link,copy),...(lesson?[el("h4","Как это работает"),el("p",lesson.intro),el("h4","Пример из работы"),el("p",lesson.example),intro]:[]),details("Подробнее: техническая теория",[el("p",k.concept)]),...(k.deep?[details("Под капотом и в production",[el("h4","Внутреннее устройство"),el("p",k.deep.internals),el("h4","Эксплуатация"),el("p",k.deep.production)])]:[]),el("h4","Диагностические команды"),el("pre",k.commands),btn("Копировать команды",()=>copy(k.commands)),el("h4","Порядок диагностики"),el("p",k.diagnosis),el("h4","Типичные ошибки"),el("p",k.pitfalls),el("h4","Вопрос уровня Lead"),el("p",k.question),link("Официальная документация ↗",k.source)
 ]:[el("p","Справочник не загружен.")]);
 section("practice","02 · Практические задания ("+row.labs.length+")",row.labs.length?row.labs.map(m=>details(m.id+" · "+m.title,[
   el("p",m.level+" · "+m.minutes+" мин","dim"),el("h4","Локальный запуск (проверь Docker context)"),el("pre",m.command),btn("Копировать запуск",()=>copy(m.command)),el("pre",m.enter),el("h4","Задание"),list(m.tasks,"ol"),el("h4","Критерии результата"),list(m.evidence),link("Документация ↗",m.docs),
   btn("Выполнить и сохранить результат",async()=>{if(!window.academyOpenPractice||!await window.academyOpenPractice(m.id))alertMsg("Практика недоступна или выполняется сохранение. Повтори после загрузки.")},"hub-open")
 ])):[el("p","Отдельного задания на готовом Docker-стенде пока нет. Используй теорию, вопросы и архитектурные упражнения; для Linux/HTTP доступна основная LAB-001.","dim")]);
 section("interview","03 · Собеседования",row.proQuestions.length?[el("p",row.proQuestions.length+" вопросов Interview Pro; старый тренажёр сохранён отдельно."),btn("Открыть Interview Pro по технологии",()=>window.academyOpenPro(row.proQuestions.map(q=>q.id)),"hub-open"),...row.proQuestions.slice(0,5).map(q=>btn(q.id+" · "+q.question,()=>window.academyOpenPro([q.id])))]:row.bank.length?row.bank.flatMap(q=>[
   btn("Запустить тренажёр: "+q[0],()=>{by("topic").value=q[0];nextQuestion();page("interview")},"hub-open"),
   ...q.slice(1).map(([question,rubric],i)=>{
     const a=el("textarea");a.rows=3;a.placeholder="Сформулируй ответ самостоятельно (не сохраняется)";a.setAttribute("aria-label","Ответ на вопрос "+(i+1));
     const hint=el("p",rubric,"hub-rubric");hint.hidden=true;
     const notice=el("p",undefined,"dim");notice.setAttribute("role","status");
     return details("Вопрос "+(i+1)+" · "+question,[a,btn("Показать критерии",()=>{if(!a.value.trim()){notice.textContent="Сначала ответь самостоятельно.";return}hint.hidden=false;notice.textContent="Самопроверка, не подтверждённая оценка."}),notice,hint])
   })
 ]):[el("p","Нет отдельного банка вопросов. Используй Lead-вопрос справочника.","dim")]);
 section("incidents","04 · Диагностика инцидентов ("+row.cases.length+")",row.cases.length?row.cases.map(i=>{
   const a=el("textarea");a.rows=4;a.placeholder="Что могло сломаться? Как проверишь, устранишь проблему и убедишься в восстановлении?";a.setAttribute("aria-label","Ответ на "+i.id);
   const ev=el("pre",i.evidence);ev.hidden=true;
   const hint=el("p",i.hint);hint.hidden=true;
   const result=el("div",i.debrief,"pro-debrief");result.hidden=true;
   const note=el("p",undefined,"dim");note.setAttribute("role","status");
   return details(i.id+" · "+i.title,[el("p",i.severity+" · синтетический кейс","dim"),el("p",i.symptoms),btn("Показать диагностические данные",()=>{ev.hidden=!ev.hidden}),ev,el("p",i.task),a,btn("Подсказка",()=>{hint.hidden=!hint.hidden}),hint,btn("Сравнить с разбором",()=>{if(!a.value.trim()){note.textContent="Сначала сформулируй гипотезу.";return}result.hidden=false;note.textContent="Синтетический разбор. Не независимая оценка."}),note,result,btn("Открыть отдельный Incident Lab",async()=>{if(!window.academyOpenIncident||!await window.academyOpenIncident(i.id))alertMsg("Сценарий ещё не загружен.")})]);
 }):[el("p","Отдельного инцидента пока нет. Изучи порядок диагностики из справочника.","dim")]);
 section("design","05 · Проектирование систем ("+row.designs.length+")",row.designs.length?row.designs.map(d=>details(d.id+" · "+d.title,[
   el("p",d.scope,"dim"),el("h4","Требования"),list(d.requirements),el("h4","Артефакты"),list(d.deliverables),el("h4","Критерии защиты"),list(d.rubric),
   btn("Копировать запрос архитектурной защиты",()=>copy("Академия: проведи архитектурную защиту "+d.id+" по learning/design.json ветки academy/stable. Не раскрывай готовый ответ, задавай по одному вопросу, не меняй STATE."))
 ])):[el("p","Архитектурных упражнений пока нет.","dim")]);
 showTopicSection("theory");
 by("hub-detail").scrollIntoView({behavior:"auto",block:"start"});
}
async function fetchArray(path){const r=await fetch(path,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);const data=await r.json();if(!Array.isArray(data))throw Error("Invalid catalog");return data}
async function load(){
 const generation=++loadGeneration;
 by("hub-reload").disabled=true;by("hub-status").textContent="Чтение локальных файлов…";
 const urls=["/api/hub","/api/knowledge","/api/practice-catalog","/api/incidents","/api/design"];
 try{
   const results=await Promise.allSettled(urls.map(fetchArray));
   if(generation!==loadGeneration)return;
   if(results[0].status!=="fulfilled")throw Error("Не удалось загрузить карту технологий (/api/hub). Проверь версию сервера.");
   const data=results.map(r=>r.status==="fulfilled"?r.value:[]);
   rows=hubJoin(...data,typeof BANK==="undefined"?[]:BANK,typeof INTERVIEW_PRO_BANK==="undefined"?[]:INTERVIEW_PRO_BANK);
   const group=by("hub-group"),old=group.value;
   const option=(name,value)=>{const n=el("option",name);n.value=value;return n};
   group.replaceChildren(option("Все направления",""),...[...new Set(rows.map(x=>x.group))].map(x=>option(x,x)));
   if([...group.options].some(o=>o.value===old))group.value=old;
   updateGrid();
   const c=hubCounts(rows),missing=results.flatMap((r,i)=>r.status==="rejected"?[urls[i]]:[]);
   by("hub-status").textContent=(missing.length?"Частичная загрузка · отсутствует "+missing.join(", ")+" · ":"Готово · ")+c.topics+" технологий · "+c.chapters+" глав · "+c.guides+" справочников · "+c.labs+" практик · "+(c.proQuestions?c.proQuestions+" вопросов Pro + "+c.questions+" legacy":c.questions+" уникальных вопросов")+" · "+c.cases+" инцидентов · "+c.designs+" архитектурных кейсов";
   if(chosen)closeTopic();
 }catch(e){rows=[];by("hub-grid").replaceChildren();closeTopic();by("hub-status").textContent="BLOCKED: "+e.message+" Проверь /api/version и перезапусти python3 portal.py."}
 finally{if(generation===loadGeneration)by("hub-reload").disabled=false}
}
by("hub-search").addEventListener("input",updateGrid);
by("hub-group").addEventListener("change",updateGrid);
by("hub-reload").addEventListener("click",load);
by("hub-close").addEventListener("click",()=>{closeTopic();by("hub-grid").scrollIntoView({behavior:"auto",block:"start"})});
load();
})();
