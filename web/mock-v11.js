// Structured mock profiles. Existing v10 mock stays available.
const V11_PROFILES={
 entry:{minutes:90,size:18,topics:[],must:["Linux","Networking","Docker","Kubernetes","Terraform","Ansible","CI/CD & GitOps","SRE & Incident Management"],lead:2},
 senior:{minutes:60,size:12,topics:[],must:["Linux","Networking","Kubernetes","Docker","CI/CD & GitOps","Terraform"],lead:2},
 lead:{minutes:90,size:18,topics:[],must:["Kubernetes","Leadership","System Design & Platform Engineering","SRE & Incident Management","CI/CD & GitOps","DevSecOps"],lead:6},
 sre:{minutes:60,size:12,topics:["Observability","SRE & Incident Management","Linux","Networking","PostgreSQL & Patroni","Kafka"],must:["Observability","SRE & Incident Management","Networking"],lead:2},
 platform:{minutes:90,size:18,topics:["Kubernetes","Helm","Terraform","CI/CD & GitOps","System Design & Platform Engineering","DevSecOps","Leadership"],must:["Kubernetes","Terraform","System Design & Platform Engineering","CI/CD & GitOps"],lead:5},
 design:{minutes:60,size:12,topics:["System Design & Platform Engineering"],must:["System Design & Platform Engineering"],lead:4},
 troubleshooting:{minutes:45,size:9,topics:["Linux","Networking","Docker","Kubernetes","Observability","Kafka","PostgreSQL & Patroni","Redis","Ansible"],must:["Linux","Networking","Kubernetes","Observability"],lead:1},
 leadership:{minutes:45,size:9,topics:["Leadership"],must:["Leadership"],lead:7},
 screening:{minutes:15,size:3,topics:["Leadership","Linux","Kubernetes","CI/CD & GitOps"],must:["Leadership","Linux"],lead:1},
 full:{minutes:180,size:36,topics:[],must:["Linux","Networking","Kubernetes","Docker","Terraform","Ansible","CI/CD & GitOps","Helm","Observability","Kafka","PostgreSQL & Patroni","Redis","SRE & Incident Management","DevSecOps","System Design & Platform Engineering","Leadership"],lead:10}
};
function v11MockPlan(profile,bank,random=Math.random){
 const p=V11_PROFILES[profile];if(!p)throw Error("Unknown profile");
 const pool=bank.filter(q=>!p.topics.length||p.topics.includes(q.topic));
 const available=[...new Map(pool.map(q=>[q.id,q])).values()];
 for(let i=available.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[available[i],available[j]]=[available[j],available[i]]}
 const result=[],used=new Set();
 const take=pred=>{const q=available.find(x=>!used.has(x.id)&&pred(x));if(!q)throw Error("Insufficient questions");used.add(q.id);result.push(q)};
 for(const topic of p.must)take(q=>q.topic===topic);
 while(result.filter(q=>q.level==="lead").length<p.lead)take(q=>q.level==="lead");
 while(result.length<p.size)take(()=>true);
 if(result.length!==p.size)throw Error("Invalid profile quota");
 return result;
}
function v11MockDraftValid(s,bank){
 if(!s||!V11_PROFILES[s.profile]||!Array.isArray(s.ids)||!Array.isArray(s.answers)||s.ids.length!==V11_PROFILES[s.profile].size||new Set(s.ids).size!==s.ids.length||s.answers.length!==s.ids.length||!s.answers.every(x=>typeof x==="string"&&x.length<=12000))return false;
 const map=new Map(bank.map(q=>[q.id,q])),p=V11_PROFILES[s.profile],selected=s.ids.map(id=>map.get(id));return selected.every(q=>q&&(!p.topics.length||p.topics.includes(q.topic)))&&selected.filter(q=>q.level==="lead").length>=p.lead&&p.must.every(topic=>selected.some(q=>q.topic===topic))&&Number.isFinite(s.started)&&s.started>=0&&s.started<=Date.now()+300000&&Number.isInteger(s.index)&&s.index>=0&&s.index<s.ids.length&&typeof s.finished==="boolean";
}
if(typeof document!=="undefined"){
 const root=document.getElementById("v11-mock");
 if(root){
  const add=(tag,text,parent=root)=>{const e=document.createElement(tag);e.textContent=text;parent.append(e);return e};
  const status=add("p","Локальный режим: результаты не отправляются в GitHub.");status.setAttribute("role","status");
  const select=add("select","");select.setAttribute("aria-label","Профиль интервью");
  for(const [id,p] of Object.entries(V11_PROFILES)){const o=add("option",id+" · "+p.minutes+" мин · "+p.size+" вопросов",select);o.value=id}select.value="lead";
  const start=add("button","Начать структурированное интервью"),panel=add("article",""),clock=add("p","");
  let s=AcademyStudy.read("mock-active"),timer=null;
  if(!v11MockDraftValid(s,INTERVIEW_PRO_BANK))s=null;
  const map=new Map(INTERVIEW_PRO_BANK.map(q=>[q.id,q]));
  function persist(){const ok=AcademyStudy.write("mock-active",s);if(!ok)status.textContent="Ошибка сохранения черновика; не закрывай вкладку.";return ok}
  function finish(){if(!s)return;s.finished=true;persist();clearInterval(timer);render()}
  function tick(){if(!s||s.finished)return;const left=Math.max(0,Math.ceil((s.started+V11_PROFILES[s.profile].minutes*60000-Date.now())/1000));clock.textContent=Math.floor(left/60)+":"+String(left%60).padStart(2,"0");if(left===0)finish()}
  function render(){
   panel.replaceChildren();start.disabled=!!s;select.disabled=!!s;
   if(!s){clock.textContent="";return}
   if(s.finished){
    clock.textContent="Завершено";add("p","Сохрани ответы в SQLite. Результат не оценён.",panel);
    const save=add("button","Сохранить завершённое интервью",panel);
    save.onclick=async()=>{save.disabled=true;try{const result=await AcademyStudy.save("mock-active","mock",{profile:s.profile,minutes:V11_PROFILES[s.profile].minutes,started_at:new Date(s.started).toISOString(),responses:s.ids.map((id,i)=>({question_id:id,answer:s.answers[i]}))});status.textContent="Сохранено · ID "+result.id;AcademyStudy.remove("mock-active");s=null;render()}catch(e){status.textContent="BLOCKED: "+e.message;save.disabled=false}};
    const out=add("textarea","",panel);out.readOnly=true;out.rows=6;out.setAttribute("aria-label","Экспорт структурированного интервью");out.value=JSON.stringify({schema_version:1,kind:"mock_interview",assessment:"unassessed",duration_minutes:V11_PROFILES[s.profile].minutes,responses:s.ids.map((id,i)=>({question_id:id,topic:map.get(id).topic,question:map.get(id).question,follow_up:map.get(id).follow_up,answer:s.answers[i]}))},null,2);
    return;
   }
   const q=map.get(s.ids[s.index]);add("h3",(s.index+1)+"/"+s.ids.length+" · "+q.question,panel);
   const answer=add("textarea","",panel);answer.maxLength=12000;answer.rows=8;answer.value=s.answers[s.index];answer.setAttribute("aria-label","Ответ структурированного интервью");
   const follow=add("button","Показать уточнение",panel);follow.onclick=()=>{if(!answer.value.trim()){status.textContent="Сначала ответь.";return}add("p",q.follow_up,panel);follow.disabled=true};
   answer.oninput=()=>{s.answers[s.index]=answer.value;persist()};
   const prev=add("button","Предыдущий",panel),next=add("button","Следующий",panel);prev.disabled=s.index===0;next.disabled=s.index===s.ids.length-1;
   prev.onclick=()=>{s.index--;persist();render()};next.onclick=()=>{s.index++;persist();render()};
   add("button","Завершить структурированное интервью",panel).onclick=finish;
  }
  start.onclick=()=>{if(s)return;try{const ids=v11MockPlan(select.value,INTERVIEW_PRO_BANK).map(q=>q.id);s={profile:select.value,started:Date.now(),ids,answers:ids.map(()=>""),index:0,finished:false};if(!persist()){s=null;return}render();timer=setInterval(tick,1000);tick()}catch(e){status.textContent=e.message}};
  if(s){select.value=s.profile;render();if(!s.finished){timer=setInterval(tick,1000);tick()}}else render();
 }
}
