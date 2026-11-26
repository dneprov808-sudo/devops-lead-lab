# Academy — начало работы

Для кандидата Academy v12-dev: [локальная приёмка](release/V12_START.md), [delivery ledger](release/V12_DELIVERY.md). До ручного merge v12 остаётся кандидатом.

Для кандидата Academy v11-dev: [локальный запуск и проверка](release/V11_START.md), [delivery ledger](release/V11_DELIVERY.md). До ручного merge v11 остаётся кандидатом.

# Academy Unified — начало работы

Постоянная ветка для обучения: academy/stable. Кандидат v5: academy/unified-v5. До ручного merge PR в stable версия v5 не считается опубликованной.

## WSL
Останови старый портал Ctrl+C. Для нового checkout:
    git clone -b academy/stable git@github.com:dneprov808-sudo/devops-lead-lab.git
    cd devops-lead-lab
    sudo apt install git python3 python3-yaml curl bash
    python3 portal.py

Для существующей чистой копии:
    git fetch origin
    git switch academy/stable
    git pull --ff-only
    python3 portal.py

Если локальная stable ещё отсутствует, используй git switch --track origin/academy/stable. Не сбрасывай изменения студента; отдельный checkout предпочтителен для портала. Открой http://127.0.0.1:8080/. Проверка версии: curl -fsS http://127.0.0.1:8080/api/version.

## Учебный цикл
Все технологии — единый каталог. Для LAB-001 используй отдельный checkout, python3 academy.py start --minutes 60, самостоятельное решение и оригинальные тесты. python3 academy.py submit выводит команды ручного commit/push. Передай точный SHA и фактический тестовый вывод Reviewer, затем Examiner. Самооценка не является подтверждённой компетенцией.

Практика и повторения: явная кнопка сохранения в GitHub, отдельная ветка student/practice-results; при неизвестной доставке повторяй тот же ID. Сырые ответы не отправляются. История и повторения загружаются из GitHub вручную. Для Handoff Monitor требуется gh auth login; Git SSH отдельно. Control ref academy/orchestration-v1, Consumer dry-run. См. release/AGENT_SYNC.md. Roadmap/Skill Matrix v5 — предложения, не канонические оценки.

## Проверки
    python3 -m unittest -v test_dx test_portal test_practice_results test_practice_history test_learning_routes test_unified
    node test_frontend.mjs
    node test_practice_frontend.mjs
    node test_learning_frontend.mjs
    node test_hub_frontend.mjs
    node test_hub_smoke.mjs
    node test_unified.mjs
    node --test orchestration/bus/test_*.mjs

Docker только в локальном контексте; запускай профили по очереди. CI платных ресурсов не включать. Не публикуй портал в интернет. Не изменяй STATE, оригинальные тесты или чужие решения.