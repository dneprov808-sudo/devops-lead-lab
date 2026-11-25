import http.client
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from http.server import ThreadingHTTPServer

import portal as p

class PortalTests(unittest.TestCase):
    def setUp(self):
        self.state = {"revision": 1, "accepted": [], "pending": []}
    def issue(self, n=1, rev=1, login="dneprov808-sudo", channel="live", extra="x", closed=False):
        ident = "daily_mentor/LAB-001/recommendation/demo"
        prefix = "[handoff:v1] " if channel == "live" else "[handoff:test:v1] "
        e = {"bus_version": 1, "channel": channel, "handoff": {"handoff_id": ident,
             "control_ref": p.REF, "observed_state_revision": rev, "summary": extra}}
        return {"number": n, "title": prefix + ident, "body": "<!-- academy-handoff:v1 -->\n```json\n" + json.dumps(e) + "\n```",
                "user": {"login": login}, "state": "closed" if closed else "open"}
    def result(self, rows):
        return p.classify_issues(rows, self.state)
    def test_table(self):
        self.assertEqual(p.table("| A | B |\n|---|---|\n| 1 | x |", 2), [["1", "x"]])
    def test_bad_table(self):
        with self.assertRaises(ValueError): p.table("bad", 2)
    def test_test_isolation(self):
        r = self.result([self.issue(channel="test")])
        self.assertEqual((r["test_count"], r["items"]), (1, []))
    def test_duplicate(self):
        self.assertEqual(self.result([self.issue(2), self.issue(1)])["items"][0]["numbers"], [1, 2])
    def test_collision(self):
        self.assertEqual(self.result([self.issue(1), self.issue(2, extra="y")])["items"][0]["status"], "collision")
    def test_stale(self):
        self.assertEqual(self.result([self.issue(rev=2)])["items"][0]["status"], "stale")
    def test_closed(self):
        self.assertEqual(self.result([self.issue(closed=True)])["items"][0]["status"], "closed / reconcile")
    def test_untrusted(self):
        self.assertEqual(self.result([self.issue(login="other")])["items"][0]["status"], "invalid/untrusted")
    def test_malformed(self):
        r = self.issue(); r["body"] = "broken"
        self.assertEqual(self.result([r])["items"][0]["status"], "invalid/untrusted")
    def test_pending(self):
        self.state["pending"] = ["daily_mentor/LAB-001/recommendation/demo"]
        self.assertEqual(self.result([self.issue()])["items"][0]["status"], "pending ID")
    def test_bad_origin(self):
        self.assertFalse(p.allowed({"Host": "evil.example:8080"}))
        self.assertFalse(p.allowed({"Host": "localhost:8080", "Origin": "https://evil.example"}))
    def test_csrf(self):
        headers = {"Host": "localhost:8080", "Origin": "http://localhost:8080"}
        self.assertFalse(p.allowed(headers, mutate=True))
        self.assertTrue(p.allowed(dict(headers, **{"X-Academy-CSRF": p.KEY}), mutate=True))
    def test_test_exit(self):
        with patch.object(p.academy, "verify_fixtures"), patch.object(p, "command", return_value=(1, "FAIL")):
            self.assertEqual(p.run_tests()["exit_code"], 1)
    def test_busy(self):
        p.LOCK.acquire()
        try:
            with self.assertRaises(ValueError): p.run_tests()
        finally: p.LOCK.release()
    def test_http_routes(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d, "index.html").write_text("portal fixture")
            with patch.object(p, "WEB", Path(d)), patch.object(p, "snapshot", return_value={"revision": 1}), patch.object(p, "run_tests", return_value={"exit_code": 1}) as run:
                server = ThreadingHTTPServer(("127.0.0.1", 0), p.Handler)
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                def request(method, path, extra=None):
                    c = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
                    c.request(method, path, headers={"Host": "localhost:8080", **(extra or {})})
                    r = c.getresponse(); body = r.read(); code = r.status; headers = dict(r.getheaders()); c.close()
                    return code, body, headers
                try:
                    code, body, headers = request("GET", "/")
                    self.assertEqual((code, body), (200, b"portal fixture"))
                    self.assertIn("Content-Security-Policy", headers)
                    self.assertEqual(request("GET", "/portal.py")[0], 404)
                    self.assertEqual(request("GET", "/api/state")[0], 200)
                    self.assertEqual(request("POST", "/api/test")[0], 403)
                    self.assertEqual(request("POST", "/api/test", {"Origin": "https://evil.example", "X-Academy-CSRF": p.KEY})[0], 403)
                    self.assertEqual(request("POST", "/api/test", {"Origin": "http://localhost:8080", "X-Academy-CSRF": p.KEY})[0], 200)
                    run.assert_called_once()
                finally:
                    server.shutdown(); server.server_close(); thread.join()

if __name__ == "__main__": unittest.main(verbosity=2)
