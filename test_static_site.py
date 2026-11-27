"""Portable Academy build contracts. Run with python3 -m unittest -v test_static_site."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("academy_static_builder", ROOT / "site/build.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class StaticSiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sha = builder.read_commit(ROOT, "HEAD")
        cls.files, cls.manifest = builder.build_files(ROOT, cls.sha)

    def test_all_outputs_and_hashes(self):
        self.assertEqual(set(self.files), {"index.html", "library.html", "interview.html", "architecture.html",
                                           "site.css", "progress.js", "course.css", "course.js", "manifest.json"})
        self.assertEqual(self.manifest["commit"], self.sha)
        for path, digest in self.manifest["outputs"].items():
            self.assertEqual(builder.sha256(self.files[path]), digest)
        self.assertEqual(len(self.manifest["inputs"]), 8)

    def test_deterministic_build(self):
        files, manifest = builder.build_files(ROOT, self.sha)
        self.assertEqual(files, self.files)
        self.assertEqual(manifest, self.manifest)

    def extract(self, filename):
        raw = self.files[filename].decode("utf-8")
        self.assertEqual(raw.count('id="dataset"'), 1)
        self.assertIn(self.sha[:8].upper(), raw)
        self.assertIn('href="site.css"', raw)
        self.assertIn('src="progress.js"', raw)
        self.assertIn("connect-src 'none'", raw)
        return json.loads(raw.split('<script type="application/json" id="dataset">', 1)[1]
                              .split("</script>", 1)[0])

    def test_no_content_loss(self):
        data = self.extract("library.html")
        for name, path in builder.CONTENT.items():
            self.assertEqual(data[name], json.loads(builder.load(ROOT, self.sha, path)))
        self.assertEqual(data["runbooks"], builder.parse_runbooks(
            builder.load(ROOT, self.sha, "web/index.html")))
        self.assertEqual(self.extract("interview.html"), builder.parse_bank(
            builder.load(ROOT, self.sha, "web/interview-bank.js")))
        self.assertEqual(self.extract("architecture.html")["counts"], self.manifest["counts"])
        course = self.extract("index.html")
        self.assertEqual(course["guides"], data["guides"])
        self.assertEqual(course["runbooks"], data["runbooks"])
        self.assertEqual(course["manifest"], data["manifest"])
        self.assertEqual(course["labs"], data["labs"])
        self.assertEqual(course["course"], json.loads(builder.load(ROOT, self.sha, "learning/course.json")))
        builder.validate_course(course["course"], data)

    def test_course_rejects_duplicate_unknown_and_bad_scenario(self):
        data = self.extract("library.html")
        import copy
        course = self.extract("index.html")["course"]
        changed = copy.deepcopy(course)
        changed["modules"][1]["topics"].append(changed["modules"][0]["topics"][0])
        with self.assertRaises(ValueError):
            builder.validate_course(changed, data)
        changed = copy.deepcopy(course)
        changed["modules"][0]["topics"][0]["practice"]["runbook"] = "missing"
        with self.assertRaises(ValueError):
            builder.validate_course(changed, data)
        changed = copy.deepcopy(course)
        changed["modules"][0]["topics"][0]["scenario"]["correct"] = 999
        with self.assertRaises(ValueError):
            builder.validate_course(changed, data)

    def test_json_is_inert(self):
        data = {"text": "</script><script>alert(1)</script>", "literal": "@@ACADEMY_SHA@@"}
        template = '<script type="application/json" id="dataset">@@ACADEMY_DATASET@@</script>'
        rendered = builder.render(template, data, self.sha)
        self.assertEqual(rendered.count("</script>"), 1)
        self.assertEqual(json.loads(rendered.split(">", 1)[1].split("</script>")[0]), data)

    def test_reject_duplicate_and_non_json_bank(self):
        with self.assertRaises(ValueError):
            builder.unique_rows([{"id": "same"}, {"id": "same"}], "test")
        with self.assertRaises(ValueError):
            builder.unique_rows([{"id": "__proto__"}], "test")
        with self.assertRaises(ValueError):
            builder.parse_bank('const INTERVIEW_PRO_BANK = []; alert(1);')
        with self.assertRaises(ValueError):
            builder.render("missing marker", {}, self.sha)

    def test_runbook_mismatch_rejected(self):
        html = builder.load(ROOT, self.sha, "web/index.html")
        altered = html.replace("data-prompt=\"python3 -m venv", "data-prompt=\"altered -m venv", 1)
        self.assertNotEqual(html, altered)
        with self.assertRaises(ValueError):
            builder.parse_runbooks(altered)

    def test_immutable_local_release(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            dest = builder.publish_local(root, self.sha, {"index.html": b"safe"})
            self.assertEqual(builder.publish_local(root, self.sha, {"index.html": b"safe"}), dest)
            with self.assertRaises(ValueError):
                builder.publish_local(root, self.sha, {"index.html": b"different"})
            self.assertEqual((dest / "index.html").read_bytes(), b"safe")


if __name__ == "__main__":
    unittest.main()
