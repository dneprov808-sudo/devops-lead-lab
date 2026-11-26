if(typeof document!=="undefined"){
 const add=(tag,text,p)=>{const e=document.createElement(tag);e.textContent=text;p.append(e);return e};
 const lead=document.getElementById("v12-lead");
 if(lead){
  const list=add("select","",lead),panel=add("article","",lead),status=add("p","Ситуационные упражнения, не подтверждение квалификации.",lead);
  let cases=[];
  function render(){
   panel.replaceChildren();const c=cases.find(x=>x.id===list.value);if(!c)return;
   add("h3",c.title,panel);add("p",c.scenario,panel);add("p",c.rubric,panel);
   const choice=add("select","",panel);choice.setAttribute("aria-label","Управленческое решение");
   for(const x of c.choices){const o=add("option",x.text,choice);o.value=x.id}
   const rationale=add("textarea","",panel);rationale.rows=5;rationale.maxLength=6000;rationale.setAttribute("aria-label","Обоснование решения");
   const pending=AcademyStudy.read("pending:"+c.id);if(pending){choice.value=pending.data.choice;rationale.value=pending.data.rationale}
   const submit=add("button","Сохранить решение и получить разбор",panel);
   submit.onclick=async()=>{if(!rationale.value.trim()){status.textContent="Сначала обоснуй решение.";return}submit.disabled=true;try{const selected=c.choices.find(x=>x.id===choice.value);await AcademyStudy.save(c.id,"lead_case",{case_id:c.id,choice:selected.id,rationale:rationale.value});add("p",selected.feedback,panel);status.textContent="Сохранено как учебная попытка; нужна независимая оценка.";choice.disabled=true;rationale.disabled=true}catch(e){status.textContent=e.message;submit.disabled=false}};
  }
  AcademyStudy.request("/api/v12/leadership").then(data=>{cases=data;for(const x of cases){const o=add("option",x.id+" · "+x.title,list);o.value=x.id}list.onchange=render;render()}).catch(e=>status.textContent=e.message);
 }
 const labs=document.getElementById("v12-labs");
 if(labs){
  const status=add("p","Загрузка каталога; запуск только вручную в локальной среде.",labs);
  AcademyStudy.request("/api/v12/labs").then(d=>{
   status.textContent="20 Kubernetes labs и 30 chaos cases; результаты не подтверждены автоматически.";
   for(const [title,rows] of [["Kubernetes Advanced Labs",d.kubernetes],["Chaos Engineering",d.chaos]]){
    const section=add("details","",labs);add("summary",title,section);
    for(const row of rows){const item=add("details","",section);add("summary",row.id+" · "+(row.title||row.domain),item);add("p",row.task||row.symptom,item);if(row.prerequisites)add("p","Требования: "+row.prerequisites,item);if(row.goal)add("p","Цель: "+row.goal,item);add("p",row.execution||"Отдельный namespace; проверь README",item)}
   }
  }).catch(e=>status.textContent=e.message);
 }
}
