(() => {
"use strict";
const by=id=>document.getElementById(id);
const txt=(id,value)=>{by(id).textContent=value};
const element=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;return n};
const KEY="academy-practice-v2";
let catalog=[], current=null, draft=null, labAttempt=null, busy=false;
function store(){
  const raw=JSON.parse(localStorage.getItem(KEY)||"{}");
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Локальное хранилище повреждено; не отправляю результат.");
  return raw;
}
function persist(value){
  const data=store();data[value.payload.module]=value;
  localStorage.setItem(KEY,JSON.stringify(data));
}
function payload(){
  return {kind:"practice",attempt:draft.payload.attempt,module:current.id,
          checks:Array.from(by("practice-checks").querySelectorAll("input:checked"),x=>Number(x.value)),
          score:by("practice-score").value===""?null:Number(by("practice-score").value)};
}
function fresh(id){return {payload:{kind:"practice",attempt:crypto.randomUUID(),module:id,checks:[],score:null},frozen:false,result:null}}
function update(){
  if(!current||!draft)return;
  if(!draft.frozen){
    draft.payload=payload();
    try{persist(draft)}catch(e){txt("practice-status","Не удалось сохранить черновик в браузере: "+e.message)}
  }
}
function showResult(id,result){
  const box=by(id);box.replaceChildren(element("span",(result.status==="saved"?"Сохранено":"Уже сохранено")+" · проверено чтением GitHub · "+result.commit.slice(0,12)+" "));
  const a=element("a","Открыть результат ↗");
  a.href="https://github.com/dneprov808-sudo/devops-lead-lab/blob/"+result.commit+"/"+result.path;
  a.target="_blank";a.rel="noopener noreferrer";box.append(a);
}
function display(){
  const frozen=draft.frozen||busy;
  by("practice-checks").querySelectorAll("input").forEach(x=>x.disabled=frozen);
  by("practice-score").disabled=frozen;
  by("practice-save").disabled=busy||!!draft.result;
  by("practice-save").textContent=draft.result?"Результат сохранён":draft.frozen?"Проверить / повторить тот же результат":"Сохранить результат → commit + push";
  by("practice-new").disabled=busy||(draft.frozen&&!draft.result);
  if(draft.result)showResult("practice-status",draft.result);
  else if(draft.frozen)txt("practice-status","Сохранение не подтверждено. Повтори только исходную попытку или проверь ветку вручную.");
}
function open(m){
  if(busy)return;
  try{
    const previous=store()[m.id];
    draft=previous||fresh(m.id);
    if(draft.payload.module!==m.id||!Array.isArray(draft.payload.checks))throw Error("Неверный локальный черновик");
    current=m;persist(draft);
    txt("practice-title",m.id+" · "+m.title);txt("practice-meta",m.topic+" · "+m.level+" · "+m.minutes+" мин");
    txt("practice-command",m.command);txt("practice-enter",m.enter);
    by("practice-tasks").replaceChildren(...m.tasks.map(t=>element("li",t)));
    by("practice-checks").replaceChildren(...m.evidence.map((e,i)=>{
      const l=element("label");l.className="check";
      const c=element("input");c.type="checkbox";c.value=String(i);c.checked=draft.payload.checks.includes(i);
      c.addEventListener("change",update);l.append(c,document.createTextNode(" "+e));return l;
    }));
    by("practice-score").value=draft.payload.score===null?"":String(draft.payload.score);
    by("practice-docs").href=m.docs;
    by("practice-detail").hidden=false;txt("practice-status","");display();
    by("practice-detail").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){txt("practice-status","BLOCKED: "+e.message);by("practice-detail").hidden=false;by("practice-save").disabled=true}
}
async function post(data){
  const session=await fetch("/api/session",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Нет локальной сессии");return r.json()});
  const response=await fetch("/api/practice-save",{method:"POST",headers:{"Content-Type":"application/json","X-Academy-CSRF":session.csrf},body:JSON.stringify(data)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||"Сохранение не подтверждено");
  if(!["saved","already_saved"].includes(result.status)||!/^[a-f0-9]{40}$/.test(result.commit)||!/^practice-results\/[A-Z0-9-]+\/[a-f0-9-]+\.json$/.test(result.path))throw Error("Ответ не подтверждает доставку");
  return result;
}
by("practice-score").addEventListener("change",update);
by("copy-practice").addEventListener("click",()=>copy(by("practice-command").textContent));
by("practice-new").addEventListener("click",()=>{
  if(!current||busy||draft.frozen&&!draft.result)return;
  if(!confirm("Создать новую попытку? Предыдущие отправленные результаты останутся в GitHub."))return;
  try{draft=fresh(current.id);persist(draft);open(current)}catch(e){txt("practice-status","BLOCKED: "+e.message)}
});
by("practice-save").addEventListener("click",async()=>{
  if(!current||!draft||busy||draft.result)return;
  try{
    if(!draft.frozen){
      draft.payload=payload();
      if(!confirm("Отправить только отмеченные критерии и самооценку в приватный репозиторий?"))return;
      draft.frozen=true;
    }
    persist(draft); // save stable attempt/payload before network
    busy=true;display();txt("practice-status","Создаю коммит, отправляю и проверяю результат…");
    draft.result=await post(draft.payload);
    try{persist(draft)}catch{ /* remote is already verified */ }
    showResult("practice-status",draft.result);
  }catch(e){txt("practice-status","BLOCKED / DELIVERY_UNKNOWN: "+e.message+" · Не создавай новый ID.")}
  finally{busy=false;display()}
});
window.academyLabResult=result=>{
  labAttempt=result?.save_attempt||null;
  by("save-lab-result").disabled=!labAttempt;
  txt("save-lab-status",labAttempt?"Можно отправить только метаданные теста, без логов и исходного кода.":"");
};
by("save-lab-result").addEventListener("click",async()=>{
  if(!labAttempt)return;
  if(!confirm("Сохранить фактический exit code, HEAD, dirty flag и хеш лога? Исходники и сырой лог не отправляются."))return;
  const attempt=labAttempt;by("save-lab-result").disabled=true;
  try{txt("save-lab-status","Сохранение…");showResult("save-lab-status",await post({kind:"lab_test",attempt}))}
  catch(e){txt("save-lab-status","BLOCKED / DELIVERY_UNKNOWN: "+e.message);if(labAttempt===attempt)by("save-lab-result").disabled=false}
});
fetch("/api/practice-catalog",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Каталог недоступен");return r.json()}).then(data=>{
  if(!Array.isArray(data))throw Error("Некорректный каталог");
  catalog=data;by("practice-list").replaceChildren(...catalog.map(m=>{
    const card=element("article");card.className="row-card";card.append(element("strong",m.id+" · "+m.title),element("p",m.topic+" · "+m.level+" · "+m.minutes+" мин"));
    const b=element("button","Открыть практику");b.className="secondary";b.addEventListener("click",()=>open(m));card.append(b);return card;
  }))
}).catch(e=>{by("practice-list").append(element("p","BLOCKED: "+e.message))});
})();
