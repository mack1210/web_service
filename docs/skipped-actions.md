# Skipped or Deferred Actions

Reviewed: 2026-07-12 (Asia/Seoul)

Each entry records the attempted step, observed result, reason for not proceeding, impact, and exact follow-up verification. None of these items stopped application development, test execution, Docker packaging, or the isolated review deployment. An earlier deployment was reported reachable over 5G on 2026-07-13; after relocation to `/home/cgma/apps/web_service`, the Compose origin was recreated as loopback-only and Cloudflare Tunnel activation became the public-access path.

## 1. Existing reverse-proxy route, public DNS, TLS, and authentication

**Attempted**: Read the existing system Caddy state and evaluate promotion from the high-port fallback to 80/443.

**Evidence / error**: System Caddy already owns ports 80/443 and serves unrelated routes. `DOMAIN` is empty. Non-interactive `sudo -n true` requires a password. The application currently has no authentication/authorization flow.

**Why skipped**: Replacing, restarting, or editing an unrelated reverse proxy would violate the preservation rule. More importantly, choosing an identity mechanism changes product authentication behavior and cannot be inferred.

**Impact**: The earlier `:18080` origin was reported publicly reachable over 5G, but the current origin binds only `127.0.0.1:18080`. Do not restore direct public forwarding or put sensitive data on the service. A Cloudflare hostname/TLS path and identity boundary remain required before normal public use.

**Exact follow-up (after choosing a domain and authentication design)**:

```bash
export DOMAIN='app.example.com'
export UPSTREAM_PORT=18080

# Back up and inspect before changing only the new route.
sudo cp -a /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.backup.$(date +%Y%m%d-%H%M%S)"
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

# Add a new ${DOMAIN} route that reverse-proxies only to 127.0.0.1:${UPSTREAM_PORT}
# and implements the approved authentication mechanism. Do not copy a credential
# from this repository and do not change existing Caddy routes.
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
```

**Verification after completion**:

```bash
dig +short A "$DOMAIN" @1.1.1.1
curl --fail --show-error --max-time 15 "https://${DOMAIN}/health/ready"
curl --fail --show-error --max-time 15 "https://${DOMAIN}/api/v1/meta"
curl --silent --show-error --head "https://${DOMAIN}/" | rg -i 'strict-transport-security|x-content-type-options|referrer-policy'
sudo systemctl status caddy --no-pager
```

## 2. Host firewall and router/NAT public forwarding

**Attempted**: Original high-port self-probe and firewall inspection during preflight; later, the operator accessed the deployed URL over 5G with Wi-Fi disabled. The service was subsequently recreated with a loopback-only bind.

**Evidence / error**: The host has LAN address `192.168.219.121` and observed public address `115.137.9.228`, indicating NAT. Non-interactive sudo is unavailable; cloud-firewall changes are unauthorized. An earlier self-probe to the public high port did not connect, while the operator later reported a successful 5G browser access. The latter has not been independently re-probed by this workspace.

**Why skipped**: The review determined public plain HTTP without authentication is a P1 security risk. Further opening, forwarding, or modifying firewall/NAT state would increase the risk and is outside the approved safe deployment work.

**Impact**: Direct external reachability is no longer expected from the current loopback-only bind. The service is not secure for sensitive use, and Cloudflare public activation remains blocked until the TLS/identity work and token/hostname setup are complete.

**Exact safe verification commands**:

```bash
curl --fail --show-error http://127.0.0.1:18080/health/ready
curl --fail --show-error http://192.168.219.121:18080/health/ready
curl --fail --show-error --max-time 15 http://115.137.9.228:18080/health/ready
ss -ltn 'sport = :18080'
```

Run the public-IP command from a network that is not the service LAN (for example 5G with Wi-Fi disabled). Do not run a public NAT/firewall opening command until the TLS and identity step above is complete.

## 3. Guaranteed HTTP 404 status for dynamic missing details

**Attempted**: Added a server-side existence check with `notFound()` before rendering the detail client component.

