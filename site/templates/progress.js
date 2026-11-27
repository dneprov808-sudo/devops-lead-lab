"use strict";
// Static site backup format v1. Self-assessments are not exam results.
// Stable keys across content revisions; never import arbitrary storage keys.
const SITE_KEYS={reading:"academy-site-reading-v1",interview:"academy-site-interview-v1",theme:"academy-site-theme-v1"};
const SITE_BACKUP_LIMIT=8*1024*1024;
function siteId(value){return typeof value==="string"&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(value)&&!["__proto__","constructor","prototype"].includes(value)}
function siteObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value)}
function siteValidate(value){
  if(!siteObject(value)||value.format!=="academy-site-progress"||value.version!==1)throw Error("Неподдерживаемый формат резервной копии");
  const reading=value.reading,interview=value.interview;
  if(!siteObject(reading)||!Array.isArray(reading.seen)||reading.seen.length>100000||!reading.seen.every(siteId))throw Error("Некорректные отметки чтения");
  if(reading.last!==null&&(!siteObject(reading.last)||!siteId(reading.last.id)||!siteId(reading.last.chapter)))throw Error("Некорректная позиция чтения");
  if(!siteObject(interview)||!siteObject(interview.drafts)||!siteObject(interview.ratings))throw Error("Некорректный журнал интервью");
  const drafts=Object.create(null),ratings=Object.create(null);
  for(const [id,draft] of Object.entries(interview.drafts)){
    if(!siteId(id)||typeof draft!=="string"||draft.length>200000)throw Error("Некорректный черновик");
    drafts[id]=draft;
  }
  for(const [id,rating] of Object.entries(interview.ratings)){
    if(!siteId(id)||!["ok","review"].includes(rating))throw Error("Некорректная самооценка");
    ratings[id]=rating;
  }
  return {format:"academy-site-progress",version:1,reading:{seen:[...new Set(reading.seen)],last:reading.last?{id:reading.last.id,chapter:reading.last.chapter}:null},interview:{drafts,ratings}};
}
function siteMerge(local,incoming){
  local=siteValidate(local);incoming=siteValidate(incoming);
  const drafts=Object.assign(Object.create(null),incoming.interview.drafts,local.interview.drafts);
  const ratings=Object.assign(Object.create(null),incoming.interview.ratings,local.interview.ratings);
  let conflicts=0;
  for(const [id,value] of Object.entries(incoming.interview.drafts))if(Object.hasOwn(local.interview.drafts,id)&&local.interview.drafts[id]!==value)conflicts++;
  for(const [id,value] of Object.entries(incoming.interview.ratings))if(Object.hasOwn(local.interview.ratings,id)&&local.interview.ratings[id]!==value)conflicts++;
  return {backup:{format:local.format,version:1,reading:{seen:[...new Set([...local.reading.seen,...incoming.reading.seen])],last:local.reading.last||incoming.reading.last},interview:{drafts,ratings}},conflicts};
}
function siteRead(storage){
  return siteValidate({format:"academy-site-progress",version:1,
    reading:JSON.parse(storage.getItem(SITE_KEYS.reading)||'{"seen":[],"last":null}'),
    interview:JSON.parse(storage.getItem(SITE_KEYS.interview)||'{"drafts":{},"ratings":{}}')});
}
function siteWrite(storage,backup){
  backup=siteValidate(backup);
  const next=[[SITE_KEYS.reading,JSON.stringify(backup.reading)],[SITE_KEYS.interview,JSON.stringify(backup.interview)]];
  const old=next.map(([key])=>[key,storage.getItem(key)]);
  try{for(const [key,value] of next)storage.setItem(key,value)}
  catch(error){
    let restored=true;
    for(const [key,value] of old)try{if(value===null)storage.removeItem(key);else storage.setItem(key,value)}catch{restored=false}
    throw Error(restored?"Импорт не сохранён; прежние данные восстановлены.":"Ошибка записи; проверь журнал и исходную резервную копию.");
  }
}
function siteInit(){
  const $=id=>document.getElementById(id),status=$("site-status");
  if(!status)return;
  function message(s){status.textContent=s}
  const theme=$("site-theme");
  function applyTheme(value){
    document.documentElement.dataset.theme=value;
    theme.textContent=value==="light"?"Тёмная тема":"Светлая тема";
    theme.setAttribute("aria-pressed",String(value==="light"));
  }
  try{applyTheme(localStorage.getItem(SITE_KEYS.theme)==="light"?"light":"dark")}catch{applyTheme("dark")}
  theme.addEventListener("click",()=>{
    const value=document.documentElement.dataset.theme==="light"?"dark":"light";
    applyTheme(value);try{localStorage.setItem(SITE_KEYS.theme,value)}catch{}
  });
  $("site-export").addEventListener("click",()=>{
    try{
      const backup=siteRead(localStorage);
      const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
      if(blob.size>SITE_BACKUP_LIMIT)throw Error("Размер журнала превышает лимит импорта");
      const url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download="academy-progress.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      message("Резервная копия подготовлена. Храни её приватно: в ней есть твои ответы.");
    }catch(error){message("Экспорт недоступен: "+error.message)}
  });
  $("site-import").addEventListener("change",async event=>{
    const file=event.target.files?.[0];event.target.value="";
    if(!file)return;
    try{
      if(file.size>SITE_BACKUP_LIMIT)throw Error("Файл больше 8 MiB");
      const incoming=siteValidate(JSON.parse(await file.text()));
      const local=siteRead(localStorage),merged=siteMerge(local,incoming);
      const notice="Объединить отметки и черновики? При "+merged.conflicts+" конфликтующих полях сохранятся текущие значения. Страница перезагрузится.";
      if(!confirm(notice)){message("Импорт отменён");return}
      siteWrite(localStorage,merged.backup);
      location.reload();
    }catch(error){message("Импорт не завершён: "+error.message)}
  });
}
if(typeof document!=="undefined")siteInit();
