# Academy v8 — Production Simulator (ACADEMY-015)

Учебный стенд с синтетическими заявками. Не подключать к production.
Отдельный Compose project academy-production, API 127.0.0.1:18088, Prometheus 127.0.0.1:19088.
SQLite — устойчивый журнал/очередь на одном хосте, не Kafka и не распределённая HA. Worker только атомарно меняет статус строки; внешних side effects нет. Реальная обработка требует отдельного контракта идемпотентности.
Перед запуском проверь docker context show и убедись, что контекст локальный, порты свободны.

Из корня репозитория:
```bash
docker compose -f production/compose.yaml config
docker compose -f production/compose.yaml up -d --build
docker compose -f production/compose.yaml ps
python3 production/load.py --count 30 --rate 5
curl -fsS http://127.0.0.1:18088/stats
```

Сценарий отказа: дождись pending=0, запиши accepted и processed. Останови только worker:
```bash
docker compose -f production/compose.yaml stop worker
python3 production/load.py --count 10 --rate 5
curl -fsS http://127.0.0.1:18088/stats
docker compose -f production/compose.yaml start worker
curl -fsS http://127.0.0.1:18088/stats
```
Ожидание: accepted увеличился на 10, processed не изменился во время остановки; после запуска pending возвращается к 0, processed=accepted. Повторяй GET до завершения, не сбрасывай данные. Метрики доступны на /metrics, Prometheus query academy_orders_pending. API health проверяет БД, а не готовность worker — это намеренный пример недостаточного healthcheck. Проверяй backlog отдельно. Остановить стенд: docker compose -f production/compose.yaml down (без -v; volume сохраняется).
Тест без Docker: python3 -m unittest -v test_production.
Проверено: Python 3.13.5, HTTP + SQLite + отдельный процесс worker, 11 принятых/11 обработанных, backlog 10→0, дубликат и некорректный ID. Docker/Prometheus runtime не проверен; Docker отсутствует в среде автора. Теги образов не закреплены digest; API однопоточный, нагрузка ограничена, нет HA, TLS и аутентификации. Не публикуй порты наружу.

Документация:
- https://docs.docker.com/reference/compose-file/services/
- https://docs.docker.com/reference/compose-file/volumes/
- https://prometheus.io/docs/instrumenting/exposition_formats/
- https://docs.python.org/3/library/sqlite3.html
