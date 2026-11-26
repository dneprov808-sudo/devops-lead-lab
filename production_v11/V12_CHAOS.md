# Chaos Center v12
30 distinct scenario specifications: 15 allowlisted single-service stop/recovery drills, 1 bounded load drill, 14 manual isolated exercises. The first 16 reuse the production v12 script; this is not autonomous hidden fault injection (the script restores the service in finally). Operator runs only after dedicated local stack baseline. Learner should see the public symptoms and success criteria, not instructor target. The repository is readable, so do not inspect operator mapping during independent practice.
```bash
python production_v11/chaos_v12.py CHAOS-001
python production_v11/chaos_v12.py CHAOS-001 --inject-and-verify --confirm-local-lab
```
Manual cases require actual lab-specific setup, safe fault injection and evidence; never treat a written RCA as runtime pass. Record: UTC timeline, hypotheses, baseline, observed impact, evidence, mitigation, recovery check, confirmed IDs and unknown outcomes, measured elapsed time and observed loss count. No destructive faults, volume deletion, production connections, or simultaneous stop. Current stop tests verify acknowledged data and drain after restart; quorum/role/SLI-specific checks need separate evidence. All runtime scenarios unexecuted by author.
