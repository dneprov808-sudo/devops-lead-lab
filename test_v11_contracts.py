import copy
import importlib.util
import tempfile
import unittest
import uuid
from pathlib import Path
import academy_metrics as metrics
from analyzer_bridge import normalize_report
from learning_store import Store, now

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("v11_k8s_verify",ROOT/"v11-labs/k8s/verify.py")
verify=importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)

class V11Contracts(unittest.TestCase):
    def test_analyzer_is_proposal_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            store=Store(Path(tmp)/"test.sqlite3",{"Q-001":{"topic":"Linux"}})
            event={"id":str(uuid.uuid4()),"kind":"attempt","created_at":now(),"data":{"question_id":"Q-001","answer":"synthetic","score":None,"error":""}}
            store.add(event)
            proposal={"id":str(uuid.uuid4()),"kind":"review_proposal","created_at":now(),"data":{"attempt_id":event["id"],"question_id":"Q-001","score":4,"reviewer":"local analyzer","evidence":"synthetic","error":"","commit":None}}
            report={"schema_version":1,"kind":"academy_analyzer_review","reviews":[proposal]}
            self.assertEqual(store.import_data(normalize_report(report,store.bank))["inserted"],1)
            self.assertEqual(store.summary()["canonical_grade"],"unchanged")
            self.assertEqual(store.summary()["self_reviews"],[])
            with self.assertRaises(ValueError): normalize_report({"analysis":[]},store.bank)
    def test_k8s_verifier_fixtures(self):
        d={"metadata":{"generation":4},"spec":{"replicas":2,"template":{"spec":{"containers":[{"image":"nginx:1.28-alpine"}]}}},"status":{"observedGeneration":4,"updatedReplicas":2,"availableReplicas":2}}
        s={"items":[{"endpoints":[{"conditions":{"ready":True},"targetRef":{"kind":"Pod","uid":u}} for u in ("a","b")]}]}
        self.assertTrue(verify.check(d,s))
        wrong=copy.deepcopy(s);wrong["items"][0]["endpoints"][1]["targetRef"]["uid"]="a"
        self.assertFalse(verify.check(d,wrong))
        wrong=copy.deepcopy(d);wrong["status"]["observedGeneration"]=3
        self.assertFalse(verify.check(wrong,s))
        wrong=copy.deepcopy(d);wrong["spec"]["template"]["spec"]["containers"][0]["image"]="invalid"
        self.assertFalse(verify.check(wrong,s))
    def test_metrics_contract(self):
        metrics.observe("synthetic",200,0.1)
        result=metrics.metrics()
        self.assertIn('academy_http_requests_total{route="synthetic",status="200"}',result)
        self.assertIn('academy_http_request_duration_seconds_total{route="synthetic"}',result)
        self.assertIn("academy_process_uptime_seconds",result)
