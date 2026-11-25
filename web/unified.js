// Explicit synchronization; never uploads answers or modifies canonical grades.
function mergeReviews(local,remote){
 const map=new Map();
 for(const r of [...local,...remote]){
   if(typeof r.topic!=="string"||!Number.isInteger(r.score)||r.score<0||r.score>4)continue;
   const day=String(r.assessed).slice(0,10),old=map.get(r.topic);
   if(!old||day>String(old.assessed).slice(0,10)||(day===String(old.assessed).slice(0,10)&&r.score<old.score))map.set(r.topic,r);
 }
 return [...map.values()];
}
(()=>{
const topics={"Linux/Bash":"LINUX","Сети/DNS/TLS/HTTP":"NET","Docker/OCI":"DOCKER","Ansible":"ANSIBLE","CI/CD":"CICD","Terraform":"TF","Kubernetes/Helm":"K8S","GitOps":"GITOPS","Observability/SRE":"SRE","Security":"SECURITY","Platform/HA/DR":"PLATFORM","Leadership":"LEAD","Kafka":"KAFKA","PostgreSQL":"POSTGRES","Patroni / etcd":"PATRONI","Redis":"REDIS","RabbitMQ":"RABBITMQ","Nginx / HAProxy":"PROXY","Logs / OpenTelemetry":"OTEL","etcd / Consensus":"ETCD"};
const key="academy-review-pending-v5";
let pending=null,busy=false;
try{pending=JSON.parse(localStorage.getItem(key)||"null")}catch{}
window.academyReviewPending=()=>!!pending;
const status=t=>{document.getElementById("sync-review-status").textContent=t;document.getElementById("review-note").textContent=t};
async function upload(){
 if(busy)return;
 if(!pending){
  if(!activeQuestion||document.getElementById("ratings").hidden)return;
  const topic=activeQuestion.topic,score=Number(document.getElementById("rating").value);
  if(!topics[topic]||!Number.isInteger(score)||score<0||score>4)return;
  if(!confirm("Отправить самооценку и дату в приватный GitHub? Ответ не отправляется."))return;
  const assessed=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  pending={kind:"review",attempt:crypto.randomUUID(),module:"REVIEW-"+topics[topic],topic,score,assessed};
  try{localStorage.setItem(key,JSON.stringify(pending))}catch{pending=null;status("BLOCKED: невозможно сохранить ID попытки");return}
 }
 busy=true;
 try{
  const session=await fetch("/api/session").then(r=>r.json());
  const r=await fetch("/api/practice-save",{method:"POST",headers:{"Content-Type":"application/json","X-Academy-CSRF":session.csrf},body:JSON.stringify(pending)});
  const result=await r.json();
  if(!r.ok||!["saved","already_saved"].includes(result.status)||!/^[0-9a-f]{40}$/.test(result.commit))throw Error(result.error||"Доставка не подтверждена");
  const record=reviewRecord(pending.topic,pending.score,new Date(pending.assessed+"T00:00:00+03:00"));
  records=mergeReviews(records,[{...record,assessed:pending.assessed}]);persist();
  localStorage.removeItem(key);pending=null;document.getElementById("ratings").hidden=true;renderReview();status("Сохранено в GitHub · "+result.commit.slice(0,12));
 }catch(e){status("BLOCKED / DELIVERY_UNKNOWN: "+e.message+" · Повтори ту же попытку.")}
 finally{busy=false}
}
document.getElementById("save-review-remote").addEventListener("click",upload);
const retry=document.createElement("button");retry.textContent="Повторить незавершённую отправку";retry.className="secondary";retry.addEventListener("click",()=>{if(pending)upload();else status("Нет незавершённой отправки")});document.getElementById("sync-review").after(retry);
document.getElementById("sync-review").addEventListener("click",async()=>{
 try{const r=await fetch("/api/practice-history",{cache:"no-store"}),d=await r.json();if(!r.ok)throw Error(d.error||"История недоступна");
 const rows=d.items.filter(x=>x.kind==="review").map(x=>({topic:x.topic,score:x.score,assessed:x.assessed,due:x.due+"T00:00:00+03:00"}));
 records=mergeReviews(records,rows);persist();renderReview();status("Загружено "+rows.length+" самооценок"+(d.truncated?" · история неполная":"")+" · SHA "+(d.commit||"нет ветки"));
 }catch(e){status("BLOCKED: "+e.message)}
});
})();
