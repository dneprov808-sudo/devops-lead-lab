import {readFileSync} from "node:fs";
import {planConsumer} from "./consumer.mjs";
try {
  if(process.argv.length!==3)throw Error("usage: node consumer_cli.mjs INPUT.json");
  const x=JSON.parse(readFileSync(process.argv[2],"utf8"));
  const result=planConsumer(x.issues,x.snapshot,x.verified,x.options);
  console.log(JSON.stringify(result,null,2));
  if(result.status==="BLOCKED")process.exitCode=2;
}catch(e){console.error("BLOCKED: invalid or unavailable local input");process.exitCode=2;}
