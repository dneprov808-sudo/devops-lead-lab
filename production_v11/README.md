# Production Simulator v11 (candidate)
Separate project and ports; old v8 unchanged. Local synthetic data only. No remote Docker, no production credentials.
Light mode (single Kafka broker and PostgreSQL, no HA claim):
  docker compose -f production_v11/compose.yaml --profile light up -d --build
  curl -fsS http://127.0.0.1:18111/stats
  python3 production_v11/smoke.py
  docker compose -f production_v11/compose.yaml --profile light down
HA candidate: after stopping light mode (same ports), use a separate project:
  PGHOST=pg1,pg2 docker compose -p academy-v11-ha -f production_v11/compose.yaml -f production_v11/compose.ha.yaml --profile ha config --quiet
  PGHOST=pg1,pg2 docker compose -p academy-v11-ha -f production_v11/compose.yaml -f production_v11/compose.ha.yaml --profile ha up -d --build
Verify roles with Patroni REST inside cluster, stop only current primary in HA project, measure recovery and compare acknowledged IDs using DB; no zero-RPO promise (async replication, single broker, all nodes on one physical host). Do not run light smoke against HA. HA profile not yet runtime-tested.
Architecture: order + outbox atomic PostgreSQL transaction; publish ack then mark (possible duplicates); worker DB commit then Kafka offset commit (idempotent state update). Redis only caches terminal results for 10s; /stats reads DB. A broker losing acknowledged data may require explicit outbox reconciliation. Failed/unknown writes must retry same ID. Synthetic credentials and tags only; full image digest lock, dependency hashes, TLS, multiple Kafka brokers and live HA drill pending.
Scenario backlog: worker stop/recovery (script); Kafka stop and outbox recovery; Redis stop (database fallback); PostgreSQL stop/reconnect; primary promotion; DCS minority loss; duplicate event; backlog under load. Start with bounded loads and no destructive volume deletion. Document baseline, timeline, RTO, RPO and verification independently. Docker Compose and images not executed in author environment.
References: https://kafka.apache.org/41/getting-started/docker/ ; https://docs.confluent.io/kafka-clients/python/current/overview.html ; https://patroni.readthedocs.io/en/latest/ ; https://docs.docker.com/compose/how-tos/profiles/
