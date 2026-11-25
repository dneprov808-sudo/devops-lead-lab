"""Read structured practice history from one pinned remote commit."""
import json
import re

REF = "refs/heads/student/practice-results"
PATH = re.compile(r"practice-results/(LAB-001|PR-[A-Z0-9-]+)/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.json")

def read_history(git, command, origins, normalize, catalog, root, limit=300):
    if git("remote", "get-url", "origin").strip() not in origins:
        raise ValueError("Unexpected origin")
    rc, raw = command(["git", "ls-remote", "--exit-code", "--refs", "origin", REF], cwd=root)
    if rc == 2 and not raw.strip():
        return {"status": "empty", "commit": None, "items": [], "invalid": 0, "truncated": False}
    fields = raw.split()
    if rc or len(fields) != 2 or fields[1] != REF or not re.fullmatch(r"[a-f0-9]{40}", fields[0]):
        raise ValueError("History ref unavailable")
    commit = fields[0]
    git("fetch", "--no-tags", "--no-write-fetch-head", "origin", commit)
    records = git("ls-tree", "-r", "-l", commit, "--", "practice-results/")
    lines = records.splitlines()
    truncated = len(lines) > limit
    items, invalid = [], 0
    for line in lines[:limit]:
        try:
            metadata, path = line.split("\t", 1)
            mode, kind, blob, size = metadata.split()
            match = PATH.fullmatch(path)
            if not match or mode != "100644" or kind != "blob" or not re.fullmatch(r"[a-f0-9]{40}", blob) or not 1 <= int(size) <= 4096:
                raise ValueError()
            data = json.loads(git("cat-file", "blob", blob))
            if data.get("module") != match[1] or data.get("attempt") != match[2]:
                raise ValueError()
            verification = data.get("verification")
            clean = normalize({k: v for k, v in data.items() if k != "verification"}, catalog)
            if clean != data or verification != clean["verification"]:
                raise ValueError()
            items.append({**clean, "path": path})
        except (ValueError, KeyError, TypeError, AttributeError):
            invalid += 1
    return {"status": "read", "commit": commit, "items": items,
            "invalid": invalid, "truncated": truncated}
