import http.client
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest
from unittest.mock import patch
import uuid
from http.server import ThreadingHTTPServer

import practice_results as p
import portal

CATALOG = [{"id": "PR-KAFKA-01", "evidence": ["a", "b"]}]

def payload():
    return {"kind": "practice", "attempt": str(uuid.uuid4()), "module": "PR-KAFKA-01", "checks": [1, 0], "score": 2}

class SaveTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.remote = self.root / "remote.git"
        self.work = self.root / "work"
        self.work.mkdir()
        self.git("init", "--bare", str(self.remote), cwd=self.root)
        self.git("init", "-b", "academy/practice-v2")
        self.git("config", "user.name", "Test Student")
        self.git("config", "user.email", "test@example.invalid")
        (self.work / "base").write_text("base")
        self.git("add", "base")
        self.git("commit", "-m", "base")
        self.git("remote", "add", "origin", str(self.remote))
        self.git("push", "origin", "HEAD:" + p.BASE)
    def git(self, *args, cwd=None):
        return subprocess.check_output(["git", "-C", str(cwd or self.work), *args], text=True, stderr=subprocess.DEVNULL).strip()
    def save(self, x):
        return p.save(x, CATALOG, root=self.work, origins={str(self.remote)})
    def test_real_push_preserves_worktree_and_index(self):
        (self.work / "private").write_text("not part of result")
        self.git("add", "private")
        before = self.git("status", "--porcelain")
        head = self.git("rev-parse", "HEAD")
        x = payload()
        r = self.save(x)
        self.assertEqual(r["status"], "saved")
        self.assertEqual(self.git("status", "--porcelain"), before)
        self.assertEqual(self.git("rev-parse", "HEAD"), head)
        self.assertEqual(self.git("diff-tree", "--no-commit-id", "--name-only", "-r", r["commit"]), r["path"])
        self.assertEqual(self.git("rev-parse", p.DEST, cwd=self.remote), r["commit"])
        self.assertEqual(json.loads(self.git("show", r["commit"] + ":" + r["path"])), p.normalize(x, CATALOG))
    def test_retry_same_result(self):
        x = payload()
        a, b = self.save(x), self.save(x)
        self.assertEqual(b["status"], "already_saved")
        self.assertEqual(a["commit"], b["commit"])
    def test_new_attempt_preserves_old(self):
        a, b = self.save(payload()), self.save(payload())
        self.assertNotEqual(a["commit"], b["commit"])
        self.assertTrue(self.git("ls-tree", b["commit"], "--", a["path"]))
        self.assertEqual(self.git("rev-parse", b["commit"] + "^"), a["commit"])
    def test_collision(self):
        x = payload()
        a = self.save(x)
        with self.assertRaises(p.SaveError): self.save({**x, "score": 3})
        self.assertEqual(self.git("rev-parse", p.DEST, cwd=self.remote), a["commit"])
    def test_wrong_origin(self):
        with self.assertRaises(p.SaveError): p.save(payload(), CATALOG, root=self.work, origins={"wrong"})
    def test_push_rejected(self):
        hook = self.remote / "hooks/pre-receive"
        hook.write_text("#!/bin/sh\nexit 1\n")
        hook.chmod(0o755)
        with self.assertRaisesRegex(p.SaveError, "DELIVERY_UNKNOWN"): self.save(payload())
        with self.assertRaises(subprocess.CalledProcessError): self.git("rev-parse", p.DEST, cwd=self.remote)
    def test_reject_extra_fields(self):
        with self.assertRaises(p.SaveError): self.save({**payload(), "notes": "not allowed"})
    def test_reject_invalid_score_checks_and_path(self):
        for patch_data in ({"score": True}, {"checks": [2]}, {"checks": [0, 0]}, {"module": "../STATE"}):
            with self.subTest(patch_data=patch_data):
                with self.assertRaises(p.SaveError): p.normalize({**payload(), **patch_data}, CATALOG)

class PortalSaveTests(unittest.TestCase):
    def test_route_and_csrf(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), portal.Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        def req(data, extra=None):
            c = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
            c.request("POST", "/api/practice-save", json.dumps(data), {"Host": "localhost:8080", "Content-Type": "application/json", **(extra or {})})
            r = c.getresponse(); status = r.status; r.read(); c.close(); return status
        headers = {"Origin": "http://localhost:8080", "X-Academy-CSRF": portal.KEY}
        try:
            with patch.object(portal, "catalog", return_value=CATALOG), patch.object(p, "save", return_value={"status": "saved"}) as save:
                self.assertEqual(req(payload()), 403)
                self.assertEqual(req(payload(), {**headers, "Origin": "https://evil.example"}), 403)
                self.assertEqual(req({"kind": "lab_test", "attempt": "forged"}, headers), 400)
                x = payload()
                self.assertEqual(req(x, headers), 200)
                save.assert_called_once_with(x, CATALOG)
        finally:
            server.shutdown(); server.server_close(); thread.join()

if __name__ == "__main__": unittest.main(verbosity=2)
