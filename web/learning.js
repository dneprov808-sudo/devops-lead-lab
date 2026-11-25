function matchText(item, query){
  const q=query.trim().toLocaleLowerCase("ru-RU").split(/\s+/).filter(Boolean);
  const hay=JSON.stringify(item).toLocaleLowerCase("ru-RU");
  return q.every(w=>hay.includes(w));
}
function budget(slo,days,error){
  if(![slo,days,error].every(Number.isFinite)||slo<0||slo>=100||days<=0||error<0||error>100)throw Error("Проверь значения");
  return {minutes:days*1440*(1-slo/100),burn:error/(100-slo)};
}
function drain(lag,inRate,outRate){
  if(![lag,inRate,outRate].every(Number.isFinite)||Math.min(lag,inRate,outRate)<0)throw Error("Проверь значения");
  return lag===0?0:outRate<=inRate?null:lag/(outRate-inRate);
}
function diskTime(free,growth){
  if(![free,growth].every(Number.isFinite)||Math.min(free,growth)<0)throw Error("Проверь значения");
  return free===0?0:growth===0?null:free/growth;
}
function quorum(n){
  if(!Number.isSafeInteger(n)||n<1)throw Error("Нужно положительное целое число");
  const required=Math.floor(n/2)+1;
  return {required,tolerated:n-required};
}
function historyMatches(row,q){return matchText({module:row.module,kind:row.kind,verification:row.verification,attempt:row.attempt},q)}
(() => {
"use strict";
const by=id=>document.getElementById(id);
const txt=(id,value)=>{by(id).textContent=value};
const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n};
const button=(label,fn)=>{const b=el("button",label,"secondary");b.addEventListener("click",fn);return b};
const link=(label,url)=>{const a=el("a",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a};
async function read(path){const r=await fetch(path,{cache:"no-store"});const data=await r.json();if(!r.ok)throw Error(data.error||"Данные недоступны");return data}
let knowledge=[],incidents=[],history=null,active=null;
document.querySelectorAll("[data-open-page]").forEach(b=>b.addEventListener("click",()=>page(b.dataset.openPage)));
function renderKnowledge(){
  const rows=knowledge.filter(k=>matchText(k,by("knowledge-search").value));
  txt("knowledge-count","Найдено: "+rows.length+" / "+knowledge.length);
  by("knowledge-list").replaceChildren(...rows.map(k=>{
    const d=el("details");d.append(el("summary",k.topic+" · "+k.title),el("p",k.level,"dim"),el("h3","Как это работает"),el("p",k.concept),el("h3","Диагностические команды"),el("pre",k.commands),button("Копировать команды",()=>copy(k.commands)),el("h3","Порядок диагностики"),el("p",k.diagnosis),el("h3","Типовые ошибки"),el("p",k.pitfalls),el("h3","Вопрос для самопроверки"),el("p",k.question),button("Разобрать с наставником",()=>copy("Академия: объясни тему "+k.topic+". Задай один вопрос уровня Lead: "+k.question)),el("p"),link("Официальная документация ↗",k.source));return d;
  }));
}
by("knowledge-search").addEventListener("input",renderKnowledge);
read("/api/knowledge").then(data=>{if(!Array.isArray(data))throw Error("Неверный каталог");knowledge=data;renderKnowledge()}).catch(e=>txt("knowledge-count","BLOCKED: "+e.message));
function showIncident(){
  active=incidents.find(x=>x.id===by("incident-select").value)||null;
  if(!active)return;
  txt("incident-severity",active.severity+" · "+active.id);
  txt("incident-title",active.title);txt("incident-symptoms",active.symptoms);
  txt("incident-task",active.task);txt("incident-evidence","");txt("incident-hint","");txt("incident-debrief","");
  ["incident-evidence","incident-hint","incident-debrief"].forEach(id=>by(id).hidden=true);
  by("incident-answer").value="";txt("incident-feedback","");
}
by("incident-select").addEventListener("change",showIncident);
by("incident-random").addEventListener("click",()=>{if(!incidents.length)return;const candidates=incidents.filter(x=>x.id!==active?.id);const rows=candidates.length?candidates:incidents;by("incident-select").value=rows[Math.floor(Math.random()*rows.length)].id;showIncident()});
by("incident-evidence-button").addEventListener("click",()=>{if(active){txt("incident-evidence",active.evidence);by("incident-evidence").hidden=false}});
by("incident-hint-button").addEventListener("click",()=>{if(active){txt("incident-hint",active.hint);by("incident-hint").hidden=false}});
by("incident-debrief-button").addEventListener("click",()=>{if(!active)return;if(!by("incident-answer").value.trim()){txt("incident-feedback","Сначала запиши собственную гипотезу.");return}txt("incident-debrief",active.debrief);by("incident-debrief").hidden=false;txt("incident-feedback","Сравни свой подход с разбором. Это самообучение, не независимая оценка.")});
by("incident-copy").addEventListener("click",()=>{if(active)copy("Академия: проведи независимую проверку моего решения синтетического инцидента "+active.id+" из learning/incidents.json в academy/engineering-pro-v3. Не меняй STATE. Задавай уточнения по одному.")});
read("/api/incidents").then(data=>{if(!Array.isArray(data))throw Error("Неверный каталог");incidents=data;by("incident-select").replaceChildren(...data.map(x=>{const o=el("option",x.id+" · "+x.title);o.value=x.id;return o}));showIncident()}).catch(e=>txt("incident-feedback","BLOCKED: "+e.message));
function renderHistory(){
  if(!history)return;
  const rows=history.items.filter(r=>historyMatches(r,by("history-filter").value));
  by("history-list").replaceChildren();
  if(!rows.length)by("history-list").append(el("p","Нет записей по фильтру.","dim"));
  for(const r of rows){
    const a=el("article",undefined,"row-card");
    a.append(el("strong",r.module+" · "+r.kind),el("p",r.kind==="practice"?"Критерии: "+r.checks.length+" · Самооценка: "+(r.score??"не оценено"):"Exit code: "+r.exit_code+" · HEAD: "+r.head+" · "+(r.dirty?"dirty":"clean")),el("small",r.verification+" · "+r.attempt));
    if(/^[0-9a-f]{40}$/.test(history.commit||"")&&/^practice-results\/[A-Z0-9-]+\/[a-f0-9-]+\.json$/.test(r.path))a.append(el("p"),link("Файл на прочитанном SHA ↗","https://github.com/dneprov808-sudo/devops-lead-lab/blob/"+history.commit+"/"+r.path));
    by("history-list").append(a);
  }
}
by("history-filter").addEventListener("input",renderHistory);
by("history-load").addEventListener("click",async()=>{const b=by("history-load");b.disabled=true;history=null;by("history-list").replaceChildren();txt("history-status","Чтение отдельной ветки…");try{history=await read("/api/practice-history");txt("history-status",history.status==="empty"?"Ветка результатов ещё не существует.":"Прочитано: "+history.items.length+" · Некорректных: "+history.invalid+(history.truncated?" · Показано не более 300 файлов":"")+" · SHA "+history.commit);renderHistory()}catch(e){txt("history-status","BLOCKED: "+e.message)}finally{b.disabled=false}});
const number=id=>{const v=by(id).value;return v.trim()===""?NaN:Number(v)};
function calculate(buttonId,outId,fn){by(buttonId).addEventListener("click",()=>{try{txt(outId,fn())}catch(e){txt(outId,e.message)}})}
const fmt=n=>n.toLocaleString("ru-RU",{maximumFractionDigits:3});
calculate("calc-budget","calc-budget-result",()=>{const r=budget(number("calc-slo"),number("calc-days"),number("calc-error"));return "Бюджет: "+fmt(r.minutes)+" мин.\nBurn rate: "+fmt(r.burn)+"×"});
calculate("calc-drain","calc-drain-result",()=>{const r=drain(number("calc-lag"),number("calc-in"),number("calc-out"));return r===null?"Lag не сокращается при этих скоростях.":"Оценка: "+fmt(r)+" с ("+fmt(r/60)+" мин)"});
calculate("calc-disk","calc-disk-result",()=>{const r=diskTime(number("calc-free"),number("calc-growth"));return r===null?"При нулевом росте заполнение не прогнозируется.":"Оценка до заполнения: "+fmt(r)+" ч"});
calculate("calc-quorum","calc-quorum-result",()=>{const r=quorum(number("calc-nodes"));return "Большинство: "+r.required+"\nДопустимо отказов: "+r.tolerated});
})();
