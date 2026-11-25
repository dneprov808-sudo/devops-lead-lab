# Coordination protocol v1

## Shared state
Canonical control file: orchestration/STATE.yaml at the explicitly agreed control ref. During pilot: academy/orchestration-v1. The existing lab lives on training/lead-cohort-01; read lab files there, not on main. The baseline SHA is for reproducibility; current student implementation is identified separately by a submitted SHA. After manual integration, Orchestrator announces the new control ref and updates control.ref. Never silently fall back to main or another branch.

Before each run read AGENTS.md, STATE, PROTOCOL and relevant task files. Record control ref, observed commit if available, revision and task ID. If inaccessible, report BLOCKED; offer safe, clearly labelled independent practice only, not an invented status or new core task. Ordinary chats and scheduled tasks do not automatically invoke one another.

## State machine
| From | To | Gate |
|---|---|---|
| assigned | in_progress | Student confirms starting work |
| in_progress | awaiting_review | Implementation SHA, actual test output and report submitted; original tests pass |
| awaiting_review | revision_required | Reviewer documents actionable failures against exact SHA |
| revision_required | in_progress | Student accepts corrections |
| awaiting_review | awaiting_exam | Reviewer passes code, evidence and report for exact SHA |
| awaiting_exam | completed | Examiner verifies independent understanding; Orchestrator accepts evidence |
| awaiting_exam | revision_required | Examiner finds material gaps; specify remediation |
| any nonterminal | blocked | Document external blocker and prior state |
| blocked | prior state | Orchestrator records blocker resolution |
| any nonterminal | deferred | User/Orchestrator agrees reason and resumption condition |

Orchestrator alone commits transitions; workflow fields must match status. Do not skip gates or invent grades. Completion of parallel practice/market/incident tasks never advances the primary lab. A new implementation SHA invalidates prior review/test evidence unless rerun/revalidated.

## Concurrency and delivery
- One logical writer for STATE and SKILL_MATRIX. All others submit proposed handoff using HANDOFFS.md, via accessible repo issue/PR/comment or pasted chat message. Do not assume connector write permissions.
- Handoff identity is stable (role + task + evidence identifier + event); duplicates are ignored. Record accepted IDs once.
- Check revision and current ref immediately before write. Use a non-force update with expected file/commit SHA where available. On conflict stop, reread and reconcile; never overwrite unrelated progress.
- No implicit cross-chat messages. User can paste a handoff into Orchestrator, or Orchestrator can read saved handoffs from the repo if accessible.
- Automatic triggers, automatic write-back and scheduled-agent synchronization are outside this phase. Existing schedules remain unchanged.

## Roles and schedules (Moscow)
Daily Mentor 09:00: read state, help with current next action; no duplicate lab. Knowledge Examiner 21:00: choose questions from verified material, record answers only after interaction. Chaos Agent Wed/Sat 19:00: separate incident ID, disclose synthetic scenario, preserve primary lab state. Career Intelligence Sun 12:00: dated source-backed market evidence, recommendations only. Lab Engineer and Reviewer act on demand. Orchestrator resolves priorities and approves transitions.

## Security / cost
Local WSL/VM labs only, synthetic data; no production access, secrets, external paid API, Codex or automatic merge. Do not claim tools ran when only inspecting source. Log actual test command, output, exit code, SHA and environment where available. If the connector cannot write, return copyable handoff and let the user/Orchestrator persist it.
