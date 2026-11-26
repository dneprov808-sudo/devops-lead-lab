"""Read-only steady-state HA acceptance for the dedicated local v12 project."""
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
BROKERS = {1, 2, 3}
PG = ('pg1', 'pg2')
REDIS = ('redis', 'redis2', 'redis3')


def kafka_ok(data):
    parts = data['partitions']
    return (set(data['brokers']) == BROKERS and set(parts) == {0, 1, 2}
            and data['min_isr'] == '2' and data['unclean'] == 'false'
            and all(set(p['replicas']) == BROKERS and set(p['isr']) == BROKERS
                    and p['leader'] in BROKERS for p in parts.values()))


def pg_ok(data):
    if set(data) != set(PG):
        return False
    return sorted((v['replica'], v['streaming']) for v in data.values()) == [(False, 1), (True, 1)]


def redis_ok(data):
    nodes, sentinels = data['nodes'], data['sentinels']
    if set(nodes) != set(REDIS) or set(sentinels) != {'sentinel1', 'sentinel2', 'sentinel3'}:
        return False
    masters = [v for v in nodes.values() if v['role'] == 'master']
    if len(masters) != 1 or masters[0]['connected'] != 2:
        return False
    primary = masters[0]['address']
    return (all(v['role'] == 'master' or (v['role'] == 'slave' and v['up']
                and v['upstream'] == primary) for v in nodes.values())
            and all(v['quorum'] and v['primary'] == primary for v in sentinels.values()))


def collect_kafka():
    from confluent_kafka.admin import AdminClient, ConfigResource, ResourceType
    client = AdminClient({'bootstrap.servers': 'kafka:9092,kafka2:9092,kafka3:9092'})
    # All-topic metadata request avoids auto-creating a missing named topic.
    metadata = client.list_topics(timeout=8)
    topic = metadata.topics.get('academy-orders-v11')
    if topic is None or topic.error:
        return {'brokers': sorted(metadata.brokers), 'partitions': {}, 'min_isr': None, 'unclean': None}
    resource = ConfigResource(ResourceType.TOPIC, topic.topic)
    config = client.describe_configs([resource], request_timeout=8)[resource].result(timeout=10)
    return {'brokers': sorted(metadata.brokers), 'partitions': {i: {'leader': p.leader,
            'replicas': p.replicas, 'isr': p.isrs} for i, p in topic.partitions.items()},
            'min_isr': config['min.insync.replicas'].value,
            'unclean': config['unclean.leader.election.enable'].value}


def collect_pg():
    import psycopg
    data = {}
    for host in PG:
        with psycopg.connect(host=host, dbname='postgres', user='postgres',
                password=os.environ['PGPASSWORD'], connect_timeout=3,
                options='-c statement_timeout=3000 -c default_transaction_read_only=on') as conn:
            replica = conn.execute('SELECT pg_is_in_recovery()').fetchone()[0]
            query = ("SELECT count(*) FROM pg_stat_wal_receiver WHERE status='streaming'" if replica
                     else "SELECT count(*) FROM pg_stat_replication WHERE state='streaming'")
            data[host] = {'replica': replica, 'streaming': conn.execute(query).fetchone()[0]}
    return data


def collect_redis():
    import redis
    def client(host, port):
        return redis.Redis(host=host, port=port, decode_responses=True,
                           socket_timeout=2, socket_connect_timeout=2)
    def addr(host, port):
        return [socket.gethostbyname(host), int(port)]
    nodes, sentinels = {}, {}
    for host in REDIS:
        with client(host, 6379) as c:
            v = c.info('replication')
            nodes[host] = {'role': v['role'], 'address': addr(host, 6379),
                'connected': v.get('connected_slaves'), 'up': v.get('master_link_status') == 'up',
                'upstream': addr(v['master_host'], v['master_port']) if v.get('master_host') else None}
    for host in ('sentinel1', 'sentinel2', 'sentinel3'):
        with client(host, 26379) as c:
            c.set_response_callback('SENTINEL CKQUORUM', lambda response: response)
            quorum = c.execute_command('SENTINEL CKQUORUM', 'academy')
            primary = c.sentinel_get_master_addr_by_name('academy')
            sentinels[host] = {'quorum': isinstance(quorum, str) and quorum.startswith('OK '),
                               'primary': addr(*primary) if primary else None}
    return {'nodes': nodes, 'sentinels': sentinels}


def evaluate(checks):
    rows = []
    for name, collect, predicate in checks:
        try:
            data = collect()
            rows.append({'check': name, 'status': 'PASS' if predicate(data) else 'FAIL', 'observed': data})
        except Exception as exc:
            # No exception text: connection strings or credentials may be present.
            rows.append({'check': name, 'status': 'BLOCKED', 'error_type': type(exc).__name__})
    status = 'FAIL' if any(r['status'] == 'FAIL' for r in rows) else (
        'PASS' if rows and all(r['status'] == 'PASS' for r in rows) else 'BLOCKED')
    return {'schema_version': 1, 'scope': 'steady-state-topology', 'status': status, 'checks': rows}


def main():
    if sys.argv[1:] == ['--inside']:
        if os.environ.get('ACADEMY_PROFILE') != 'v12-ha':
            return 125
        report = evaluate([('kafka', collect_kafka, kafka_ok), ('postgres', collect_pg, pg_ok),
                           ('redis', collect_redis, redis_ok)])
        print(json.dumps(report, indent=2))
        return {'PASS': 0, 'FAIL': 1, 'BLOCKED': 125}[report['status']]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--confirm-local-lab', action='store_true', required=True)
    parser.parse_args()
    if os.environ.get('DOCKER_HOST') or os.environ.get('DOCKER_CONTEXT'):
        print('BLOCKED: unset Docker endpoint overrides', file=sys.stderr)
        return 125
    cmd = ['docker', '--host', 'unix:///var/run/docker.sock', 'compose', '-p', 'academy-v12-ha']
    for name in ('compose.yaml', 'compose.ha.yaml', 'compose.v12.yaml'):
        cmd += ['-f', str(ROOT / name)]
    cmd += ['--profile', 'ha', 'exec', '-T', 'api', 'python', '-', '--inside']
    try:
        result = subprocess.run(cmd, input=Path(__file__).read_text(), text=True, timeout=90,
                                capture_output=True)
    except (OSError, subprocess.TimeoutExpired):
        print('BLOCKED: local Docker or probe unavailable', file=sys.stderr)
        return 125
    try:
        report = json.loads(result.stdout)
        code = {'PASS': 0, 'FAIL': 1, 'BLOCKED': 125}[report['status']]
        if report['scope'] != 'steady-state-topology' or code != result.returncode:
            raise ValueError('Invalid probe result')
    except (ValueError, KeyError, TypeError):
        print('BLOCKED: no valid topology report from local API container', file=sys.stderr)
        return 125
    print(json.dumps(report, indent=2))
    return code


if __name__ == '__main__':
    sys.exit(main())
