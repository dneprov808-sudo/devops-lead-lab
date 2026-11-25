# ACADEMY-007 — DX test report (2026-11-26)

## Executed
- CLI and test suite copied locally and SHA-1 Git blob compared to GitHub: academy.py 93afc5a0c969f3c9825cadda5fe9f8b4f06c32df; test_dx.py e1e42f8d3b42784b8f9272948389e93730d3e3a5.
- python3 -m py_compile academy.py, academy.py --help and doctor: PASS.
- python3 test_dx.py: 10/10 PASS (integrity, unsupported lab, start/resume, dirty checkout, remote duplicate, review gate, test exit propagation, wrong origin, invalid YAML). Mocks for branch/preflight unit cases.
- Actual local Git integration: temporary bare remote, synthetic canonical STATE, local origin allowlist overridden only in test; fetch, parse, create student branch, resume without duplicate: PASS. No network writes to GitHub in integration test.
- Original LAB-001 README/server/test/placeholder read back and local blobs compared; academy.py test: original eight tests fail on exit 99 placeholder, CLI propagates exit 1; academy.py submit blocks failed submission with exit 2. Expected baseline behavior; lab not solved.
- Workflow exact blob f2f5398d5473688e7e860a10e60a4ff00d16625f parsed locally with YAML BaseLoader, inspected branch trigger, read-only permission, billing opt-in, checkout credential persistence false. Syntax/guard checks PASS; not a GitHub Actions execution.
- Existing Mentor and Examiner prompts extended with DX time modes and interview/repetition; re-read after update. Schedule unchanged, ACADEMY-005 preserved, Orchestrator stays read-only, Career Intelligence paused.

## Limitations
No GitHub Actions hosted job executed and no billing or repository variable changed. Connector does not establish actual WSL authentication; private clone needs existing credentials. CLI intentionally supports LAB-001 only. New lab adapter must be reviewed. Repetition runs in existing Examiner instruction and depends on accessible prior verified reports; no durable independent review scheduler, no automatic grade/state writing. Dashboard is a chat command interface, not a separate persistent app. Scheduled execution remains unverified. No merge.
