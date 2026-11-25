"use strict";
function engineeringModel(id,a,b){
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>100||b>100)throw Error("Некорректные параметры");
 switch(id){
 case "kafka": return {active:Math.min(a,b),idle:Math.max(0,b-a),capacity:Math.min(a,b)*500};
 case "k8s": return {desired:a,ready:Math.min(a,b),missing:Math.max(0,a-b)};
 case "terraform": return {create:Math.max(0,b-a),destroy:Math.max(0,a-b)};
 case "patroni": return {quorum:Math.floor(a/2)+1,available:Math.min(a,b),majority:b>=Math.floor(a/2)+1&&a>0};
 case "docker": return {limit:a,usage:b,overLimit:b>a};
 default:throw Error("Неизвестная модель");
 }
}
const ENGINEERING_MODELS=[
 ["kafka","Kafka","Разделы","Потребители",4,2,"В одной группе раздел назначается не более чем одному потребителю. Мощность условная: 500 сообщений/с на активного потребителя.","https://kafka.apache.org/documentation/"],
 ["k8s","Kubernetes","Желаемые реплики","Готовые реплики",3,2,"Контроллер стремится к желаемому состоянию. Готовность зависит от probes; модель не учитывает планирование и rollout.","https://kubernetes.io/docs/concepts/workloads/controllers/deployment/"],
 ["terraform","Terraform","Текущее количество","Желаемое количество",3,5,"Условная модель count для одинаковых ресурсов. Реальный plan зависит от state, провайдера и адресов ресурсов.","https://developer.hashicorp.com/terraform/cli/commands/plan"],
 ["patroni","Patroni / etcd","Участники DCS","Доступные участники",3,2,"Большинство участников etcd необходимо для записи. Кворум сам по себе не гарантирует безопасное продвижение PostgreSQL.","https://patroni.readthedocs.io/en/latest/"],
 ["docker","Docker","Лимит памяти (условные единицы)","Потребление",8,6,"Превышение лимита создаёт риск OOM. Реальное поведение зависит от cgroups, reclaim и настроек ядра.","https://docs.docker.com/engine/containers/resource_constraints/"]
];
if(typeof document!=="undefined"){
 const root=document.getElementById("engineering-models");
 if(root){
 const el=(tag,t)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;return n};
 const labels={active:"Активные потребители",idle:"Простаивают",capacity:"Сообщений/с (модель)",desired:"Желаемые реплики",ready:"Готовые",missing:"Не хватает",create:"Создать",destroy:"Удалить",quorum:"Необходимое большинство",available:"Доступно",majority:"Есть большинство",limit:"Лимит",usage:"Потребление",overLimit:"Превышение лимита"};
 for(const [id,title,la,lb,va,vb,desc,url] of ENGINEERING_MODELS){
 const card=el("details");card.className="hub-fold";card.append(el("summary",title),el("p",desc));
 const inputs=[la,lb].map((label,i)=>{const l=el("label",label+" ");const input=el("input");input.type="range";input.min=id==="patroni"&&i===0?"1":"0";input.max="12";input.value=String(i?vb:va);const value=el("output",input.value);l.append(input,value);card.append(l);return [input,value]});
 const result=el("p");result.setAttribute("aria-live","polite");
 function render(){for(const [input,value] of inputs)value.textContent=input.value;const data=engineeringModel(id,...inputs.map(x=>Number(x[0].value)));result.textContent=Object.entries(data).map(([k,v])=>labels[k]+": "+(typeof v==="boolean"?(v?"да":"нет"):v)).join(" · ")}
 for(const [input] of inputs)input.addEventListener("input",render);
 const link=el("a","Официальная документация");link.href=url;link.target="_blank";link.rel="noopener noreferrer";card.append(result,link);root.append(card);render();
 }
 }
}
