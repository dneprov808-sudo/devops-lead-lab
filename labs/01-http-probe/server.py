from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import time

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/slow":
            time.sleep(4)
        code = {"/ok": 200, "/slow": 200, "/fail": 503, "/redirect": 302}.get(self.path, 404)
        try:
            self.send_response(code)
            if code == 302:
                self.send_header("Location", "/ok")
            self.end_headers()
            self.wfile.write(b"lab\n")
        except (BrokenPipeError, ConnectionResetError):
            pass

if __name__ == "__main__":
    with ThreadingHTTPServer(("127.0.0.1", 18080), Handler) as server:
        server.serve_forever()
