// Local-only backup, collision-safe restore and explicit retry of validated pending records.
function pendingDraftKind(target,ids){return ids.has(target)?"attempt":target==="mock-active"?"mock":["design","vacancy","portfolio"].includes(target)?target:/^LEAD-SIM-(0[1-9]|1[0-2])$/.test(target)?"lead_case":null}
function draftBackup(storage,bank){
 const prefix="academy-v11-draft:", ids=new Set(bank.map(q=>q.id)),items={};
 for(let i=0;i<storage.length;i++){
  const k=storage.key(i);if(!k?.startsWith(prefix))continue;
  const name=k.slice(prefix.length);
  if(ids.has(name)||name==="mock-active"||(name.startsWith("pending:")&&pendingDraftKind(name.slice(8),ids)))items[name]=JSON.parse(storage.getItem(k));
 }
 return {schema_version:1,kind:"academy_drafts",items};
}
function restoreDrafts(storage,bank,backup){
 if(!backup||backup.schema_version!==1||backup.kind!=="academy_drafts"||!backup.items||Array.isArray(backup.items)||typeof backup.items!=="object")throw Error("Invalid draft backup");
 const ids=new Set(bank.map(q=>q.id)),entries=Object.entries(backup.items),prefix="academy-v11-draft:";
 if(entries.length>2*bank.length+20||JSON.stringify(backup).length>4*1024*1024)throw Error("Draft backup too large");
 const writes=[];
 for(const [k,v] of entries){
  if(ids.has(k)){if(typeof v!=="string"||v.length>12000)throw Error("Invalid question draft")}
  else if(k==="mock-active"){if(!v11MockDraftValid(v,bank))throw Error("Invalid mock draft")}
  else if(k.startsWith("pending:")){
   const target=k.slice(8);const type=pendingDraftKind(target,ids);
   if(!type||v?.kind!==type||typeof v.id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v.id)||!v.data||Array.isArray(v.data)||typeof v.data!=="object"||typeof v.created_at!=="string"||!Number.isFinite(Date.parse(v.created_at)))throw Error("Unsupported pending draft; preserve original backup manually");
   if(type==="attempt"&&(v.data.question_id!==target||typeof v.data.answer!=="string"||v.data.answer.length>12000))throw Error("Invalid pending attempt");
   if(type==="lead_case"&&(v.data.case_id!==target||typeof v.data.rationale!=="string"||v.data.rationale.length>6000))throw Error("Invalid pending leadership case");
   if(type==="mock"&&(!Array.isArray(v.data.responses)||!v.data.responses.length||v.data.responses.length>36||v.data.responses.some(x=>!ids.has(x.question_id)||typeof x.answer!=="string"||x.answer.length>12000)))throw Error("Invalid pending mock");
  }else throw Error("Unknown draft key");
  const key=prefix+k,encoded=JSON.stringify(v),old=storage.getItem(key);
  if(old!==null&&old!==encoded)throw Error("Draft conflict: "+k);
  if(old===null)writes.push([key,encoded]);
 }
 const done=[];
 try{for(const [key,value] of writes){storage.setItem(key,value);done.push(key)}}catch(e){for(const k of done)storage.removeItem(k);throw e}
 return {restored:done.length,existing:entries.length-done.length};
}
if(typeof document!=="undefined"){
 const root=document.getElementById("v12-drafts");if(root){
  const add=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;root.append(e);return e};
  const input=add("textarea","");input.rows=5;input.setAttribute("aria-label","Локальная копия черновиков");
  const status=add("p","Черновики и незавершённые отправки содержат приватные ответы.");
  add("button","Экспорт черновиков").onclick=()=>{try{input.value=JSON.stringify(draftBackup(localStorage,INTERVIEW_PRO_BANK),null,2);status.textContent="Скопируй в приватный файл, вне Git."}catch(e){status.textContent=e.message}};
  add("button","Восстановить черновики").onclick=()=>{try{const x=restoreDrafts(localStorage,INTERVIEW_PRO_BANK,JSON.parse(input.value));status.textContent=JSON.stringify(x)+"; перезагрузи страницу."}catch(e){status.textContent=e.message}};
  const pendingList=add("select","");pendingList.setAttribute("aria-label","Незавершённая отправка");
  function pendingOptions(){pendingList.replaceChildren();try{for(const [key,value] of Object.entries(draftBackup(localStorage,INTERVIEW_PRO_BANK).items)){if(key.startsWith("pending:")){const o=document.createElement("option");o.value=key;o.textContent=key+" · "+value.id;pendingList.append(o)}}}catch(e){status.textContent=e.message}}
  add("button","Показать незавершённые отправки").onclick=pendingOptions;
  add("button","Повторить выбранную отправку").onclick=async()=>{try{const key=pendingList.value;if(!key)throw Error("Нет записи");const value=AcademyStudy.read(key);if(!value)throw Error("Запись отсутствует");if(!confirm("Сохранить исходную неизменённую запись локально?"))return;await AcademyStudy.request("/api/v11/event",value);AcademyStudy.remove(key);status.textContent="Сохранено · "+value.id+"; перезагрузи страницу.";pendingOptions()}catch(e){status.textContent=e.message}};
 }
}
