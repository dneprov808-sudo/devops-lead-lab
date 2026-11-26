import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import HTTPServer
from pathlib import Path
from production.app import init, handler, stats

ROOT = Path(__file__).resolve().parent

class ProductionTests(unittest.TestCase):
    def test_worker_outage_and_recovery(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / 'orders.db')
            init(path)
            server = HTTPServer(('127.0.0.1', 0), handler(path))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = f'http://127.0.0.1:{server.server_port}'
            worker = None
            def submit(key):
                req = urllib.request.Request(base + '/orders', data=json.dumps({'id': key}).encode(), headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=4) as response:
                    return response.status
            def start():
                return subprocess.Popen([sys.executable, str(ROOT / 'production/app.py'), 'worker'], env={**os.environ, 'ACADEMY_DB': path})
            def drain():
                deadline = time.monotonic() + 15
                while stats(path)['pending'] and time.monotonic() < deadline:
                    self.assertIsNone(worker.poll(), 'worker exited')
                    time.sleep(0.1)
                self.assertEqual(stats(path)['pending'], 0)
            try:
                self.assertEqual(submit('first'), 201)
                self.assertEqual(submit('first'), 200)
                with self.assertRaises(urllib.error.HTTPError) as error:
                    submit('bad id')
                self.assertEqual(error.exception.code, 400)
                worker = start()
                drain()
                worker.terminate()
                worker.wait(timeout=5)
                worker = None
                for i in range(10):
                    self.assertEqual(submit(f'outage-{i}'), 201)
                self.assertEqual(stats(path), {'accepted': 11, 'processed': 1, 'pending': 10})
                worker = start()
                drain()
                self.assertEqual(stats(path), {'accepted': 11, 'processed': 11, 'pending': 0})
                with urllib.request.urlopen(base + '/metrics', timeout=4) as response:
                    self.assertIn(b'academy_orders_pending 0', response.read())
            finally:
                if worker is not None:
                    worker.terminate()
                    try:
                        worker.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        worker.kill()
                        worker.wait(timeout=5)
                server.shutdown()
                server.server_close()
                thread.join(timeout=5)
