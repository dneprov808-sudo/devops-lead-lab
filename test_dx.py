import hashlib
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock
import academy as a

class DXTests(unittest.TestCase):
    def snapshot(self, status='assigned'):
        return {'current_task': {'id':'LAB-001','ref':'training/lead-cohort-01','path':'labs/01-http-probe','status':status}}

    def test_fixture_integrity(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'fixture'
            p.write_bytes(b'abc')
            sha = hashlib.sha1(b'blob 3\0abc').hexdigest()
            with patch.object(a,'LAB',Path(d)), patch.object(a,'FIXTURES',{'fixture':sha}):
                a.verify_fixtures()
                p.write_bytes(b'changed')
                with self.assertRaises(ValueError): a.verify_fixtures()

    def test_unknown_lab(self):
        d = self.snapshot(); d['current_task']['id'] = 'LAB-999'
        with self.assertRaises(ValueError): a.current_lab(d)

    def test_start_creates_branch(self):
        with patch.object(a,'state',return_value=self.snapshot()), patch.object(a,'verify_fixtures'), patch.object(a,'git',side_effect=['academy/dx-v1','','','','']) as g:
            a.start(20)
            g.assert_any_call('switch','-c',a.STUDENT)

    def test_start_existing_branch(self):
        with patch.object(a,'state',return_value=self.snapshot()), patch.object(a,'verify_fixtures'), patch.object(a,'git',return_value=a.STUDENT) as g:
            a.start(60)
            g.assert_called_once_with('branch','--show-current')

    def test_dirty_checkout(self):
        with patch.object(a,'state',return_value=self.snapshot()), patch.object(a,'verify_fixtures'), patch.object(a,'git',side_effect=['academy/dx-v1',' M file']) as g:
            with self.assertRaises(ValueError): a.start(60)
            self.assertEqual(g.call_count,2)

    def test_remote_duplicate(self):
        with patch.object(a,'state',return_value=self.snapshot()), patch.object(a,'verify_fixtures'), patch.object(a,'git',side_effect=['academy/dx-v1','','','remote branch']) as g:
            with self.assertRaises(ValueError): a.start(60)
            self.assertEqual(g.call_count,4)

    def test_review_gate(self):
        with patch.object(a,'state',return_value=self.snapshot('awaiting_review')), patch.object(a,'git') as g:
            with self.assertRaises(ValueError): a.start(120)
            g.assert_not_called()

    def test_test_exit_propagation(self):
        with patch.object(a,'verify_fixtures'), patch.object(a,'git',side_effect=['sha','']), patch.object(a.subprocess,'run',return_value=Mock(returncode=1)):
            self.assertEqual(a.test(),1)

    def test_bad_origin(self):
        with patch.object(a,'git',return_value='unexpected') as g:
            with self.assertRaises(ValueError): a.state()
            g.assert_called_once_with('remote','get-url','origin')

    def test_bad_yaml(self):
        with patch.object(a,'git',side_effect=[next(iter(a.ORIGINS)),'','sha','[invalid']):
            with self.assertRaises(ValueError): a.state()

if __name__ == '__main__': unittest.main(verbosity=2)
