"use strict";
const V8_REVIEWS=[
 {title:"Dockerfile",lines:["FROM python:latest","WORKDIR /app","COPY . .","ENV DB_PASSWORD=synthetic-example","CMD [\"python\",\"app.py\"]"],risks:[0,3],notes:"Фиксируй версию образа, а для строгой воспроизводимости digest. ENV сохраняет значение в образе. COPY требует корректного .dockerignore; непривилегированный USER не задан.",source:"https://docs.docker.com/build/building/best-practices/"},
 {title:"Terraform",lines:["resource \"local_file\" \"config\" {","  filename = \"/tmp/example.conf\"","  content = \"synthetic\"","}","# apply -auto-approve без проверки plan"],risks:[4],notes:"Автоматическое подтверждение допустимо лишь в контролируемом pipeline с проверенным plan и политиками. Не используй этот комментарий как команду.",source:"https://developer.hashicorp.com/terraform/cli/commands/apply"},
 {title:"Kubernetes",lines:["kind: Deployment","spec:","  replicas: 1","  strategy:","    type: Recreate"],risks:[2,4],notes:"Одна реплика и Recreate создают риск простоя при обновлении. Это не всегда ошибка: некоторые приложения требуют эксклюзивного доступа.",source:"https://kubernetes.io/docs/concepts/workloads/controllers/deployment/"}
];
function v8Review(index,selected){
 const c=V8_REVIEWS[index];if(!c||!Array.isArray(selected))throw Error("invalid review");
 const s=new Set(selected);
 return {found:c.risks.filter(x=>s.has(x)).length,total:c.risks.length,extra:[...s].filter(x=>!c.risks.includes(x)).length};
}
function v8Config(raw){
 try{const d=JSON.parse(raw);if(!d||d.kind!=="Deployment"||d.apiVersion!=="apps/v1")return "Нужен Deployment apps/v1.";if(!Number.isInteger(d.spec?.replicas)||d.spec.replicas<0)return "spec.replicas: целое неотрицательное число.";return "Фрагмент JSON и replicas корректны. Это не полная Kubernetes schema validation."}catch{return "Некорректный JSON."}
}
const V8_TERMINAL={"help":"help | kubectl get pods | kubectl describe pod worker | kubectl logs worker","kubectl get pods":"NAME   READY   STATUS\napi    1/1     Running\nworker 0/1     CrashLoopBackOff","kubectl describe pod worker":"Last State: Terminated\nReason: OOMKilled\nExit Code: 137","kubectl logs worker":"synthetic log: loading batch; process terminated"};
function v8Command(s){return Object.hasOwn(V8_TERMINAL,s.trim())?V8_TERMINAL[s.trim()]:"Команда не входит в симулятор. Введи help."}
function v8Backup(storage){
 const result={schema:1,kind:"academy-local-review-bookmarks",data:{}};
 for(const key of ["academy-review-v1","academy-bookmarks-v7"]){const raw=storage.getItem(key);if(raw!==null)result.data[key]=JSON.parse(raw)}
 return result;
}
if(typeof document!=="undefined"){
 const root=document.getElementById("production-center");
 if(root){
 const el=(tag,t)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;return n};
 const button=(t,fn)=>{const b=el("button",t);b.type="button";b.addEventListener("click",fn);return b};
 const section=(title,desc)=>{const a=el("article");a.append(el("h2",title),el("p",desc));root.append(a);return a};
 const live=section("Локальный Production","Фактические данные API. Стенд запускается отдельно по production/README.md.");
 const status=el("p","Не проверено"),metrics=el("pre");status.setAttribute("role","status");
 let loading=false;
 async function refresh(){if(loading)return;loading=true;try{const r=await fetch("/api/production/status",{cache:"no-store"});if(!r.ok)throw Error("HTTP");const d=await r.json();if(d.status!=="available")throw Error("offline");status.textContent="API доступен; это не подтверждает здоровье worker.";metrics.textContent="Принято: "+d.metrics.accepted+"\nОбработано: "+d.metrics.processed+"\nОчередь: "+d.metrics.pending}catch{status.textContent="Стенд недоступен или метрики невалидны.";metrics.textContent=""}finally{loading=false}}
 live.append(button("Обновить реальные метрики",refresh),status,metrics,el("pre","docker compose -f production/compose.yaml up -d --build\npython3 production/load.py --count 30 --rate 5\ndocker compose -f production/compose.yaml stop worker\ndocker compose -f production/compose.yaml start worker"));refresh();
 const terminal=section("Терминал: симуляция","Команды не выполняются на хосте. Данные синтетические.");
 const cmd=el("input");cmd.setAttribute("aria-label","Команда симулятора");cmd.placeholder="help";const output=el("pre",V8_TERMINAL.help);output.setAttribute("aria-live","polite");const run=()=>{output.textContent=v8Command(cmd.value)};cmd.addEventListener("keydown",e=>{if(e.key==="Enter")run()});terminal.append(cmd,button("Выполнить в симуляторе",run),output);
 const ide=section("Редактор конфигурации","Учебная проверка JSON-фрагмента Kubernetes, без исполнения.");
 const editor=el("textarea");editor.rows=8;editor.setAttribute("aria-label","JSON конфигурация");editor.value=JSON.stringify({apiVersion:"apps/v1",kind:"Deployment",spec:{replicas:3}},null,2);
 const result=el("p");result.setAttribute("role","status");ide.append(editor,button("Проверить фрагмент",()=>{result.textContent=v8Config(editor.value)}),result);
 const review=section("Code Review Center","Отметь проблемные строки с учётом условий эксплуатации. Самопроверка.");
 const sel=el("select"),reviewBody=el("div");sel.setAttribute("aria-label","Задание code review");V8_REVIEWS.forEach((c,i)=>{const o=el("option",c.title);o.value=String(i);sel.append(o)});
 function renderReview(){const i=Number(sel.value),c=V8_REVIEWS[i];reviewBody.replaceChildren();const inputs=c.lines.map(line=>{const label=el("label",line),check=el("input");check.type="checkbox";label.prepend(check);label.className="check";reviewBody.append(label);return check});const feedback=el("p");feedback.setAttribute("role","status");reviewBody.append(button("Проверить выбор",()=>{const r=v8Review(i,inputs.flatMap((x,j)=>x.checked?[j]:[]));feedback.textContent="Найдено "+r.found+"/"+r.total+" · дополнительных отметок "+r.extra+". "+c.notes}),feedback)}
 sel.addEventListener("change",renderReview);review.append(sel,reviewBody);renderReview();
 const design=section("System Design: конструктор гипотез","Выбери компоненты, затем обоснуй требования, узкие места и отказоустойчивость. Это текстовая модель, не проверенная архитектура.");
 const nodes=["API gateway","Backend","Kafka","PostgreSQL","Redis","Prometheus"];const checks=nodes.map(n=>{const l=el("label",n),c=el("input");c.type="checkbox";l.prepend(c);l.className="check";design.append(l);return c});const canvas=el("pre","Выбери компоненты");const update=()=>{canvas.textContent=nodes.filter((_,i)=>checks[i].checked).join("\n")||"Нет компонентов"};checks.forEach(c=>c.addEventListener("change",update));design.append(canvas,el("p","Для полноценного задания используй существующий раздел System Design."));
 const lead=section("Lead: управление инцидентом","SEV-1: ошибки выросли после релиза, команда одновременно предлагает rollback и изменение БД.");
 const feedback=el("p");feedback.setAttribute("role","status");for(const [choice,why] of [["Назначить incident commander, остановить неконтролируемые изменения и оценить безопасный rollback","Сначала координация, влияние на пользователей и обратимость. Убедись в совместимости схемы БД."],["Разрешить всем параллельно менять production","Независимые изменения затрудняют диагностику и увеличивают риск."],["Сразу откатить всё, включая БД","Откат БД может потерять данные; сначала проверь совместимость и план восстановления."]])lead.append(button(choice,()=>{feedback.textContent=why}));lead.append(feedback);
 const agents=section("Агенты и доказательства","Официальные данные остаются в существующих разделах. Новый экран не публикует Handoff.");
 agents.append(button("Открыть Handoff",()=>page("handoffs")),button("Открыть канонический обзор",()=>page("overview")));
 const backup=section("Экспорт локальных самооценок и избранного","Ручная копия двух локальных ключей; не включает черновики практикума, pending push или удалённую историю. Не восстанавливает данные автоматически.");
 const backupText=el("textarea");backupText.rows=5;backupText.readOnly=true;backupText.setAttribute("aria-label","Резервная копия");const backupStatus=el("p");backupStatus.setAttribute("role","status");backup.append(button("Подготовить JSON",()=>{try{backupText.value=JSON.stringify(v8Backup(localStorage),null,2);backupStatus.textContent="Скопируй JSON в локальный файл."}catch{backupText.value="";backupStatus.textContent="Не удалось прочитать данные; исходные записи не изменены."}}),backupText,backupStatus);
 }
}
