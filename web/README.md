# Academy Web Portal v1 — ACADEMY-008

> **Practice v2:** в этой ветке действует дополнительный практикум и явная кнопка сохранения результатов в student/practice-results. Актуальный быстрый старт и новая модель записи: [practice/README.md](../practice/README.md). Нижеследующая документация описывает базовый Web Portal v1; его запрет записи распространяется на STATE, Issues и автоматизации, но не на новый строго ограниченный save-эндпоинт.

Local private portal, not a publicly deployed website. No OpenAI API, Codex, cloud hosting, npm packages, database or additional automation. Reuses Academy DX v1; only LAB-001 has a local executable adapter. No lab solutions included.

## Quick start (WSL Ubuntu)
If a fresh clone is needed:
    git clone -b academy/web-portal-v1 https://github.com/dneprov808-sudo/devops-lead-lab.git
    cd devops-lead-lab

Private repository: authenticate Git first using your existing SSH or HTTPS credentials. For SSH use git@github.com:dneprov808-sudo/devops-lead-lab.git instead of HTTPS. Never embed tokens in URLs. If existing checkout has changes or a student branch, do not reset or overwrite; inspect git status and consult Orchestrator first.

If dependencies are absent:
    sudo apt update
    sudo apt install git python3 python3-yaml curl bash

One command from repository root:
    python3 portal.py

Open http://127.0.0.1:8080 in Windows browser (normal WSL localhost forwarding). Stop via Ctrl-C in WSL. If port occupied stop its owner or use another local instance only after reviewing configuration; do not expose this server on 0.0.0.0. No browser extension or frontend build required.

For optional Handoff monitor install recent GitHub CLI with --paginate --slurp support and authenticate in terminal:
    gh auth login --hostname github.com
    gh auth status
Use your own authorized read access; no token goes into browser or source. Without gh the rest of the portal works; Handoff reports BLOCKED. Prefer read-only repo access if supported by your chosen authentication. See https://cli.github.com/manual/gh_api and https://docs.github.com/en/rest/issues/issues .

## What each section does
- Overview: fetch canonical control commit from academy/orchestration-v1; show STATE revision/task/next action, workflow flags, read timestamp. If refresh fails, mark stale/blocked. Agent schedules are reference information, not live ChatGPT run records. Refresh manually.
- Roadmap and Skills: read Markdown tables from the same pinned commit. Never estimate unknown competence scores.
- Session: choose 20/60/120 min, timer and next-step plan. Copy CLI command from Laboratory. Run it in terminal to create/reuse student/lab-001 from a clean portal checkout. Git branch changes and push are explicit terminal operations only. If remote student branch already exists, CLI stops; reconcile manually instead of duplicating. Edit only healthcheck.sh and REPORT.md. Use local test button only for trusted local code; test output includes actual exit code. Source fixture integrity checked by original CLI. Tests run in the same checkout as portal; if using a separate student worktree, use CLI there and not the portal test button. Existing student branch from earlier DX may lack portal files; do not overwrite it.
- Interview: 24 offline practice questions across 12 topics, two difficulty levels selected by previous local self-rating. Enter answer, reveal rubric, self-assess 0–4; no AI grade. Raw answer is not saved. Copy an exam request into ChatGPT for independent assessment.
- Review: browser localStorage stores only latest topic score and timestamps; 1/1/3/7/14 day intervals, overdue first. Local practice data is not canonical, not cross-device synced and not durable backup. Clear through the UI.
- Handoff: gh reads repo Issues including closed, with pagination; preview separates test titles, groups matching IDs, flags conflicts, stale/closed/untrusted and accepted/pending IDs. This is transport preview, not complete bus schema validator, not acceptance ledger and not the authoritative Consumer. Full validation/evidence remains Orchestrator's role. No writing Issues or STATE.
- ChatGPT: copy requests into project Учеба. The site does not call ChatGPT models, read private conversation history, start automation or automatically submit Handoff. Use existing project agents.

## Security and limitations
Bind only IPv4 loopback; no network exposure, no reverse proxy, no internet deployment. Host/Origin checks, random local CSRF token, same-origin CSP, explicit test confirmation, fixed command and route allowlists, no arbitrary path/command input. Browser uses textContent for data, not HTML injection. The local CSRF token is not a GitHub credential. Git and gh retain their own credentials on the machine. Git fetch changes local git object store, not remote state. Local code execution is NOT sandboxed; never run untrusted code or production commands. Do not print secrets in student output; do not share logs externally without review. Server is for one trusted local user, not production hardened. No GitHub writes, no automated merge, no changes to schedules. No need to enable CI to use this portal.

## Test commands
    python3 -m unittest -v test_portal
    node test_frontend.mjs  # optional Node 22 for development checks, not runtime
    python3 academy.py test # initial placeholder expected FAIL

See WEB_TEST_REPORT.md for actual evidence and remaining checks.
