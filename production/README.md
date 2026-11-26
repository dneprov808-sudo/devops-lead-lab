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

## Контрольный запуск перед ручным merge (26.11.2026)

Проверь чистоту рабочей копии. Для первого запуска ветки:
```bash
git fetch origin
git switch --track origin/academy/production-v8
```
Если ветка уже существует: `git switch academy/production-v8` и `git pull --ff-only`.
После ручного merge используй `academy/stable`, обновляемую только fast-forward.
Не переключай ветку с незакоммиченным решением LAB-001: используй отдельную рабочую копию.

Зависимости: Python 3, PyYAML, Node.js, Docker Engine + Compose v2; для браузерного smoke отдельно Playwright и локальный Chromium. Не устанавливай зависимости в системный Python без проверки; при необходимости используй venv.

```bash
git status --short
git rev-parse HEAD
python3 release/gate.py
docker context show
docker compose -f production/compose.yaml config
```

До запуска Compose убедись, что Docker context относится к локальному учебному хосту и порты 18088, 19088 свободны. Не направляй команды на боевую инфраструктуру. Портал использует 8080.
После запуска дождись успешного healthcheck API и состояния worker, затем открой http://localhost:8080 → Production v8.
Проверь http://localhost:19088/targets: target academy-orders должен быть UP. Выполни запрос academy_orders_pending. Во время отказа worker scrape может оставаться UP, а backlog расти; это ожидаемая демонстрация различия между доступностью API и обработкой заявок.

Критерий приёмки: полный gate exit 0, Compose config и runtime без ошибок, реальные метрики, worker outage/recovery по описанному сценарию, предыдущие разделы и результаты доступны в браузере. Повторный тест новых компонентов прошёл, но эти дополнительные критерии пока не подтверждены. Смотри release/V8_TEST_REPORT.md.

### Восстановление и обновление

При росте очереди проверь `docker compose -f production/compose.yaml ps`, логи API и worker, затем доступность БД и состояние очереди. Не удаляй volume для устранения ошибок. Остановка через down без -v сохраняет SQLite. Полноценное резервное копирование и проверка restore SQLite пока не реализованы; не считай браузерный экспорт резервной копией БД. Для обновления останови стенд, сохрани данные и результаты вручную, обнови ветку, повтори gate и Compose config, затем пересобери. Не запускай настоящий production: отсутствуют TLS, auth, HA, disaster recovery, production-grade нагрузочное тестирование и проверенные pinned digests.
