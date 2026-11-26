# v12 recovery
Stop the portal before switching data directories. Backups contain private answers and operator decisions. Keep outside Git; restore only a trusted completed backup, not an arbitrary downloaded DB or live WAL file.
```bash
python backup_v12.py backup ~/academy-backup.sqlite3
mkdir -m 700 ~/academy-recovery
python backup_v12.py restore ~/academy-backup.sqlite3 ~/academy-recovery/learning.sqlite3 --confirm-trusted-backup
python backup_v12.py restore ~/academy-backup.sqlite3 ~/academy-recovery/learning.sqlite3 --confirm-trusted-backup --apply
ACADEMY_DATA_DIR="$HOME/academy-recovery" python portal.py
```
Dry run rebuilds a disposable database; apply publishes a new database with a create-only hard link on the same filesystem. Never overwrites original or existing destination. Source schema, integrity, event metadata, proposal binding, decision envelope and exact logical fingerprint verified. No cryptographic reviewer authentication; trusted operator attestation only. Keep original DB and browser draft export separately. SQLite schema references: https://docs.python.org/3.13/library/sqlite3.html and https://sqlite.org/pragma.html .