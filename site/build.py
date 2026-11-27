#!/usr/bin/env python3
"""Build a private, portable static Academy from one immutable Git commit.

No dependency downloads, network, credentials, runtime API or deployment.
Run from a Git checkout; review the resulting site before hosting it.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = {
    "guides": "learning/knowledge.json",
    "manifest": "learning/hub.json",
    "labs": "practice/catalog.json",
    "incidents": "learning/incidents.json",
    "designs": "learning/design.json",
}
ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}\Z")
SHA = re.compile(r"[0-9a-f]{40}\Z")
BANK = re.compile(r'\s*(?:"use strict";\s*)?const INTERVIEW_PRO_BANK\s*=\s*(\[.*\])\s*;\s*\Z', re.S)
CARD = re.compile(r'<article class="deploy-card" id="([^"]+)">([\s\S]*?)</article>')
STEP = re.compile(r'<div class="deploy-command"><h4>([^<]*)</h4><pre>([\s\S]*?)</pre>')
COPY = re.compile(r'<button\b[^>]*\bdata-prompt="([^"]*)"[^>]*>')
RUNBOOK_IDS = {"deploy-portal", "deploy-main-lab", "deploy-light", "deploy-ha",
               "deploy-k8s", "deploy-linux", "deploy-iac", "deploy-ci", "deploy-gate"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args], stderr=subprocess.PIPE).decode("utf-8")


def read_commit(root, ref):
    sha = git(root, "rev-parse", "--verify", "--end-of-options", ref + "^{commit}").strip()
    require(SHA.fullmatch(sha), "Expected a full commit SHA")
    return sha


def load(root, sha, path):
    require(SHA.fullmatch(sha), "Invalid commit SHA")
    return git(root, "show", f"{sha}:{path}")


def valid_id(value):
    return isinstance(value, str) and ID.fullmatch(value) and value not in {
        "__proto__", "prototype", "constructor"}


def text_fields(row, fields, label):
    require(isinstance(row, dict), f"{label}: object required")
    for field in fields:
        require(isinstance(row.get(field), str) and row[field].strip(),
                f"{label}: missing text {field}")


def unique_rows(rows, label):
    require(isinstance(rows, list) and rows, f"{label}: expected nonempty array")
    ids = set()
    for row in rows:
        require(isinstance(row, dict) and valid_id(row.get("id")), f"{label}: invalid id")
        require(row["id"] not in ids, f"{label}: duplicate {row['id']}")
        ids.add(row["id"])
    return ids


def string_list(row, name):
    require(isinstance(row.get(name), list) and row[name] and
            all(isinstance(x, str) and x.strip() for x in row[name]),
            f"{row['id']}: invalid {name}")


def validate(data, bank):
    guide_ids = unique_rows(data["guides"], "guides")
    hub_ids = unique_rows(data["manifest"], "hub")
    require(guide_ids == hub_ids, "Guide and hub IDs must match")
    chapter_ids = set()
    for guide in data["guides"]:
        text_fields(guide, ("topic", "title", "level", "concept", "commands", "diagnosis",
                            "pitfalls", "question", "source"), guide["id"])
        unique_rows(guide.get("chapters"), guide["id"])
        for chapter in guide["chapters"]:
            cid = chapter["id"]
            require(cid.startswith(guide["id"] + "-") and cid not in chapter_ids,
                    f"Invalid/duplicate chapter ID: {cid}")
            chapter_ids.add(cid)
            text_fields(chapter, ("title", "level", "explanation", "production", "example",
                                 "commands", "question", "source"), cid)
            require(chapter["level"] in {"foundation", "senior", "lead"}, f"{cid}: level")
            require(chapter["source"].startswith("https://"), f"{cid}: source")
            if "snippet" in chapter:
                text_fields(chapter["snippet"], ("language", "code", "notes"), cid)
    for topic in data["manifest"]:
        text_fields(topic, ("title", "group"), topic["id"])
        require(isinstance(topic.get("profiles"), list) and
                all(isinstance(x, str) for x in topic["profiles"]), "Invalid profiles")
    for lab in data["labs"]:
        text_fields(lab, ("topic", "title", "level", "profile", "command", "docs"), lab["id"])
        require(type(lab.get("minutes")) is int and lab["minutes"] > 0, "Invalid lab duration")
        string_list(lab, "tasks")
        string_list(lab, "evidence")
    for incident in data["incidents"]:
        text_fields(incident, ("topic", "title", "severity", "symptoms", "task",
                               "evidence", "hint", "debrief"), incident["id"])
    for case in data["designs"]:
        text_fields(case, ("title", "scope"), case["id"])
        for name in ("requirements", "deliverables", "rubric"):
            string_list(case, name)
    for name in ("labs", "incidents", "designs"):
        unique_rows(data[name], name)
    unique_rows(bank, "interview bank")
    for question in bank:
        text_fields(question, ("topic", "section", "level", "question", "answer",
                               "follow_up", "practice", "rubric", "source"), question["id"])
        require(question["source"].startswith("https://"), f"{question['id']}: source")


def strip_markup(markup):
    markup = re.sub(r"</(?:p|div|h[234]|li)>", "\n", markup)
    return html.unescape(re.sub(r"<[^>]+>", "", markup)).strip()


def parse_runbooks(source):
    books = []
    for match in CARD.finditer(source):
        rid, markup = match.groups()
        title = re.search(r"<h2>(.*?)</h2>", markup, re.S)
        result_index = markup.find('<div class="deploy-result">')
        first_step = markup.find('<div class="deploy-command">')
        require(title and first_step >= 0 and result_index > first_step,
                f"{rid}: runbook markup changed")
        steps = [{"title": html.unescape(t), "code": html.unescape(c)}
                 for t, c in STEP.findall(markup)]
        copies = [html.unescape(s) for s in COPY.findall(markup)]
        require(steps and [s["code"] for s in steps] == copies, f"{rid}: command/copy mismatch")
        books.append({"id": rid, "title": strip_markup(title.group(1)),
                      "intro": strip_markup(markup[:first_step]), "steps": steps,
                      "result": strip_markup(markup[result_index:])})
    ids = unique_rows(books, "runbooks")
    require(RUNBOOK_IDS <= ids, "Missing existing runbooks")
    require(len(books) == len(re.findall(r'class="deploy-card" id=', source)),
            "Unparsed runbook")
    return books


def parse_bank(source):
    match = BANK.fullmatch(source)
    require(match is not None, "Interview bank must be a strict JSON array assignment")
    return json.loads(match.group(1))


def safe_json(data):
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False).replace("<", "\\u003c")


def render(template, data, sha):
    marker = "@@ACADEMY_DATASET@@"
    require(template.count(marker) == 1, "Expected one dataset marker")
    # Substitute template metadata before inserting untrusted JSON, never rewrite its values.
    shell = template.replace("@@ACADEMY_SHA@@", sha).replace("@@ACADEMY_SHORT_SHA@@", sha[:8].upper())
    return shell.replace(marker, safe_json(data), 1)


def sha256(payload):
    return hashlib.sha256(payload).hexdigest()


def build_files(root, sha):
    sources = {name: load(root, sha, path) for name, path in CONTENT.items()}
    bank_source = load(root, sha, "web/interview-bank.js")
    runbook_source = load(root, sha, "web/index.html")
    data = {name: json.loads(value) for name, value in sources.items()}
    data["runbooks"] = parse_runbooks(runbook_source)
    bank = parse_bank(bank_source)
    validate(data, bank)
    counts = {"topics": len(data["guides"]), "chapters": sum(len(g["chapters"]) for g in data["guides"]),
              "questions": len(bank), "labs": len(data["labs"]), "incidents": len(data["incidents"]),
              "designs": len(data["designs"]), "runbooks": len(data["runbooks"]),
              "command_blocks": sum(len(r["steps"]) for r in data["runbooks"])}
    files = {}
    for name, payload in (("index.html", data), ("interview.html", bank),
                          ("architecture.html", {"counts": counts, "commit": sha})):
        files[name] = render(load(root, sha, "site/templates/" + name), payload, sha).encode("utf-8")
    for name in ("site.css", "progress.js"):
        files[name] = load(root, sha, "site/templates/" + name).encode("utf-8")
    inputs = {CONTENT[name]: sha256(value.encode("utf-8")) for name, value in sources.items()}
    inputs.update({"web/interview-bank.js": sha256(bank_source.encode("utf-8")),
                   "web/index.html": sha256(runbook_source.encode("utf-8"))})
    manifest = {"schema_version": 1, "commit": sha, "counts": counts, "inputs": inputs,
                "outputs": {name: sha256(value) for name, value in sorted(files.items())}}
    files["manifest.json"] = (json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    return files, manifest


def publish_local(root, sha, files):
    # No deletion or overwrite of existing directories. A matching release is reusable.
    parent = root / "site-dist"
    parent.mkdir(exist_ok=True)
    require(not parent.is_symlink(), "site-dist must not be a symlink")
    dest = parent / sha
    if dest.exists() or dest.is_symlink():
        require(dest.is_dir() and not dest.is_symlink(), "Unsafe output destination")
        require(set(p.name for p in dest.iterdir()) == set(files) and
                all((dest / name).is_file() and not (dest / name).is_symlink()
                    and (dest / name).read_bytes() == content for name, content in files.items()),
                "Existing release differs; inspect it and choose a new checkout")
        return dest
    with tempfile.TemporaryDirectory(prefix=".academy-site-", dir=parent) as tmp:
        staging = Path(tmp) / "release"
        staging.mkdir()
        for name, payload in files.items():
            (staging / name).write_bytes(payload)
        require(not dest.exists() and not dest.is_symlink(), "Output appeared during build")
        staging.rename(dest)
    return dest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ref", default="HEAD", help="Commit or local Git ref to build (default HEAD)")
    args = parser.parse_args()
    sha = read_commit(ROOT, args.ref)
    files, manifest = build_files(ROOT, sha)
    dest = publish_local(ROOT, sha, files)
    print(json.dumps(manifest["counts"], ensure_ascii=False))
    print("Release:", dest)
    print(f"python3 -m http.server 8090 --bind 127.0.0.1 --directory {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
