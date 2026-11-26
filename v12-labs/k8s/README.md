# Kubernetes Advanced Labs (20 separate exercises)
Use the existing dedicated kind-academy-v11 cluster and kubeconfig, never current default kubectl context. Each lab creates its own namespace; setup refuses an existing namespace. Do not apply these intentionally defective fixtures to real infrastructure. The catalog specifies task, prerequisites and observable acceptance; it does not contain corrected manifests.
```bash
python v12-labs/k8s/lab.py list
python v12-labs/k8s/lab.py setup KADV-01 --confirm-local-lab
# Diagnose and fix only that namespace independently.
python v12-labs/k8s/lab.py verify KADV-01 --confirm-local-lab
```
Read catalog.json for each namespace, task and prerequisites. Use the explicit kubeconfig and context from v11 for your own kubectl commands. NetworkPolicy requires enforcing CNI; CSI, HPA, multi-node scheduling and Argo require additional prepared dependencies. These are BLOCKED without those dependencies, not automatically passed. Some immutable resources need recreation within the exercise namespace; student decides. Verify waits are not built in: wait for reconciliation then rerun. Cleanup only the exact lab namespace after preserving evidence. Argo case manual sync, no prune, no automatic credentials. etcd case read-only, not HA or destructive testing. Live cluster not available in author environment.
Reference: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ ; https://kubernetes.io/docs/concepts/services-networking/network-policies/ .
