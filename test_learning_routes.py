import http.client
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from http.server import ThreadingHTTPServer

import portal

class LearningRoutes(unittest.TestCase):
    def test_catalog_and_history_routes(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "learning").mkdir()
            for name in ("knowledge", "incidents", "design"):
                (root / "learning" / (name + ".json")).write_text(json.dumps([{"id": name}]))
            with patch.object(portal, "ROOT", root), patch.object(portal, "catalog", return_value=[]), patch.object(portal.practice_history, "read_history", return_value={"status": "empty", "items": []}) as read:
                server = ThreadingHTTPServer(("127.0.0.1", 0), portal.Handler)
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                def req(method, path, host="localhost:8080"):
                    c = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
                    c.request(method, path, headers={"Host": host})
                    r = c.getresponse(); data = json.loads(r.read()); code = r.status; c.close()
                    return code, data
                try:
                    for name in ("knowledge", "incidents", "design"):
                        self.assertEqual(req("GET", "/api/" + name), (200, [{"id": name}]))
                    self.assertEqual(req("GET", "/api/practice-history")[1]["status"], "empty")
                    self.assertEqual(req("GET", "/api/practice-history", "evil.test:8080")[0], 403)
                    self.assertEqual(req("POST", "/api/practice-history")[0], 403)
                    self.assertEqual(req("GET", "/learning/design.json")[0], 404)
                    read.assert_called_once()
                finally:
                    server.shutdown(); server.server_close(); thread.join()

if __name__ == "__main__":
    unittest.main(verbosity=2)
