# Linux & Networking Practical Pro
Use an expendable Linux VM/WSL, with iproute2, util-linux, nftables, tcpdump, dnsutils, dnsmasq, openssl and Python installed. User namespace creation may be disabled: stop rather than bypass isolation. Network fixtures never touch host route table or firewall. No production addresses or credentials.
```bash
bash v12-labs/linux/sandbox.sh --confirm-local-lab
python "$ACADEMY_LINUX_ROOT/verify.py" route
```
Five live network exercises (do not inspect other people's solutions):
- LNX-01: route to 198.51.100.200 fails. Keep academy0 and address 192.0.2.10, fix route covering requested address; verifier inspects actual route.
- LNX-02: hosts fixture resolves api.academy.test incorrectly. Start dnsmasq in this namespace only on 127.0.0.1:15353, no upstream DNS, use edited hosts file; prove dig returns 192.0.2.10.
- LNX-03: run two Python HTTP servers on 127.0.0.1:18080/18081 in this namespace. Construct nft table named academy, allow 18080 and deny 18081; verifier requires both listeners and checks actual connect result.
- LNX-04: generate synthetic local CA/server certificate files ca.pem/server.pem in $ACADEMY_WORK; verification must succeed for api.academy.test. Explain SAN, trust and expiry; no real private keys or external certificate.
- LNX-05: capture local HTTP session on loopback to trace.pcap using tcpdump, identify SYN/SYN-ACK, verify capture. Keep capture local.
For each case: python "$ACADEMY_LINUX_ROOT/verify.py" dns|firewall|tls|capture. Exit destroys namespace; evidence directory remains. Background processes must be terminated before exit. No host packet capture.
Three additional VM exercises:
- LNX-06: inspect /proc/self/cgroup and /sys/fs/cgroup/cgroup.controllers; in a disposable VM only, use a delegated user service/scope with MemoryMax and CPUQuota; verify cgroup membership, memory.max and cpu.max, record before/after. Do not edit host cgroup tree.
- LNX-07: inspect starter.service with systemd-analyze verify, correct independently in a disposable VM, start only an isolated user service; show active state, MainPID, logs, and clean stop. Never install this unit into production systemd.
- LNX-08: diagnose bounded CPU/memory load on a disposable VM, use pidstat/vmstat/ps and /proc/<pid>; distinguish CPU contention from I/O and memory pressure; record evidence and stop test process. Manual review, not automatic competency.
Five live verifier cases, three manual VM cases. Not run in author environment.
