import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("./web/unified.js",import.meta.url),"utf8");
const {mergeReviews,moscowDay}=new Function(source.split("\n(()=>{")[0]+"\nreturn {mergeReviews,moscowDay}")();
assert.equal(moscowDay("2026-01-01T22:00:00Z"),"2026-01-02");
assert.equal(mergeReviews([{topic:"Kafka",score:4,assessed:"2026-01-02"}],[{topic:"Kafka",score:1,assessed:"2026-01-02"}])[0].score,1);
assert.equal(mergeReviews([{topic:"Kafka",score:1,assessed:"2026-01-01"}],[{topic:"Kafka",score:3,assessed:"2026-01-02"}])[0].score,3);
assert.equal(mergeReviews([],[{topic:"Kafka",score:8,assessed:"2026-01-02"}]).length,0);
console.log("4 review checks PASS");
