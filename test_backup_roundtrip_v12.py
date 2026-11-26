import pathlib, tempfile, unittest, uuid, sqlite3
from learning_store import Store, now, canonical
from assessment_v12 import binding, decide, report
from backup_v12 import restore, read_snapshot
class BackupRoundTrip(unittest.TestCase):
    def test_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=pathlib.Path(tmp);bank={"Q-001":{"topic":"Linux","level":"senior"}}
            s=Store(d/"original",bank)
            aid=str(uuid.uuid4());pid=str(uuid.uuid4())
            s.add({"id":aid,"kind":"attempt","created_at":now(),"data":{"question_id":"Q-001","answer":"synthetic","score":1,"error":""}})
            s.add({"id":pid,"kind":"review_proposal","created_at":now(),"data":{"attempt_id":aid,"question_id":"Q-001","score":3,"reviewer":"review candidate","evidence":"synthetic","error":"","commit":None}})
            with s.connect() as c: sha=binding(c,pid)[2]
            decide(s,pid,sha,"accept","human reviewer","local review")
            backup=d/"backup";dest=d/"restored"
            s.backup(backup)
            self.assertEqual(restore(backup,dest,bank=bank)["decisions"],1)
            self.assertFalse(dest.exists())
            self.assertEqual(restore(backup,dest,bank=bank,apply=True)["status"],"restored")
            self.assertEqual(read_snapshot(backup),read_snapshot(dest))
            self.assertEqual(report(Store(dest,bank)),report(s))
            with self.assertRaises(FileExistsError):restore(backup,dest,bank=bank,apply=True)
            with sqlite3.connect(backup) as c:
                import json
                raw=c.execute("SELECT payload FROM review_decisions").fetchone()[0]
                row=json.loads(raw);row["binding_sha256"]="0"*64
                c.execute("UPDATE review_decisions SET payload=?",(canonical(row),))
            with self.assertRaises(ValueError):restore(backup,d/"bad",bank=bank,apply=True)
            self.assertFalse((d/"bad").exists())
