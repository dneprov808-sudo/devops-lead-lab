# CI/CD Engineering Lab
Use a fresh disposable workspace; no production deployment. Python 3.12+, local Trivy/pip-audit for security stage. Direct local practice:
```bash
python3 -m unittest test_pipeline_v12 -v
python3 v12-labs/cicd/pipeline.py build v12-labs/cicd/source.json bundle
python3 v12-labs/cicd/pipeline.py verify bundle
python3 v12-labs/cicd/pipeline.py promote bundle promoted-bundle REVIEWED_SHA256
```
Tamper with an expendable copy and show verification fails; never re-build on promotion. Rollback selects an older reviewed artifact with its exact digest; no real environment mutation. GitLab CI file is under lab directory, does not activate root CI. Use a private local GitLab instance (free CE) and dedicated disposable runner tagged academy-local, not a privileged runner or shared production host. Jenkinsfile is for a dedicated local controller/agent, with Pipeline + Workspace Cleanup plugins, no Docker socket or production credentials; specify script path v12-labs/cicd/Jenkinsfile. Clean fresh checkout/workspace before build. Supply reviewed SHA manually; no default approval. Run on local engines only after checking the actual runner and permissions. Live Jenkins/GitLab integration, installation and pipeline verification pending. Existing CI-ACC-01 remains unchanged, this separate worked artifact example teaches promotion identity rather than solves the original CLI exercise.
