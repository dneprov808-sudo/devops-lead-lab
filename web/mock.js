"use strict";
const MOCK_MODES=Object.freeze({30:6,60:12,90:18});
function mockPlan(minutes,bank,random=Math.random){
 if(!Object.hasOwn(MOCK_MODES,minutes)||!Number.isInteger(minutes))throw Error("Invalid duration");
 const pool=[...new Map(bank.map(q=>[q[0],q])).values()];
 if(pool.length<MOCK_MODES[minutes])throw Error("Insufficient unique topics");
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,MOCK_MODES[minutes]);
}
function mockRemaining(deadline,now){return Math.max(0,Math.ceil((deadline-now)/1000));}
function mockExport(minutes,questions,answers,started,ended){
 return {schema_version:1,kind:"mock_interview",assessment:"unassessed",duration_minutes:minutes,started_at:new Date(started).toISOString(),ended_at:new Date(ended).toISOString(),responses:questions.map((q,i)=>({topic:q[0],question:q[1],follow_up:q[2],answer:answers[i]||""}))};
}
if(typeof document!=="undefined"){
 const root=document.getElementById("mock-center");
 if(root){
 const add=(tag,t,parent=root)=>{const e=document.createElement(tag);e.textContent=t;parent.append(e);return e;};
 add("p","Ответы остаются в памяти вкладки до экспорта. Оценка только независимым экзаменатором.");
 const controls=add("div",""), panel=add("article",""), clock=add("p","");
 let timer=null,session=null;
 function finish(){if(!session)return;clearInterval(timer);const s=session;session=null;panel.replaceChildren();clock.textContent="Сессия завершена";const result=mockExport(s.minutes,s.questions,s.answers,s.started,Date.now());const out=add("textarea","",panel);out.value=JSON.stringify(result,null,2);out.readOnly=true;out.rows=12;out.setAttribute("aria-label","Экспорт ответов");add("p","Скопируй JSON экзаменатору. Не включай рабочие секреты.",panel);for(const b of controls.querySelectorAll("button"))b.disabled=false;}
 function render(){if(!session)return;const s=session;panel.replaceChildren();const q=s.questions[s.index];add("h2",(s.index+1)+"/"+s.questions.length+" · "+q[1],panel);add("p",q[2],panel);const input=add("textarea","",panel);input.rows=8;input.value=s.answers[s.index]||"";input.setAttribute("aria-label","Ответ");input.oninput=()=>{s.answers[s.index]=input.value;};const prev=add("button","Назад",panel);prev.disabled=s.index===0;prev.onclick=()=>{s.index--;render();};const next=add("button","Далее",panel);next.disabled=s.index===s.questions.length-1;next.onclick=()=>{s.index++;render();};add("button","Завершить",panel).onclick=finish;}
 for(const minutes of [30,60,90]){add("button",minutes+" мин",controls).onclick=()=>{if(session)return;const started=Date.now();session={minutes,started,deadline:started+minutes*60000,questions:mockPlan(minutes,ACC_QUESTIONS),answers:[],index:0};for(const b of controls.querySelectorAll("button"))b.disabled=true;const tick=()=>{if(!session)return;const left=mockRemaining(session.deadline,Date.now());clock.textContent=Math.floor(left/60)+":"+String(left%60).padStart(2,"0");if(!left)finish();};render();tick();timer=setInterval(tick,1000);};}
 }
}
