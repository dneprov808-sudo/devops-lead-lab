# Academy v12 — рабочая область

## Быстрый запуск в Ubuntu WSL

Портал — отдельный checkout, не ветка решения LAB-001. Останови старый портал
через Ctrl+C. Если копия уже есть, не клонируй поверх неё и не удаляй .academy-data.
Для сохранения браузерных черновиков используй тот же адрес (localhost и
127.0.0.1 имеют разные localStorage). Перед изменением версии сохрани резервную
копию по [инструкции восстановления](release/V12_RECOVERY.md).

```bash
cd ~
git clone -b academy/stable git@github.com:dneprov808-sudo/devops-lead-lab.git academy-portal
cd academy-portal
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-v11-dev.txt
python portal.py
```

Открой http://127.0.0.1:8080/ в Windows. Docker для портала не нужен.
Установи Python 3.12–3.14, python3-venv и Git, если их ещё нет. Node 22
нужен для регрессионных тестов, не для отображения портала.
Для существующей чистой копии stable: `git pull --ff-only origin academy/stable`,
активировать прежнее venv и обновить зависимости; не переключать ветку с
незакоммиченными работами.

## Интерфейс

Светлая тема по умолчанию, тёмная — кнопкой в верхней панели. Выбор хранится локально отдельно от учебных данных. На узком экране разделы открываются кнопкой «Разделы»; Escape закрывает меню. Главная показывает актуальную задачу после чтения канонического STATE; при ошибке синхронизации явно показывает недоступность. Центр запуска копирует команды с обратной связью рядом с терминальным блоком и не выполняет их.

## Что делать в интерфейсе

| Раздел | Для чего |
| --- | --- |
| Главная · технологии | Теория, справочники, поиск, карточки технологий |
| Центр запуска | Где запускать, какие зависимости, точные команды, проверки и остановка |
| Текущая задача | Синхронизировать канонический STATE, получить следующий шаг |
| Основная LAB-001 | Отдельный student checkout, самостоятельная реализация |
| Практикум | Дополнительные упражнения, свои критерии и локальные стенды |
| Симуляторы и аварии | v12 Chaos/K8s и архивный v8 (не путать со стендом v12) |
| Банк вопросов / Пробное собеседование | Подготовка и независимая проверка |
| План и оценка / Матрица | Локальные результаты и канонический статус раздельно |

## Карта окружений

| Что | Где | Порт / изоляция |
| --- | --- | --- |
| Портал | WSL Python, checkout stable | 8080 loopback |
| LAB-001 | Отдельный student checkout | 18080 optional local fixture |
| Production Light | Docker Compose, production_v11/compose.yaml | 18111, Prometheus 19111 |
| Production HA | Docker Compose, три overlay файла | 18112 LB, 18111 API, 19111 Prometheus |
| Kubernetes | kind academy-v11, отдельный kubeconfig | Только dedicated cluster |
| Linux | disposable WSL/VM, user namespace | Не изменять host firewall/routes |
| IaC | disposable VM/каталог, local provider | Без облака |
| CI/CD | локальный pipeline, отдельный checkout | Без production runner |
| Legacy Production v8 | отдельный старый стенд | 18088 |

Light и HA не запускать одновременно (пересекаются порты). В UI есть
команды запуска каждого сценария, но портал их не исполняет. Перед
повторным запуском проверить существующие контейнеры/кластеры. Все данные
синтетические. Не удалять volumes, kubeconfig или учебные результаты
без отдельного решения. Старый /api/production/status относится к v8.

Подробности: [HA acceptance](release/V12_INFRA_ACCEPTANCE.md),
[K8s labs](v12-labs/k8s/README.md), [Linux](v12-labs/linux/README.md),
[IaC](v12-labs/iac/README.md), [CI/CD](v12-labs/cicd/README.md).
Не считать наличие runbook доказательством успешного runtime.

## Приёмка

В чистом checkout, без запущенного портала:
```bash
source .venv/bin/activate
python -m unittest -v test_workspace_ui
node test_frontend.mjs
node test_ui_preferences.mjs
python -m playwright install --with-deps chromium
python release/browser_e2e.py
python release/gate.py --full
```
Затем открыть портал и проверить desktop/mobile, навигацию, копирование
команд, фильтры каталога, сохранение локальной попытки и восстановление
черновика. Не использовать реальные ответы при тестировании.
