import json, pathlib, sqlite3, tempfile, unittest
from backup_v12 import read_snapshot, fingerprint, canonical
class BackupStructure(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup)
        self.p=pathlib.Path(t.name)/"backup.db"
        self.row={"id":"event","kind":"attempt","created_at":"2025-01-01","data":{}}
        with sqlite3.connect(self.p) as c:
            c.execute("PRAGMA user_version=1")
            c.execute("CREATE TABLE events(id TEXT PRIMARY KEY,created_at TEXT,kind TEXT,payload TEXT)")
            c.execute("CREATE INDEX events_created ON events(created_at,id)")
            c.execute("INSERT INTO events VALUES (?,?,?,?)",("event","2025-01-01","attempt",canonical(self.row)))
    def test_snapshot_and_fingerprint(self):
        s=read_snapshot(self.p)
        self.assertEqual(s["events"],[self.row])
        self.assertEqual(s["decisions"],[])
        self.assertEqual(fingerprint(s),fingerprint(read_snapshot(self.p)))
    def test_reject_metadata_mismatch(self):
        with sqlite3.connect(self.p) as c:c.execute("UPDATE events SET kind='mock'")
        with self.assertRaises(ValueError):read_snapshot(self.p)
    def test_reject_unexpected_schema(self):
        with sqlite3.connect(self.p) as c:c.execute("CREATE TABLE extra(x)")
        with self.assertRaises(ValueError):read_snapshot(self.p)
    def test_reject_sidecar(self):
        pathlib.Path(str(self.p)+"-wal").touch()
        with self.assertRaises(ValueError):read_snapshot(self.p)
