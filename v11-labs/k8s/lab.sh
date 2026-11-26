#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
cfg="$PWD/academy-v11.kubeconfig"
[[ -z "${DOCKER_HOST:-}" && -z "${DOCKER_CONTEXT:-}" ]] || { echo "Use explicitly verified local Docker context"; exit 2; }
[[ "$(docker context inspect "$(docker context show)" --format '{{.Endpoints.docker.Host}}')" == unix://* ]] || { echo "Not a local Unix socket"; exit 2; }
if [[ "${1:-}" == create ]]; then
  [[ ! -e "$cfg" ]] || { echo "Kubeconfig exists; reconcile manually"; exit 2; }
  kind create cluster --name academy-v11 --kubeconfig "$cfg"
  chmod 600 "$cfg"
  exit
fi
[[ -f "$cfg" ]] || { echo "Missing dedicated kubeconfig"; exit 2; }
k=(kubectl --kubeconfig "$cfg" --context kind-academy-v11)
endpoint="$("${k[@]}" config view --minify -o jsonpath='{.clusters[0].cluster.server}')"
[[ "$endpoint" == https://127.0.0.1:* ]] || { echo "Unexpected API endpoint"; exit 2; }
case "${1:-}" in
 install) helm --kubeconfig "$cfg" --kube-context kind-academy-v11 upgrade --install academy-v11 ./chart -n academy-v11 --create-namespace --wait --timeout 2m ;;
 fault) "${k[@]}" -n academy-v11 set image deployment/academy-v11-api api=nginx:academy-v11-intentionally-invalid ;;
 verify) python3 verify.py ;;
 diff) helm template academy-v11 ./chart -n academy-v11 | "${k[@]}" -n academy-v11 diff -f - ;;
 *) echo "Usage: bash lab.sh create|install|fault|verify|diff"; exit 2 ;;
esac
