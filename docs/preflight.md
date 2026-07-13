# Deployment Preflight

Captured: 2026-07-10T22:25:41+09:00

## Host and access

- OS: Ubuntu 24.04.4 LTS; kernel `6.8.0-124-generic`; architecture `x86_64`.
- User: `cgma` (uid 1000), a member of the `sudo` and `docker` groups.
- Non-interactive sudo: unavailable (`sudo: a password is required`). No privileged host mutation will be attempted without an already-authorized non-interactive path.
- Disk: 326 GiB free on `/`; inode usage 7%; available memory approximately 12 GiB; swap approximately 3.3 GiB free.

## Repository preservation

- Git root: `/home/cgma/cgma_git`; branch: `master`; HEAD: `79e00911b91aa80d8ce83e704a7313ad7eb7aa85`.
- This project directory initially contained only the four supplied planning/input files.
- The enclosing repository already has unrelated modified, deleted, and untracked files outside this project directory. They are preserved and excluded from this task's change set.
- Git identity is configured as `cgma <caggun1210@gmail.com>`.

## Available tooling

- Node.js `v24.16.0`, pnpm `11.5.2`, Python `3.13.5`, and uv `0.11.7` are installed.
- Docker `29.6.1` and Docker Compose `v5.3.1` are installed and usable by the current user.
- No local Playwright browser cache was found at preflight time.

## Existing containers and services

- Existing Docker containers include n8n, PostgreSQL, Redis, MCP support containers, and an unrelated restarting MSSQL container. They will not be stopped, removed, or modified.
- Existing Docker networks and volumes are preserved; this application will use its own Compose project/network.
- Caddy is an active system service (`/usr/bin/caddy run --config /etc/caddy/Caddyfile`) and currently owns host ports 80 and 443.
- Existing Caddy routes are `code.heybobma.dedyn.io -> localhost:8080` and `n8n.heybobma.dedyn.io -> localhost:5678`; its configuration path is `/etc/caddy/Caddyfile`.
- Existing listeners also include SSH on 22, SMB on 139/445, PostgreSQL on 5432/5433, n8n on 5678, and local services on 8080, 2019, and 18789.

## Network and firewall observations

- LAN IPv4: `192.168.219.121/24`; observed public IPv4: `115.137.9.228`.
- The different LAN and observed public addresses indicate NAT is likely. No domain was supplied, so DNS A/AAAA lookup and managed TLS issuance are not applicable.
- Host firewall inspection could not be completed without sudo: `ufw`, `nft`, and `iptables` all returned permission errors. No firewall rules have been changed.
- Cloud firewall mutation is explicitly unauthorized in `deployment-inputs.env`.

## Deployment decision baseline

- Standard 80/443 deployment is unavailable because those ports are already used by the existing Caddy service, which must be preserved.
- Existing-proxy integration is preferred by policy, but changing `/etc/caddy/Caddyfile` requires privileged access that is not available non-interactively. The first safe fallback is a dedicated high-port bundled ingress.
- The final selected port, container state, verification results, and any manual proxy/firewall commands are recorded in `docs/deployment-report.md` and `docs/skipped-actions.md`.

## Backups and mutation notes

- No existing application configuration, proxy file, firewall rule, container, network, or volume has been modified during preflight.
- `/etc/caddy/Caddyfile` was read only. Since no proxy change is made, no proxy backup is required for this run.

## 2026-07-12 improvement-pass revalidation

- The original `overnight-web-agent-kit` Docker project remained running and healthy on host port 18080 throughout this review; it was not stopped, rebuilt, or restarted.
- The first next available fallback port, 18081, was used only by a separate `overnight-web-agent-kit-review` Compose project. Its API, frontend, and Caddy containers were health-checked successfully.
- No existing Caddy route, port 80/443 listener, host firewall rule, cloud firewall rule, DNS record, NAT rule, unrelated container, network, or volume was changed.
- At the time of this revalidation, the review deployment was intentionally treated as LAN-only. A new public port-forwarding or firewall rule would have been unsafe before a domain/TLS and authentication decision.
- Docker was available without sudo. Normal container Corepack download attempts timed out; the frontend Dockerfile was changed to install the exact pnpm version with npm retry support, after which the host-network Docker build completed.
- After the isolated verification passed, the user explicitly requested a service restart. The verified images were tagged for the main Compose project, and only that project's API, frontend, and Caddy containers were recreated on port 18080. All three reported healthy; system Caddy and unrelated services were untouched.

## 2026-07-13 access-status addendum

- After the original preflight/revalidation, the operator reported successful access to the deployed service over 5G with Wi-Fi disabled.
- The service must therefore be treated as publicly reachable plain HTTP, not LAN-only. This is an operator-reported manual observation; the workspace did not run a separate external-network probe after the report.
- No router, firewall, DNS, proxy, TLS, or authentication setting was changed as part of recording this status. The required hardening path and exact verification commands remain in `docs/skipped-actions.md`.

## 2026-07-13 Cloudflare-ready relocation

- The project was moved from `/home/cgma/cgma_git/project/web_service/overnight-web-agent-kit` to `/home/cgma/apps/web_service` and started from the new path.
- Only the `overnight-web-agent-kit` Compose project's API, frontend, and Caddy containers were recreated. All reported healthy, and the readiness and metadata endpoints returned 200.
- The new Compose default binds Caddy to `127.0.0.1:18080`; `ss -ltn 'sport = :18080'` confirmed that no direct LAN/public listener remains.
- `compose.cloudflare.yaml` adds an optional Cloudflare Tunnel container that reaches Caddy on Docker's internal network. The external tunnel was not started because its token and public hostname are absent.

## 2026-07-13 local LAN access restoration

- The operator requested direct access from `http://192.168.219.121:18080/settings`. The local ignored `.env` now sets `HOST_BIND_ADDRESS=192.168.219.121`.
- Only the main Compose project's containers were recreated. API, frontend, and Caddy all became healthy; the LAN `/settings` route returned 200 and exposed the Settings page heading.
- `ss -ltn 'sport = :18080'` now reports `192.168.219.121:18080`. Loopback is intentionally not a listener in this mode. Before starting the Cloudflare Tunnel profile, return the local setting to `127.0.0.1`.
