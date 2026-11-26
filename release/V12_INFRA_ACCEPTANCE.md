# ACADEMY-V12-HARDEN-03 — infrastructure acceptance (increment 1)

Base: academy/stable, merge of PR #33, 17e30de95f3ae572111856a55da9ac7518ce9529.
This is a targeted hardening increment, not a new Academy version, not a release certification.

## Local acceptance sequence

Use a fresh dedicated worktree and the exact reviewed commit. No real student data,
production network, remote Docker or other Academy stack. Requires Docker Engine
and Compose with the local Unix socket /var/run/docker.sock (Linux/WSL); rootless
or alternative sockets are intentionally unsupported in this increment.
Allow enough local RAM/disk for three Kafka brokers, PostgreSQL, etcd, Redis and
application containers. Do not use volume deletion as a recovery strategy.

From repository root, after manually confirming the checkout and local Docker:

```bash
unset DOCKER_HOST DOCKER_CONTEXT
docker --host unix:///var/run/docker.sock compose -p academy-v12-ha \
  -f production_v11/compose.yaml -f production_v11/compose.ha.yaml \
  -f production_v11/compose.v12.yaml --profile ha config --quiet
docker --host unix:///var/run/docker.sock compose -p academy-v12-ha \
  -f production_v11/compose.yaml -f production_v11/compose.ha.yaml \
  -f production_v11/compose.v12.yaml --profile ha up -d --build
python -m unittest -v test_topology_v12
```

Wait for the stack to be ready; the existing bounded-load drill creates synthetic
orders and checks the database. Verify the Docker default context points to the
same local daemon before using the existing drill (it does not pin the socket).

```bash
docker context show
docker context inspect --format '{{.Endpoints.docker.Host}}'
python production_v11/ha_drill_v12.py --confirm-local-lab
python production_v11/topology_v12.py --confirm-local-lab
```

The new topology probe executes read-only queries inside the existing API
container. It does not start, stop, create, delete or reconfigure services,
write orders, or create a missing Kafka topic. It requires an explicit opt-in,
pins the socket/project, checks the internal profile, and has an overall timeout.

| Check | Required steady state |
| --- | --- |
| Kafka | Exactly brokers 1, 2, 3; three application partitions, RF3 and full ISR on each; elected leaders, min ISR2, unclean election disabled |
| PostgreSQL | Exactly one writable-role server (not in recovery) and one replica; one streaming sender/receiver respectively |
| Redis | Exactly one master with two connected replicas, both links up to the same master; three Sentinel views agree and each reports quorum |

PASS = 0; observed predicate mismatch = FAIL (1); unavailable dependencies,
query errors, malformed/no container report = BLOCKED (125). FAIL dominates
BLOCKED when both occur. A Redis NOQUORUM command error is conservatively
reported BLOCKED, never PASS. Probe output contains synthetic topology
addresses; review before sharing. No exception messages are printed in JSON.

After a successful baseline, run one existing guarded fault drill at a time;
after each restart rerun the topology probe until it passes or the recovery
deadline agreed for the experiment expires. Record the exact commit, scenario,
fault-window ACKs, missing/pending/unknown IDs and elapsed observations.
Do not treat an availability budget as a universal SLA or a zero-loss sample
as proof of zero RPO. For example, stop a single broker with the existing
ha_drill_v12.py --stop kafka2 --confirm-local-lab only in the disposable lab.

This probe does not measure continuous availability/RTO, WAL lag, Patroni DCS
quorum, KRaft controller quorum, internal Kafka topic health, load-balancer
failover or Kubernetes. Observations are sequential, not an atomic snapshot.
Real service execution and collectors are still unverified.

## Author-side evidence

- Python 3.13.5: 4/4 native unit tests passed, on local copies matching published
  Git blobs: topology_v12.py ad3299760ae72f9043bdc249c0b24d80df6328ca;
  test_topology_v12.py 817c2a85ba50b03398fb8b5d9bcf36dc3d819306.
