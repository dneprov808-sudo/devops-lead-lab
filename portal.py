"""Academy portal: loopback-only, read-only GitHub, explicit local tests."""
import datetime as dt
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import subprocess
import sys
import threading
import uuid
import practice_results
import practice_history
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import yaml
import academy

ROOT = Path(__file__).resolve().parent
WEB = ROOT / "web"
REPO = "dneprov808-sudo/devops-lead-lab"
REF = "academy/orchestration-v1"
PORT = 8080
HOST = "127.0.0.1"
KEY = secrets.token_urlsafe(32)
LOCK = threading.Lock()
SAVE_LOCK = threading.Lock()
LAST_TESTS = {}

def catalog():
    return json.loads((ROOT / "practice/catalog.json").read_text(encoding="utf-8"))
STATIC = {"/": ("index.html", "text/html; charset=utf-8"),
          "/style.css": ("style.css", "text/css; charset=utf-8"),
          "/app.js": ("app.js", "text/javascript; charset=utf-8"),
          "/practice.js": ("practice.js", "text/javascript; charset=utf-8"),
          "/learning.js": ("learning.js", "text/javascript; charset=utf-8"),
          "/learning.css": ("learning.css", "text/css; charset=utf-8")}

def command(args, cwd=ROOT, timeout=30):
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0", GH_PROMPT_DISABLED="1")
    p = subprocess.Popen(args, cwd=cwd, env=env, stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, start_new_session=True)
    try:
        data, _ = p.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        os.killpg(p.pid, signal.SIGKILL)
        p.communicate()
        raise ValueError("Command timed out")
    return p.returncode, data.decode("utf-8", errors="replace")

def git(*args):
    rc, output = command(["git", *args])
    if rc:
        raise ValueError("Git read failed; check local credentials and network")
    return output

def table(text, width):
    rows = []
    for line in text.splitlines():
        if line.startswith("|"):
            cells = [x.strip() for x in line.strip("|").split("|")]
            if len(cells) == width and not all(re.fullmatch(r"[: -]+", x) for x in cells):
                rows.append(cells)
    if len(rows) < 2:
        raise ValueError("Unexpected Markdown table")
    return rows[1:]

def snapshot():
    if git("remote", "get-url", "origin").strip() not in academy.ORIGINS:
        raise ValueError("Unexpected Git origin")
    remote = git("ls-remote", "--exit-code", "origin", "refs/heads/" + REF).split()
    if len(remote) != 2 or remote[1] != "refs/heads/" + REF or not re.fullmatch(r"[0-9a-f]{40}", remote[0]):
        raise ValueError("Canonical ref unavailable")
    commit = remote[0]
    git("fetch", "--no-tags", "origin", commit)
    def read(path):
        return git("show", commit + ":" + path)
    d = yaml.safe_load(read("orchestration/STATE.yaml"))
    if (d["schema_version"] != 1 or d["control"]["ref"] != REF
            or d["control"]["repository"] != REPO or type(d["revision"]) is not int
            or d["revision"] < 1):
        raise ValueError("Invalid canonical STATE")
    t = d["current_task"]
    return {"status": "live", "commit": commit, "revision": d["revision"],
            "task": {k: t[k] for k in ("id", "topic", "status", "path", "ref")},
            "week": d["program"]["current_week"], "weeks": d["program"]["duration_weeks"],
            "next": d["next_action"]["task"], "workflow": d["workflow"],
            "roadmap": table(read("ROADMAP.md"), 3),
            "skills": table(read("SKILL_MATRIX.md"), 5),
            "accepted": d["handoffs"]["accepted_ids"], "pending": d["handoffs"]["pending_review"],
            "checked_at": dt.datetime.now(dt.timezone.utc).isoformat()}

