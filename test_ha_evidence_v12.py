import importlib.util, pathlib, unittest, urllib.error
p=pathlib.Path(__file__).resolve().parent/"production_v11/ha_drill_v12.py"
spec=importlib.util.spec_from_file_location("ha_drill",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class HAEvidence(unittest.TestCase):
    def test_classify_acknowledged(self):
        def get(path):
            if path.endswith("a"): return {"id":"a","done":True,"source":"database"}
            if path.endswith("b"): return {"id":"b","done":False,"source":"database"}
            if path.endswith("c"): raise urllib.error.HTTPError(path,404,"",{},None)
            raise OSError("timeout")
        self.assertEqual(m.check_ids(["a","b","c","d"],get),{"acknowledged":4,"missing":["c"],"pending":["b"],"unknown":["d"]})
    def test_cache_and_wrong_id_not_proof(self):
        for data in ({"id":"a","done":True,"source":"cache"},{"id":"b","done":True,"source":"database"},{"id":"a","done":1,"source":"database"}):
            self.assertEqual(m.check_ids(["a"],lambda _:data)["unknown"],["a"])
    def test_availability_and_recovery_are_distinct(self):
        evidence={"missing":[],"pending":[],"unknown":[]}
        self.assertEqual(m.evaluate(evidence,0,10,10,True)["overall"],"FAIL")
        self.assertEqual(m.evaluate(evidence,9,1,0,True)["fault_window_availability"],"FAIL")
        self.assertEqual(m.evaluate(evidence,9,1,1,True)["overall"],"PASS")
        self.assertEqual(m.evaluate(evidence,10,0,0,False)["recovery"],"FAIL")
        self.assertEqual(m.evaluate({**evidence,"missing":["a"]},10,0,0,True)["overall"],"FAIL")
    def test_ack_exact_identity(self):
        self.assertTrue(m.accepted("a",lambda *_:{"id":"a","created":True}))
        self.assertFalse(m.accepted("a",lambda *_:{"id":"b","created":True}))
        self.assertFalse(m.accepted("a",lambda *_:{"id":"a","created":1}))
