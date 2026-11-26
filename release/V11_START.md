# Academy v11-dev — local start and review
This is a release candidate; run gates before manual merge. Existing start instructions in START_HERE.md still describe older versions; use this guide for v11.
## Separate checkout (preserve student changes)
```bash
git fetch origin
git worktree add -b review/v11-local ../academy-v11-review origin/academy/v11
cd ../academy-v11-review
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-v11-dev.txt
python -m playwright install chromium
node --version
python release/gate.py
python release/gate.py --full
python portal.py
```
If the worktree or branch already exists, inspect it first; do not reset local changes. Stop existing portal on port 8080 before full browser gate. URL http://127.0.0.1:8080. Node 22 and Python 3.12+ recommended; Docker Compose installed locally for full gate. All downloads/tools local, no paid services.
## Learning
Use grouped workspace: Technologies -> Interview Pro for specific topic; Today -> local study plan, errors and evidence counts. Answer first, reveal, then explicitly save a self-assessment/attempt. Mock Interview Pro has ten profiles including entry and Lead; drafts resume from browser localStorage, completed sessions explicitly saved to SQLite. Legacy tools remain available. No scores represent confirmed competencies without independent review and canonical Orchestrator approval.
## Local backup
```bash
python learning_backup.py export ~/academy-v11-backup.json
python learning_backup.py backup ~/academy-v11-backup.sqlite3
python learning_backup.py import ~/academy-v11-backup.json
```
Use new filenames for backups; import validated and idempotent, never destructive. Default .academy-data/learning.sqlite3 is ignored. Use ACADEMY_DATA_DIR for a separate local database. Do not commit or share raw answers, transcripts or backups. Old Git result history remains available separately; legacy migration and drafts are not covered by SQLite backup.
## Labs
Follow production_v11/README.md and v11-labs/k8s/README.md. Verify local Docker context, resource budgets and ports first. Light and HA share ports; never run both simultaneously. Keep canonical LAB-001 unchanged. Live gates require explicitly prepared local lab. No solution to the K8s failure supplied. Analyzer: analyzer/README.md. Agents: orchestration/bus/V11_JOURNAL.md. Review all limitations in release/V11_DELIVERY.md.
