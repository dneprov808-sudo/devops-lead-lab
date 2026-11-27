# Academy private VPS delivery — ACADEMY-V13-DEPLOY-01

Owner-reviewed setup for a dedicated educational VPS. No credentials, SSH login for agents, sudo, Docker, public deployment workflow, or self-hosted GitHub runner. The public repository can be read without authentication. The website itself should initially be served only on loopback or a private VPN; access control and TLS are separate owner decisions. Public GitHub content remains publicly readable regardless of Nginx protection.

## Prerequisites (do not enable until all pass)

- CI bootstrap PR #43 merged manually and academy/stable push workflow Academy Release CI / academy-release-gate succeeds.
- Ruleset enforces successful academy-release-gate and up-to-date branch before merging; verify no unintended write collaborators/apps.
- Review this PR and merge manually. Verify native unit tests and CI. Review and install exact merged deployment files, never curl | sudo.
- Debian/Ubuntu with systemd, Python 3, git, CA certificates. Outbound HTTPS/DNS to github.com and api.github.com. Existing Nginx and port allocation inspected by owner.

## One-time bootstrap

Run as owner/administrator on the dedicated educational server only:

```sh
sudo useradd --system --user-group --create-home --home-dir /var/lib/academy-deploy --shell /usr/sbin/nologin academy-deploy
sudo install -d -o academy-deploy -g academy-deploy -m 0755 /srv/academy
sudo apt-get update
sudo apt-get install -y git python3 ca-certificates
```

If account/path already exist, inspect them instead of replacing or recursively changing ownership. No password, SSH authorized_keys, sudo, docker or extra groups. Clone reviewed stable to an administrator-controlled checkout, verify the exact reviewed commit, then from that checkout:

```sh
sudo install -d -m 0755 /usr/local/libexec
sudo install -o root -g root -m 0644 deploy/pull_deploy.py /usr/local/libexec/academy-pull-deploy.py
sudo install -o root -g root -m 0644 deploy/academy-deploy.service /etc/systemd/system/academy-deploy.service
sudo install -o root -g root -m 0644 deploy/academy-deploy.timer /etc/systemd/system/academy-deploy.timer
sudo systemd-analyze verify /etc/systemd/system/academy-deploy.service /etc/systemd/system/academy-deploy.timer
sudo systemctl daemon-reload
sudo systemctl start academy-deploy.service
sudo journalctl -u academy-deploy.service -n 40 --no-pager
readlink /srv/academy/current
```

Enable timer only after a successful DEPLOYED result, validation of current manifest and website smoke test:

```sh
sudo systemctl enable --now academy-deploy.timer
systemctl list-timers academy-deploy.timer
```

Nginx must serve ONLY /srv/academy/current, not /srv/academy or a Git checkout. Example for a separate loopback-only listener (check port availability first; do not replace existing vhosts):

```nginx
server {
    listen 127.0.0.1:8090;
    server_name localhost;
    root /srv/academy/current;
    index index.html;
    autoindex off;
    location / {
        try_files $uri $uri/ =404;
    }
}
```

Administrator validates nginx -t before reload. For remote browser use existing private VPN or SSH local port forwarding as the owner's existing admin account; if a public HTTPS domain is wanted, separately configure DNS/TLS/authentication and firewall. Do not expose a cleartext password-protected site publicly.

## Deployment policy

On each timer tick, fetch exact remote stable SHA. If current is already that SHA, verify its file digests and return. Otherwise require latest successful push run for exact stable commit from the expected workflow and repo, and the named successful job. Query unauthenticated public API, fail closed on network/rate-limit/API problems. Fetch that exact commit, check pinned Git blob IDs for builder and CI workflow, build with standard library only, validate exact static file allowlist and manifest SHA-256, recheck current remote head and CI run, atomically switch current symlink. The previous release is retained. No portal execution, no running repo JS, no infrastructure laboratory startup. Systemd sandbox restricts writes to /srv/academy and private temporary directory, drops capabilities and blocks privilege escalation; not a VM isolation boundary.

The pinned workflow/builder blob IDs correspond to PR #43 workflow and stable builder at preparation time. If either changes, deployment blocks until the owner reviews and reinstalls an updated root-owned helper. No silent control-plane updates. Cap retention at 20 releases, requiring manual review of old releases. Manifest digests establish local integrity, not independent signing of artifacts; server rebuilds from the CI-approved commit. A failed or interrupted build does not activate a new release. A no-change tick does not re-query CI; owner may pause timer immediately if a published release must be withdrawn.

## Rollback

Stop timer and service, inspect /srv/academy/releases, select a previously verified exact SHA (do not use untrusted shell substitution). Validate its manifest and files, then owner switches symlink atomically as academy-deploy. Keep timer stopped until the stable branch is fixed via reviewed revert PR and CI succeeds, otherwise latest stable may be redeployed. Never force-push or delete all releases.

## Evidence and limitations

Unit tests: python3 -m unittest -v test_pull_deploy. Test against fixture directories without networking. Actual VPS and systemd acceptance must be performed by owner. No server connection or credentials used in authoring. No public listener provisioned. Control STATE and student LAB-001 remain untouched.

References:
- https://docs.github.com/en/rest/actions/workflow-runs
- https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
