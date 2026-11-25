# ACADEMY-004 — integration evidence

## Executed checks
- 21/21 core pure-function tests in JS execution environment, using the exact function definitions serialized to bus.mjs and test_bus.mjs; source files read back and compared for equality.
- 6/6 transport helper checks likewise executed with the exact definitions serialized to transport.mjs and test_transport.mjs.
- Issue #2: https://github.com/dneprov808-sudo/devops-lead-lab/issues/2 — created, fetched, exact title matched in issue search (one result), channel=test, proposed_status=null. Ordinary issue comments read (empty); test issue closed and closed state re-read. No live handoff accepted.
- PR #3 comment: https://github.com/dneprov808-sudo/devops-lead-lab/pull/3#issuecomment-7175663395 — created with PR comment connector, read back by comment ID and exact body. Synthetic, not a state approval. Ordinary Issue comment POST is not established by this test.
- All four original automations remain active, Europe/Moscow, and have the existing permission-gated publication instructions. No scheduled independent run record available during this check. No prompt or schedule change.

## Not tested
- Full Node/gh CLI run against GitHub from local WSL; gh not installed in the assistant's local test container.
- Ordinary Issue comment POST and read-back via CLI in a real independent agent context.
- True concurrent issue POST, optimistic state commit conflict, full acceptance/replay persistence and automatic cross-agent delivery.
- GitHub server-side role separation, branch protection, tamper-proof storage. Owner account is shared; logical role is not authenticated independently.

## Acceptance
Pilot code and connector smoke: PASS. Automated live rollout: NOT TESTED / not approved. The code is a read-only planner by default; explicit --apply permits issue creation or received_only transport receipt. It never writes STATE, grades, or lab files. No merge performed. State remains assigned LAB-001 until student evidence and Orchestrator approval.
