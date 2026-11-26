import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const app=readFileSync(new URL("./web/app.js",import.meta.url),"utf8");
const source=app.slice(app.indexOf("function page(id)"),app.indexOf("async function copy("));
function fixture(){
 const groups=[{open:true},{open:false},{open:false}];
 const node=(id,group=null)=>({id,hidden:false,dataset:{page:id},attributes:{},textContent:id,disabled:false,
  classList:{active:false,contains(c){return c==="page"},toggle(c,v){if(c==="active")this.active=v}},
  setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},
  closest(){return group},addEventListener(k,fn){this[k]=fn},querySelector(){return null},contains(){return false},
  scrollIntoView(){}});
 const pages=["home","hub","deploy","review"].map(id=>node(id));
 const nav=pages.map((p,i)=>node(p.id,groups[i===0?0:i===2?2:1]));
 const cards=["deploy-portal","deploy-ha"].map(id=>node(id));
 const links=cards.map(p=>Object.assign(node(p.id),{getAttribute:()=>"#"+p.id}));
 const ids=Object.fromEntries([...pages,...cards,...["workspace-nav","workspace-current","home-refresh","home-answers","home-unique","home-mocks","home-reviews","home-progress-status"].map(id=>node(id))].map(n=>[n.id,n]));
 const location={hash:""},history={pushState(_a,_b,hash){location.hash=hash}},document={
  getElementById:id=>ids[id]||null,activeElement:null,
  querySelectorAll:q=>({".deploy-index a":links,".page":pages,"nav button[data-page]":nav,"nav details[data-workspace]":groups}[q]||[]),
  querySelector:q=>q==="nav button.active"?nav.find(n=>n.classList.active):null};
 let pending=[];
 const api=()=>new Promise((resolve,reject)=>pending.push({resolve,reject}));
 const window={matchMedia:()=>({matches:false}),scrollTo(){},addEventListener(){}};
 const result=new Function("$","text","document","window","location","history","setMobileMenu","renderReview","api",source+"\nreturn {page,applyRoute,selectRunbook,refreshHome};")(id=>ids[id],(id,v)=>ids[id].textContent=String(v),document,window,location,history,()=>{},()=>{},api);
 return {result,ids,pages,nav,cards,links,groups,location,pending};
}
const f=fixture(),r=f.result;
r.page("deploy");
assert(f.location.hash==="#deploy-portal","default runbook deep link");
assert(!f.ids["deploy-portal"].hidden&&f.ids["deploy-ha"].hidden,"only one runbook visible");
r.selectRunbook("deploy-ha",true);
assert(f.location.hash==="#deploy-ha"&&!f.ids["deploy-ha"].hidden&&f.ids["deploy-portal"].hidden,"switch runbook");
assert(f.links[1].attributes["aria-current"]==="true","active link");
assert(r.selectRunbook("invalid",true)===false,"unknown runbook rejected");
f.location.hash="#hub";r.applyRoute();
assert(!f.ids.hub.hidden&&f.ids.deploy.hidden,"catalog route");
assert(f.groups[1].open&&!f.groups[2].open,"contextual group");
f.location.hash="#deploy-ha";r.applyRoute();
assert(!f.ids.deploy.hidden&&!f.ids["deploy-ha"].hidden,"deep link restore");
f.location.hash="#invalid";r.applyRoute();
assert(!f.ids.home.hidden&&f.pages.filter(p=>!p.hidden).length===1,"unknown route fallback");
f.pending.shift().resolve({by_topic:{Linux:{attempts:3,questions:2}},mock_sessions:1,review_proposals:2});
await Promise.resolve();await Promise.resolve();
assert(f.ids["home-answers"].textContent==="3"&&f.ids["home-unique"].textContent==="2","summary actual counts");
const a=r.refreshHome(),b=r.refreshHome();
f.pending[1].resolve({by_topic:{},mock_sessions:0,review_proposals:0});await b;
f.pending[0].resolve({by_topic:{Linux:{attempts:999,questions:999}},mock_sessions:1,review_proposals:1});await a;
assert(f.ids["home-answers"].textContent==="0","stale response ignored");
const failure=r.refreshHome();f.pending[2].reject(Error("unavailable"));await failure;
assert(f.ids["home-answers"].textContent==="—"&&f.ids["home-progress-status"].textContent.includes("недоступны"),"unavailable not represented as zero");

console.log("Workbench routing, runbook selection and dashboard summary PASS");
