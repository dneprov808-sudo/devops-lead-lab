import importlib.util, pathlib, unittest, urllib.error
p=pathlib.Path(__file__).resolve().parent/"production_v11/ha_drill_v12.py"
spec=importlib.util.spec_from_file_location("ha_drill",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class HAEvidence(unittest.TestCase):
    def test_classify_acknowledged(self):
        def get(path):
            if path.endswith("a"): return {"done":True}
            if path.endswith("b"): return {"done":False}
            if path.endswith("c"): raise urllib.error.HTTPError(path,404,"",{},None)
            raise OSError("timeout")
        self.assertEqual(m.check_ids(["a","b","c","d"],get),{"acknowledged":4,"missing":["c"],"pending":["b"],"unknown":["d"]})
