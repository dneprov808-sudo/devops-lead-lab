import datetime as dt, tempfile, unittest, uuid
from pathlib import Path
from learning_store import Store
from migration_v12 import convert
class MigrationV12(unittest.TestCase):
    def test_legacy_import(self):
        ident=str(uuid.uuid4());day="2025-01-01"
        row={"kind":"review","attempt":ident,"module":"REVIEW-LINUX","topic":"Linux/Bash","score":2,"assessed":day,"due":"2025-01-04","verification":"self_reported","path":"practice-results/REVIEW-LINUX/"+ident+".json"}
        h={"status":"read","commit":"a"*40,"invalid":0,"truncated":False,"items":[row]}
        with tempfile.TemporaryDirectory() as tmp:
            s=Store(Path(tmp)/"db",{})
            self.assertEqual(s.import_data(convert(h))["inserted"],1)
            self.assertEqual(s.import_data(convert({**h,"commit":"b"*40}))["existing"],1)
            self.assertEqual(s.summary()["legacy_results"],1)
            self.assertEqual(s.summary()["self_reviews"],[])
            self.assertEqual(s.summary()["canonical_grade"],"unchanged")
        with self.assertRaises(ValueError):convert({**h,"truncated":True})
        with self.assertRaises(ValueError):convert({**h,"items":[{**row,"due":"2025-01-05"}]})
