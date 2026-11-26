import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from production.status import read_status

class ProductionStatusTests(unittest.TestCase):
    def check(self, payload, expected):
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                raw = json.dumps(payload).encode()
                self.send_response(200)
                self.send_header('Content-Length', str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
        server = HTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            self.assertEqual(read_status(server.server_port), expected)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)

    def test_valid(self):
        data = {'accepted': 11, 'processed': 1, 'pending': 10}
        self.check(data, {'status': 'available', 'metrics': data})

    def test_inconsistent(self):
        self.check({'accepted': 11, 'processed': 1, 'pending': 1}, {'status': 'unavailable'})

    def test_boolean(self):
        self.check({'accepted': True, 'processed': 1, 'pending': 0}, {'status': 'unavailable'})

    def test_unavailable(self):
        server = HTTPServer(('127.0.0.1', 0), BaseHTTPRequestHandler)
        port = server.server_port
        server.server_close()
        self.assertEqual(read_status(port), {'status': 'unavailable'})
