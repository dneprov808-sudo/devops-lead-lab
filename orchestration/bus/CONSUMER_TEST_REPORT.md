# ACADEMY-006 — verification
- Preflight read six canonical files, bus source and current LAB-001 specification.
- Canonical commit: 5c7b1fe7a3c42ccc9478b4b80a2c7c6e5c82fd8f.
- STATE blob before and after collection: 978cd9cd6a929c7abad3776c705d9ccca3a49800; revision 1; LAB-001 assigned.
- 24/24 consumer pure-function tests passed in JS runtime with actual canonical bus parser; implementation and test file read back equal to submitted source.
- Live connector dry-run: repo search and recent list independently returned same five issue IDs 2,4,5,6,7; all individually hydrated. Live: zero messages, five ignored, zero proposals, zero writes. Test channel: five test_only, zero proposals, zero writes. No synthetic payload counted as learner evidence.
- Schedule creation attempted: error too_many_active_automations, current_count=5, plan_limit=5. No automation created, paused or modified. Deployment instructions saved separately.
- NOT TESTED: actual scheduled consumer execution; real live message carrying independently verified evidence; local Node CLI invocation; concurrency with remote writes. Current tests include synthetic competing proposals and state-change rejection, not distributed transaction testing.
- Result: partial; code and read-only collection passed, activation blocked by account capacity.