**Evidence / error**: The browser receives and renders the recoverable “We could not find that item” state; E2E passes. In the current Next 16 dynamic streaming response, `curl -I http://127.0.0.1:18080/items/missing` still returns 200 and the RSC stream contains `NEXT_HTTP_ERROR_FALLBACK;404`.

**Why deferred**: A public, indexable 404 requires a route/rendering architecture that can decide before the shell streams. The current site is intentionally no-index and the visible recovery is correct; replacing routing behavior would be disproportionate without a public SEO decision.

**Impact**: Public SEO/crawler use must not rely on a strict HTTP 404 for unknown item IDs yet.

**Verification command**:

```bash
curl --silent --show-error --head http://127.0.0.1:18080/items/missing
curl --silent --show-error http://127.0.0.1:18080/items/missing | rg 'NEXT_HTTP_ERROR_FALLBACK;404'
```

## 4. WebKit/Safari and Lighthouse coverage

**Attempted**: Chromium was run through the available Playwright container. A local browser package was not installed for WebKit; Lighthouse is not an existing project dependency.

**Why skipped**: The browser/dependency is absent. Adding a new auditing dependency requires an explicit dependency decision.

**Impact**: Chromium desktop/mobile coverage is strong, but Safari behavior and a Lighthouse score are not claimed.

**Exact commands after approval/installation**:

```bash
cd /home/cgma/cgma_git/project/web_service/overnight-web-agent-kit/frontend
pnpm exec playwright install webkit chromium
PLAYWRIGHT_BASE_URL=http://127.0.0.1:18080 pnpm test:e2e --project=webkit
pnpm dlx lighthouse http://127.0.0.1:18080/ --output html --output-path ../artifacts/lighthouse-review.html
```

## 5. Public SEO, localization, privacy, and ads decisions

**Attempted**: Code and runtime inventory for public metadata, ads, analytics, consent, and language handling.

**Evidence**: No domain/canonical URL, organization/contact/legal content, publisher/ad identifiers, consent manager, analytics script, or localization policy is present. The UI is English with intentionally bilingual sample fixtures.

**Why deferred**: These require product/legal/brand choices. The review deliberately uses `noindex, nofollow` and a disallowing robots route instead of fabricating public claims, consent text, or ads.

**Impact**: The app is not ready for public SEO or Google monetization. No production ad code was inserted.

**Verification after a product decision**:

```bash
curl --silent --show-error http://127.0.0.1:18080/robots.txt
curl --silent --show-error http://127.0.0.1:18080/ | rg -i 'canonical|description|robots'
pnpm --dir frontend audit
```

## 6. Cloudflare public hostname activation

**Attempted**: Added `compose.cloudflare.yaml`, a loopback-only production-origin default, and documented build/deploy/verification commands for a remotely managed Cloudflare Tunnel.

**Evidence / error**: No Cloudflare account session, tunnel token, or approved public hostname is present in the workspace. The `.env` file is intentionally absent and ignored by Git.

**Why skipped**: Creating a public hostname, assigning DNS, and supplying a tunnel token are external account actions. The token is a secret and must not be placed in the repository.

**Impact**: The application can be built and started safely on `127.0.0.1:18080`, but Cloudflare public HTTPS cannot be claimed until an operator creates the tunnel and supplies the secret outside Git.

**Exact build and deploy commands (after setting the token in an untracked `.env`)**:

```bash
cd /home/cgma/apps/web_service
HOST_BIND_ADDRESS=127.0.0.1 HOST_PORT=18080 \
  docker compose -f compose.yaml -f compose.prod.yaml -f compose.cloudflare.yaml \
  --profile production --profile cloudflare build
HOST_BIND_ADDRESS=127.0.0.1 HOST_PORT=18080 \
  docker compose -f compose.yaml -f compose.prod.yaml -f compose.cloudflare.yaml \
  --profile production --profile cloudflare up -d --wait
```

**Verification after completion**:

```bash
curl --fail --show-error http://127.0.0.1:18080/health/ready
curl --fail --show-error --max-time 15 https://app.example.com/health/ready
docker compose -f compose.yaml -f compose.prod.yaml -f compose.cloudflare.yaml \
  --profile production --profile cloudflare ps
```
