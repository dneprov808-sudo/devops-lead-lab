# Academy v12 — Engineering Excellence: delivery ledger

Base: bf6e54edc5fb92a48eba79418b08cc48557f2ac3, academy/stable (v11). Draft PR #33, academy/v12. 15 requested tracks have implementation increments; **candidate, not accepted release**. No merge, no paid services, no canonical STATE or learner qualification changes. Original LAB-001 and v11 question bank preserved.

| Track | Delivered | Remaining acceptance / limitations |
|---|---|---|
| P0 Release Hardening | compatibility baseline, extended local regression gate, Playwright acceptance scenario, optional Trivy/pip-audit against committed Git archive, explicit BLOCKED status | entire native gate, real browser, scanners and Compose config not executed; no immutable image digest lock or hosted CI |
| P0 Assessment 2.0 | 0–4 rubric, evidence-bound immutable local human decisions, conflict detection, entry/lead/full exam candidate report | authenticated reviewer identity, full native assessment tests and independent canonical qualification not accepted |
| P0 Multi-Agent | existing Consumer + revision/state/control-bound manual work queue, conflict review | live agent scheduling and concurrent canonical writer acceptance not implemented; no auto transition |
| P0 Progress Migration | validated legacy import, idempotent IDs, browser draft export/restore, explicit retry, create-only verified SQLite recovery | real student migration and recovery on user's copy pending; synthetic roundtrip passed; binary backup required for decisions |
| P1 AI Examiner | local Ollama structured review proposal, score, feedback, follow-up | live local model, calibration, prior raw analyzer analysis.json schema and direct import pending |
| P1 Production 3.0 | existing app + HA overlay: 3 Kafka broker/controllers RF3/min ISR2, 3 etcd/2 PG, Redis Sentinel (3 nodes/3 sentinels), 2 APIs + LB, local bounded load and strict DB-only evidence drill separating availability from recovery | real Docker run, permissions, failover, persistence/restart, HA/RPO/RTO acceptance; single host and async replication are limitations |
| P1 Chaos | 30 distinct scenario specs: 15 guarded service stops + 1 bounded load route, 14 manual isolated cases | live drills, domain-specific automated predicates and independent evidence for all 30; not automatic hidden faults |
| P1 Kubernetes | 20 namespaced fixtures, 57 verification predicates, guarded setup/verify; topics scheduling, RBAC, DNS, CNI, CSI, HPA, Helm, Argo CD, etcd | actual dedicated cluster execution; dependencies CNI/CSI/HPA/Argo and multinode where required |
| P1 Linux/network | 5 automated verifier cases in isolated namespace, 3 manual VM tasks | native namespace/systemd/cgroup/resource execution |
| P1 IaC | Ansible idempotence and config check; Terraform local-provider drift/plan/rollback lab | real Ansible/Terraform run and dependency locks |
| P1 CI/CD | digest-addressed synthetic artifact build/verify/promote, lab-only GitLab CI and Jenkinsfile | actual local runners/controllers and pipeline execution; no installation or activation |
| P1 Knowledge Quality | lexical cross-topic audit of 738 questions, 460 unique source URLs, 17 short-answer triage rows, reviewer checklist and opt-in link checker | 738 independent technical reviews pending; 460 live URLs not checked; lexical triage is not semantic proof |
| P1 Adaptive Learning | evidence-weighted due plan, separate self/operator status, time and topic prioritization | real student data and UI acceptance |
| P1 Career Intelligence | deduplicated 30-day vacancy matrix, gross/net separation, local skill gaps, explicit authorized HH import | no HH token/current vacancy dataset, no representative market salary estimate |
| P1 Leadership | 12 decision/rationale/feedback cases, saved local attempts | human review and actual browser acceptance |

## Executed evidence

- Native Python 3.13.5: two artifact pipeline tests passed; native Node 22.16.0: one work-queue test script with six assertions passed. Five source/test blobs matched published Git hashes.
- Published a2cb58b readback: 6 JS contract scripts executed with assert/read adapters, 1178 assertions passed (5 drafts, 8 adaptive/market, 8 unified, 251 mock, 6 tools, 900 complete bank). Later pending-draft patch: 8 assertions passed in adapter before publication. These are not native/browser tests.
- Published 26c8235: concatenated 16 JS scripts compile, all static script routes declared, no duplicate HTML IDs in static inspection; catalog sizes and unique IDs verified: 20 labs/57 predicates, 30 chaos cases (16 automated routes/14 manual), 12 leadership, 738 review entries/460 URLs.
- Code review follow-up: bind exam duration to profile, permit a blank answer only with score zero. This final Python change and full assessment suite not run natively.
- Direct clone blocked by DNS in author environment; GitHub connector available. Docker, kind, kubectl, Helm, Trivy and pip-audit unavailable. Full regression, real Playwright, live services, HH and Ollama not run. Status of these checks is BLOCKED/unverified, not PASS.
- No new competence approved; canonical state and old student results unchanged. Manual merge only.

Handoff: System Architect / Lab Engineer -> Code Reviewer; ACADEMY-V12; candidate implementation in PR #33. Next action: independent review, full local gate, runtime drills, migration on a copy and content/market verification. See V12_START.md.

## Hardening round — ACADEMY-V12-HARDEN-01

Base candidate ad48fc4; fixes through 2acfee7. No changes to control branch, original LAB-001 or question bank. New features intentionally deferred in favor of P0/data safety and evidence integrity.