- Tests exercise healthy and degraded RF/ISR, wrong role, broken replica link,
  divergent Sentinel views, missing predicates, failure precedence and redaction.
- Local CLI without Docker returned 125. Direct clone DNS failed.
- No live topology, native full gate, real failover or K8s acceptance claimed.
- Canonical STATE revision 1 and LAB-001 unchanged; no automatic merge.

References: https://kafka.apache.org/41/configuration/broker-configs/ ;
https://docs.confluent.io/platform/8.0/clients/confluent-kafka-python/html/index.html ;
https://www.postgresql.org/docs/16/monitoring-stats.html ;
https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/ ;
https://redis.readthedocs.io/en/v6.4.0/commands.html .

Handoff: Lab Engineer -> Release Engineer, ACADEMY-V12-HARDEN-03 increment 1.
Status: implementation and fixture checks complete; runtime acceptance BLOCKED.
Next: verify real collectors on dedicated lab, integrate evidence with guarded
failover and domain-specific K8s acceptance. Preserve earlier outstanding gates.

## Increment 2 — control-plane snapshot

Run the new read-only probe before a fault and after full recovery, alongside
the earlier topology probe:

```bash
python -m unittest -v test_topology_v12 test_quorum_v12
python production_v11/quorum_v12.py --confirm-local-lab
```

| Check | Steady-state acceptance |
| --- | --- |
| KRaft | Expected cluster ID and exactly voters 1/2/3, elected leader in that set, nonnegative leader epoch and high watermark, max follower lag zero |
| etcd | Exactly three expected endpoint responses with distinct member IDs, shared positive cluster ID and term, unanimous nonzero leader in observed members, no learners/errors, positive applied index not beyond Raft index |
| Patroni | Two running nodes in expected scope; one primary HTTP 200 with leader lock and one eligible replica HTTP 200; opposite health endpoints return 503 |

Kafka metadata quorum CLI and etcd endpoint status are executed within the
dedicated Compose project. Patroni GET requests use fixed service names in the
API container with no proxies or redirects. Every subprocess has a 40-second
timeout; the probe requires the local default socket and verified v12 profile.
It never changes membership, switches leaders or injects failures.

The snapshot is sequential, not atomic. Zero Kafka follower lag is a deliberately
strict baseline, not a service SLO; etcd status alone does not prove linearizable
read availability, exact configured membership or cross-node log equality.
Patroni endpoint checks do not measure WAL lag, fencing or failover duration.
A nonzero command exit or parse failure is BLOCKED; a parsed predicate mismatch
is FAIL. Any FAIL dominates BLOCKED. Do not use these snapshots alone to certify HA.

Author evidence: Python 3.13.5, 5/5 new native tests passed on local copies with
published blob SHA equality:
- production_v11/quorum_v12.py 410bf3e6d60b33bcb078f91eab5867457b230e44
- test_quorum_v12.py 0f376ace130c4eda7650656b24b89669fecbc35f

Coverage: healthy/degraded fixtures, duplicate voters, foreign cluster, 64-bit
etcd IDs without precision loss, divergent leaders/terms, invalid applied index,
Patroni role/lock mismatch, failure precedence, error redaction, fixed command
and remote Docker/profile guards. Real CLI returned 125 with Docker absent.
Direct clone again failed DNS. Earlier 4/4 topology tests are prior-round
evidence, not a combined rerun. No live collector or failover acceptance claimed.

Official references:
- https://kafka.apache.org/41/operations/kraft/
- https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- https://patroni.readthedocs.io/en/latest/rest_api.html

Handoff: Lab Engineer -> Release Engineer, ACADEMY-V12-HARDEN-03 increment 2.
Implementation and native fixtures complete; live verification BLOCKED.
Next: integrate topology and control-plane snapshots into the guarded failover
workflow, with explicit time budgets and separate recovery/availability evidence.
Do not change canonical STATE, student solutions, or assessment status.
