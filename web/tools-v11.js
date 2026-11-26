function v11Capacity(rps,per,util,zones,gb,mbps){
 const values=[rps,per,util,zones,gb,mbps];
 if(!values.every(Number.isSafeInteger)||rps<1||rps>1e9||per<1||per>1e7||util<1||util>100||zones<2||zones>20||gb<1||gb>1e7||mbps<1||mbps>1e6)throw Error("Invalid assumptions");
 const perZone=Math.ceil(rps/((zones-1)*per*util/100));
 return {perZone,total:perZone*zones,remainingCapacity:Math.floor(perZone*(zones-1)*per*util/100),restoreSeconds:Math.ceil(gb*1000/mbps)};
}
function v11Market(events,topics){
 const rows=events.filter(e=>e.kind==="vacancy").map(e=>e.data);
 return topics.map(topic=>({topic,mentions:rows.filter(v=>v.topics.includes(topic)).length,total:rows.length})).sort((a,b)=>b.mentions-a.mentions||a.topic.localeCompare(b.topic));
}
if(typeof document!=="undefined"){
 const add=(tag,text,parent)=>{const e=document.createElement(tag);e.textContent=text;parent.append(e);return e};
 const button=(p,t,fn)=>{const e=add("button",t,p);e.onclick=fn;return e};
 const field=(p,label,value,type="number")=>{const l=add("label",label+" ",p);const e=add("input","",l);e.type=type;e.value=String(value);return e};
 const area=(p,label)=>{const l=add("label",label,p);const e=add("textarea","",l);e.rows=3;return e};
 const design=document.getElementById("v11-design");
 if(design){
  add("h2","Capacity & HA/DR — проверяемые допущения",design);
  const graph=add("pre","",design),fields=[["Peak RPS",12000],["Проверенная RPS / replica",500],["Целевая загрузка %",75],["Зон",3],["Данные GB (decimal)",2000],["Restore MB/s",200]].map(([l,v])=>field(design,l,v));
  const status=add("p","",design);status.setAttribute("role","status");
  const title=field(design,"Название ADR","Учебная архитектура","text"),decision=area(design,"Решение"),alternatives=area(design,"Альтернативы и компромиссы"),verification=area(design,"Проверка SLI, RPO/RTO и отказов");
  function calculate(){const nums=fields.map(e=>Number(e.value));const c=v11Capacity(...nums);graph.textContent="Clients → Load balancer → "+Array.from({length:nums[3]},(_,i)=>"AZ"+(i+1)+" ["+c.perZone+" replicas]").join(" | ")+" → data services\nПосле потери зоны: "+c.remainingCapacity+" RPS при заданной загрузке\nВсего реплик: "+c.total+"\nТолько копирование backup: "+c.restoreSeconds+" секунд (без replay, provisioning, validation). RPO измеряется отдельно.";return nums}
  for(const f of fields)f.oninput=()=>{try{calculate();status.textContent=""}catch(e){status.textContent=e.message}};
  button(design,"Сохранить ADR локально",async()=>{try{const [rps,per_replica,util_percent,zones,db_gb,restore_mbps]=calculate();const x=await AcademyStudy.save("design","design",{title:title.value,rps,per_replica,util_percent,zones,db_gb,restore_mbps,decision:decision.value,alternatives:alternatives.value,verification:verification.value});status.textContent="Сохранено "+x.id+" · не подтверждённая защита"}catch(e){status.textContent=e.message}});
  button(design,"Запрос независимой защиты",()=>copy("Проведи независимую защиту ADR: "+title.value+". Требования и расчёт: "+graph.textContent+". Моё решение: "+decision.value+". Альтернативы: "+alternatives.value+". Проверки: "+verification.value+". Не меняй STATE, оцени доказательства."));
  calculate();
 }
 const career=document.getElementById("v11-career");
 if(career){
  const topics=[...new Set(INTERVIEW_PRO_BANK.map(q=>q.topic))],status=add("p","Рынок не загружен автоматически. Вноси только актуальные вакансии с источником и датой. Зарплаты RUB/месяц, gross/net отдельно.",career);
  const form=area(career,"JSON вакансии или портфолио"),summary=add("div","",career);
  button(career,"Шаблон вакансии",()=>{form.value=JSON.stringify({title:"",company:"",source:"https://",observed:new Date().toISOString().slice(0,10),salary_min:null,salary_max:null,basis:"unknown",topics:["Kubernetes"]},null,2)});
  button(career,"Шаблон подтверждения опыта",()=>{form.value=JSON.stringify({title:"",topic:"Kubernetes",impact:"",evidence:"",commit:null},null,2)});
  async function render(){
   try{const {events}=await AcademyStudy.request("/api/v11/career");summary.replaceChildren();
    add("h3","Матрица требований по введённым вакансиям",summary);
    for(const x of v11Market(events,topics))add("p",x.topic+" · "+x.mentions+"/"+x.total,summary);
    add("h3","Источники и зарплаты",summary);
    for(const e of events.filter(e=>e.kind==="vacancy")){const d=e.data,p=add("p",d.company+" · "+d.title+" · "+d.observed+" · "+(d.salary_min??"—")+"–"+(d.salary_max??"—")+" RUB "+d.basis+" ",summary);const a=add("a","Источник",p);a.href=d.source;a.rel="noopener noreferrer";a.target="_blank";}
    add("h3","Портфолио (не проверено независимо)",summary);
    for(const e of events.filter(e=>e.kind==="portfolio"))add("p",e.data.title+" · "+e.data.impact+" · "+(e.data.commit||"SHA не указан"),summary);
    status.textContent="Локальные записи, без автоматического поиска и оценки готовности.";
   }catch(e){status.textContent=e.message}
  }
  for(const [label,kind] of [["Сохранить вакансию","vacancy"],["Сохранить доказательство опыта","portfolio"]])button(career,label,async()=>{try{await AcademyStudy.save(kind,kind,JSON.parse(form.value));await render()}catch(e){status.textContent=e.message}});
  button(career,"Обновить матрицу",render);render();
 }
 const health=document.getElementById("v11-health");
 if(health){const out=add("pre","",health);button(health,"Проверить состояние академии",async()=>{try{const [v,h]=await Promise.all([AcademyStudy.request("/api/version"),AcademyStudy.request("/api/v11/health")]);out.textContent=JSON.stringify({version:v,health:h},null,2)}catch(e){out.textContent="BLOCKED: "+e.message}});const a=add("a","Локальные Prometheus metrics",health);a.href="/api/v11/metrics";a.target="_blank";a.rel="noopener noreferrer";}
}
