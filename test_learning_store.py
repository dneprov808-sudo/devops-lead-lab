import datetime as dt
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch
from learning_store import Store, now

class LearningStoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path=Path(self.tmp.name)/"study.sqlite3"
        self.store=Store(self.path,{"Q-001":{},"Q-002":{}})
    def record(self,kind="attempt",data=None):
        return {"id":str(uuid.uuid4()),"created_at":now(),"kind":kind,"data":data or {"question_id":"Q-001","answer":"test","score":2,"error":"gap"}}
    def test_roundtrip(self):
        row=self.record()
        self.assertEqual(self.store.add(row)["inserted"],1)
        self.assertEqual(self.store.add(row)["existing"],1)
        fresh=Store(Path(self.tmp.name)/"new.sqlite3",self.store.bank)
        self.assertEqual(fresh.import_data(self.store.export())["inserted"],1)
        self.assertEqual(fresh.export(),self.store.export())
    def test_atomic_collision(self):
        row=self.record(); self.store.add(row)
        changed={**row,"data":{**row["data"],"score":4}}
        with self.assertRaises(ValueError):
            self.store.import_data({"schema_version":1,"events":[self.record(),changed]})
        self.assertEqual(len(self.store.export()["events"]),1)
    def test_invalid(self):
        for change in ({"score":True},{"question_id":"UNKNOWN"},{"answer":"x"*12001}):
            row=self.record(); row["data"].update(change)
            with self.assertRaises(ValueError): self.store.add(row)
        self.assertEqual(self.store.export()["events"],[])
    def test_review_binding(self):
        row=self.record(); self.store.add(row)
        data={"attempt_id":row["id"],"question_id":"Q-002","score":4,"reviewer":"test examiner","evidence":"example","error":"","commit":None}
        with self.assertRaises(ValueError): self.store.add(self.record("review_proposal",data))
        data["question_id"]="Q-001"
        self.store.add(self.record("review_proposal",data))
        s=self.store.summary()
        self.assertEqual(s["review_proposals"],1)
        self.assertEqual(s["self_reviews"][0]["verification"],"self_reported")
        self.assertEqual(s["canonical_grade"],"unchanged")
    def test_backup(self):
        self.store.add(self.record())
        dst=Path(self.tmp.name)/"backup.sqlite3"
        self.store.backup(dst)
        self.assertEqual(Store(dst,self.store.bank).export(),self.store.export())
        with self.assertRaises(FileExistsError): self.store.backup(dst)
    def test_store_size_and_rollback(self):
        with patch("learning_store.MAX_STORE_BYTES",1):
            with self.assertRaises(ValueError): self.store.add(self.record())
        self.assertEqual(self.store.export()["events"],[])
    def test_career_view_excludes_answers(self):
        self.store.bank={"Q-001":{"topic":"Linux"}}
        self.store.add(self.record())
        row=self.record("vacancy",{"title":"Synthetic lead","company":"Example","source":"https://example.com/role","observed":dt.date.today().isoformat(),"salary_min":400000,"salary_max":600000,"basis":"gross","topics":["Linux"]})
        self.store.add(row)
        self.assertEqual([e["kind"] for e in self.store.career()["events"]],["vacancy"])
        invalid={**row,"id":str(uuid.uuid4()),"data":{**row["data"],"salary_max":1}}
        with self.assertRaises(ValueError): self.store.add(invalid)
    def test_mock_review_binding(self):
        row=self.record("mock",{"profile":"lead","minutes":90,"started_at":now(),"responses":[{"question_id":"Q-001","answer":"synthetic"}]})
        row["created_at"]=now()
        self.store.add(row)
        data={"attempt_id":row["id"],"question_id":"Q-001","score":3,"reviewer":"examiner candidate","evidence":"synthetic answer","error":"","commit":None}
        self.store.add(self.record("review_proposal",data))
        self.assertEqual(self.store.summary()["mock_sessions"],1)
        self.assertEqual(self.store.summary()["proposals"][0]["status"],"unverified_proposal")
