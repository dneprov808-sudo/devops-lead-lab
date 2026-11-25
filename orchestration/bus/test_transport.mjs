import {receiptBody,receiptDecision,pages} from "./transport.mjs";
function checkReceipt() {
  const e={channel:"test",handoff:{handoff_id:"orchestrator/ACADEMY-004/recommendation/smoke-v1"}};
  const author="operator",body=receiptBody(e,"a".repeat(64));
  const c={body,user:{login:author}};
  const checks=[
    ["receipt is transport only",JSON.parse(body.split("\n")[1]).receipt==="received_only"],
    ["receipt replay no write",receiptDecision([c],body,author)==="existing"],
    ["foreign author is not receipt",receiptDecision([{...c,user:{login:"unknown"}}],body,author)==="create"],
    ["changed payload conflict",receiptDecision([c],receiptBody(e,"b".repeat(64)),author)==="conflict"],
    ["conflict not hidden by duplicate",receiptDecision([c,{...c,body:receiptBody(e,"b".repeat(64))}],body,author)==="conflict"],
    ["pagination preserves all rows",pages([[1,2],[3]]).join(",")==="1,2,3"]
  ];
  return checks;
}
const checks=checkReceipt();for(const [name,ok] of checks)console.log((ok?"PASS ":"FAIL ")+name);if(checks.some(x=>!x[1]))process.exitCode=1;
