import {connectorDecision,deliveryDecision} from "./connector_policy.mjs";
function tests(){
 const role="daily_mentor",owner="operator",id="daily_mentor/LAB-001/recommendation/20261126-r1",title="[handoff:v1] "+id,body="<!-- academy-handoff:v1 -->\n```json\n"+JSON.stringify({bus_version:1,channel:"live",handoff:{from:role,handoff_id:id}})+"\n```";
 const base={role,owner,title,body,acceptedIds:[],pendingIds:[],recent:[],search:[],limit:100,sameRevision:true};
 const row={title,body,number:1,author:owner,hydrated:true,state:"open"};
 const check=(over)=>connectorDecision({...base,...over});
 return [
 ["new event",check({})==="CREATE_ONCE"],
 ["search miss but recent hit",check({recent:[row]})==="REUSE"],
 ["closed duplicate",check({search:[{...row,state:"closed"}]})==="REUSE"],
 ["cross-list disagreement",check({recent:[row],search:[{...row,body:"different"}]})==="BLOCKED_CONFLICT"],
 ["unhydrated search row",check({search:[{...row,hydrated:false}]})==="BLOCKED_CONFLICT"],
 ["wrong author",check({recent:[{...row,author:"other"}]})==="BLOCKED_CONFLICT"],
 ["accepted replay",check({acceptedIds:[id]})==="ALREADY_TRACKED"],
 ["pending replay",check({pendingIds:[id]})==="ALREADY_TRACKED"],
 ["limit reached",check({limit:1,recent:[row]})==="BLOCKED_INCOMPLETE"],
 ["missing search",check({search:null})==="BLOCKED_INCOMPLETE"],
 ["stale",check({sameRevision:false})==="BLOCKED_STALE"],
 ["uncertain previous POST",check({isRetryUnknown:true})==="BLOCKED_UNKNOWN_WRITE"],
 ["uncertain POST found",check({isRetryUnknown:true,search:[row]})==="REUSE"],
 ["role mismatch",check({role:"career_intelligence"})==="BLOCKED_PAYLOAD"],
 ["readback success",deliveryDecision({title,body},row,owner)==="DELIVERED"],
 ["readback mismatch",deliveryDecision({title,body},{...row,body:"changed"},owner)==="UNCONFIRMED"],
 ["readback absent",deliveryDecision({title,body},null,owner)==="UNCONFIRMED"]
 ];
}
const r=tests();for(const [name,ok] of r)console.log((ok?"PASS ":"FAIL ")+name);if(r.some(x=>!x[1]))process.exitCode=1;
