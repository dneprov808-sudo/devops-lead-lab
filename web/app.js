const INTERVALS=[1,1,3,7,14];
function reviewRecord(topic,score,now=new Date()){
  if(typeof topic!=="string"||!Number.isInteger(score)||score<0||score>4)throw Error("Invalid review");
  const date=new Date(now);
  if(!Number.isFinite(date.getTime()))throw Error("Invalid date");
  date.setDate(date.getDate()+INTERVALS[score]);
  return {topic,score,due:date.toISOString(),assessed:new Date(now).toISOString()};
}
function reviewOrder(rows,now=new Date()){
  return rows.slice().sort((a,b)=>Number(new Date(b.due)<=now)-Number(new Date(a.due)<=now)||a.score-b.score||Date.parse(a.due)-Date.parse(b.due));
}
function questionLevel(previous){
  return previous&&previous.score>=3?1:0;
}

const BANK=[["Linux/Bash",["Процесс использует много CPU. Как определить причину без перезапуска?","Раздели загрузку CPU, ожидание I/O, состояние потоков и ограничения cgroups."],["После релиза нагрузка выросла, но CPU utilisation низкая. Как локализовать задержку?","Проверь очереди, блокировки, I/O, off-CPU, лимиты и корреляцию с релизом."]],["Сети/DNS/TLS/HTTP",["TCP-соединение не устанавливается. Какие проверки разделят проблемы клиента, сети и сервера?","Маршрут, сокеты, пакетный захват, firewall, обратный маршрут; проверяй гипотезы."],["TLS-соединения периодически обрываются только на части клиентов. Как построишь расследование?","Сегментация клиентов, цепочка сертификатов, SNI, время, промежуточные устройства, измерения."]],["Docker/OCI",["Почему контейнер работает локально, но падает при запуске на другом хосте?","Архитектура образа, конфигурация, volumes, UID, limits, logs и exit code."],["Как уменьшить поверхность атаки контейнерного приложения без поломки релизов?","Минимальный образ, non-root, capabilities, read-only FS, supply chain, rollback."]],["Ansible",["Что означает идемпотентность и как проверить её на роли?","Два запуска, changed, модули вместо shell, проверка фактического состояния."],["Как развернуть изменения на 500 хостах с ограничением blast radius?","Batch/serial, health gates, failure policy, rollback, inventory и аудит."]],["CI/CD",["Как разделить build, test, deploy и release?","Один immutable artifact, независимые проверки, среда, approvals, rollback."],["Как исключить одновременные конфликтующие деплои и подмену артефакта?","Concurrency, identity/digest, provenance, least privilege, deployment lock."]],["Terraform",["Что находится в state и почему его нельзя считать просто конфигурацией?","Связь ресурсов и реальных объектов, drift, чувствительные данные, locking."],["Как восстановиться после частичного apply и не удалить рабочие ресурсы?","Состояние, plan, реальные объекты, import/moved при необходимости, backup, review."]],["Kubernetes/Helm",["Pod Running, но сервис недоступен. Как локализовать проблему?","Events, readiness, selectors, endpoints, DNS, network policy, logs."],["Как диагностировать каскадную деградацию после rollout при жёстких resource limits?","Requests/limits, throttling, OOM, HPA, probes, rollout/rollback и SLO."]],["GitOps",["Чем отличается декларативная доставка от обычного push-деплоя?","Desired state, reconciliation, drift, источник истины, rollback."],["Как организовать экстренное исправление при GitOps без бесконтрольного drift?","Break-glass, аудит, временная политика, возврат к Git и reconciliation."]],["Observability/SRE",["Чем отличаются SLI, SLO и SLA?","Измеряемый индикатор, целевое значение, обязательство; окно и error budget."],["Как настроить алертинг по burn rate, чтобы снизить шум и не пропустить инцидент?","Окна, скорость расхода бюджета, severity, actionable alerts и runbook."]],["Security",["Как исключить утечку секретов в CI?","Минимальные права, временные credentials, masking, отсутствие секретов в логах и артефактах."],["Как проверить цепочку поставки контейнерного образа до production?","SBOM, подпись, provenance, digest, scanning, policy enforcement."]],["Platform/HA/DR",["Объясни RPO и RTO и предложи проверку восстановления.","Данные, допустимая потеря, время восстановления, restore drill и измерение."],["Как проектировать платформу self-service с контролем стоимости и безопасности?","Golden paths, guardrails, quotas, tenancy, ownership, метрики adoption и reliability."]],["Leadership",["Как распределить работу команды при критическом инциденте?","Incident commander, роли, коммуникация, mitigation, журнал решений."],["Как обосновать отказ от рискованного релиза бизнесу и согласовать альтернативу?","Риск, SLO, данные, варианты, компромисс, критерии и ответственное решение."]]];
BANK.push(["Kafka",["Как consumer group распределяет partitions между consumers?","Partition assignment, offsets, rebalance, lag."],["Как спроектировать обработку повторов при сбое consumer после записи в БД?","Идемпотентность, commit offset, транзакционная граница, retry и DLQ."]],["PostgreSQL",["Как найти блокирующую транзакцию?","pg_stat_activity, pg_locks, wait events, безопасное завершение."],["Почему после добавления индекса план не изменился?","Статистика, селективность, стоимость I/O, actual rows, buffers."]],["Patroni / etcd",["Какие роли у PostgreSQL, Patroni и DCS?","WAL replication, leader lock, quorum, health checks."],["Какие гарантии RPO/RTO при асинхронном failover?","Replication lag, election, fencing, split brain, измерение восстановления."]],["Redis",["Чем TTL отличается от eviction?","Истечение ключа, maxmemory, политика вытеснения."],["Как оценить RPO Redis при AOF и RDB?","fsync policy, snapshot interval, потеря последних записей, проверка restore."]]);
const EXTRA=[["Linux/Bash",["Почему df показывает занятый диск, хотя du не находит больших файлов?","Открытые удалённые файлы, mount points, lsof, inode и права доступа."],["Как диагностировать высокий load average при 80% idle CPU?","D-state, I/O latency, blocked tasks, cgroups, baseline, ограничить impact."]],["Сети/DNS/TLS/HTTP",["Чем отличаются NXDOMAIN, TCP refused и TLS verify error?","Слои DNS, TCP, TLS; наблюдения и корректная проверка."],["Почему только крупные запросы зависают через VPN?","MTU, PMTUD, MSS, ICMP, capture обеих сторон, не отключать защиту."]],["Docker/OCI",["Чем volume отличается от writable layer контейнера?","Жизненный цикл данных, mounts, backup и UID."],["Как расследовать OOM контейнера при свободной памяти хоста?","cgroup memory limit, events, working set, kernel logs, load test."]],["Ansible",["Почему check mode может не выявить проблему реального deploy?","Поддержка модулей, зависимости, runtime state, безопасная проверка."],["Как обнаружить и исправить drift роли без перезапуска всех сервисов?","Diff, canary, handlers, serial, no-op second run и rollback."]],["CI/CD",["Зачем продвигать один digest между средами?","Неизменяемость, provenance, reproducibility, traceability."],["Как разработать совместимую миграцию БД при rolling update?","Expand-contract, совместимость версий, backfill, gates, rollback."]],["Terraform",["Что показывает exit code 2 при terraform plan -detailed-exitcode?","Изменения, не ошибка; review plan, backend, состояние."],["После переименования ресурса plan предлагает destroy/create. Что делать?","Сопоставление state/address, moved, import, backup и отсутствие apply до проверки."]],["Kubernetes/Helm",["Почему Running Pod может не быть Ready?","Probes, endpoints, зависимости, events и logs."],["Как проверить, что PDB и topology spread не блокируют обновление узлов?","Disruption budget, replicas, scheduler, capacity, drain в учебном context."]],["GitOps",["Почему ручное изменение объекта может быть отменено?","Desired state и reconciler; drift, audit."],["Как разграничить GitOps для нескольких команд и сред?","RBAC, tenancy, repo ownership, promotion, policy, blast radius."]],["Observability/SRE",["Чем отличается up от probe_success?","Scrape exporter vs доступность target, missing data."],["Как построить multi-window burn-rate alerting?","SLO, denominator, окна, severity, actionable mitigation."]],["Security",["Почему нельзя считать base64 шифрованием?","Кодирование, encryption, ключи и access control."],["Как ограничить blast radius скомпрометированного deployment runner?","Short-lived credentials, identity, environment, audit, network isolation, revoke."]],["Platform/HA/DR",["Чем failover отличается от restore?","Доступность, репликация, backup, проверка данных."],["Как выбрать независимые failure domains для базы и DCS?","Quorum, zones, shared dependencies, fencing, backup restore, failure test."]],["Leadership",["Как сформулировать критерии приёмки инженерной задачи?","Измеримый результат, evidence, scope, ограничения."],["Команда перегружена toil, а бизнес требует релизы. Как изменить приоритеты?","Данные, impact, SLO, delegation, automation ROI, договорённость."]],["Kafka",["Что означает lag в consumer group?","Log end offset, committed offset, per-partition skew."],["При RF=3, acks=all и min.insync.replicas=2 осталось ISR=1. Что произойдёт?","Ошибки записи, durability, восстановление ISR, не менять гарантии без согласования."]],["PostgreSQL",["Почему долго живущая транзакция мешает vacuum?","MVCC, xmin, dead tuples, snapshot и locks."],["Как расследовать рост WAL при наличии replication slots?","LSN, inactive slot, archiving, disk growth, retention, не удалять WAL вручную."]],["Patroni / etcd",["Чем switchover отличается от failover?","Плановое vs аварийное переключение, lag, candidate, fencing."],["Что произойдёт при потере большинства DCS и как исключить split-brain?","Leader lock, TTL, failsafe configuration, quorum, demotion, проверка ролей."]],["Redis",["Какие метрики покажут, что кеш перестал помогать БД?","Hits/misses, expired/evicted keys, latency, backend QPS."],["Как спроектировать защиту от cache stampede?","TTL jitter, single-flight, stale policy, load shedding, capacity."]]];
for(const [topic,...questions] of EXTRA){const row=BANK.find(r=>r[0]===topic);if(row)row.push(...questions)}
BANK.push(...[["RabbitMQ",["Чем exchange отличается от queue?","Routing, bindings, storage."],["Как ограничить повторную доставку poison messages?","Ack/nack, retries, DLX, idempotency."],["Чем publisher confirm отличается от consumer ack?","Граница подтверждения, брокер vs consumer."],["Как расследовать рост messages_unacknowledged?","Prefetch, consumer latency, downstream bottleneck, backpressure."]],["Nginx / HAProxy",["Чем L4 балансировка отличается от L7?","Соединения, протокол, routing и health."],["Как настроить безопасное read/write routing PostgreSQL?","Leader-aware checks, replica lag, pools, failover."],["Чем 502 отличается от 504?","Upstream response/connect failure и timeout, logs."],["Почему retry POST может создать дубли?","Idempotency keys, retry budget, timeouts, side effects."]],["Logs / OpenTelemetry",["Что такое trace ID и span?","Корреляция запроса, родительские связи, события."],["Как диагностировать задержку асинхронной обработки через Kafka?","Propagation, producer/consumer spans, lag, sampling, metrics."],["Когда метрики предпочтительнее логов?","Агрегаты, latency, cardinality, стоимость."],["Как ограничить стоимость телеметрии без потери критичных сигналов?","Sampling, cardinality, retention, PII, SLO."]],["etcd / Consensus",["Почему 3 голосующих узла выдерживают отказ одного?","Majority, quorum, независимость отказов."],["Как восстановить DCS после потери большинства?","Проверенный backup, согласованное восстановление, fencing, не создавать split-brain."],["Чем linearizable read отличается от потенциально устаревшего чтения?","Кворум/лидер, consistency, latency."],["Как оценить влияние дисковой задержки на consensus?","fsync, heartbeat/election, commit latency, monitoring, capacity."]]]);
function pickQuestion(row,previous,sequence){const level=questionLevel(previous);return row[1+level+2*(sequence%2)]}
const $=id=>document.getElementById(id);
const text=(id,v)=>{$(id).textContent=v??"—"};
const elem=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n};
let state=null,csrf=null,deadline=null,activeQuestion=null,records=[];
try{const parsed=JSON.parse(localStorage.getItem("academy-review-v1")||"[]");if(Array.isArray(parsed))records=parsed.filter(r=>r&&BANK.some(b=>b[0]===r.topic)&&Number.isInteger(r.score)&&r.score>=0&&r.score<=4&&Number.isFinite(Date.parse(r.due)))}catch{}
function alertMsg(msg){text("alert",msg);$("alert").hidden=!msg}
async function api(path,post=false){
  const r=await fetch(path,post?{method:"POST",headers:{"X-Academy-CSRF":csrf}}:{cache:"no-store"});
  const data=await r.json();
  if(!r.ok)throw Error(data.error||"Request blocked");
  return data;
}
// Visual preferences are deliberately separate from learning and draft storage.
const THEME_KEY="academy-ui-theme-v12";
function setTheme(theme, remember=false){
  const value=theme==="dark"?"dark":"light";
  document.documentElement.dataset.theme=value;
  const toggle=$("theme-toggle");
  toggle.setAttribute("aria-pressed",String(value==="dark"));
  toggle.textContent=value==="dark"?"Светлая тема":"Тёмная тема";
  if(remember){try{localStorage.setItem(THEME_KEY,value)}catch{/* preference is session-only */}}
}
function setMobileMenu(open){
  $("workspace-nav").dataset.mobileOpen=String(open);
  $("menu-toggle").setAttribute("aria-expanded",String(open));
}
let savedTheme="light";
try{savedTheme=localStorage.getItem(THEME_KEY)||"light"}catch{}
setTheme(savedTheme);
setMobileMenu(false);
$("theme-toggle").addEventListener("click",()=>setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark",true));
$("menu-toggle").addEventListener("click",()=>setMobileMenu($("workspace-nav").dataset.mobileOpen!=="true"));
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&$("workspace-nav").dataset.mobileOpen==="true"){
    setMobileMenu(false);
    if(window.matchMedia("(max-width: 800px)").matches)$("menu-toggle").focus();
  }
});
function page(id){
  const target=document.getElementById(id);
  if(!target||!target.classList.contains("page"))return;
  const focusWasInMenu=$("workspace-nav").contains(document.activeElement)
    &&window.matchMedia("(max-width: 800px)").matches;
  document.querySelectorAll(".page").forEach(n=>n.hidden=n!==target);
  document.querySelectorAll("nav button").forEach(n=>{
    const active=n.dataset.page===id;
    n.classList.toggle("active",active);
    if(active){
      n.setAttribute("aria-current","page");
      const group=n.closest("details");
      if(group)group.open=true;
      text("workspace-current",n.textContent.trim());
    }else n.removeAttribute("aria-current");
  });
  setMobileMenu(false);
  if(id==="review")renderReview();
  if(focusWasInMenu){
    const heading=target.querySelector("h1");
    if(heading){heading.setAttribute("tabindex","-1");heading.focus({preventScroll:true})}
  }
  window.scrollTo(0,0);
}
document.querySelectorAll("nav button").forEach(b=>b.addEventListener("click",()=>page(b.dataset.page)));
async function copy(value,feedback=null){
  try{
    await navigator.clipboard.writeText(value);
    if(feedback)feedback.textContent="Скопировано. Вставь в терминал.";
    else alertMsg("Скопировано. Вставь в терминал или ChatGPT.");
  }catch{
    if(feedback)feedback.textContent="Копирование недоступно. Выдели код выше вручную.";
    else alertMsg("Копирование недоступно. Выдели вручную: "+value);
  }
}
document.querySelectorAll(".prompt").forEach(b=>b.addEventListener("click",()=>{
  const feedback=b.closest(".command-actions")?.querySelector(".copy-feedback")||null;
  copy(b.dataset.prompt,feedback);
}));
function renderState(d){
  text("week",d.week+"/"+d.weeks);text("revision",d.revision);
  text("task",d.task.id+" · "+d.task.topic);text("next",d.task.status+" — "+d.next);
  text("home-task-title",d.task.id+" · "+d.task.topic);text("home-task-next",d.task.status+" — "+d.next);
  text("lab-title",d.task.id+" · "+d.task.topic);text("lab-next",d.next);
  text("commit","Control "+d.commit+" · "+new Date(d.checked_at).toLocaleString("ru-RU",{timeZone:"Europe/Moscow"})+" МСК");
  $("workflow").replaceChildren(...Object.entries(d.workflow).map(([k,v])=>elem("span",k+": "+v,"chip "+(v==="completed"?"done":""))));
  $("roadmap-list").replaceChildren(...d.roadmap.map(r=>{const x=elem("details");const n=Number(r[0]);x.open=n===d.week;x.append(elem("summary","Неделя "+r[0]+" · "+r[1]+(x.open?" (текущая)":"")),elem("p",r[2]));return x}));
  $("roadmap-proposal").replaceChildren(...(d.proposed_roadmap||[]).map(r=>{const x=elem("article",undefined,"row-card");x.append(elem("strong","Неделя "+r[0]+" · "+r[1]),elem("p",r[2]));return x}));
  $("skill-proposal").replaceChildren(...(d.proposed_skills||[]).map(r=>{const x=elem("article",undefined,"row-card");x.append(elem("strong",r[0]),elem("p","Предложенная цель: "+r[3]),elem("small",r[4]));return x}));
  $("skill-list").replaceChildren(...d.skills.map(r=>{const x=elem("article",undefined,"row-card");x.append(elem("strong",r[0]),elem("p","Подтверждено: "+r[2]+" · Цель: "+r[3]),elem("small",r[4]));return x}));
}
async function sync(){
  $("sync").disabled=true;
  try{const d=await api("/api/state");state=d;renderState(d);text("connection","GitHub · прочитано");$("connection").className="tag good";alertMsg("")}
  catch(e){state=null;text("home-task-title","STATE недоступен");text("home-task-next","Не удалось прочитать каноническое состояние. Обнови STATE после проверки GitHub.");text("connection","BLOCKED / устарело");$("connection").className="tag bad";alertMsg("Синхронизация не выполнена. Старые данные не являются актуальным STATE. "+e.message)}
  finally{$("sync").disabled=false}
}
$("sync").addEventListener("click",sync);
const PLANS={20:"5 мин повторение · 10 мин практика · 5 мин проверка",60:"10 мин повторение · 35 мин практика · 10 мин диагностика · 5 мин проверка",120:"20 мин повторение · 60 мин практика · 25 мин отказы · 15 мин защита"};
$("begin").addEventListener("click",()=>{if(!state){alertMsg("Сначала синхронизируй STATE.");return}if(!["assigned","in_progress","revision_required"].includes(state.task.status)){alertMsg("Следуй текущему статусу: ревью, экзамен или Orchestrator.");return}const n=Number($("duration").value);deadline=Date.now()+n*60000;text("plan",PLANS[n]);text("lab-command","python3 academy.py start --minutes "+n);alertMsg("Сессия началась локально. Открой раздел Лаборатория для команд. STATE не изменён.")});
setInterval(()=>{if(deadline!==null){const s=Math.max(0,Math.ceil((deadline-Date.now())/1000));text("timer",Math.floor(s/60)+":"+String(s%60).padStart(2,"0"));if(!s){deadline=null;alertMsg("Сессия закончилась. Зафиксируй результат.")}}},500);
$("copy-lab").addEventListener("click",()=>copy($("lab-command").textContent));
$("trust").addEventListener("change",()=>{$("test").disabled=!$("trust").checked||!csrf});
$("test").addEventListener("click",async()=>{if(!$("trust").checked||!csrf)return;$("test").disabled=true;text("test-output","Тестирование…");if(window.academyLabResult)window.academyLabResult(null);try{const r=await api("/api/test",true);text("test-output","Exit code: "+r.exit_code+"\n"+r.output+"\n"+r.note);if(window.academyLabResult)window.academyLabResult(r)}catch(e){text("test-output","BLOCKED: "+e.message)}finally{$("trust").checked=false;$("test").disabled=true}});
BANK.forEach(r=>{const o=elem("option",r[0]);o.value=r[0];$("topic").append(o)});
const questionSequence=new Map();
function nextQuestion(){
  if(window.academyReviewPending&&window.academyReviewPending()){alertMsg("Сначала повтори отправку сохранённой попытки во вкладке Повторение.");return;}
  const topic=$("topic").value;const row=BANK.find(r=>r[0]===topic);
  const prior=records.find(r=>r.topic===topic);const seq=questionSequence.get(topic)||0;
  const selected=pickQuestion(row,prior,seq);questionSequence.set(topic,seq+1);
  activeQuestion={topic,criteria:selected[1]};
  text("question-text",selected[0]);$("answer").value="";$("criteria").hidden=true;$("ratings").hidden=true;text("review-note","");
}
$("question").addEventListener("click",nextQuestion);
$("topic").addEventListener("change",nextQuestion);
$("rubric").addEventListener("click",()=>{if(!activeQuestion||!$("answer").value.trim()){text("review-note","Сначала ответь самостоятельно.");return}text("criteria",activeQuestion.criteria);$("criteria").hidden=false;$("ratings").hidden=false});
function persist(){try{localStorage.setItem("academy-review-v1",JSON.stringify(records));return true}catch{return false}}
$("save-review").addEventListener("click",()=>{if(!activeQuestion||$("ratings").hidden)return;const r=reviewRecord(activeQuestion.topic,Number($("rating").value));records=records.filter(x=>x.topic!==r.topic);records.push(r);text("review-note",persist()?"Самооценка записана локально. Не изменяет SKILL_MATRIX.":"Запись только в памяти текущей страницы.");$("ratings").hidden=true});
function renderReview(){
  $("review-list").replaceChildren();
  if(!records.length){$("review-list").append(elem("p","Пока нет локальных самооценок.","dim"));return}
  for(const r of reviewOrder(records)){const x=elem("article",undefined,"row-card");x.append(elem("strong",r.topic),elem("p","Самооценка: "+r.score+" · "+(new Date(r.due)<=new Date()?"Пора повторить":"До "+new Date(r.due).toLocaleDateString("ru-RU"))));const b=elem("button","Повторить","secondary");b.addEventListener("click",()=>{$("topic").value=r.topic;nextQuestion();page("interview")});x.append(b);$("review-list").append(x)}
}
$("clear-review").addEventListener("click",()=>{if(confirm("Удалить локальные самооценки?")){records=[];persist();renderReview()}});
$("load-handoffs").addEventListener("click",async()=>{const b=$("load-handoffs");b.disabled=true;text("handoff-info","Чтение GitHub…");$("handoff-list").replaceChildren();try{const d=await api("/api/handoffs");text("handoff-info","Тестовых: "+d.test_count+" · Групп live: "+d.items.length+" · "+d.note);for(const i of d.items){const x=elem("article",undefined,"row-card");x.append(elem("strong",i.id),elem("p",i.status));for(const n of i.numbers){if(!Number.isSafeInteger(n)||n<1)continue;const a=elem("a","#"+n+" ↗ ");a.href="https://github.com/dneprov808-sudo/devops-lead-lab/issues/"+n;a.target="_blank";a.rel="noopener noreferrer";x.append(a)}$("handoff-list").append(x)}}catch(e){text("handoff-info","BLOCKED: "+e.message+" · Проверь gh auth status.")}finally{b.disabled=false}});
api("/api/session").then(r=>csrf=r.csrf).catch(e=>alertMsg(e.message));nextQuestion();sync();
