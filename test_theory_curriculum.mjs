import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const guides=JSON.parse(read("./learning/knowledge.json"));
const manifest=JSON.parse(read("./learning/hub.json"));
const ids=new Set(),titles=new Set();let words=0;
assert(guides.length===20&&manifest.length===20,"20 existing topics");
for(const g of guides){
 assert(manifest.some(m=>m.id===g.id),"mapped guide "+g.id);
 assert(g.chapters.length===3,"three chapters "+g.id);
 assert(g.chapters.map(c=>c.level).join(",")==="foundation,senior,lead","learning sequence "+g.id);
 for(const c of g.chapters){
  assert(!ids.has(c.id)&&!titles.has(c.title)&&c.id.startsWith(g.id+"-"),"unique chapter identity "+c.id);
  ids.add(c.id);titles.add(c.title);
  for(const [field,min] of [["title",10],["explanation",180],["production",150],["example",65],["commands",8],["question",25]]){
   assert(typeof c[field]==="string"&&c[field].length>=min,c.id+" incomplete "+field);
  }
  assert(/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(c.source),c.id+" invalid source");
  words+=[c.explanation,c.production,c.example].join(" ").split(/\s+/).length;
 }
}
assert(ids.size===60&&words>=5000,"substantial theory coverage");
const source=read("./web/learning.js").split("\n(() => {")[0];
const render=new Function(source+"\nreturn theoryChapters;")();
const node=(tag,text,cls)=>({tag,text,cls,children:[],append(...nodes){this.children.push(...nodes)}});
let copied=null;
const root=render(guides[0],node,(text,fn)=>({tag:"button",text,fn}), (text,url)=>({tag:"a",text,url}),s=>copied=s);
const chapters=root.children.filter(n=>n.cls==="theory-chapter");
assert(chapters.length===3&&chapters[0].open&&!chapters[1].open,"chapter reading order");
assert(chapters.every(n=>n.children.some(x=>x.tag==="pre")&&n.children.some(x=>x.tag==="a")),"commands and sources rendered");
chapters[1].children.find(n=>n.tag==="button").fn();
assert(copied===guides[0].chapters[1].commands,"copy exact original example");
console.log("Theory curriculum PASS: "+ids.size+" chapters, "+words+" explanatory words");
