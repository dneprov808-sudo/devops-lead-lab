# ACADEMY-009 — verification report

Preflight: canonical STATE revision 1, LAB-001 assigned; blob 978cd9cd6a929c7abad3776c705d9ccca3a49800. Base portal head 70d39d0b523a2fcfa9b83d33ba48f68da7478cb1. PR #11 already merged before this task; no merge performed here. Existing open issue search empty.

Executed in local Python container on copies verified against actual Git blob SHA:
- portal.py c01f7304c6031cc6d3bb44c34ea11565a7a2e1a0, academy.py 270154fa88ecfbaea6a4a5a777542eb7e3f3d3a2, test_portal.py c911a8a1ee3a572d1912d03539da795c5e350c7e: 15/15 prior portal tests PASS.
- practice_results.py 2aeb40c048eb26a1996fc6141c68adcd94dcaaff, test_practice_results.py da5a490c7b744329c26f554b3827eed40b209994: 9/9 PASS. Actual local Git bare-remote commits, push and read-back; same-attempt retry; conflict, rejected push, wrong origin, invalid payload, prior result preservation; unrelated staged file and HEAD unchanged. Real HTTP with CSRF and forged lab-test rejection; route test mocks save function while Git integration independently executes it. No actual write to student/practice-results on GitHub.
- Real LAB-001 placeholder run: exit 1, Ran 8 tests, server produced local_test_only metadata; expected failure. No solution revealed.
- Frontend: 7 existing + 6 additional static/logic JS checks PASS in JS execution environment using fetched actual app/practice JS and HTML/catalog. No full browser E2E.
- Four YAML files parsed with PyYAML. Compose profile/service count, dependency/volume references, loopback ports verified; byte SHA comparison against repository. This is NOT docker compose config or running Docker. Docker unavailable in test container.
- NOT TESTED: actual WSL GitHub push with user credentials, full browser UX, images/build/start, Kafka runtime, PostgreSQL behavior, Patroni failover/DCS, Redis, Nginx and observability services. All modules are supplementary, not completed by student.
No change to canonical state, no automation change, no paid API/Codex/cloud or merge.
