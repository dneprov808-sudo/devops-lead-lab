import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import uuid
from unittest.mock import patch

import practice_history as h
import practice_results as p
import portal

CAT = [{"id": "PR-PG-01", "evidence": ["a", "b"]}]

class HistoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.remote = self.root / "remote.git"
        self.work = self.root / "work"
        self.work.mkdir()
        self.git("init", "--bare", str(self.remote), cwd=self.root)
        self.git("init", "-b", "academy/practice-v2")
        self.git("config", "user.name", "Academy test")
        self.git("config", "user.email", "test@example.invalid")
        (self.work / "base").write_text("base")
        self.git("add", "base")
        self.git("commit", "-m", "base")
        self.git("remote", "add", "origin", str(self.remote))
        self.git("push", "origin", "HEAD:" + p.BASE)
    def git(self, *args, cwd=None):
        return subprocess.check_output(["git", "-C", str(cwd or self.work), *args], text=True, stderr=subprocess.DEVNULL).strip()
    def command(self, args, cwd):
        r = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
        return r.returncode, r.stdout
    def read(self, limit=300):
        return h.read_history(self.git, self.command, {str(self.remote)}, p.normalize, CAT, self.work, limit)
    def record(self):
        x = {"kind": "practice", "attempt": str(uuid.uuid4()), "module": "PR-PG-01", "checks": [1], "score": 2}
        return p.save(x, CAT, root=self.work, origins={str(self.remote)})
    def test_empty(self):
        self.assertEqual(self.read()["status"], "empty")
    def test_saved_and_pinned(self):
        r = self.record()
        result = self.read()
        self.assertEqual(result["commit"], r["commit"])
        self.assertEqual(result["items"][0]["path"], r["path"])
        self.assertEqual(result["items"][0]["verification"], "self_reported")
    def test_limit_and_read_only(self):
        self.record(); self.record()
        head = self.git("rev-parse", "HEAD")
        before = self.git("status", "--porcelain")
        result = self.read(1)
        self.assertTrue(result["truncated"])
        self.assertEqual(len(result["items"]), 1)
        self.assertEqual(self.git("rev-parse", "HEAD"), head)
        self.assertEqual(self.git("status", "--porcelain"), before)
    def test_invalid_and_symlink(self):
        r = self.record()
        self.git("switch", "--detach", r["commit"])
        path = self.work / "practice-results/PR-PG-01" / (str(uuid.uuid4()) + ".json")
        path.write_text(json.dumps({"token": "synthetic-not-valid"}))
        path.with_name(str(uuid.uuid4()) + ".json").symlink_to(path.name)
        self.git("add", "practice-results")
        self.git("commit", "-m", "invalid fixture")
        self.git("push", "origin", "HEAD:" + p.DEST)
        result = self.read()
        self.assertEqual(result["invalid"], 2)
        self.assertEqual(len(result["items"]), 1)
        self.assertNotIn("synthetic-not-valid", json.dumps(result))
    def test_wrong_origin(self):
        with self.assertRaises(ValueError):
            h.read_history(self.git, self.command, {"wrong"}, p.normalize, CAT, self.work)
    def test_failed_read(self):
        with self.assertRaises(ValueError):
            h.read_history(self.git, lambda *a, **k: (128, "failed"), {str(self.remote)}, p.normalize, CAT, self.work)
    def test_bad_ref(self):
        with self.assertRaises(ValueError):
            h.read_history(self.git, lambda *a, **k: (0, "a"*40 + " refs/heads/wrong"), {str(self.remote)}, p.normalize, CAT, self.work)

if __name__ == "__main__":
    unittest.main(verbosity=2)
