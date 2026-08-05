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

## 2026-08-03 AI-POT study integration

- The existing Compose app was extended at `/aipot`; no host port, Caddy route, firewall, DNS, or unrelated container was changed.
- Compose mounts the local AI-POT study workspace read-only into the API. The source directory must remain at `/home/cgma/cgma_git/study/aipot/실전모의고사` for deployed source-photo questions and generated mocks to load.
- A new Compose-owned `aipot_history` volume contains personal submitted-attempt JSON state. It is not version-controlled and must not be removed with `down -v`.
- Only the API and frontend services were rebuilt/recreated. Caddy stayed running and healthy on `192.168.219.121:18080`.

## 2026-08-04 AI-POT content and interaction update

- Source OCR and generated visual-prompt assets use the existing read-only AI-POT content mount; no extra network, port, proxy, firewall, DNS, host-service, or container permission was introduced.
- Only API and frontend services were recreated for the content update and answer-drawer scroll correction. Caddy continued running unchanged on `192.168.219.121:18080`.

## 2026-08-04 AI-POT latest-technology rounds

- Five generated sets (11–15) and their visual/data assets were added inside the existing read-only AI-POT study mount. No new service, port, proxy, firewall, DNS, network, or dependency was introduced.
- The API picked up the mounted manifests without a restart. Only the frontend was rebuilt/recreated to replace its static catalog count with the live set count. Caddy and the API remained healthy and unchanged.

## 2026-08-04 AI-POT inline source visual crops

- Fifty-two reviewed diagram/image crops across all five source rounds (38 in Q01–Q35 and 14 in Q36–Q40), including source round 1 Q21, Q18's graph, and the shared Q34–Q35 Google Flow visual, are stored within the existing read-only AI-POT source mount and are served through the already scoped source-asset endpoint. No new storage, network route, port, proxy, dependency, or permission was added. Full source-page images are not served.
- Only the API and frontend Compose services were rebuilt/recreated. Caddy, other services, and the persistent `aipot_history` volume were not modified.

## 2026-08-05 AI-POT evidence-evaluator topology

- The existing `aipot_history` volume now persists a SQLite database as well as legacy history
  migration data. It must continue to be preserved across deployments and must not be removed with
  `down -v`.
- A new internal `aipot-sandbox` service communicates with the API over a named-volume Unix socket.
  It publishes no host or Docker-network port and runs with `network_mode: none`, a read-only root,
  dropped capabilities, bounded process/memory/CPU settings, and a temporary writable `/tmp`.
- The evaluator only becomes operational when `OPENROUTER_API_KEY` is supplied outside version
  control. Without it, practical evaluation fails explicitly; deployment must not represent an
  unavailable evaluator as automatic scoring.
- No existing Caddy route, host port, system service, firewall rule, or unrelated container needs
  to change for this feature.

## 2026-08-05 AI-POT completion-flow promotion

- The completion/retry UI correction required only a frontend image rebuild/recreation. The API,
  Caddy, host binding, and persistent study-data volume remained running and unchanged.
- Post-promotion checks confirmed frontend health and the active `/aipot/solve/generated-mock-01`
  route on `http://192.168.219.130:18080`.
