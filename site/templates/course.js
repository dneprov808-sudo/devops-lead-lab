"use strict";
// Route derives from content IDs, never from the current chapter count or array index.
const COURSE_POSITION="academy-site-course-position-v1";
const COURSE_READING="academy-site-reading-v1";
const COURSE_LEVELS=["foundation","senior","lead"];
function courseRoute(data){
  const guides=new Map(data.guides.map(g=>[g.id,g]));
  return data.course.modules.flatMap(module=>module.topics.flatMap(topic=>{
    const guide=guides.get(topic.id);
    if(!guide)throw Error("Unknown guide "+topic.id);
    const chapters=[...guide.chapters].sort((a,b)=>COURSE_LEVELS.indexOf(a.level)-COURSE_LEVELS.indexOf(b.level));
    const item=(kind,chapter=null)=>({id:kind+":"+(chapter?.id||topic.id),kind,module,topic,guide,chapter});
    return [item("intro"),...chapters.map(c=>item("chapter",c)),item("scenario"),item("practice")];
  }));
}
function courseReading(raw){
  try{
    const v=JSON.parse(raw||"null");
    if(v&&Array.isArray(v.seen))return {seen:[...new Set(v.seen.filter(x=>typeof x==="string"))],last:v.last&&typeof v.last.id==="string"&&typeof v.last.chapter==="string"?v.last:null};
  }catch{}
  return {seen:[],last:null};
}
function courseStart(route,reading,saved){
  const current=route.findIndex(s=>s.id===saved);
  if(current>=0)return current;
  const next=route.findIndex(s=>s.kind==="chapter"&&!reading.seen.includes(s.chapter.id));
  if(next<0)return route.length-1;
  const step=route[next],already=route.some(s=>s.topic.id===step.topic.id&&s.kind==="chapter"&&reading.seen.includes(s.chapter.id));
  return already?next:route.findIndex(s=>s.topic.id===step.topic.id&&s.kind==="intro");
}
function courseMark(reading,step){
  if(step.kind!=="chapter")return reading;
  return {seen:[...new Set([...reading.seen,step.chapter.id])],last:{id:step.guide.id,chapter:step.chapter.id}};
}
function courseStats(route,reading){
  const chapters=route.filter(s=>s.kind==="chapter"),seen=new Set(reading.seen);
  return {total:chapters.length,done:chapters.filter(s=>seen.has(s.chapter.id)).length};
}
function courseLag(inRate,outRate,minutes){
  return Math.max(0,Math.round((inRate-outRate)*60*minutes));
}
function courseBudget(requests,bad,slo){
  const allowed=requests*(100-slo)/100;
  return {allowed:Math.round(allowed*100)/100,spent:allowed>0?Math.round(bad/allowed*100):null,success:requests?100*(requests-bad)/requests:null};
}
function courseReadiness(pods){return pods.filter(p=>p).length}
function courseScenario(scenario,index){
  if(!Number.isInteger(index)||index<0||index>=scenario.choices.length)return null;
  return {correct:index===scenario.correct,feedback:scenario.feedback[index]};
}
function courseSearch(route,query){
  const terms=String(query||"").trim().toLocaleLowerCase("ru-RU").split(/\s+/).filter(Boolean);
  if(!terms.length)return [];
  return route.filter(s=>s.kind==="intro"||s.kind==="chapter").filter(s=>{
    const hay=[s.guide.topic,s.guide.id,s.chapter?.title,s.chapter?.id,s.module.title].join(" ").toLocaleLowerCase("ru-RU");
    return terms.every(term=>hay.includes(term));
  }).slice(0,12);
}
function courseInit(){
  const $=id=>document.getElementById(id);
  const data=JSON.parse($("dataset").textContent);
  const route=courseRoute(data);
  const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
  const B=(text,fn,cls)=>{const b=E("button",text,cls);b.type="button";b.addEventListener("click",fn);return b};
  const A=(text,href)=>{const a=E("a",text);a.href=href;if(href.startsWith("https://")){a.target="_blank";a.rel="noopener noreferrer"}return a};
  let reading=courseReading(null),saved=null,stored=false;
  try{reading=courseReading(localStorage.getItem(COURSE_READING));saved=localStorage.getItem(COURSE_POSITION);stored=true}catch{}
  let current=courseStart(route,reading,saved),solved=new Set(),chapterPart=0;
  const narrow=()=>typeof matchMedia==="function"&&matchMedia("(max-width: 900px)").matches;
  const motion=()=>typeof matchMedia==="function"&&!matchMedia("(prefers-reduced-motion: reduce)").matches?"smooth":"auto";
  const focusKey="academy-site-focus-v1";
  function setRail(hidden,remember=false){
    $("course-route").hidden=hidden;
    $("course-route-toggle").setAttribute("aria-expanded",String(!hidden));
    $("course-route-toggle").textContent=hidden?"Показать маршрут":"Скрыть маршрут";
    $("course-focus").setAttribute("aria-pressed",String(hidden));
    $("course-focus").textContent=hidden?"Выйти из режима чтения":"Режим чтения";
    if(remember)try{localStorage.setItem(focusKey,hidden?"1":"0")}catch{}
  }
  function persist(){
    try{localStorage.setItem(COURSE_READING,JSON.stringify(reading));localStorage.setItem(COURSE_POSITION,route[current].id);stored=true}catch{stored=false}
  }
  function go(index,focus=true){
    if(!Number.isInteger(index)||index<0||index>=route.length)return;
    current=index;chapterPart=0;$("course-search").value="";$("course-search-results").replaceChildren();persist();render();
    if(focus){
      if(narrow())setRail(true);
      $("lesson").focus({preventScroll:true});$("lesson").scrollIntoView({block:"start",behavior:motion()});
    }
  }
  function section(parent,title,text){
    const box=E("section",undefined,"course-section");
    box.append(E("h3",title));for(const p of Array.isArray(text)?text:[text])box.append(E("p",p));
    parent.append(box);return box;
  }
  function notice(parent,text){parent.append(E("p",text,"course-notice"))}
  function code(parent,text,label){
    const box=E("div",undefined,"course-code"),bar=E("div",undefined,"course-codebar"),pre=E("pre",text);
    const copy=B("Копировать",async()=>{
      try{await navigator.clipboard.writeText(text);copy.textContent="Скопировано"}
      catch{copy.textContent="Выдели и скопируй";const range=document.createRange();range.selectNodeContents(pre);const sel=getSelection();sel.removeAllRanges();sel.addRange(range)}
    });
    bar.append(E("span",label),copy);box.append(bar,pre);parent.append(box);
  }
  function slider(parent,label,min,max,step,value,change){
    const wrap=E("label",undefined,"course-slider"),top=E("span",label),out=E("strong",value),input=E("input");input.type="range";input.min=min;input.max=max;input.step=step;input.value=value;
    wrap.append(top,out,input);parent.append(wrap);
    input.addEventListener("input",()=>{out.textContent=input.value;change(Number(input.value))});return input;
  }
  function metric(label,value){
    const card=E("div",undefined,"course-model-metric"),out=E("strong",value);
    card.append(E("small",label),out);return {card,out};
  }
  function model(parent,topic){
    const box=E("section",undefined,"course-model");
    box.append(E("span","ПОПРОБУЙ САМ · УПРОЩЁННАЯ МОДЕЛЬ","course-eyebrow"));
    if(topic.id==="k8s"){
      box.append(E("h3","Readiness: куда Service отправит трафик?"),E("p","Нажми на Pod, чтобы изменить его readiness. Все три Pod Running; модель показывает только доступность для обычного трафика."));
      const pods=[true,true,true],grid=E("div",undefined,"course-model-grid"),result=E("p",undefined,"course-model-result");result.setAttribute("role","status");
      const buttons=pods.map((_,i)=>B("",()=>{pods[i]=!pods[i];draw()}));
      function draw(){
        buttons.forEach((b,i)=>{b.textContent="Pod "+(i+1)+" · "+(pods[i]?"Ready":"Not Ready");b.setAttribute("aria-pressed",String(pods[i]))});
        result.textContent="Готовых конечных точек: "+courseReadiness(pods)+"/3. "+(courseReadiness(pods)===0?"Нет готовых backend для обычного трафика.":"Service может направлять обычный трафик в готовые Pod.");
      }
      const flow=E("div",undefined,"course-flowline");
      for(const [i,label] of ["Client","Service","EndpointSlice"].entries()){
        if(i)flow.append(E("b","→"));flow.append(E("span",label));
      }
      grid.append(...buttons);box.append(flow,grid,result);draw();
    }else if(topic.id==="kafka"){
      box.append(E("h3","Почему растёт consumer lag?"),E("p","Начальный lag = 0. Постоянные скорости, одна условная очередь, без rebalance и retries. Меняй скорость producer и consumer."));
      let incoming=800,outgoing=620,minutes=5;
      const result=E("p",undefined,"course-model-result"),meter=E("div",undefined,"course-meter"),fill=E("div");meter.append(fill);
      const metrics=E("div",undefined,"course-model-metrics"),inputRate=metric("Вход · msg/s",incoming),outputRate=metric("Обработка · msg/s",outgoing),backlog=metric("Lag · сообщений",0);
      metrics.append(inputRate.card,outputRate.card,backlog.card);box.append(metrics);
      const draw=()=>{const lag=courseLag(incoming,outgoing,minutes);inputRate.out.textContent=incoming;outputRate.out.textContent=outgoing;backlog.out.textContent=lag.toLocaleString("ru-RU");backlog.card.setAttribute("data-state",lag?"warning":"normal");result.textContent="Накопленный lag: "+lag.toLocaleString("ru-RU")+" сообщений за "+minutes+" мин. "+(incoming>outgoing?"Вход быстрее обработки.":"Очередь не растёт при нулевом начальном lag.");fill.style.width=Math.min(100,lag/(1500*60*minutes)*100)+"%"};
      meter.setAttribute("aria-hidden","true");
      slider(box,"Producer · сообщений/с",0,1500,10,incoming,v=>{incoming=v;draw()});
      slider(box,"Consumer · сообщений/с",0,1500,10,outgoing,v=>{outgoing=v;draw()});
      slider(box,"Интервал · минуты",1,15,1,minutes,v=>{minutes=v;draw()});
      box.append(E("small","Шкала: доля от максимального lag при 1500 msg/s и нулевой обработке."),meter,result);draw();
    }else if(topic.id==="sre"){
      box.append(E("h3","Как расходуется error budget"),E("p","100 000 запросов в одном окне; SLO 99,9%. Сдвинь число плохих событий."));
      const result=E("p",undefined,"course-model-result"),meter=E("div",undefined,"course-meter"),fill=E("div");meter.append(fill);
      const metrics=E("div",undefined,"course-model-metrics"),limit=metric("Бюджет ошибок",100),spent=metric("Потрачено","75%"),sli=metric("Фактический SLI","99.925%");
      metrics.append(limit.card,spent.card,sli.card);box.append(metrics);
      const draw=bad=>{const s=courseBudget(100000,bad,99.9);limit.out.textContent=s.allowed;spent.out.textContent=s.spent+"%";sli.out.textContent=s.success.toFixed(3)+"%";spent.card.setAttribute("data-state",s.spent>100?"warning":"normal");result.textContent="Допустимо: "+s.allowed+" плохих. Израсходовано "+s.spent+"%. SLI "+s.success.toFixed(3)+"%. "+(s.spent>100?"SLO нарушен в этом окне.":"Бюджет не превышен.");fill.style.width=Math.min(100,s.spent)+"%"};
      meter.setAttribute("aria-hidden","true");
      slider(box,"Плохие события",0,300,1,75,draw);box.append(meter,result);draw(75);
    }else if(topic.id==="terraform"){
      box.append(E("h3","Configuration → plan → apply"),E("p","Учебная модель: управляемый объект имеет условный параметр capacity, обновляемый без replacement. Это не настоящий Terraform provider."));
      let actual=2,desired=2,planned=null;
      const state=E("p",undefined,"course-model-result"),plan=B("Рассчитать plan",()=>{planned=desired;draw()}),apply=B("Применить сохранённый plan",()=>{if(planned!==null){actual=planned;planned=null;draw()}});
      const metrics=E("div",undefined,"course-model-metrics"),config=metric("Configuration",desired),planMetric=metric("Plan","—"),resource=metric("Реальный ресурс",actual);
      metrics.append(config.card,planMetric.card,resource.card);box.append(metrics);
      state.setAttribute("role","status");
      const draw=()=>{config.out.textContent=desired;resource.out.textContent=actual;planMetric.out.textContent=planned===null?"—":planned===actual?"Без изменений":actual+" → "+planned;state.textContent="Факт: "+actual+" · Желаемое: "+desired+" · "+(planned===null?"Plan ещё не рассчитан.":planned===actual?"Plan: no changes.":"Plan: update "+actual+" → "+planned);apply.disabled=planned===null};
      slider(box,"Желаемая capacity",1,8,1,desired,v=>{desired=v;planned=null;draw()});box.append(plan,apply,state);draw();
    }else return;
    parent.append(box);
  }
  function renderIntro(root,s){
    root.append(E("span","01 / ПОНИМАНИЕ","course-eyebrow"),E("h2",s.guide.topic+": с чего начать"));
    section(root,"Сначала пойми картину целиком",s.topic.overview);
    const walk=E("section",undefined,"course-walkthrough");
    walk.append(E("h3","Разберём на конкретном примере — по шагам"));
    s.topic.walkthrough.forEach((text,index)=>{const part=E("section",undefined,"course-walk-step");part.append(E("span","ШАГ "+(index+1),"course-eyebrow"),E("p",text));walk.append(part)});
    root.append(walk);
    section(root,"Что нужно получить на выходе",s.module.goal);
    model(root,s.topic);
    section(root,"Как будем изучать",["Сначала базовые главы, затем Senior и Lead. Открывай примеры и диагностические команды; не выполняй их автоматически. После чтения тебя ждёт ситуационная проверка и конкретный следующий шаг практики."]);
  }
  function renderChapter(root,s){
    const c=s.chapter,level={foundation:"Основы",senior:"Senior",lead:"Lead"}[c.level]||c.level;
    root.append(E("span","02 / ТЕОРИЯ · "+level,"course-eyebrow"),E("h2",c.title),E("p","Три части урока · механизм, пример и самостоятельное объяснение","course-lesson-meta"));
    const tabs=E("div",undefined,"course-tabs"),body=E("div",undefined,"course-chapter-body");
    const names=["Механизм","Production и пример","Команды и самопроверка"];
    function draw(){
      tabs.replaceChildren(...names.map((name,i)=>{const b=B((i+1)+" · "+name,()=>{chapterPart=i;draw()});b.setAttribute("aria-pressed",String(i===chapterPart));return b}));
      body.replaceChildren();
      if(chapterPart===0){section(body,"Как это работает",c.explanation);}
      if(chapterPart===1){section(body,"Что происходит в production",c.production);section(body,"Разбери пример",c.example);if(c.snippet){code(body,c.snippet.code,c.snippet.language.toUpperCase());section(body,"Что делает конфигурация",c.snippet.notes)}}
      if(chapterPart===2){notice(body,"Команды — диагностический пример, не скрипт для запуска целиком. Проверь локальный стенд, версии, права и контекст.");code(body,c.commands,"ДИАГНОСТИКА");section(body,"Объясни без подсказки",c.question);body.append(A("Официальная документация ↗",c.source));}
      const controls=E("div",undefined,"course-actions");
      if(chapterPart>0)controls.append(B("← Предыдущая часть",()=>{chapterPart--;draw()}));
      if(chapterPart<2)controls.append(B("Следующая часть →",()=>{chapterPart++;draw()},"primary"));
      else controls.append(B(reading.seen.includes(c.id)?"Глава уже отмечена · Далее →":"Отметить ознакомление и продолжить →",()=>{reading=courseMark(reading,s);go(current+1)},"primary"));
      body.append(controls);
    }
    root.append(tabs,body);draw();
  }
  function renderScenario(root,s){
    const q=s.topic.scenario;
    root.append(E("span","03 / САМОПРОВЕРКА","course-eyebrow"),E("h2","Прими инженерное решение"));
    section(root,"Ситуация",q.prompt);
    const options=E("div",undefined,"course-options"),status=E("div",undefined,"course-feedback");status.setAttribute("role","status");
    const buttons=q.choices.map((choice,i)=>B(choice,()=>{const result=courseScenario(q,i);buttons.forEach((b,j)=>{b.setAttribute("aria-pressed",String(i===j));b.setAttribute("data-result",i===j?(result.correct?"correct":"incorrect"):"")});status.setAttribute("data-result",result.correct?"correct":"incorrect");status.replaceChildren(E("strong",result.correct?"Обоснованный выбор":"Попробуй ещё раз"),E("p",result.feedback));if(result.correct)solved.add(s.id);else solved.delete(s.id);next.disabled=!solved.has(s.id)}));
    const next=B("К практике →",()=>go(current+1),"primary");next.disabled=!solved.has(s.id);
    options.append(...buttons);root.append(options,status,next);
    notice(root,"Это учебный кейс с разбором, не независимый экзамен. Можно вернуться к теории или пропустить проверку через общую навигацию.");
  }
  function renderPractice(root,s){
    root.append(E("span","04 / ПРАКТИКА И EVIDENCE","course-eyebrow"),E("h2","Что делать руками"));
    section(root,"Задача",s.topic.practice.task);
    section(root,"Как проверить результат",s.topic.practice.evidence);
    if(s.topic.id==="linux"){
      const active=E("section",undefined,"course-runbook");
      active.append(E("h3","Основная лаборатория: проверь STATE"),E("p","Если в каноническом STATE назначена LAB-001, начни с её исходной спецификации, а не с общего сетевого sandbox. Реализация остаётся самостоятельной."),A("Проверить актуальную задачу ↗","https://github.com/dneprov808-sudo/devops-lead-lab/blob/academy/orchestration-v1/orchestration/STATE.yaml"),E("p","Спецификация, требования и оригинальные тесты:"),A("LAB-001 · README ↗","https://github.com/dneprov808-sudo/devops-lead-lab/blob/training/lead-cohort-01/labs/01-http-probe/README.md"));
      const main=data.runbooks.find(r=>r.id==="deploy-main-lab");
      if(main){const d=E("details");d.append(E("summary","Порядок запуска LAB-001"),E("p",main.intro));for(const step of main.steps){d.append(E("h4",step.title));code(d,step.code,"КОМАНДЫ · WSL")}section(d,"Критерий результата",main.result);active.append(d)}
      root.append(active);
    }
    const rb=data.runbooks.find(r=>r.id===s.topic.practice.runbook);
    if(rb){
      const panel=E("section",undefined,"course-runbook");panel.append(E("h3",rb.title),E("p",rb.intro));
      notice(panel,"Выполняй только нужные этапы в указанной локальной среде. Проверь STATE и prerequisites. Никаких автоматических команд или отметок об успехе.");
      for(const [i,step] of rb.steps.entries()){const d=E("details");d.open=false;d.append(E("summary",(i+1)+" · "+step.title));code(d,step.code,"КОМАНДЫ · WSL");panel.append(d)}
      section(panel,"Критерий результата и остановка",rb.result);root.append(panel);
    }else notice(root,"Отдельная среда для темы не назначена. Не разворачивай случайный стенд.");
    const profile=data.manifest.find(m=>m.id===s.topic.id),labs=data.labs.filter(l=>profile?.profiles.includes(l.profile));
    for(const l of labs){
      const d=E("details");d.append(E("summary",l.id+" · "+l.title),E("p",l.level+" · "+l.minutes+" мин"));
      const list=E("ol");for(const task of l.tasks)list.append(E("li",task));d.append(E("h3","Условия задачи"),list);
      const evidence=E("ul");for(const item of l.evidence)evidence.append(E("li",item));d.append(E("h3","Доказательства"),evidence);root.append(d);
    }
    const a=E("div",undefined,"course-actions");a.append(A("Открыть полную библиотеку и стенды →","library.html"),A("Тренировать ответы на собеседование →","interview.html"));root.append(a);
    notice(root,"Не отмечай лабораторию выполненной без запуска исходных тестов и проверки evidence. Следующая тема — учебный маршрут, не изменение активной задачи.");
  }
  function render(){
    const s=route[current],stats=courseStats(route,reading),percent=stats.total?Math.round(stats.done/stats.total*100):0;
    $("course-count").textContent=stats.done+" / "+stats.total;
    $("course-percent").textContent=percent+"%";
    $("course-meter").style.width=percent+"%";$("course-meter").parentNode.setAttribute("aria-valuenow",String(percent));
    $("course-storage").textContent=stored?"Отметки в этом браузере · не подтверждение квалификации":"Хранилище недоступно · текущая сессия";
    $("course-resume").textContent=stats.done?"Продолжить с текущего шага →":"Начать / продолжить →";
    const weeks=$("course-weeks");weeks.replaceChildren();
    for(const m of data.course.modules){
      const steps=route.filter(x=>x.module.id===m.id),stat=courseStats(steps,reading),open=m.id===s.module.id,d=E("details",undefined,"course-week");d.open=open;
      const summary=E("summary"),weekTitle=E("span",undefined,"course-week-title"),weekMeter=E("span",undefined,"course-week-meter"),weekFill=E("span");
      weekFill.style.width=(stat.total?stat.done/stat.total*100:0)+"%";weekMeter.append(weekFill);weekMeter.setAttribute("aria-hidden","true");
      weekTitle.append(E("span",m.title),E("small",stat.done+" / "+stat.total+" глав"),weekMeter);
      summary.append(E("span",String(m.week).padStart(2,"0"),"course-week-number"),weekTitle);summary.setAttribute("aria-label","Неделя "+m.week+" · "+m.title+", "+stat.done+" из "+stat.total+" глав");d.append(summary);
      for(const t of m.topics){
        const r=route.filter(x=>x.topic.id===t.id),active=t.id===s.topic.id,b=B(r[0].guide.topic,()=>go(route.indexOf(r[0])));
        b.setAttribute("aria-current",String(active));d.append(b);
        if(active){const list=E("div",undefined,"course-step-list");
          for(const x of r){const label=x.kind==="intro"?"Введение":x.kind==="scenario"?"Самопроверка":x.kind==="practice"?"Практика":(reading.seen.includes(x.chapter.id)?"✓ ":"")+x.chapter.title;const step=B(label,()=>go(route.indexOf(x)));step.setAttribute("aria-current",String(s.id===x.id));list.append(step)}d.append(list)}
      }weeks.append(d);
    }
    const topicSteps=route.filter(x=>x.topic.id===s.topic.id);
    const kindLabels={intro:"Введение",chapter:"Теория",scenario:"Самопроверка",practice:"Практика"};
    $("course-current-title").textContent="Сейчас: неделя "+s.module.week+" · "+s.guide.topic+" · "+(s.chapter?.title||kindLabels[s.kind]);
    const context=$("course-context");
    const stages=E("div",undefined,"course-stagebar");
    stages.setAttribute("aria-label","Этапы текущей темы");
    for(const kind of ["intro","chapter","scenario","practice"]){
      const first=topicSteps.find(x=>x.kind===kind);
      const stage=B(kindLabels[kind],()=>go(route.indexOf(first)));
      if(s.kind===kind)stage.setAttribute("aria-current","step");
      stages.append(stage);
    }
    context.replaceChildren(E("div","НЕДЕЛЯ "+s.module.week+" / "+data.course.modules.length+" · "+s.guide.topic,"course-eyebrow"),E("p","Шаг "+(current+1)+" из "+route.length+" · "+s.module.title,"muted"),stages);
    const root=$("course-content");root.replaceChildren();
    ({intro:renderIntro,chapter:renderChapter,scenario:renderScenario,practice:renderPractice})[s.kind](root,s);
    const following=route[current+1];
    if(following)root.append(E("p","Далее: "+following.guide.topic+" · "+(following.chapter?.title||kindLabels[following.kind]),"course-next-preview"));
    const nav=$("course-nav"),prev=B("← Предыдущий шаг",()=>go(current-1)),next=B(current===route.length-1?"Маршрут завершён":"Следующий шаг →",()=>go(current+1));
    prev.disabled=current===0;next.disabled=current===route.length-1;nav.replaceChildren(prev,E("span","Можно пропустить; отметка не ставится автоматически.","muted"),next);
  }
  $("course-search").addEventListener("input",()=>{
    const query=$("course-search").value,results=$("course-search-results");
    results.replaceChildren();
    if(!query.trim())return;
    const found=courseSearch(route,query);
    if(!found.length){results.append(E("p","Совпадений нет. Попробуй другое название."));return}
    for(const step of found){
      const label=step.chapter?step.guide.topic+" · "+step.chapter.title:step.guide.topic+" · Введение";
      results.append(B(label,()=>go(route.indexOf(step))));
    }
  });
  $("course-resume").addEventListener("click",()=>go(current));
  const toggle=$("course-route-toggle"),rail=$("course-route");
  const toggleRail=()=>setRail(!rail.hidden,true);
  toggle.addEventListener("click",toggleRail);$("course-focus").addEventListener("click",toggleRail);
  let initialHidden=narrow();try{const pref=localStorage.getItem(focusKey);if(pref!==null&&!narrow())initialHidden=pref==="1"}catch{}
  setRail(initialHidden);
  document.addEventListener?.("keydown",event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"&&!event.altKey){
      event.preventDefault();setRail(false);$("course-search").focus();
    }
  });
  $("course-search").addEventListener("keydown",event=>{
    if(event.key==="Escape"){$("course-search").value="";$("course-search-results").replaceChildren();event.preventDefault()}
  });
  render();
}
if(typeof document!=="undefined")courseInit();
