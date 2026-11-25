# Academy DX v1 — начни здесь

1. В ChatGPT, проект «Учеба», напиши: «Академия: старт 20/60/120» (выбери одно число). Этот чат — Dashboard. Он читает канонический STATE и показывает один следующий шаг. Команды и правила: dx/CHAT.md.
2. В WSL Ubuntu из домашней директории:
   ```bash
   git clone -b academy/dx-v1 https://github.com/dneprov808-sudo/devops-lead-lab.git
   cd devops-lead-lab
   python3 academy.py setup
   python3 academy.py start --minutes 60
   ```
   Если git/Python/YAML отсутствуют: sudo apt update && sudo apt install git python3 python3-yaml curl bash. Приватный репозиторий требует уже настроенного Git-доступа (SSH или HTTPS с credential manager); токен не вставлять в URL. При существующем клоне не клонировать повторно и не перетирать изменения; сначала git status, затем согласовать переход на ветку DX. CLI поддерживает только LAB-001; новые задания требуют нового адаптера. Ветки: canonical academy/orchestration-v1, учебная спецификация training/lead-cohort-01, DX academy/dx-v1, решение student/lab-001. Не merge.
3. Редактируй healthcheck.sh и REPORT.md в labs/01-http-probe. Для локального стенда отдельно запусти python3 academy.py serve; Ctrl-C останавливает сервер. Тесты самостоятельно поднимают свой сервер.
4. python3 academy.py test — оригинальные тесты, exit code передаётся вызывающему процессу. Заглушка ожидаемо не пройдёт. python3 academy.py report — путь к существующему шаблону. python3 academy.py submit — тесты и команды для ручной отправки; никогда не делает commit/push.
5. После ручного commit/push: «Академия: ревью» + точный SHA и фактический вывод тестов. После ревью: «Академия: экзамен». Orchestrator в 22:00 МСК собирает отчёт, но не меняет STATE. Переходы только после ручного утверждения.
6. CI уже описан в .github/workflows/academy-ci.yml. По умолчанию job не запускается без repository variable ACADEMY_CI_ENABLED=true. Включать только после проверки оставшихся бесплатных минут и жёсткого ограничения расходов в Billing (если невозможно установить запрет платного перерасхода, оставить выключенным). Settings > Secrets and variables > Actions > Variables. При включении push в student/lab-001 с изменениями lab/CLI/workflow запускает проверку. Проверяй SHA и лог в Actions. Не менять тесты, workflow или CLI в студенческом решении. CI — не замена ревью. Не использовать secrets. Изменения в незнакомом коде не запускать. 
