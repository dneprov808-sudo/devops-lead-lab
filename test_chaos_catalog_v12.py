import json, pathlib, unittest
class ChaosCatalogV12(unittest.TestCase):
    def test_catalog(self):
        root=pathlib.Path(__file__).resolve().parent
        a=json.loads((root/"production_v11/chaos_v12.json").read_text())
        public=json.loads((root/"learning/chaos_v12.json").read_text())
        self.assertEqual(len(a),30)
        self.assertEqual(len({x["id"] for x in a}),30)
        self.assertEqual(sum(x["execution"]=="local_stop" for x in a),15)
        self.assertEqual(sum(x["execution"]=="bounded_load" for x in a),1)
        self.assertEqual(public,[{k:v for k,v in x.items() if k!="operator_target"} for x in a])
        self.assertTrue(all(x["evidence"] and x["goal"] and x["symptom"] for x in a))
