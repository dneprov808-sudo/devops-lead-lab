#!/usr/bin/env bash
# Start a disposable local network namespace, never mutate host routing/firewall.
set -euo pipefail
here="$(cd -- "$(dirname -- "$0")" && pwd)"
[[ "${1:-}" == "--confirm-local-lab" ]] || { echo "Usage: bash sandbox.sh --confirm-local-lab"; exit 2; }
export ACADEMY_PARENT_NET="$(readlink /proc/self/ns/net)"
export ACADEMY_WORK="$(mktemp -d -t academy-v12-linux.XXXXXX)"
export ACADEMY_LINUX_ROOT="$here"
echo "Evidence directory: $ACADEMY_WORK"
unshare --user --map-root-user --net --fork bash --noprofile --norc -c '
set -e
[[ "$(readlink /proc/self/ns/net)" != "$ACADEMY_PARENT_NET" ]] || exit 2
ip link set lo up
ip link add academy0 type dummy
ip addr add 192.0.2.10/32 dev academy0
ip link set academy0 up
ip route add 198.51.100.0/25 dev academy0
cd "$ACADEMY_WORK"
cp "$ACADEMY_LINUX_ROOT/hosts.starter" hosts
echo "Isolated network namespace; inspect README and verify.py; exit to destroy network."
exec bash --noprofile --norc
'
