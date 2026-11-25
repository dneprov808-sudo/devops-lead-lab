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

const CONFIG_LESSONS=[
["Kubernetes","https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",[["spec.replicas: 3","Желаемое число Pod. Контроллер создаёт недостающие экземпляры."],["strategy.rollingUpdate.maxSurge: 1","При обновлении разрешён один дополнительный Pod."],["strategy.rollingUpdate.maxUnavailable: 0","Плановое обновление не должно уменьшать число доступных реплик. Нужны свободные ресурсы."]]],
["Terraform","https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle",[["lifecycle { prevent_destroy = true }","Блокирует план удаления ресурса, пока правило присутствует в конфигурации. Не заменяет резервную копию."],["create_before_destroy = true","При замене сначала создаётся новый ресурс, если провайдер и ограничения позволяют."]]],
["Docker Compose","https://docs.docker.com/reference/compose-file/services/",[["mem_limit: 512m","Ограничивает память контейнера; превышение может привести к OOM."],["restart: unless-stopped","Политика перезапуска после завершения процесса; не лечит зависание."],["healthcheck.test","Проверяет здоровье приложения; сам по себе unhealthy не перезапускает контейнер."]]],
["Ansible","https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html",[["notify: Restart service","Уведомляет обработчик, если задача сообщила changed."],["handlers:","Обработчики обычно выполняются в конце соответствующей части play. Повторные уведомления объединяются."]]],
["Kafka","https://kafka.apache.org/documentation/",[["min.insync.replicas=2","При acks=all запись требует минимум двух синхронных реплик; иначе запись отклоняется."],["acks=all","Лидер ожидает подтверждения всех текущих ISR. Это не гарантия отсутствия потерь при любых отказах."]]],
["Patroni","https://patroni.readthedocs.io/en/latest/dynamic_configuration.html",[["ttl: 30","Срок действия лидерской блокировки DCS в секундах."],["loop_wait: 10","Пауза между циклами управления."],["retry_timeout: 10","Бюджет повторных попыток. Должно выполняться loop_wait + 2 * retry_timeout <= ttl."]]]
];
function configExplanation(topic,index){return CONFIG_LESSONS.find(x=>x[0]===topic)?.[2]?.[index]?.[1]??null}
if(typeof document!=="undefined"){
 const root=document.getElementById("engineering-models");
 if(root){const el=(tag,t)=>{const n=document.createElement(tag);n.textContent=t;return n};
 root.append(el("h3","Разбор параметров конфигурации"));
 for(const [topic,url,params] of CONFIG_LESSONS){
 const d=el("details","");d.className="hub-fold";d.append(el("summary",topic),el("p","Нажми на параметр. Это отдельные фрагменты, не готовый файл."));
 const out=el("p","Выбери параметр.");out.setAttribute("role","status");
 for(const [i,[key]] of params.entries()){const b=el("button",key);b.type="button";b.className="secondary";b.addEventListener("click",()=>{out.textContent=configExplanation(topic,i)});d.append(b);}
 const a=el("a","Официальная документация");a.href=url;a.target="_blank";a.rel="noopener noreferrer";d.append(out,a);root.append(d);
 }
 }
}

function learningRoute(topics,history,now=Date.now()){
 return topics.map(topic=>{
 const r=history.find(x=>x.topic===topic&&Number.isInteger(x.score)&&x.score>=0&&x.score<=4&&Number.isFinite(Date.parse(x.due)));
 return {topic,score:r?.score??null,due:r?Date.parse(r.due)<=now:false,priority:!r?2:Date.parse(r.due)<=now?0:r.score<=2?1:3};
 }).sort((a,b)=>a.priority-b.priority||(a.score??5)-(b.score??5)||a.topic.localeCompare(b.topic,"ru"));
}
function readBookmarks(raw,topics){try{const a=JSON.parse(raw||"[]");return Array.isArray(a)?[...new Set(a.filter(x=>topics.includes(x)))]:[]}catch{return []}}
if(typeof document!=="undefined"){
 const root=document.getElementById("engineering-route");
 if(root&&typeof BANK!=="undefined"){
 const topics=BANK.map(x=>x[0]),key="academy-bookmarks-v7";
 const el=(tag,t)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;return n};
 let marks=[];try{marks=readBookmarks(localStorage.getItem(key),topics)}catch{}
 const list=el("div"),notice=el("p");notice.setAttribute("role","status");
 const refresh=el("button","Обновить рекомендации");refresh.type="button";
 const only=el("input");only.type="checkbox";const label=el("label"," Только избранное");label.prepend(only);
 function render(){
 list.replaceChildren();
 for(const r of learningRoute(topics,typeof records==="undefined"?[]:records).filter(r=>!only.checked||marks.includes(r.topic))){
 const d=el("div");d.className="hub-block";
 d.append(el("strong",r.topic),el("p",r.score===null?"Ещё нет самооценки":(r.due?"Пора повторить · ":"")+"Самооценка "+r.score+"/4"));
 const open=el("button","Повторить тему");open.type="button";open.addEventListener("click",()=>{document.getElementById("topic").value=r.topic;nextQuestion();page("interview")});
 const mark=el("button",marks.includes(r.topic)?"Убрать из избранного":"В избранное");mark.type="button";mark.className="secondary";mark.addEventListener("click",()=>{const next=marks.includes(r.topic)?marks.filter(x=>x!==r.topic):[...marks,r.topic];try{localStorage.setItem(key,JSON.stringify(next));marks=next;notice.textContent="Избранное сохранено."}catch{notice.textContent="Не удалось сохранить избранное."}render()});d.append(open,mark);list.append(d);
 }
 if(!list.children.length)list.append(el("p","Нет избранных тем."));
 }
 refresh.addEventListener("click",render);only.addEventListener("change",render);root.append(el("p","Рекомендации основаны на локальных самооценках, а не на подтверждённых компетенциях. Сначала просроченные темы, затем слабые и неизученные."),refresh,label,notice,list);render();
 }
}
