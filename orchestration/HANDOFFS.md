# Handoff contract

Each completed attempt or blocker produces one record. Paste into Orchestrator or store in an appropriate GitHub issue/PR comment. A handoff is a proposal, not a state transition. Do not include passwords, real production logs or a hidden exercise solution.

```yaml
handoff_version: 1
handoff_id: "<role>/<task-id>/<event>/<evidence-id>"
from: "<role>"
to: "orchestrator"
task_id: "LAB-001"
event: "<submitted|reviewed|examined|blocked|recommendation>"
observed_state_revision: 1
control_ref: "academy/orchestration-v1"
observed_control_commit: null
artifact_ref: "training/lead-cohort-01"
artifact_commit: null
result: "<pass|fail|partial|blocked|not_applicable>"
summary: "<facts, not assumptions>"
evidence:
  - kind: "<commit|test_output|review|exam|source>"
    location: "<URL/path or chat result>"
    details: "<command, output, exit code, or observed answer>"
proposed_status: null
next_action: "<specific action>"
limitations: []
```

Use real identifiers; null means not available, not proof. Reviewer cites exact SHA and separates blocking from optional issues. Examiner records actual answers and rubric; a question set alone is not an exam result. Career/Chaos use own task IDs and proposed_status null for primary lab. If GitHub unavailable, return handoff with blocked/partial and no invented evidence.

## Initial handoff (bootstrap, pending user action)
LAB-001 specification and test harness exist at baseline commit 4a4cae2c95580f01fa66946dafd2b21eb9754d98. healthcheck.sh is a placeholder (exit 99). No test execution or completed student implementation has been observed. Next: student implements and submits evidence. This note is not an exam, review or claim of completed lab.
