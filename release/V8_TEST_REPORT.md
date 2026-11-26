# Academy v8 — release evidence and outstanding gates

Base: academy/stable 65b656bfbec139fb4cfdb5ac59166c91d8082092. PR #20 only. Canonical STATE and original LAB-001 unchanged.

Executed locally on Python 3.13.5 and Node 22.16.0, exact Git blob SHA verified:
- production/app.py 660cc21b1daa129f610b1e26203b895687f0bd5f
- test_production.py a0d793275686ca8ab29e87f7c4a780cbd4279b6f
- production/status.py 8cc48c2512f362fee11832aa37df5baf1275cc71
- test_production_status.py 3c16388ae86d5fc09f3ac52c213d3db4ab475d47
- web/production.js 296344ab01ce340f0ba05acdc817558e627ec419
- test_production.mjs 582b2b3389832d291b4f851cf626c57c6522a82f
- production/browser_smoke.py 885ae12ba87f317c192dd0bcced98da74f5d359e

PASS: python -m unittest -v test_production test_production_status (5 tests; 3.197 s).
Actual HTTP requests, invalid ID, repeated ID, stopped worker, backlog 10, restart and drain 11/11, metrics validation, unavailable service. Initial fixed-delay exploratory check failed; replaced with bounded condition polling.
PASS: node test_production.mjs (12 assertions).
PASS: ACADEMY_CHROMIUM=/usr/bin/chromium python production/browser_smoke.py (isolated Chromium DOM, mock fetch and storage; no page errors). Normal browser navigation to local HTTP blocked by administrator policy; not an end-to-end portal test.
NOT RUN: Docker Compose runtime (Docker absent), complete existing release/gate.py (private repo cannot be cloned in local runtime, GitHub connector only), actual Prometheus scrape, portal HTTP integration, full responsive styling, backup/restore of all existing keys and remote results. No merge recommendation until gates pass.
Remaining: Kafka/PostgreSQL/HA integration, more failure modes and assertions, actual sandbox shell, full YAML/HCL validation, visual graph editor, independent agent journal, multiple lead scenarios, mobile/offline PWA, validated backup restore. Existing feature links are not replacements for these deliverables.
Local commands: python3 release/gate.py; docker compose -f production/compose.yaml config; follow production/README.md. Optional locally installed Playwright/Chromium: python3 production/browser_smoke.py.
No Codex, paid API, paid cloud or automatic merge.

## Repeat review 2026-11-26

Reviewed PR #20 at 1006af4ec2b5cbe1e3d9b7b28fe115b4cafb5530 against stable 65b656bfbec139fb4cfdb5ac59166c91d8082092: 16 changed files, open draft, mergeable=true (Git conflict check only). Canonical STATE blob 978cd9cd6a929c7abad3776c705d9ccca3a49800 unchanged. No open issues.
Re-verified all seven listed Git blob hashes against local source.
Executed again:
- python -m unittest -v test_production test_production_status: 5/5 PASS in 4.282 s; HTTP API and actual worker process, duplicate/invalid IDs, pending 10 -> 0, accepted=processed=11; status validation and unavailable endpoint.
- node test_production.mjs: 12/12 PASS.
- ACADEMY_CHROMIUM=/usr/bin/chromium python production/browser_smoke.py: PASS, isolated DOM with fake network/storage.
No full gate/Compose/scrape/portal end-to-end test: Docker unavailable, direct GitHub DNS unavailable; connector works. The browser fixture is not whole-portal integration.
Review limitations: SQLite shared volume is single-host, worker may exit on DB errors; no restart/retry policy in this increment. The API is single-threaded, no auth/TLS, not a real trading service. Status checks API counters, not worker liveness. Export covers only review and bookmarks; restore not implemented. Terminal is a fixed-command simulation. Images are tags, not pinned digests. Do not treat mergeable as release-ready.
Manual gate remains mandatory; see production/README.md. No merge performed.
