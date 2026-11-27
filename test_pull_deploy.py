"""Offline release-selection, integrity and activation contracts."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("pull_deploy", Path(__file__).parent / "deploy/pull_deploy.py")
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
SHA = "a" * 40
NEXT = "b" * 40


def run(**changes):
    value = {"id": 1, "head_sha": SHA, "head_branch": d.BRANCH, "event": "push",
             "head_repository": {"full_name": d.REPO},
             "path": ".github/workflows/" + d.WORKFLOW + "@refs/heads/" + d.BRANCH,
             "run_number": 1, "run_attempt": 1, "status": "completed", "conclusion": "success"}
    value.update(changes)
    return value


def fixture(path, sha):
    path.mkdir()
    outputs = {}
    for name in d.FILES:
        payload = (name + sha).encode()
        (path / name).write_bytes(payload)
        outputs[name] = hashlib.sha256(payload).hexdigest()
    (path / "manifest.json").write_text(json.dumps({"schema_version": 1, "commit": sha, "outputs": outputs}))
    return path


class PullDeployTests(unittest.TestCase):
    def test_exact_success_only(self):
        self.assertEqual(d.choose_run({"workflow_runs": [run()]}, SHA)["id"], 1)
        for row in (run(event="pull_request"), run(head_sha=NEXT), run(head_branch="main"),
                    run(head_repository={"full_name": "fork/repo"}), run(conclusion="failure"),
                    run(status="in_progress"), run(conclusion="skipped"), run(path="other.yml")):
            self.assertIsNone(d.choose_run({"workflow_runs": [row]}, SHA))
        self.assertIsNone(d.choose_run({"workflow_runs": [run(), run(run_number=2, conclusion="failure")]}, SHA))

    def test_required_job(self):
        job = {"name": d.JOB, "status": "completed", "conclusion": "success"}
        self.assertTrue(d.required_job({"jobs": [job]}))
        self.assertFalse(d.required_job({"jobs": []}))
        self.assertFalse(d.required_job({"jobs": [job, job]}))
        self.assertFalse(d.required_job({"jobs": [dict(job, conclusion="skipped")]}))

    def test_publish_and_failure_preserve_previous(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            a = fixture(root / "a", SHA)
            b = fixture(root / "b", NEXT)
            self.assertEqual(d.publish(root, SHA, a), root / "releases" / SHA)
            self.assertEqual((root / "current").resolve(), root / "releases" / SHA)
            self.assertEqual(d.publish(root, SHA, a), root / "releases" / SHA)
            (b / "index.html").write_text("corrupt")
            with self.assertRaises(ValueError):
                d.publish(root, NEXT, b)
            self.assertEqual((root / "current").resolve(), root / "releases" / SHA)
            (b / "index.html").write_bytes(("index.html" + NEXT).encode())
            d.publish(root, NEXT, b)
            self.assertEqual((root / "current").resolve(), root / "releases" / NEXT)
            self.assertTrue((root / "releases" / SHA).is_dir())

    def test_no_extra_or_symlink_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = fixture(Path(tmp) / "release", SHA)
            (p / "secret.txt").write_text("synthetic")
            with self.assertRaises(ValueError):
                d.validate_release(p, SHA)
            (p / "secret.txt").unlink()
            (p / "index.html").unlink()
            (p / "index.html").symlink_to(p / "library.html")
            with self.assertRaises(ValueError):
                d.validate_release(p, SHA)


if __name__ == "__main__":
    unittest.main()
