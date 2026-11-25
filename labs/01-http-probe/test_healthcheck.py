import subprocess
import time
import unittest
import threading
import socket
from pathlib import Path
from http.server import ThreadingHTTPServer
from server import Handler

ROOT = Path(__file__).resolve().parent

class ProbeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.base = "http://127.0.0.1:" + str(cls.server.server_port)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def check(self, args, code, output):
        start = time.monotonic()
        result = subprocess.run(["bash", str(ROOT / "healthcheck.sh"), *args],
                                capture_output=True, text=True, timeout=3)
        self.assertLess(time.monotonic() - start, 3)
        self.assertEqual((result.returncode, result.stdout.strip()), (code, output), result.stderr)

    def test_ok(self):
        self.check([self.base + "/ok"], 0, "HEALTHY")

    def test_503(self):
        self.check([self.base + "/fail"], 1, "HTTP_ERROR")

    def test_404(self):
        self.check([self.base + "/missing"], 1, "HTTP_ERROR")

    def test_redirect(self):
        self.check([self.base + "/redirect"], 1, "HTTP_ERROR")

    def test_timeout(self):
        self.check([self.base + "/slow"], 3, "TIMEOUT")

    def test_refused(self):
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            self.check(["http://127.0.0.1:" + str(sock.getsockname()[1])], 2, "NETWORK_ERROR")

    def test_no_args(self):
        self.check([], 4, "USAGE_ERROR")

    def test_extra_args(self):
        self.check([self.base, "extra"], 4, "USAGE_ERROR")

if __name__ == "__main__":
    unittest.main(verbosity=2)
