# Academy v11 — delivery ledger
Base ad056cbb4b332ce12e355de4b5f86b3072f43a03. One draft PR, incremental commits. No canonical STATE changes, automatic merge, paid API/cloud or remote CI activation.
Status definitions: implemented = source exists; verified = exact tests executed; blocked = runtime/evidence missing. None of these mean student competency.
| Phase | Acceptance | Status |
|---|---|---|
| P0 hardening | core gate + real HTTP browser + Compose validation + security checks, actual SHA | implemented; full runtime pending |
| P0 storage | SQLite, validated attempts, backup/restore, privacy, tests | pending |
| P0 unified | all questions reachable by technology, preserve legacy, navigation | pending |
| P0 assessment | evidence grades, errors, independent review, entry exam | pending |
| P1 adaptive/mock/analyzer | persistent sessions, quotas, review plan, versioned import | pending |
| P1 production/K8s | local isolated live labs and recovery evidence | pending |
| P1 agent/knowledge | read-only handoffs, evidence gates, quality audit | pending |
| P2 design/career/observability | useful tools and source-bound evidence | pending |

Core: python3 release/gate.py. Full: python3 release/gate.py --full (requires Chromium/Playwright and Docker Compose; fails when absent). Full config validation does NOT prove live container behavior. Runtime dependencies: Python 3.12+, PyYAML; Node 22 for tests. Use separate virtualenv. No credential in source. No paid CI. Do not call a release ready until actual gates pass.
