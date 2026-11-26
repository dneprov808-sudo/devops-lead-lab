# K8s Practical Pro — rollout/drift lab (supplementary, not LAB-001)
Requires local Docker, kind, kubectl, Helm 3, Python. Check versions and free capacity; choose a dedicated cluster only.
  cd v11-labs/k8s
  bash lab.sh create
  bash lab.sh install
  bash lab.sh verify
  bash lab.sh fault
Task: independently diagnose stalled rollout and recover desired state without changing original verifier. Preserve availability and capture events, generation, image, endpoints, HTTP result and timeline. Use bash lab.sh diff to compare Helm-rendered desired state to actual state (exit 1 means difference). No solution is supplied. The diff is a GitOps concept exercise, not a running Argo CD controller.
Optional actual Argo CD: install an explicitly version-pinned official manifest in this dedicated cluster only after review. app.yaml is a manual-sync application pointing to the private repo on academy/stable after merge; configure read-only repository access manually, never commit credentials. Verify application health, diff, drift, controlled sync. No auto-sync or prune. Live verification pending.
Delete only your dedicated lab cluster manually: kind delete cluster --name academy-v11 (destroys lab state). Kubeconfig not tracked.
References: https://kind.sigs.k8s.io/docs/user/quick-start/ ; https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ ; https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
