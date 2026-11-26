"use strict";
function proNormalize(s){return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");}
function proValidate(bank){
 const fields=["id","topic","section","level","question","answer","follow_up","practice","rubric","source"];
 if(!Array.isArray(bank)||!bank.length)return false;
 const ids=new Set(),questions=new Set(),sourceNumbers=new Set();
 for(const q of bank){
  if(!q||typeof q!=="object"||!fields.every(k=>typeof q[k]==="string"&&q[k].trim())||! /^[A-Z][A-Z0-9-]*-\d{3,}$/.test(q.id)||!["middle","senior","lead"].includes(q.level)||!q.source.startsWith("https://"))return false;
  const key=proNormalize(q.question);
  if(!key||ids.has(q.id)||questions.has(key))return false;
  if(Object.hasOwn(q,"source_prompts")){
   if(!Array.isArray(q.source_prompts)||!q.source_prompts.length)return false;
   for(const item of q.source_prompts){
    if(!item||!Number.isInteger(item.number)||item.number<1||sourceNumbers.has(item.number)||typeof item.question!=="string"||!item.question.trim())return false;
    sourceNumbers.add(item.number);
   }
  }
  ids.add(q.id);questions.add(key);
 }
 return true;
}
function proFilter(bank,{topic="",section="",level="",query=""}={}){
 const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
 return bank.filter(q=>(!topic||q.topic===topic)&&(!section||q.section===section)&&(!level||q.level===level)&&terms.every(t=>[q.id,q.topic,q.section,q.question,q.follow_up,...(q.source_prompts||[]).map(p=>p.question+" источник "+p.number)].join(" ").toLowerCase().includes(t)));
}
function proMockPool(bank){return bank.map(q=>[q.topic,q.question,q.follow_up,q.rubric,q.id]);}
if(typeof document!=="undefined"){
 const root=document.getElementById("interview-pro-center");
 if(root){
 const add=(tag,t,parent=root)=>{const e=document.createElement(tag);e.textContent=t;parent.append(e);return e;};
 if(!proValidate(INTERVIEW_PRO_BANK)){add("p","Ошибка формата банка. Модуль недоступен.");}
 else{
 const bank=INTERVIEW_PRO_BANK;
 add("p",bank.length+" / 738 вопросов (700 по исходному плану + 38 дополнительных). Исходные формулировки не считаются отдельными вопросами. Старый банк сохранён.");
 const filters=add("div","");
 function select(label,values){const lab=add("label",label+" ",filters);const s=add("select","",lab);for(const v of ["",...new Set(values)]){const o=add("option",v||"Все",s);o.value=v;}return s;}
 const topic=select("Технология",bank.map(q=>q.topic)),section=select("Раздел",bank.map(q=>q.section)),level=select("Уровень",["middle","senior","lead"]);
 const lab=add("label","Поиск ",filters),search=add("input","",lab);search.type="search";search.placeholder="Термин или ID";
 const status=add("p","");status.setAttribute("role","status");
 const panel=add("article","");
 let filtered=bank,index=0,scope=null;
 const render=()=>{
  panel.replaceChildren();
  if(!filtered.length){status.textContent="Нет совпадений";return;}
  const q=filtered[index];
  status.textContent=(index+1)+" / "+filtered.length+" · "+q.id+" · "+q.level;
  add("h2",q.question,panel);
  add("p","Уточнения: "+q.follow_up,panel);
  if(q.source_prompts?.length){const details=add("details","",panel);add("summary","Формулировки из Kubernetes k8s.md ("+q.source_prompts.length+")",details);const list=add("ul","",details);for(const p of q.source_prompts)add("li","#"+p.number+" · "+p.question,list);add("p","Вопросы о личном опыте: рассказывай только о выполненных тобой работах и лабораториях, не выдавай теорию за production-опыт.",details);}
  const input=add("textarea","",panel);input.rows=5;input.setAttribute("aria-label","Самостоятельный ответ");
  if(typeof AcademyStudy!=="undefined"){input.value=AcademyStudy.read(q.id)||"";input.oninput=()=>{if(!AcademyStudy.write(q.id,input.value))notice.textContent="Черновик не сохранён: storage unavailable.";};}
  const notice=add("p","",panel);
  const reveal=add("button","Показать разбор",panel);
  reveal.onclick=()=>{if(!input.value.trim()){notice.textContent="Сначала сформулируй свой ответ.";return;}notice.textContent="Сравни свой ответ с разбором, не оценивай только по совпадению слов.";reveal.disabled=true;add("h3","Подробный ответ",panel);add("p",q.answer,panel);add("h3","Практическая проверка",panel);add("p",q.practice,panel);add("h3","Критерии и ошибки",panel);add("p",q.rubric,panel);const a=add("a","Официальная документация",panel);a.href=q.source;a.target="_blank";a.rel="noopener noreferrer";if(typeof AcademyStudy!=="undefined"){const grade=add("select","",panel);grade.setAttribute("aria-label","Самооценка");for(const n of ["",0,1,2,3,4]){const o=add("option",n===""?"Не оценено":String(n),grade);o.value=String(n)}const error=add("input","",panel);error.placeholder="Что не получилось";error.setAttribute("aria-label","Ошибка");const save=add("button","Сохранить попытку локально",panel);save.onclick=async()=>{save.disabled=true;try{const x=await AcademyStudy.save(q.id,"attempt",{question_id:q.id,answer:input.value,score:grade.value===""?null:Number(grade.value),error:error.value});notice.textContent="Сохранено · "+x.id+" · самооценка.";AcademyStudy.remove(q.id);}catch(e){notice.textContent="BLOCKED: "+e.message+"; повтори сохранение той же попытки.";save.disabled=false}}}};
  const nav=add("div","",panel);const prev=add("button","Назад",nav),next=add("button","Далее",nav);prev.disabled=index===0;next.disabled=index===filtered.length-1;prev.onclick=()=>{index--;render();};next.onclick=()=>{index++;render();};
 };
 const update=()=>{scope=null;filtered=proFilter(bank,{topic:topic.value,section:section.value,level:level.value,query:search.value});index=0;render();};
 window.academyOpenPro=ids=>{scope=new Set(ids);topic.value="";section.value="";level.value="";search.value="";filtered=bank.filter(q=>scope.has(q.id));index=0;render();page("interview-pro");};
 for(const s of [topic,section,level])s.onchange=update;search.oninput=update;render();
 }
 }
}
