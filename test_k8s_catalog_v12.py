import json,pathlib,unittest
class K8sCatalogV12(unittest.TestCase):
    def test_specs(self):
        root=pathlib.Path(__file__).resolve().parent/"v12-labs/k8s"
        rows=json.loads((root/"catalog.json").read_text())
        self.assertEqual(len(rows),20)
        self.assertEqual(len({x["namespace"] for x in rows}),20)
        for x in rows:
            self.assertTrue(x["checks"] and x["task"] and x["prerequisites"])
            fixture=json.loads((root/x["fixture"]).read_text())
            self.assertTrue(fixture["items"])
            self.assertTrue(all(v["metadata"]["namespace"]==x["namespace"] for v in fixture["items"]))
