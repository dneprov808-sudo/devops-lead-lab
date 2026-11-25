# LAB-001 — HTTP reliability probe
Время: 2–3 часа. Ubuntu/WSL, Bash, curl, Python 3. Без root и внешних сервисов.
Реализуй healthcheck.sh самостоятельно. Интерфейс: bash healthcheck.sh URL
Ровно одна строка stdout: HEALTHY (exit 0) только HTTP 200; HTTP_ERROR (exit 1) любой другой HTTP статус; NETWORK_ERROR (exit 2) отказ соединения или DNS; TIMEOUT (exit 3) превышение времени; USAGE_ERROR (exit 4) отсутствующий или лишний аргумент. Диагностика допускается в stderr. Лимит HTTP-запроса 2 секунды, без повторов и переходов по redirect. Не отключай TLS-проверку. Не изменяй тесты.
Запуск: python3 test_healthcheck.py
Ручной стенд: python3 server.py (порт 18080 на localhost); в другом терминале curl -i http://127.0.0.1:18080/ok
После решения заполни REPORT.md. Зафиксируй время, диагностику через ss/curl, причины 503, timeout и connection refused, ограничения проверки и проект улучшения для 1000 endpoints. Отдельно объясни readiness vs liveness.
Документация: https://curl.se/docs/manpage.html ; https://www.gnu.org/software/bash/manual/ ; https://docs.python.org/3/library/http.server.html
