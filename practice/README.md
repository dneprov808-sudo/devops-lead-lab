# Academy Practice v2 — ACADEMY-009

Дополнительная практика уровня Middle/Senior/Lead. LAB-001 остаётся единственной основной лабораторией, STATE и SKILL_MATRIX не изменяются. Это не официальные подтверждённые компетенции. Решения заданий не включены.

## Быстрый старт из WSL

Если существующий checkout содержит решение/незакоммиченные изменения, не переключай его принудительно. Для отдельного нового checkout:
```bash
cd ~
git clone -b academy/practice-v2 https://github.com/dneprov808-sudo/devops-lead-lab.git devops-lead-lab-v2
cd devops-lead-lab-v2
python3 portal.py
```
Открой http://127.0.0.1:8080 и раздел «Практикум». Обычные зависимости: Git, Python 3, python3-yaml, curl, Bash. При необходимости установи через apt. Для стендов нужен локальный Docker Engine + Compose v2, не нужен для тренажёра/сохранения. Не запускай Docker против рабочего удалённого контекста: проверь docker context show, docker context inspect и переменную DOCKER_HOST. Убедись, что используется именно твой локальный учебный Docker; не выполняй на production. Никаких cloud-ресурсов.

## Девять заданий, шесть профилей

| ID | Тема | Профиль |
|---|---|---|
| PR-KAFKA-01 | partitions, offsets, consumer lag | kafka |
| PR-KAFKA-02 | producer/consumer failure, KRaft/ISR design | kafka |
| PR-PG-01 | EXPLAIN, index, статистика | postgres |
| PR-PG-02 | locks, транзакции, backup/restore | postgres |
| PR-PATRONI-01 | лидер, replica, failover | patroni |
| PR-PATRONI-02 | DCS outage, split-brain, ADR | patroni |
| PR-REDIS-01 | TTL, eviction, persistence | redis |
| PR-NGINX-01 | reverse proxy, upstream failure | nginx |
| PR-OBS-01 | Prometheus, Blackbox Exporter, Grafana, SLI | observability |

В каждом задании в портале есть команда запуска, вход в стенд, 4 действия, 3 критерия результата и ссылка на документацию. Из корня repo можно проверить Compose без запуска:
```bash
docker compose -f practice/compose.yaml --profile kafka config
docker compose -f practice/compose.yaml --profile kafka up -d
docker compose -f practice/compose.yaml --profile kafka ps
docker compose -f practice/compose.yaml --profile kafka stop
```
Замени kafka на нужный профиль. Для Patroni команда up -d --build. Работай с одним профилем за раз, контролируй свободную память и диск. stop сохраняет данные; удаление volumes не автоматизировано. Не используй down -v без осознанного решения удалить все учебные данные проекта. Пароли в конфигурации намеренно синтетические, непригодны для production; доступ к опубликованным портам только через loopback. Kafka одноузловая; Patroni две PostgreSQL ноды и один etcd — учебный стенд, не отказоустойчивый DCS. Prometheus http://127.0.0.1:19090, Grafana http://127.0.0.1:13000 (admin / academy-local-only). Nginx http://127.0.0.1:18081. 
Статическая YAML-проверка пройдена; docker compose config, загрузка образов, фактическая репликация и failover требуют проверки на локальном Docker. Не обещаем их PASS заранее. Образы фиксированы по версии/серии, не digest; для строгой воспроизводимости записывай фактические image digests после pull.

## Сохранить результат одной кнопкой

1. В «Практикум» открой задачу, выполни стенд, отметь реально полученные доказательства, при желании выставь самооценку. До отправки отметки сохраняются в localStorage браузера.
2. Нажми «Сохранить результат → commit + push» и подтверди. В разделе LAB-001 после реального запуска тестов доступна отдельная кнопка сохранения метаданных тестов.
3. Backend проверит Git origin и push URL, сформирует JSON с фиксированной схемой, прочитает remote tip, создаст коммит через отдельный временный Git index, выполнит non-force push строго в refs/heads/student/practice-results и повторно прочитает файл с remote. Не меняет текущую ветку, HEAD, рабочие файлы, index, тесты, STATE или оценки. Первый save создаёт ветку от academy/practice-v2; после этого только добавляет результаты. Не требуется gh или новый токен, но нужен уже настроенный Git-доступ с правом push и Git author identity. Если identity не задан, укажи собственные git config user.name и user.email (можно GitHub noreply). Не добавляй токены в URL.
4. В UI появится ссылка с проверенным commit SHA. История: https://github.com/dneprov808-sudo/devops-lead-lab/tree/student/practice-results/practice-results . Она появится после первого успешного сохранения.
5. При отказе или неопределённом push не создавай новый ID. Сохраняется исходный черновик/ID, кнопка повторяет тот же payload. Если запись уже существует и совпадает — already_saved без нового коммита; иной payload того же ID — collision. Конкурентные изменения не перезаписываются force push; ручная сверка и повтор того же ID. Для LAB-001 сервер хранит последние 32 test records в RAM, при рестарте проверить ветку и повторно запустить тесты; это не долговременный acceptance ledger.
6. В GitHub отправляются только ID модуля и попытки, чек-лист, самооценка, либо настоящий локальный exit code, HEAD, dirty flag и SHA-256 полного захваченного вывода тестов. Сырой лог, исходники healthcheck.sh, REPORT.md и личные записи не отправляются этой кнопкой. Решение LAB-001 по-прежнему сдаётся через Academy CLI / отдельную студенческую ветку и Code Review. Хеш лога сам по себе не доказывает результат удалённого CI. Самооценка не официальная оценка. 
Сохранение работает по явному клику, не скрытый таймер и не автоматическая публикация при каждом изменении. Данные не отправляются в OpenAI API. Портал локальный, не разворачивать на публичном интерфейсе.

## Проверки
```bash
python3 -m unittest -v test_portal test_practice_results
node test_frontend.mjs
node test_practice_frontend.mjs
```
Node нужен только для dev-тестов. Подробнее TEST_REPORT.md.
