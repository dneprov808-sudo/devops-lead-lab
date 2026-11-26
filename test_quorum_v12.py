import copy
import json
import unittest
from unittest.mock import patch

from production_v11 import quorum_v12 as q


def kraft_fixture(voters='[{"id": 1}, {"id": 2}, {"id": 3}]', lag=0):
    return (f'ClusterId: {q.CLUSTER}\nLeaderId: 2\nLeaderEpoch: 7\n'
            f'HighWatermark: 12\nMaxFollowerLag: {lag}\nCurrentVoters: {voters}\n')


def etcd_fixture():
    # IDs deliberately exceed the exact integer range of JS Number.
    return [{'Endpoint': endpoint, 'Status': {
        'header': {'cluster_id': 17237436991929493444, 'member_id': 9372538179322589801 + i},
        'leader': 9372538179322589801, 'raftTerm': 7, 'raftIndex': 100 + i,
        'raftAppliedIndex': 99 + i, 'version': '3.5.21'}}
        for i, endpoint in enumerate(q.ENDPOINTS)]


class QuorumTests(unittest.TestCase):
    def test_kraft_healthy_and_degraded(self):
        d = q.kraft(kraft_fixture())
        self.assertTrue(q.kraft_ok(d))
        self.assertTrue(q.kraft_ok(q.kraft(kraft_fixture('[1,2,3]'))))
        for change in ({'leader': -1}, {'voters': [1, 1, 2]}, {'cluster': 'foreign'},
                       {'high_watermark': -1}, {'max_follower_lag': 1}):
            self.assertFalse(q.kraft_ok(dict(d, **change)))
        with self.assertRaises(ValueError):
            q.kraft(kraft_fixture('[true,2,3]'))
        with self.assertRaises(ValueError):
            q.kraft(kraft_fixture() + 'LeaderId: 1\n')

    def test_etcd_full_and_partial(self):
        d = q.etcd(json.dumps(etcd_fixture()))
        self.assertEqual(d[0]['member'], 9372538179322589801)
        self.assertTrue(q.etcd_ok(d))
        self.assertFalse(q.etcd_ok(d[:2]))
        for change in ({'member': d[1]['member']}, {'cluster': 3}, {'leader': 0},
                       {'term': 8}, {'applied': 1000}, {'learner': True}, {'has_errors': True}):
            bad = copy.deepcopy(d)
            bad[0].update(change)
            self.assertFalse(q.etcd_ok(bad))
        with self.assertRaises(ValueError):
            q.etcd('{}')

    def test_patroni_primary_lock(self):
        d = {'pg1': {'scope': 'academy-v11-ha', 'state': 'running', 'role': 'primary',
                     'primary': 200, 'replica': 503},
             'pg2': {'scope': 'academy-v11-ha', 'state': 'running', 'role': 'replica',
                     'primary': 503, 'replica': 200}}
        self.assertTrue(q.patroni_ok(d))
        self.assertTrue(q.patroni_ok({'pg1': d['pg2'], 'pg2': d['pg1']}))
        for change in ({'primary': 503}, {'state': 'starting'}, {'scope': 'foreign'}):
            bad = copy.deepcopy(d)
            bad['pg1'].update(change)
            self.assertFalse(q.patroni_ok(bad))
        self.assertFalse(q.patroni_ok({'pg1': d['pg1'], 'pg2': d['pg1']}))

    def test_fail_and_blocked(self):
        def broken():
            raise RuntimeError('private-value')
        good = ('good', lambda: True, bool)
        bad = ('bad', lambda: False, bool)
        blocked = ('blocked', broken, bool)
        self.assertEqual(q.evaluate([good])['status'], 'PASS')
        self.assertEqual(q.evaluate([])['status'], 'BLOCKED')
        self.assertEqual(q.evaluate([good, blocked])['status'], 'BLOCKED')
        self.assertEqual(q.evaluate([bad, blocked])['status'], 'FAIL')
        self.assertNotIn('private-value', str(q.evaluate([blocked])))

    def test_local_command_and_profile_guard(self):
        with patch.object(q.subprocess, 'run') as run:
            run.return_value.stdout = 'fixture'
            self.assertEqual(q.compose('etcd1', 'etcdctl'), 'fixture')
            args, kwargs = run.call_args
            self.assertEqual(args[0][:6], ['docker', '--host', 'unix:///var/run/docker.sock',
                                           'compose', '-p', 'academy-v12-ha'])
            self.assertEqual(args[0][-4:], ['exec', '-T', 'etcd1', 'etcdctl'])
            self.assertEqual(kwargs['timeout'], 40)
            self.assertTrue(kwargs['check'])
        with patch.dict(q.os.environ, {'DOCKER_HOST': 'tcp://remote:2375'}, clear=True), \
                patch.object(q.sys, 'argv', ['quorum_v12.py', '--confirm-local-lab']), \
                patch.object(q, 'compose') as compose:
            self.assertEqual(q.main(), 125)
            compose.assert_not_called()
        with patch.dict(q.os.environ, {}, clear=True), \
                patch.object(q.sys, 'argv', ['quorum_v12.py', '--confirm-local-lab']), \
                patch.object(q, 'compose', return_value='wrong-profile') as compose:
            self.assertEqual(q.main(), 125)
            compose.assert_called_once()
