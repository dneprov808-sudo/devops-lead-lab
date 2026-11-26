# Production v12 HA candidate
Reuses v11 app/outbox, no duplicate service implementation. Three combined Kafka broker/controllers, RF=3 defaults and min ISR=2, existing 3 etcd/2 Patroni PG, Redis 1 primary + 2 replicas + 3 Sentinels, 2 API instances behind Nginx. All local containers share one physical failure domain. Redis is a cache, async replication does not promise zero loss. PostgreSQL remains async; confirmed-write loss is measured, not assumed. No broker topic upgrades of old volumes: use separate project and fresh volumes.
Stop v11 projects using ports 18111/19111 before starting. Check at least 8–12 GB available RAM as an estimate; verify actual memory. In repo root:
```bash
docker compose -p academy-v12-ha -f production_v11/compose.yaml -f production_v11/compose.ha.yaml -f production_v11/compose.v12.yaml --profile ha config --quiet
docker compose -p academy-v12-ha -f production_v11/compose.yaml -f production_v11/compose.ha.yaml -f production_v11/compose.v12.yaml --profile ha up -d --build
curl -fsS http://127.0.0.1:18112/health
python production_v11/ha_drill_v12.py --orders 10 --confirm-local-lab
python production_v11/ha_drill_v12.py --stop worker --orders 10 --confirm-local-lab
```
Choose other stop targets one at a time after confirming topology and baseline. Use no concurrent load during drill. The script stops and restores only allowlisted service in dedicated project; checks acknowledged IDs via DB-only endpoint (not Redis). Reports loss count and elapsed time, not certified RPO/RTO. No force/volume deletion. Sentinel config is copied to writable /tmp; persistent Sentinel/replica reconfiguration across whole-cluster restart needs separate testing. Single host test does not prove geographic HA. Live Docker/HA/permissions/image availability remain unverified.
References: https://kafka.apache.org/41/operations/kraft/ ; https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/ .

Hardening: the drill separates recovery evidence from fault-window availability; requires an actual stopped service, at least one accepted fault-window order and a fresh accepted order after restart. Default budget is zero unconfirmed requests; explicitly choose --max-unconfirmed N (0 <= N < orders) when an exercise allows temporary degradation. An unconfirmed request remains unknown, not proven lost. A cache response, mismatched ID or non-boolean completion cannot satisfy DB evidence. No continuous probe during restart, so elapsed check time is not certified RTO. Local runtime remains untested.
