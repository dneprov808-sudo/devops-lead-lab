import json, pathlib, tempfile, unittest, uuid
from learning_store import Store, now
from market_v12 import normalize_item
class CareerLeadV12(unittest.TestCase):
    def test_market_suggestions(self):
        item={"id":"123","name":"Senior DevOps Kubernetes Linux","employer":{"name":"Synthetic"},"snippet":{"requirement":"<highlighttext>Terraform</highlighttext>"},"salary":{"currency":"RUR","from":450000,"to":600000,"gross":True}}
        v=normalize_item(item,"2026-01-01")
        self.assertEqual(v["basis"],"gross")
        self.assertEqual(v["salary_min"],450000)
        self.assertIn("Terraform",v["topics"])
        self.assertIsNone(normalize_item({**item,"archived":True},"2026-01-01"))
        self.assertIsNone(normalize_item({**item,"salary":{"currency":"USD","from":100}},"2026-01-01")["salary_min"])
    def test_lead_cases(self):
        root=pathlib.Path(__file__).resolve().parent
        cases=json.loads((root/"learning/leadership_v12.json").read_text())
        self.assertEqual(len(cases),12)
        self.assertTrue(all(len(c["choices"])==3 and sum(x["preferred"] for x in c["choices"])==1 for c in cases))
        with tempfile.TemporaryDirectory() as tmp:
            s=Store(pathlib.Path(tmp)/"db",{})
            row={"id":str(uuid.uuid4()),"kind":"lead_case","created_at":now(),"data":{"case_id":cases[0]["id"],"choice":cases[0]["choices"][0]["id"],"rationale":"synthetic rationale"}}
            self.assertEqual(s.add(row)["inserted"],1)
            self.assertEqual(s.summary()["canonical_grade"],"unchanged")
