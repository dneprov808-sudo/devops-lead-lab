# Roadmap v5 — предложение к активации Orchestrator

Десять недель остаются ориентиром, не обещанием. LAB-001 остаётся assigned; следующие основные лаборатории требуют отдельных спецификаций и тестов. PR-* дополнительные, не заменяют основной gate.

| Неделя | Фокус | Проверяемый результат |
|---|---|---|
| 1 | Linux, Bash, HTTP | LAB-001: оригинальные тесты, отчёт, ревью, экзамен |
| 2 | Сети, DNS, TLS, Nginx/HAProxy | Диагностика маршрута, HTTP 502/504; PR-NGINX-01/02 |
| 3 | Docker, OCI, Redis | Безопасная сборка, persistence и cache; PR-REDIS-01/02 |
| 4 | Ansible, CI/CD | Идемпотентность, canary, rollback; независимый тест роли и pipeline |
| 5 | Terraform, Git | State, drift, plan без нежелательных удалений |
| 6 | Kubernetes, Helm, GitOps | Probes, rollout, endpoints, drift; локальный стенд требуется |
| 7 | PostgreSQL и Kafka | EXPLAIN, locks, MVCC, restore; partitions, lag, replay; PR-PG-01–04 и PR-KAFKA-01–03 |
| 8 | Observability, SRE, Security | PR-OBS-01/02, SLO, burn rate, алерт, threat model |
| 9 | Patroni, etcd, HA/DR, RabbitMQ | PR-PATRONI-01–03, RTO/RPO, quorum, ADR; RabbitMQ стенд требуется |
| 10 | Platform engineering, Leadership | DESIGN-01–05, архитектурная защита и два интервью |

Один основной lab; объём дополнительных заданий выбирается по времени и пробелам. Ни одна тема не считается освоенной без независимых доказательств.
