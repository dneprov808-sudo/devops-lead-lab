import http.client
import threading
from http.server import ThreadingHTTPServer
import unittest
import portal

class RuntimeSmoke(unittest.TestCase):
    def test_http(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), portal.Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            for path in ('/', '/api/version', '/api/session', '/unified.js', '/api/hub'):
                with self.subTest(path=path):
                    conn = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=5)
                    try:
                        conn.request('GET', path, headers={'Host': 'localhost:8080'})
                        response = conn.getresponse()
                        self.assertEqual(response.status, 200)
                        self.assertTrue(response.read())
                    finally:
                        conn.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join()
