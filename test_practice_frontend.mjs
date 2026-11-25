import {readFileSync} from "node:fs";
function checkPractice(practice,html,catalog){
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 const refs=[...practice.matchAll(/(?:by\(|txt\()"([^"]+)"/g)].map(x=>x[1]);
 const errors=refs.filter(x=>!ids.includes(x));
 let syntax=true;try{new Function(practice)}catch{syntax=false}
 const checks=[
 ["Practice JS syntax and DOM references",syntax&&errors.length===0],
 ["16 unique exercises",catalog.length===16&&new Set(catalog.map(m=>m.id)).size===catalog.length],
 ["6 explicit profiles",new Set(catalog.map(m=>m.profile)).size===6],
 ["exercise contract",catalog.every(m=>/^PR-[A-Z0-9-]+$/.test(m.id)&&m.tasks.length>=4&&m.evidence.length>=3&&m.command.includes("--profile "+m.profile)&&m.docs.startsWith("https://"))],
 ["fixed save API",practice.includes('fetch("/api/practice-save"')&&practice.includes('"X-Academy-CSRF":session.csrf')],
 ["persist before POST",practice.indexOf("persist(draft); // save stable attempt/payload before network")<practice.indexOf("draft.result=await post(draft.payload)")&&practice.includes("draft.frozen=true")]
 ];
 return {checks,errors};
}
const r=checkPractice(readFileSync(new URL("./web/practice.js",import.meta.url),"utf8"),readFileSync(new URL("./web/index.html",import.meta.url),"utf8"),JSON.parse(readFileSync(new URL("./practice/catalog.json",import.meta.url),"utf8")));for(const [name,ok] of r.checks)console.log((ok?"PASS ":"FAIL ")+name);if(r.checks.some(x=>!x[1])){console.error(r.errors);process.exitCode=1;}