def classify_issues(rows, state):
    groups = {}
    test = 0
    for row in rows:
        title = row.get("title", "")
        if row.get("pull_request"):
            continue
        if title.startswith("[handoff:test:v1] "):
            test += 1
            continue
        if not title.startswith("[handoff:v1] "):
            continue
        ident = title[len("[handoff:v1] "):]
        body = row.get("body") or ""
        try:
            match = re.fullmatch(r"<!-- academy-handoff:v1 -->\r?\n```json\r?\n([\s\S]+)\r?\n```\s*", body)
            e = json.loads(match.group(1))
            h = e["handoff"]
            if (e["bus_version"] != 1 or e["channel"] != "live" or h["handoff_id"] != ident
                    or row["user"]["login"] != "dneprov808-sudo"):
                raise ValueError()
            fingerprint = hashlib.sha256(json.dumps(e, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        except (ValueError, TypeError, KeyError, AttributeError):
            h, fingerprint = {}, None
        groups.setdefault(ident, []).append((row, h, fingerprint))
    result = []
    for ident, group in groups.items():
        row, h, _ = group[0]
        numbers = sorted({r["number"] for r, _, _ in group})
        if any(f is None for _, _, f in group):
            status = "invalid/untrusted"
        elif len({f for _, _, f in group}) != 1:
            status = "collision"
        elif ident in state["accepted"]:
            status = "accepted ID"
        elif ident in state["pending"]:
            status = "pending ID"
        elif any(r.get("state") == "closed" for r, _, _ in group):
            status = "closed / reconcile"
        elif h.get("observed_state_revision") != state["revision"] or h.get("control_ref") != REF:
            status = "stale"
        else:
            status = "review required"
        result.append({"id": ident, "numbers": numbers, "status": status})
    return {"status": "live", "test_count": test, "items": result,
            "note": "Transport preview only; Consumer performs full validation and evidence review."}

def handoffs():
    if not shutil.which("gh"):
        raise ValueError("Install gh and run gh auth login to read Issues")
    s = snapshot()
    rc, output = command(["gh", "api", "--hostname", "github.com", "--paginate", "--slurp",
                          "repos/" + REPO + "/issues?state=all&per_page=100"], timeout=60)
    if rc:
        raise ValueError("GitHub Issues unavailable; check gh auth status")
    pages = json.loads(output)
    if not isinstance(pages, list) or not all(isinstance(p, list) for p in pages):
        raise ValueError("Incomplete Issues response")
    return classify_issues([r for p in pages for r in p], s)

def run_tests():
    if not LOCK.acquire(blocking=False):
        raise ValueError("A test run is already active")
    try:
        academy.verify_fixtures()
        rc, output = command([sys.executable, "academy.py", "test"], timeout=45)
        result = {"status": "finished", "exit_code": rc, "output": output[-24000:],
                  "note": "Local working tree result; not a verified committed submission."}
        match = re.match(r"^HEAD: ([0-9a-f]{40})\r?\nWorking tree: ([^\n]*)", output)
        if match:
            attempt = str(uuid.uuid4())
            record = {"kind": "lab_test", "attempt": attempt, "module": "LAB-001",
                      "head": match.group(1), "dirty": match.group(2).strip() != "clean",
                      "exit_code": rc, "output_sha256": hashlib.sha256(output.encode()).hexdigest()}
            LAST_TESTS[attempt] = record
            while len(LAST_TESTS) > 32:
                LAST_TESTS.pop(next(iter(LAST_TESTS)))
            result["save_attempt"] = attempt
        return result
    finally:
        LOCK.release()

def allowed(headers, port=PORT, mutate=False):
    if headers.get("Host") not in (f"127.0.0.1:{port}", f"localhost:{port}"):
        return False
    origin = headers.get("Origin")
    if origin is not None and origin not in (f"http://127.0.0.1:{port}", f"http://localhost:{port}"):
        return False
    return not mutate or (origin is not None and hmac.compare_digest(headers.get("X-Academy-CSRF", ""), KEY))

class Handler(BaseHTTPRequestHandler):
    def send_data(self, status, kind, data):
        self.send_response(status)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(data)
    def reply(self, data, status=200):
        self.send_data(status, "application/json; charset=utf-8", json.dumps(data, ensure_ascii=False).encode())
    def do_GET(self):
        if not allowed(self.headers):
            return self.reply({"error": "Forbidden"}, 403)
        try:
            if self.path in STATIC:
                name, kind = STATIC[self.path]
                return self.send_data(200, kind, (WEB / name).read_bytes())
            if self.path == "/api/session":
                return self.reply({"csrf": KEY})
            if self.path == "/api/state":
                return self.reply(snapshot())
            if self.path == "/api/handoffs":
                return self.reply(handoffs())
            if self.path == "/api/practice-catalog":
                return self.reply(catalog())
            if self.path == "/api/knowledge":
                return self.reply(json.loads((ROOT / "learning/knowledge.json").read_text(encoding="utf-8")))
            if self.path == "/api/incidents":
                return self.reply(json.loads((ROOT / "learning/incidents.json").read_text(encoding="utf-8")))
            if self.path == "/api/design":
                return self.reply(json.loads((ROOT / "learning/design.json").read_text(encoding="utf-8")))
            if self.path == "/api/practice-history":
                return self.reply(practice_history.read_history(git, command, academy.ORIGINS,
                    practice_results.normalize, catalog(), ROOT))
            return self.reply({"error": "Not found"}, 404)
        except (OSError, ValueError, KeyError, TypeError, AttributeError, yaml.YAMLError):
            return self.reply({"status": "blocked", "error": "Read failed; check Git/gh access and canonical data."}, 503)
    def do_POST(self):
        if not allowed(self.headers, mutate=True):
            return self.reply({"error": "Forbidden"}, 403)
        if self.path == "/api/practice-save":
            if not SAVE_LOCK.acquire(blocking=False):
                return self.reply({"error": "Save already in progress; keep the same attempt"}, 409)
            try:
                if self.headers.get_content_type() != "application/json":
                    raise ValueError("Expected JSON")
                length = int(self.headers.get("Content-Length", "0"))
                if not 1 <= length <= 4096 or self.headers.get("Transfer-Encoding"):
                    raise ValueError("Invalid body size")
                self.connection.settimeout(10)
                payload = json.loads(self.rfile.read(length))
                if isinstance(payload, dict) and payload.get("kind") == "lab_test":
                    if set(payload) != {"kind", "attempt"} or payload["attempt"] not in LAST_TESTS:
                        raise ValueError("Run tests again or reconcile previous save")
                    payload = LAST_TESTS[payload["attempt"]]
                return self.reply(practice_results.save(payload, catalog()))
            except practice_results.SaveError as e:
                return self.reply({"status": "blocked", "error": str(e)}, 409)
            except (OSError, ValueError, TypeError, KeyError):
                return self.reply({"status": "blocked", "error": "Save request invalid or unavailable"}, 400)
            finally:
                SAVE_LOCK.release()
        if self.path != "/api/test" or self.headers.get("Content-Length", "0") != "0":
            return self.reply({"error": "Unsupported request"}, 400)
        try:
            return self.reply(run_tests())
        except (OSError, ValueError, KeyError):
            return self.reply({"status": "blocked", "error": "Local tests blocked: verify fixtures, dependencies or active run."}, 409)

if __name__ == "__main__":
    with ThreadingHTTPServer((HOST, PORT), Handler) as server:
        print(f"Academy: http://{HOST}:{PORT} (Ctrl-C to stop)", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
