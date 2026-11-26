"""Synthetic orders lab. No external services or real trading."""
import contextlib
import json
import os
import re
import sqlite3
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

DB = os.environ.get("ACADEMY_DB", "/data/orders.db")
ID = re.compile(r"[a-zA-Z0-9_-]{1,64}\Z")

@contextlib.contextmanager
def db(path):
    con = sqlite3.connect(path, timeout=3)
    try:
        with con:
            yield con
    finally:
        con.close()

def init(path):
    with db(path) as con:
        con.execute("CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, done INTEGER NOT NULL DEFAULT 0)")

def submit(path, key):
    if not isinstance(key, str) or not ID.fullmatch(key):
        raise ValueError("invalid id")
    with db(path) as con:
        cur = con.execute("INSERT OR IGNORE INTO orders(id) VALUES(?)", (key,))
        return cur.rowcount == 1

def work(path):
    with db(path) as con:
        cur = con.execute("UPDATE orders SET done=1 WHERE id=(SELECT id FROM orders WHERE done=0 ORDER BY rowid LIMIT 1) AND done=0")
        return cur.rowcount == 1

def stats(path):
    with db(path) as con:
        total, done = con.execute("SELECT COUNT(*), COALESCE(SUM(done),0) FROM orders").fetchone()
    return {"accepted": total, "processed": done, "pending": total-done}

def handler(path):
    class Handler(BaseHTTPRequestHandler):
        def reply(self, code, body, mime="application/json"):
            raw = json.dumps(body).encode() if mime == "application/json" else body.encode()
            self.send_response(code)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        def do_GET(self):
            try:
                if self.path == "/health":
                    stats(path)
                    return self.reply(200, {"status":"ok"})
                if self.path == "/stats":
                    return self.reply(200, stats(path))
                if self.path == "/metrics":
                    data = stats(path)
                    raw = "".join(f"# TYPE academy_orders_{k} gauge\nacademy_orders_{k} {v}\n" for k,v in data.items())
                    return self.reply(200, raw, "text/plain; version=0.0.4; charset=utf-8")
                self.reply(404, {"error":"not found"})
            except sqlite3.Error:
                self.reply(503, {"error":"database unavailable"})
        def do_POST(self):
            if self.path != "/orders":
                return self.reply(404, {"error":"not found"})
            if self.headers.get("Transfer-Encoding") or self.headers.get_content_type() != "application/json":
                return self.reply(400, {"error":"JSON required"})
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 512:
                    raise ValueError("size")
                self.connection.settimeout(3)
                data = json.loads(self.rfile.read(size))
                if not isinstance(data, dict) or set(data) != {"id"}:
                    raise ValueError("shape")
                created = submit(path, data["id"])
                self.reply(201 if created else 200, {"id":data["id"], "created":created})
            except (ValueError, TimeoutError, UnicodeError):
                self.reply(400, {"error":"invalid order"})
            except sqlite3.Error:
                self.reply(503, {"error":"database unavailable"})
    return Handler

if __name__ == "__main__":
    init(DB)
    if sys.argv[1:] == ["worker"]:
        while True:
            work(DB)
            time.sleep(0.1)
    elif sys.argv[1:] == ["api"]:
        HTTPServer(("0.0.0.0", 8080), handler(DB)).serve_forever()
    else:
        raise SystemExit("use api or worker")
