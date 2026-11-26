import hashlib
import pathlib
import subprocess
import sys
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).with_name('release.py')

class ReleaseContract(unittest.TestCase):
    def test_artifact_lifecycle(self):
        with tempfile.TemporaryDirectory() as d:
            src, artifact = (pathlib.Path(d)/n for n in ('source','artifact'))
            src.write_bytes(b'v1\x00\n')
            def run(*args):
                return subprocess.run([sys.executable,str(SCRIPT),*map(str,args)],capture_output=True,text=True,timeout=5)
            digest=hashlib.sha256(src.read_bytes()).hexdigest()
            r=run('build',src,artifact)
            self.assertEqual(r.returncode,0,r.stderr)
            self.assertEqual(r.stdout.strip(),digest)
            self.assertEqual(artifact.read_bytes(),src.read_bytes())
            src.write_bytes(b'v2')
            self.assertNotEqual(run('build',src,artifact).returncode,0)
            self.assertEqual(artifact.read_bytes(),b'v1\x00\n')
            self.assertEqual(run('verify',artifact,digest).returncode,0)
            artifact.write_bytes(b'tampered')
            self.assertNotEqual(run('verify',artifact,digest).returncode,0)
            self.assertNotEqual(run('verify',src.with_name('missing'),digest).returncode,0)
