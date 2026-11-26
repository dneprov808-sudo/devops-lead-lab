# Academy v12-dev — локальная приёмка

Кандидат: academy/v12, PR #33. До ручного merge не считать stable обновлённой.
Не сбрасывать рабочее дерево студента и не менять канонический STATE.

## Изолированный checkout
```bash
git fetch origin
git worktree add -b review/v12-local ../academy-v12-review origin/academy/v12
cd ../academy-v12-review
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-v11-dev.txt
node --version
python release/gate.py
```

Рекомендуемый baseline: Python 3.12–3.14, Node 22. Установить Chromium для Playwright командой `python -m playwright install chromium`, локальный Docker Compose, Trivy и pip-audit отдельно. Публичные загрузки зависимостей/баз уязвимостей возможны, платные сервисы не требуются.

```bash
python release/gate.py --full --security --report "$HOME/academy-v12-gate.json"
python portal.py
```

Остановить предыдущий портал на 8080 перед запуском. Открыть http://127.0.0.1:8080/ . Не публиковать порт наружу. `--full` проверяет браузер и конфигурации Compose, но не HA failover. Не запускать fault injection против production или удалённого Docker context.

## Практические треки

- Learning: сохранение черновиков, импорт истории, локальные оценки; решения ревьюера не равны canonical qualification. См. `assessment_v12.py --help`, `migration_v12.py --help`.
- Examiner: `examiner_v12.py --help`; только локальная Ollama, ответ модели — предложение ревью.
- HA: `production_v11/compose.v12.yaml` (overlay, вместе с base + HA) и `production_v11/ha_drill_v12.py`. Сначала изучить preflight и ресурсные ограничения; отдельный локальный проект, не запускать параллельно с v11. Каталог аварий `production_v11/chaos_v12.json`.
- Kubernetes: `v12-labs/k8s/README.md`, `catalog.json`, `lab.py --help`. Только выделенный kind. CNI, CSI, HPA, Argo требуют отдельных prerequisites.
- Linux / IaC / CI: README в соответствующих подкаталогах `v12-labs/`. Никаких секретов в Git.
- Knowledge: `node release/knowledge_v12.mjs`; опциональный `python knowledge_links_v12.py --help`. Независимое ревью по `learning/review_queue_v12.json`.
- Career: `python market_v12.py --help`. HH credentials только в окружении, не в Git; проверять импорт вручную.
- Leadership: интерактивные кейсы в карьерном разделе.

Перед миграцией сделать бинарную копию локальной SQLite и сохранить черновики через экспорт. См. [проверяемое восстановление](V12_RECOVERY.md). Security scan работает только с git archive текущего HEAD, не с приватными untracked файлами. Перед запуском закоммить проверяемые tracked изменения; отсутствие сканеров блокирует проверку. JSON-экспорт событий не включает операторские решения; бинарная копия сохраняет их. Старый checkout/результаты не удалять.

## Acceptance

Пройти локальный gate, затем живые K8s/HA/Linux/IaC/CI/Ollama проверки и независимое ревью. Отдельно принять миграцию на копии данных, проверить сохранность старых черновиков. Не повышать статус компетенций без подтверждённого выполнения. См. V12_DELIVERY.md.

Gate evidence: `--report` requires a clean tracked Git checkout, a known HEAD, and an unused output path outside the checkout. Report records exact commit, clean/same-commit status, Python version, each command and status, omitted checks, without captured logs or answers. Test storage is temporary even if ACADEMY_DATA_DIR is set. A missing dependency or unavailable command yields BLOCKED (125), failures yield FAIL (1). This does not certify unexecuted HA or domain-specific tests. Use a new report filename on retry. Review reports before sharing; they include local command paths.
