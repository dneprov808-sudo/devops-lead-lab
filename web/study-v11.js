// Local study API. Raw answers are never sent to GitHub by this module.
const AcademyStudy=(()=>{
 const prefix="academy-v11-draft:";
 const read=(key)=>{try{return JSON.parse(localStorage.getItem(prefix+key)||"null")}catch{return null}};
 const write=(key,value)=>{try{localStorage.setItem(prefix+key,JSON.stringify(value));return true}catch{return false}};
 const remove=key=>{try{localStorage.removeItem(prefix+key)}catch{}};
 async function request(path,data){
  let options={cache:"no-store"};
  if(data!==undefined){
   const session=await fetch("/api/session",{cache:"no-store"});
   if(!session.ok)throw Error("Local session unavailable");
   options={method:"POST",headers:{"Content-Type":"application/json","X-Academy-CSRF":(await session.json()).csrf},body:JSON.stringify(data)};
  }
  const r=await fetch(path,options);const value=await r.json();
  if(!r.ok)throw Error(value.error||"Local API unavailable");return value;
 }
 function record(kind,data){return {id:crypto.randomUUID(),created_at:new Date().toISOString(),kind,data}}
 async function save(key,kind,data){
  const existing=read("pending:"+key);
  if(existing&&(existing.kind!==kind||JSON.stringify(existing.data)!==JSON.stringify(data)))throw Error("Предыдущая отправка не подтверждена; восстанови прежний payload");
  const pending=existing||record(kind,data);
  if(!write("pending:"+key,pending))throw Error("Cannot preserve retry ID");
  const result=await request("/api/v11/event",pending);
  remove("pending:"+key);return {result,id:pending.id};
 }
 return {read,write,remove,request,record,save};
})();
function studyPlan(bank,reviews,today,minutes=60){
 const map=new Map(reviews.map(x=>[x.question_id,x]));
 const candidates=bank.map(q=>({id:q.id,topic:q.topic,review:map.get(q.id)}))
  .filter(x=>!x.review||x.review.due<=today)
  .sort((a,b)=>Number(!!b.review)-Number(!!a.review)||(a.review?.score??-1)-(b.review?.score??-1)||String(a.review?.due||"").localeCompare(String(b.review?.due||""))||a.id.localeCompare(b.id));
 const count=Math.max(1,Math.floor(minutes/5)),selected=[],topics=new Map();
 // Round robin over weak/due topics; no canonical grade inferred.
 for(const x of candidates){if(!topics.has(x.topic))topics.set(x.topic,[]);topics.get(x.topic).push(x)}
 while(selected.length<count&&[...topics.values()].some(v=>v.length)){
  for(const list of topics.values()){if(list.length&&selected.length<count)selected.push(list.shift())}
 }
 return selected;
}
function studyPlanV12(bank,selfReviews,reviewed,today,minutes=60){
 const self=new Map(selfReviews.map(r=>[r.question_id,r])),expert=new Map(reviewed.map(r=>[r.question_id,r]));
 const topics=new Map();
 for(const r of reviewed){const q=bank.find(q=>q.id===r.question_id);if(q){const a=topics.get(q.topic)||[];a.push(r.score);topics.set(q.topic,a)}}
 const queue=bank.map(q=>{
  const review=expert.get(q.id)||self.get(q.id),known=expert.has(q.id),weak=topics.get(q.topic)||[];
  const weakness=weak.length?4-weak.reduce((a,b)=>a+b,0)/weak.length:1.5;
  const tier=review?(review.due<=today?(known?0:1):4):2;
  return {id:q.id,topic:q.topic,minutes:q.level==="lead"?7:5,tier,known,weakness,score:review?.score??-1,due:review?.due||"",reason:known?"operator_reviewed_local":review?"self_reported":"not_assessed"};
 }).filter(x=>x.tier<4);
 queue.sort((a,b)=>a.tier-b.tier||(a.tier===2?b.weakness-a.weakness:a.score-b.score)||a.due.localeCompare(b.due)||a.id.localeCompare(b.id));
 const result=[],used=new Map();let remaining=Math.max(0,Math.min(180,Number(minutes)||0));
 while(queue.length){
  const tier=queue[0].tier;
  const eligible=queue.filter(q=>q.tier===tier&&q.minutes<=remaining);
  if(!eligible.length){for(let i=queue.length-1;i>=0;i--)if(queue[i].tier===tier)queue.splice(i,1);continue}
  const best=eligible.reduce((a,b)=>(used.get(b.topic)||0)<(used.get(a.topic)||0)?b:a);
  result.push(best);remaining-=best.minutes;used.set(best.topic,(used.get(best.topic)||0)+1);queue.splice(queue.indexOf(best),1);
 }
 return result;
}

