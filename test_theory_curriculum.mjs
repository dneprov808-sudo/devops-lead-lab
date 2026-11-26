import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const guides=JSON.parse(read("./learning/knowledge.json"));
const manifest=JSON.parse(read("./learning/hub.json"));
const ids=new Set(),titles=new Set();let words=0,snippets=0;
const extended=new Set(['linux','docker','k8s','ansible','terraform','cicd']);
assert(guides.length===20&&manifest.length===20,"20 existing topics");
for(const g of guides){
 assert(manifest.some(m=>m.id===g.id),"mapped guide "+g.id);
 assert(g.chapters.length===(extended.has(g.id)?9:3),"chapter count "+g.id);
 assert(g.chapters.slice(0,3).map(c=>c.level).join(",")==="foundation,senior,lead","learning sequence "+g.id);
 if(extended.has(g.id))assert(g.chapters.slice(3).map(c=>c.level).join(",")==="foundation,foundation,senior,senior,lead,lead","advanced progression "+g.id);
 for(const [index,c] of g.chapters.entries()){
  assert(!ids.has(c.id)&&!titles.has(c.title)&&c.id.startsWith(g.id+"-"),"unique chapter identity "+c.id);
  ids.add(c.id);titles.add(c.title);
  for(const [field,min] of [["title",10],["explanation",180],["production",150],["example",65],["commands",8],["question",25]]){
   assert(typeof c[field]==="string"&&c[field].length>=min,c.id+" incomplete "+field);
  }
  assert(/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(c.source),c.id+" invalid source");
  if(index>=3){
    assert(c.snippet&&["bash","ini","yaml","dockerfile","hcl","groovy"].includes(c.snippet.language),c.id+" snippet language");
    assert(c.snippet.code.length>=30&&c.snippet.notes.length>=100,c.id+" annotated snippet");
    snippets++;
  }
  words+=[c.explanation,c.production,c.example].join(" ").split(/\s+/).length;
 }
}
assert(ids.size===96&&words>=9000&&snippets===36,"substantial theory coverage");
const source=read("./web/learning.js").split("\n(() => {")[0];
const render=new Function(source+"\nreturn theoryChapters;")();
const node=(tag,text,cls)=>({tag,text,cls,children:[],append(...nodes){this.children.push(...nodes)}});
let copied=null;
const root=render(guides[0],node,(text,fn)=>({tag:"button",text,fn}), (text,url)=>({tag:"a",text,url}),s=>copied=s);
const chapters=root.children.filter(n=>n.cls==="theory-chapter");
assert(chapters.length===9&&chapters[0].open&&!chapters[1].open,"chapter reading order");
assert(chapters.every(n=>n.children.some(x=>x.tag==="pre")&&n.children.some(x=>x.tag==="a")),"commands and sources rendered");
assert(chapters[3].children.some(n=>n.cls==="theory-snippet"&&n.text===guides[0].chapters[3].snippet.code),"code rendered verbatim");
assert(chapters[3].children.some(n=>n.cls==="theory-notes"&&n.text===guides[0].chapters[3].snippet.notes),"annotation rendered verbatim");
chapters[1].children.find(n=>n.tag==="button").fn();
assert(copied===guides[0].chapters[1].commands,"copy exact original example");
console.log("Theory curriculum PASS: "+ids.size+" chapters, "+words+" explanatory words");
