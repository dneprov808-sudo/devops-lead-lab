"use strict";
function proNormalize(s){return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");}
function proValidate(bank){
 const fields=["id","topic","section","level","question","answer","follow_up","practice","rubric","source"];
 if(!Array.isArray(bank)||!bank.length)return false;
 const ids=new Set(),questions=new Set();
 for(const q of bank){
  if(!q||typeof q!=="object"||!fields.every(k=>typeof q[k]==="string"&&q[k].trim())||! /^[A-Z][A-Z0-9-]*-\d{3,}$/.test(q.id)||!["middle","senior","lead"].includes(q.level)||!q.source.startsWith("https://"))return false;
  const key=proNormalize(q.question);
  if(!key||ids.has(q.id)||questions.has(key))return false;
  ids.add(q.id);questions.add(key);
 }
 return true;
}
function proFilter(bank,{topic="",section="",level="",query=""}={}){
 const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
 return bank.filter(q=>(!topic||q.topic===topic)&&(!section||q.section===section)&&(!level||q.level===level)&&terms.every(t=>[q.id,q.topic,q.section,q.question,q.follow_up].join(" ").toLowerCase().includes(t)));
}
function proMockPool(bank){return bank.map(q=>[q.topic,q.question,q.follow_up,q.rubric,q.id]);}
if(typeof document!=="undefined"){
 const root=document.getElementById("interview-pro-center");
 if(root){
 const add=(tag,t,parent=root)=>{const e=document.createElement(tag);e.textContent=t;parent.append(e);return e;};
 if(!proValidate(INTERVIEW_PRO_BANK)){add("p","Ошибка формата банка. Модуль недоступен.");}
 else{
 const bank=INTERVIEW_PRO_BANK;
 add("p",bank.length+" / 700 новых вопросов. Старый банк сохранён. Ответы для обучения, не подтверждение компетенций.");
 const filters=add("div","");
 function select(label,values){const lab=add("label",label+" ",filters);const s=add("select","",lab);for(const v of ["",...new Set(values)]){const o=add("option",v||"Все",s);o.value=v;}return s;}
 const topic=select("Технология",bank.map(q=>q.topic)),section=select("Раздел",bank.map(q=>q.section)),level=select("Уровень",["middle","senior","lead"]);
 const lab=add("label","Поиск ",filters),search=add("input","",lab);search.type="search";search.placeholder="Термин или ID";
 const status=add("p","");status.setAttribute("role","status");
 const panel=add("article","");
 let filtered=bank,index=0;
 const render=()=>{
  panel.replaceChildren();
  if(!filtered.length){status.textContent="Нет совпадений";return;}
  const q=filtered[index];
  status.textContent=(index+1)+" / "+filtered.length+" · "+q.id+" · "+q.level;
  add("h2",q.question,panel);
  add("p","Уточнения: "+q.follow_up,panel);
  const input=add("textarea","",panel);input.rows=5;input.setAttribute("aria-label","Самостоятельный ответ");
  const notice=add("p","",panel);
  const reveal=add("button","Показать разбор",panel);
  reveal.onclick=()=>{if(!input.value.trim()){notice.textContent="Сначала сформулируй свой ответ.";return;}notice.textContent="Сравни свой ответ с разбором, не оценивай только по совпадению слов.";reveal.disabled=true;add("h3","Подробный ответ",panel);add("p",q.answer,panel);add("h3","Практическая проверка",panel);add("p",q.practice,panel);add("h3","Критерии и ошибки",panel);add("p",q.rubric,panel);const a=add("a","Официальная документация",panel);a.href=q.source;a.target="_blank";a.rel="noopener noreferrer";};
  const nav=add("div","",panel);const prev=add("button","Назад",nav),next=add("button","Далее",nav);prev.disabled=index===0;next.disabled=index===filtered.length-1;prev.onclick=()=>{index--;render();};next.onclick=()=>{index++;render();};
 };
 const update=()=>{filtered=proFilter(bank,{topic:topic.value,section:section.value,level:level.value,query:search.value});index=0;render();};
 for(const s of [topic,section,level])s.onchange=update;search.oninput=update;render();
 }
 }
}
