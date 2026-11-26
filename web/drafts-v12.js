// Local-only export/import of v11 draft keys, no overwrite and no network.
function draftBackup(storage,bank){
 const prefix="academy-v11-draft:", ids=new Set(bank.map(q=>q.id)),items={};
 for(let i=0;i<storage.length;i++){
  const k=storage.key(i);if(!k?.startsWith(prefix))continue;
  const name=k.slice(prefix.length);
  if(ids.has(name)||name==="mock-active"||name.startsWith("pending:"))items[name]=JSON.parse(storage.getItem(k));
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
   const target=k.slice(8);const type=ids.has(target)?"attempt":target==="mock-active"?"mock":null;
   if(!type||v?.kind!==type||typeof v.id!=="string"||!v.data||typeof v.created_at!=="string")throw Error("Unsupported pending draft; preserve original backup manually");
   if(type==="attempt"&&(v.data.question_id!==target||typeof v.data.answer!=="string"||v.data.answer.length>12000))throw Error("Invalid pending attempt");
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
 }
}
