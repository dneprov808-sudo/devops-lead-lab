import copy
import unittest
from production_v11.topology_v12 import kafka_ok, pg_ok, redis_ok, evaluate


class TopologyTests(unittest.TestCase):
    def test_kafka_full_replication(self):
        data = {'brokers': [1, 2, 3], 'min_isr': '2', 'unclean': 'false',
                'partitions': {i: {'leader': 1, 'replicas': [1, 2, 3], 'isr': [1, 2, 3]} for i in range(3)}}
        self.assertTrue(kafka_ok(data))
        for key, value in [('brokers', [1, 2]), ('min_isr', '1'), ('unclean', 'true')]:
            bad = dict(data, **{key: value})
            self.assertFalse(kafka_ok(bad))
        bad = copy.deepcopy(data)
        bad['partitions'][0]['isr'] = [1, 2]
        self.assertFalse(kafka_ok(bad))
        bad = copy.deepcopy(data)
        del bad['partitions'][2]
        self.assertFalse(kafka_ok(bad))

    def test_pg_roles_and_streaming(self):
        data = {'pg1': {'replica': False, 'streaming': 1}, 'pg2': {'replica': True, 'streaming': 1}}
        self.assertTrue(pg_ok(data))
        data['pg2']['replica'] = False
        self.assertFalse(pg_ok(data))
        data['pg2'] = {'replica': True, 'streaming': 0}
        self.assertFalse(pg_ok(data))

    def test_redis_quorum_and_link(self):
        primary = ['172.18.0.2', 6379]
        data = {'nodes': {'redis': {'role': 'master', 'address': primary, 'connected': 2},
                          **{n: {'role': 'slave', 'up': True, 'upstream': primary} for n in ('redis2', 'redis3')}},
                'sentinels': {f'sentinel{i}': {'quorum': True, 'primary': primary} for i in range(1, 4)}}
        self.assertTrue(redis_ok(data))
        for key, value in [('quorum', False), ('primary', ['172.18.0.3', 6379])]:
            bad = copy.deepcopy(data)
            bad['sentinels']['sentinel2'][key] = value
            self.assertFalse(redis_ok(bad))
        data['nodes']['redis3']['up'] = False
        self.assertFalse(redis_ok(data))

    def test_verdict_precedence_and_redaction(self):
        def broken():
            raise RuntimeError('private-password')
        ok = ('ok', lambda: True, bool)
        blocked = ('blocked', broken, bool)
        fail = ('fail', lambda: False, bool)
        self.assertEqual(evaluate([ok])['status'], 'PASS')
        report = evaluate([ok, blocked])
        self.assertEqual(report['status'], 'BLOCKED')
        self.assertNotIn('private-password', str(report))
        self.assertEqual(evaluate([blocked, fail])['status'], 'FAIL')
        self.assertEqual(evaluate([])['status'], 'BLOCKED')
