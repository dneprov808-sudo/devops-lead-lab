import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const app=readFileSync(new URL("./web/app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("./web/hub.css",import.meta.url),"utf8");
const source=app.slice(app.indexOf("const THEME_KEY="),app.indexOf("function page(id)"));
if(!source.includes("setMobileMenu(false)"))throw Error("Preference bootstrap missing");
function boot(initial,deny=false){
  const storage=new Map(Object.entries(initial));
  const node=()=>({dataset:{},textContent:"",attributes:{},events:{},focused:false,
    setAttribute(k,v){this.attributes[k]=v},addEventListener(k,fn){this.events[k]=fn},
    focus(){this.focused=true}});
  const nodes=Object.fromEntries(["theme-toggle","menu-toggle","workspace-nav"].map(id=>[id,node()]));
  const document={documentElement:node(),events:{},addEventListener(k,fn){this.events[k]=fn}};
  const window={matchMedia:()=>({matches:true})};
  const localStorage={getItem(k){if(deny)throw Error("denied");return storage.get(k)||null},
    setItem(k,v){if(deny)throw Error("denied");storage.set(k,v)}};
  new Function("$","document","window","localStorage",source)(id=>nodes[id],document,window,localStorage);
  return {nodes,document,storage};
}
const key="academy-ui-theme-v12";
const normal=boot({"academy-review-v1":"keep"});
assert(normal.document.documentElement.dataset.theme==="light","default light");
assert(normal.nodes["theme-toggle"].attributes["aria-pressed"]==="false","default aria");
normal.nodes["theme-toggle"].events.click();
assert(normal.document.documentElement.dataset.theme==="dark","dark toggle");
assert(normal.storage.get(key)==="dark","theme persisted");
assert(normal.storage.get("academy-review-v1")==="keep","learning storage unchanged");
assert(boot({[key]:"dark"}).document.documentElement.dataset.theme==="dark","dark restored");
assert(boot({[key]:"invalid"}).document.documentElement.dataset.theme==="light","invalid preference normalized");
normal.nodes["theme-toggle"].events.click();
assert(normal.document.documentElement.dataset.theme==="light","light toggle");
const denied=boot({},true);
denied.nodes["theme-toggle"].events.click();
assert(denied.document.documentElement.dataset.theme==="dark","works without storage");
assert(normal.nodes["workspace-nav"].dataset.mobileOpen==="false","menu initially closed");
normal.nodes["menu-toggle"].events.click();
assert(normal.nodes["workspace-nav"].dataset.mobileOpen==="true","menu opens");
assert(normal.nodes["menu-toggle"].attributes["aria-expanded"]==="true","menu aria");
normal.document.events.keydown({key:"Escape"});
assert(normal.nodes["workspace-nav"].dataset.mobileOpen==="false","Escape closes");
assert(normal.nodes["menu-toggle"].focused,"focus restored");
const colorMap=s=>Object.fromEntries([...s.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g)].map(m=>[m[1],m[2]]));
const darkStart=css.indexOf(':root[data-theme="dark"]');
const light=colorMap(css.slice(css.indexOf(":root {"),darkStart));
const dark={...light,...colorMap(css.slice(darkStart,css.indexOf("body {")))};
const luminance=hex=>hex.slice(1).match(/../g).map(s=>parseInt(s,16)/255)
  .map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
const pairs=[["text","bg"],["text","panel"],["muted","panel"],["muted","bg"],
  ["accent","panel"],["accent","accent-soft"],["on-accent","accent"],
  ["success","success-soft"],["warn","warn-soft"],["code-text","code-bg"]];
for(const palette of [light,dark])for(const [fg,bg] of pairs){
  const a=luminance(palette[fg]),b=luminance(palette[bg]);
  assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,fg+"/"+bg+" contrast");
}

console.log("UI preferences and text contrast PASS");
