"""Read-only control-plane snapshot; does not prove sustained quorum or failover."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
IDS = {1, 2, 3}
CLUSTER = 'MkU3OEVBNTcwNTJENDM2Qk'
ENDPOINTS = [f'http://etcd{i}:2379' for i in range(1, 4)]
EXIT = {'PASS': 0, 'FAIL': 1, 'BLOCKED': 125}


def integer(value):
    if type(value) is not int:
        raise ValueError('Expected integer')
    return value


def kraft(raw):
    fields = {}
    for line in raw.splitlines():
        key, sep, value = line.partition(':')
        if sep and key.strip() in ('ClusterId', 'LeaderId', 'LeaderEpoch', 'HighWatermark',
                                   'MaxFollowerLag', 'CurrentVoters'):
            if key.strip() in fields:
                raise ValueError('Duplicate field')
            fields[key.strip()] = value.strip()
    voters = json.loads(fields['CurrentVoters'])
    if not isinstance(voters, list):
        raise ValueError('Expected voters')
    ids = [integer(v['id'] if isinstance(v, dict) else v) for v in voters]
    return {'cluster': fields['ClusterId'], 'voters': ids,
            'leader': int(fields['LeaderId']), 'epoch': int(fields['LeaderEpoch']),
            'high_watermark': int(fields['HighWatermark']), 'max_follower_lag': int(fields['MaxFollowerLag'])}


def kraft_ok(d):
    return (d['cluster'] == CLUSTER and len(d['voters']) == 3 and set(d['voters']) == IDS
            and d['leader'] in IDS and d['epoch'] >= 0 and d['high_watermark'] >= 0
            and d['max_follower_lag'] == 0)


def etcd(raw):
    rows = json.loads(raw)
    if not isinstance(rows, list):
        raise ValueError('Expected endpoint list')
    result = []
    for row in rows:
        s = row['Status']
        h = s['header']
        result.append({'endpoint': row['Endpoint'], 'cluster': integer(h['cluster_id']),
                       'member': integer(h['member_id']), 'leader': integer(s.get('leader', 0)),
                       'term': integer(s['raftTerm']), 'index': integer(s['raftIndex']),
                       'applied': integer(s['raftAppliedIndex']),
                       'learner': s.get('isLearner', False), 'has_errors': bool(s.get('errors'))})
    return result


def etcd_ok(rows):
    if len(rows) != 3 or {r['endpoint'] for r in rows} != set(ENDPOINTS):
        return False
    members = {r['member'] for r in rows}
    clusters = {r['cluster'] for r in rows}
    leaders = {r['leader'] for r in rows}
    terms = {r['term'] for r in rows}
    return (len(members) == 3 and min(members) > 0 and len(clusters) == 1 and min(clusters) > 0
            and len(leaders) == 1 and leaders <= members and len(terms) == 1 and min(terms) > 0
            and all(r['learner'] is False and not r['has_errors']
                    and 0 < r['applied'] <= r['index'] for r in rows))


def patroni_ok(d):
    if set(d) != {'pg1', 'pg2'}:
        return False
    pairs = []
    for v in d.values():
        if v['scope'] != 'academy-v11-ha' or v['state'] != 'running':
            return False
        pairs.append((v['primary'], v['replica'], v['role']))
    return sorted(pairs) == [(200, 503, 'primary'), (503, 200, 'replica')]


PATRONI_PROBE = """
import json, urllib.request, urllib.error
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Unexpected redirect')
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
def get(host, path, body=False):
    try:
        with opener.open('http://' + host + ':8008/' + path, timeout=3) as r:
            return json.load(r) if body else r.status
    except urllib.error.HTTPError as e:
        if not body and e.code == 503:
            return 503
        raise
out = {}
for host in ('pg1', 'pg2'):
    d = get(host, 'patroni', True)
    out[host] = {'scope': d['patroni']['scope'], 'state': d['state'], 'role': d['role'],
                 'primary': get(host, 'primary'), 'replica': get(host, 'replica')}
print(json.dumps(out))
"""


def compose(*args):
    cmd = ['docker', '--host', 'unix:///var/run/docker.sock', 'compose', '-p', 'academy-v12-ha']
    for name in ('compose.yaml', 'compose.ha.yaml', 'compose.v12.yaml'):
        cmd += ['-f', str(ROOT / name)]
    cmd += ['--profile', 'ha', 'exec', '-T', *args]
    return subprocess.run(cmd, capture_output=True, text=True, timeout=40, check=True).stdout


def evaluate(checks):
    rows = []
    for name, collect, predicate in checks:
        try:
            observed = collect()
            rows.append({'check': name, 'status': 'PASS' if predicate(observed) else 'FAIL',
                         'observed': observed})
        except Exception as exc:
            rows.append({'check': name, 'status': 'BLOCKED', 'error_type': type(exc).__name__})
    status = ('FAIL' if any(r['status'] == 'FAIL' for r in rows) else
              'PASS' if rows and all(r['status'] == 'PASS' for r in rows) else 'BLOCKED')
    return {'schema_version': 1, 'scope': 'control-plane-snapshot', 'status': status, 'checks': rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--confirm-local-lab', required=True, action='store_true')
    parser.parse_args()
    if os.environ.get('DOCKER_HOST') or os.environ.get('DOCKER_CONTEXT'):
        print('BLOCKED: Docker endpoint override', file=sys.stderr)
        return 125
    try:
        profile = compose('api', 'python', '-c', "import os; print(os.environ.get('ACADEMY_PROFILE'))")
        if profile.strip() != 'v12-ha':
            raise ValueError('Unexpected profile')
    except Exception:
        print('BLOCKED: local v12 API profile not verified', file=sys.stderr)
        return 125
    report = evaluate([
        ('kraft', lambda: kraft(compose('kafka', '/opt/kafka/bin/kafka-metadata-quorum.sh',
                                        '--bootstrap-server', 'kafka:9092,kafka2:9092,kafka3:9092',
                                        'describe', '--status')), kraft_ok),
        ('etcd', lambda: etcd(compose('etcd1', '/usr/local/bin/etcdctl',
                                    '--endpoints=' + ','.join(ENDPOINTS), '--command-timeout=10s',
                                    '--write-out=json', 'endpoint', 'status')), etcd_ok),
        ('patroni', lambda: json.loads(compose('api', 'python', '-c', PATRONI_PROBE)), patroni_ok),
    ])
    print(json.dumps(report, indent=2))
    return EXIT[report['status']]


if __name__ == '__main__':
    sys.exit(main())
