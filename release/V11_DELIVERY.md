# Academy v11 — release candidate / delivery ledger
Base ad056cbb4b332ce12e355de4b5f86b3072f43a03, PR #32. Status: **candidate, NOT release-ready until live gates and independent review**.
All fourteen approved directions have an implementation increment, not all have passed acceptance. Existing bank (738), LAB-001 and STATE byte-identical to base; no automatic merge, no paid API/cloud, no changes to automation schedules or canonical grades.

| Direction | Implemented | Outstanding acceptance |
|---|---|---|
| Release Hardening | local core/full gate, real HTTP E2E script, isolation guards, dependency version pins, Git SHA version | execute complete native gate, actual browser, vulnerability and digest review |
| Unified Learning Platform | 738 Pro questions mapped to 20 catalog entries, legacy fallback, seven nav groups | real browser/navigation/mobile and migration review |
| Learning Storage | local SQLite event store, idempotent import, JSON export/merge, binary backup, 64 MiB payload limit | full API/E2E, legacy result migration; drafts browser-local |
| Assessment | entry mock profile, journal, local evidence matrix, review proposals bound to attempts | independent reviewer and Orchestrator acceptance; no confirmed grades assigned |
| Adaptive | per-question self-report due dates, round-robin topic plan | independent-grade-driven recommendations, live UI tests |
| Mock | 10 profiles, quotas, resume after reload, explicit SQLite completion | real browser and independent grading exercises |
| Analyzer | validated offline v1 normalized proposal import | exact external analysis.json schema unavailable; direct adapter pending |
| Production | PostgreSQL outbox, Kafka publisher/worker, Redis cache, HA candidate with 3 etcd/2 PG, light recovery drill | Docker runtime, broker data/permissions, actual HA/RPO/RTO and further fault drills |
| Kubernetes | dedicated kind cluster, Helm rollout/drift lab, verifier and optional Argo Application | live kind/Helm/Argo; verify pinned versions/images, no auto-sync |
| Agents | existing Consumer strengthened against stale control SHA, immutable local dry-run journal | scheduled live integration, independent evidence approval and concurrent writer test |
| System Design | capacity/N-1 and copy-time calculations, ADR record and defense prompt | live UI, broader graph editing, real workload evidence |
| Career | source/date/gross-net vacancy matrix and evidence portfolio | real market data, resume review and interview results integration |
| Knowledge | 738 metadata records, 460 unique source URLs, lexical triage, 95 version-specific references | live link check, human semantic/technical review of all 738, all marked pending |
| Observability | local health endpoint, bounded HTTP metrics and structured logging | live HTTP/browser/Prometheus integration |

## Evidence as of dffb18d
- Python 3.13.5 native: 8/8 storage unit tests, exact blobs learning_store.py b96cefbd19609439689ee74da0b94d4ccbd2cc51 and test_learning_store.py d7a36af4c10b5d4bb2b588622941977bc7249c6f.
- JS adapter readback at 711d128: 1,445 assertions across 8 contract scripts; 53 legacy frontend checks across 5 scripts; 25 Consumer checks at 97fc0d4. Adapter checks are not native Node/browser evidence. New 10-profile tests cover 50 seeded selections and 250 quota/draft assertions + rejection. All 14 concatenated browser scripts syntax compiled; DOM IDs/routes/static mappings checked. Minor final privacy route and bounds changes not yet full-regression tested.
- Content audit: 738 entries, 460 unique HTTPS source strings, 40 hosts, 95 version references, zero exact normalized duplicates and zero candidates over same-topic lexical Jaccard threshold 0.60. This does NOT prove semantic uniqueness or URL reachability. Every technical review status remains pending.
- Native Python 3.13.5 supplementary tests: 3/3 (analyzer proposal/fixture K8s verifier/metrics), 11/11 total combined with storage. Exact blob SHA verified: analyzer_bridge.py 23c6c1332111997a57e7ff4d717be95a5fa3045d, academy_metrics.py 700de6c8521665e8d2017784cfd7e80a0494ca1b, v11-labs/k8s/verify.py e690f58876277156193996a13ae5912f5a94eaa1, test_v11_contracts.py 40e1598dc4ec928b2afff3068fd6e57c1a993660. This is fixture testing, not a real cluster or raw analyzer integration.
- GitHub connector works; direct clone fails DNS. Docker, kind, Helm, kubectl unavailable in author environment. Full release gate, actual browser integration, runtime Compose/HA/K8s, exhaustive security/source verification NOT RUN. No claim of production readiness.

## Gate and privacy
`python3 release/gate.py` core; `python3 release/gate.py --full` adds real local browser and Compose config (not live services). Optional `--live-production` explicitly stops/restarts worker in a running LIGHT local project; `--k8s-live` checks an existing dedicated lab. HA failure drills are separate. Full gate reports omitted checks.
Raw answers, local SQLite and drafts are private; never upload to GitHub. Old results branch and localStorage untouched. Binary backup, JSON export/import are local; unsaved drafts not in backup. Import merges with collision rejection, no destructive overwrite. Browser import max 2 MiB; use CLI for larger files. Portal only loopback, no reverse proxy/remote deployment. No secrets or production data.