- 5cc5e66: create-only SQLite backup recovery, read-only source, trusted_schema OFF, schema/integrity checks, re-import validated events, decision bindings, logical snapshot fingerprint. Reject invalid positive score for blank response while permitting rejection and zero-score review.
- 5793083: security scanners run on committed archive only; exclude untracked private data, refuse modified tracked files, separate secret scan from severity filter; gate reports BLOCKED for exit 125.
- 44c9d86: HA drill requires observed stop, matching ACK, DB source and strict result, fresh recovery ACK; explicit unconfirmed request budget (default zero), never treats zero accepted fault-window requests as PASS.
- 64c0ec6: recovered pending ID reconciliation clears only matching drafts, keeps newer ones, reloads UI; restored mock validates topic coverage, lead quota, allowed topics and bounded timestamp. Use one tab during recovery; no multi-tab atomicity guarantee.
- 2acfee7: blank response and exam duration/threshold regression tests.

Native Python 3.13.5: **18/18 tests PASS** on exact source/test blobs, manually transferred from GitHub because direct clone unavailable. Test modules: test_backup_structure_v12 (4), test_backup_roundtrip_v12 (1), test_security_scope_v12 (4), test_ha_evidence_v12 (4), test_assessment_v12 (5). Synthetic SQLite roundtrip includes accepted review, non-overwrite and rejection of changed binding. Git blob hashes checked for all ten files:
- backup_v12.py 24b3db09e8e56c7f44167d95c0e9765a8783e9b8; test_backup_structure_v12.py 4d95141cefc4eb0f0a2fbad30decd0a7905b9f43; test_backup_roundtrip_v12.py a69647c541c20e3958e03c6126d8f8760c00272c
- release/security_v12.py be6aa9fb6809d8401852cf24f3ec1f9e0f37778d; test_security_scope_v12.py 47d07f3dd02ddf57bb09e205a96076c70b2443fa
- production_v11/ha_drill_v12.py 6f8441314dc04f179f5cee7317e50a3a484d207f; test_ha_evidence_v12.py 1afd6ab3a6d8d4c88c03be590b4c5163
- learning_store.py 79d25048d3972f3758a19762410e512ec8c59903; assessment_v12.py ffe30ec9d0da455b59fbb84737350380cd7ebd51; test_assessment_v12.py cdc1b948d40eca898511d12e1de3d26bcfed8503.

JS contract adapter: draft 20/20, mock 253/253, syntax compilation of bank + mock + drafts. Not native JS/browser evidence. Security scanner CLI returned 125 (Trivy absent): BLOCKED, not vulnerability-free. Live Docker/K8s/HA, full native gate, Playwright, actual migration and all earlier outstanding acceptance still pending. Test evidence measures verifier behavior, not infrastructure RTO/RPO or authenticated reviewer identity. Decisions preserve previous binding format; no canonical grade update. SQLite implementation references official Python 3.13 sqlite3 and SQLite PRAGMA docs.

Handoff: Code Reviewer / Release Engineer, ACADEMY-V12-HARDEN-01, targeted fixes and synthetic regression complete; next owner Release Engineer for full local gate on clean checkout, then Lab Engineer for live HA/K8s and migration on a private copy. Keep PR draft pending acceptance.


## Hardening round — ACADEMY-V12-HARDEN-02

Base 1f7c292; targeted fixes through 9fb37c0. Preflight: stable bf6e54e, canonical STATE revision 1 LAB-001 assigned; PR #33 open draft, other open PRs untouched, no open issues.

- ae358ce: strict live Consumer/Queue integration, control commit and task binding, test-mode rejection, unresolved review/blocker routing, inconsistent proposals blocked; CLI requires second-read finalControlCommit and hashes exact input bytes. No authenticated remote read or actual transition.
- 90e3f88: local gate temporary SQLite directory, create-only JSON evidence, explicit commit and before/after cleanliness, PASS/FAIL/BLOCKED exit codes. Report does not contain captured logs or answer payloads.
- 6a0d6a5: DB-only verifier no longer reads or writes Redis; statistics read in a single SQL statement. External DB/cache/Kafka clients stubbed in tests.
- 9fb37c0: evidence report additionally requires no unignored untracked files; ignored files/dependencies remain trusted environment. Backup CLI refuses private output in checkout except ignored .academy-data. Report/gate module import supports both script and module invocation.

Native Python 3.13.5, 8/8 targeted tests PASS, exact Git blob hashes checked:
- release/gate_evidence.py 8a030a868a0652f5044371a4949ba60e4e45735a; test_gate_evidence_v12.py fa8bc901afff9898bb4db783d50be2186b162061 (4 tests).
- production_v11/app.py bad13db6c9bc59109ccb8129fa1db3ead56dc736; test_production_read_v12.py 63ad6548c73616cb86e52e0d980712861b7b8c90 (4 tests).
- Previous round native 18/18 rerun on preserved local source copies, not full regression.
- Queue/Consumer integration: 21 pure contract assertions passed; existing Consumer 25/25 passed with adapter. Native queue CLI subprocess tests included but not run. Gate CLI entire repository not executed; backup CLI output path guard inspected, not tested end to end.

References: https://docs.python.org/3.13/library/subprocess.html ; https://docs.docker.com/reference/cli/docker/compose/config ; https://playwright.dev/python/docs/browser-contexts .

Remaining blockers: direct Git clone DNS failure, Docker absent; Chromium and Playwright exist locally but full exact checkout unavailable, so real Academy E2E not executed. Native full gate, security scanner execution, HA/K8s and other live labs, image digests, actual migration, independent knowledge review and local model/market validation still pending. Keep PR draft; no canonical grade, STATE, original LAB-001, interview bank or schedule changes.

Handoff: Release Engineer / Code Reviewer, ACADEMY-V12-HARDEN-02, targeted tests passed, candidate not release-ready; next Release Engineer to run full gate on dedicated local clean checkout, then Lab Engineer to verify live HA/K8s. No auto merge or paid services.