if(typeof document!=="undefined"){
 const root=document.getElementById("v11-study");
 if(root){
  const add=(tag,text,parent=root)=>{const e=document.createElement(tag);e.textContent=text;parent.append(e);return e};
  const status=add("p","Локальные данные, не подтверждённая квалификация.");status.setAttribute("role","status");
  const panel=add("div","");
  const minutes=add("select","");for(const n of [20,45,60,90]){const o=add("option",n+" мин",minutes);o.value=String(n)}minutes.value="60";
  const refresh=add("button","Обновить план и журнал");
  const exportBtn=add("button","Экспорт JSON (ответы локальные)");
  const input=add("textarea","");input.rows=5;input.setAttribute("aria-label","Локальный JSON для импорта или экспорта");
  const importBtn=add("button","Импортировать резервную копию");
  const reviewBtn=add("button","Импортировать предложение оценки");
  const reviewHelp=add("p","Предложение: {id,kind:review_proposal,created_at,data:{attempt_id,question_id,score,reviewer,evidence,error,commit}}. Не является подтверждённой оценкой.");
  const button=(parent,label,fn)=>{const e=add("button",label,parent);e.onclick=fn;return e};
  async function render(){
   try{
    const d=await AcademyStudy.request("/api/v11/summary");const assessment=await AcademyStudy.request("/api/v12/assessment");panel.replaceChildren();
    add("h3","Локальный прогресс",panel);
    add("p",d.events+" записей · "+d.legacy_results+" прежних результатов · "+d.mock_sessions+" mock · "+d.review_proposals+" предложений оценки. Канонический grade не меняется.",panel);
    const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    const reviewed=new Map(d.self_reviews.map(x=>[x.question_id,x]));for(const x of assessment.reviewed_questions)reviewed.set(x.question_id,x);
    const plan=studyPlanV12(INTERVIEW_PRO_BANK,d.self_reviews,assessment.reviewed_questions,today,Number(minutes.value));
    add("h3","План на сегодня: "+plan.length+" вопросов · "+plan.reduce((n,q)=>n+q.minutes,0)+" мин",panel);
    for(const q of plan)button(panel,q.id+" · "+q.topic+" · "+q.minutes+" мин · "+q.reason,()=>window.academyOpenPro([q.id]));
    add("h3","Независимо рассмотренные локальные доказательства",panel);for(const [topic,v] of Object.entries(assessment.topics))add("p",topic+" · "+v.count+" вопросов · "+v.average+" / 4",panel);for(const exam of assessment.exams)add("p",exam.profile+" · "+exam.reviewed+"/"+exam.expected+" · "+exam.status,panel);add("p","Конфликты оценок: "+assessment.conflicts+"; canonical STATE не изменён.",panel);
    add("h3","Матрица локальных доказательств",panel);
    for(const topic of [...new Set(INTERVIEW_PRO_BANK.map(q=>q.topic))]){
      const t=d.by_topic[topic]||{attempts:0,questions:0,proposals:0};
      add("p",topic+" · попыток "+t.attempts+" · уникальных "+t.questions+" · предложений ревью "+t.proposals+" · канонический балл не выводится",panel);
    }
    add("h3","Предложения оценки (не подтверждены)",panel);
    for(const row of d.proposals)add("p",row.question_id+" · "+row.score+" / 4 · "+row.reviewer,panel);
    add("h3","Журнал ошибок",panel);
    for(const row of d.errors)button(panel,row.question_id+" · "+row.error,()=>window.academyOpenPro([row.question_id]));
    if(!d.errors.length)add("p","Нет зафиксированных ошибок.",panel);
    status.textContent="Данные прочитаны из локального SQLite.";
   }catch(e){status.textContent="BLOCKED: "+e.message}
  }
  refresh.onclick=render;minutes.onchange=render;
  exportBtn.onclick=async()=>{try{input.value=JSON.stringify(await AcademyStudy.request("/api/v11/export"),null,2);status.textContent="Скопируй локальный backup; не отправляй сырые ответы."}catch(e){status.textContent=e.message}};
  importBtn.onclick=async()=>{try{if(!confirm("Объединить локальные записи без перезаписи?"))return;await AcademyStudy.request("/api/v11/import",JSON.parse(input.value));await render()}catch(e){status.textContent=e.message}};
  reviewBtn.onclick=async()=>{try{const x=JSON.parse(input.value);if(x.kind!=="review_proposal")throw Error("Expected review_proposal");await AcademyStudy.request("/api/v11/event",x);await render()}catch(e){status.textContent=e.message}};
  render();
 }
}
