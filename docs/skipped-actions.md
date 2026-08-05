# Skipped or Deferred Actions

Reviewed: 2026-07-12 (Asia/Seoul)

Each entry records the attempted step, observed result, reason for not proceeding, impact, and exact follow-up verification. None of these items stopped application development, test execution, Docker packaging, or the isolated review deployment. An earlier deployment was reported reachable over 5G on 2026-07-13; after relocation to `/home/cgma/apps/web_service`, the operator requested the Compose origin be LAN-bound at `192.168.219.121:18080`. Cloudflare Tunnel activation remains the intended public-HTTPS path.

## 1. Existing reverse-proxy route, public DNS, TLS, and authentication

**Attempted**: Read the existing system Caddy state and evaluate promotion from the high-port fallback to 80/443.

**Evidence / error**: System Caddy already owns ports 80/443 and serves unrelated routes. `DOMAIN` is empty. Non-interactive `sudo -n true` requires a password. The application currently has no authentication/authorization flow.

**Why skipped**: Replacing, restarting, or editing an unrelated reverse proxy would violate the preservation rule. More importantly, choosing an identity mechanism changes product authentication behavior and cannot be inferred.

**Impact**: The earlier `:18080` origin was reported publicly reachable over 5G, and the current origin binds the requested LAN IP. Do not add direct public forwarding or put sensitive data on the service. A Cloudflare hostname/TLS path and identity boundary remain required before normal public use.

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

**Attempted**: Original high-port self-probe and firewall inspection during preflight; later, the operator accessed the deployed URL over 5G with Wi-Fi disabled. The service was subsequently recreated with a LAN-only bind at the operator's request.

**Evidence / error**: The host has LAN address `192.168.219.121` and observed public address `115.137.9.228`, indicating NAT. Non-interactive sudo is unavailable; cloud-firewall changes are unauthorized. An earlier self-probe to the public high port did not connect, while the operator later reported a successful 5G browser access. The latter has not been independently re-probed by this workspace.

**Why skipped**: The review determined public plain HTTP without authentication is a P1 security risk. Further opening, forwarding, or modifying firewall/NAT state would increase the risk and is outside the approved safe deployment work.

**Impact**: Direct LAN reachability is expected from the current bind, but public 5G reachability was not re-tested. The service is not secure for sensitive use, and Cloudflare public activation remains blocked until the TLS/identity work and token/hostname setup are complete.

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

### 2026-08-03 AI-POT Chromium regression attempt

**Attempted**: `pnpm --dir frontend test:e2e`, including the new AI-POT flow that checks five-question pagination, the mobile answer board, final-page-only submission, and review navigation.

**Observed result**: All browser projects stopped before executing because Playwright's Chromium executable was absent at `/home/cgma/.cache/ms-playwright/chromium_headless_shell-1228/`.

**Impact**: Frontend lint, strict typecheck, unit tests, and production build passed; backend API tests and live `/aipot` smoke checks passed. The Playwright coverage is present but has not been executed in this host environment.

**2026-08-04 update**: The answer-drawer scroll regression has a focused unit test and its frontend build/live smoke check passed. Full browser validation remains blocked by the same missing Chromium executable.

**Exact follow-up**:

```bash
cd /home/cgma/apps/web_service/frontend
pnpm exec playwright install chromium
pnpm test:e2e
```

### 2026-08-04 AI-POT immediate-feedback browser check

**Attempted**: `pnpm --dir frontend test:e2e` after deploying the 17-set AI-POT feedback/timer update to port 18080.

**Observed result**: Playwright could not launch either desktop or mobile Chromium because `/home/cgma/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell` is absent.

**Impact**: API behavior, TypeScript, lint, unit tests, production build, Compose validation, and live HTTP checks pass. The browser interaction check for locking, green/red feedback, and timer phase transition still needs a local Chromium installation.

**Exact follow-up after approval to download a browser binary**:

```bash
cd /home/cgma/apps/web_service/frontend
pnpm exec playwright install chromium
PLAYWRIGHT_BASE_URL=http://192.168.219.121:18080 pnpm test:e2e
```

## 7. Dependency-audit remediation

**Attempted**: `pnpm --dir frontend audit` after the AI-POT implementation checks.

**Observed result**: The existing lockfile reports 19 advisories: 13 high and 6 moderate. These include Next.js `16.2.10` advisories patched in `16.2.11`, plus transitive `postcss`, `js-yaml`, `sharp`, and `brace-expansion` paths.

**Why skipped**: Updating dependencies changes the application supply chain and lockfile. The project policy and active task both require explicit approval before dependency changes, so no package or lockfile was modified.

**Impact**: The AI-POT feature has no new dependencies, and its code/API/deployment checks pass. The application still carries the pre-existing dependency-audit risk until an approved upgrade pass is completed.

**Exact follow-up after approval**:

```bash
cd /home/cgma/apps/web_service/frontend
pnpm up next@16.2.11 postcss@8.5.18
pnpm audit
pnpm lint && pnpm typecheck && pnpm test && pnpm build
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

## 8. AI-POT evaluator provider verification and promotion

**Implemented locally**: The API has transactional SQLite evidence storage, an internal
network-isolated code runner, question execution modes, explicit image-generation confirmation,
and provider clients configured for OpenRouter. Unit and integration-style application checks use
a fake provider and do not make billable network calls.

**Why live verification and deployment are pending**: The ignored local environment did not have
`OPENROUTER_API_KEY` configured. A real execution/judging request cannot be truthfully verified
without a secret, and deploying an unconfigured evaluator would only turn practical submissions
into explicit 503 failures. No provider request was made and no supplied credential was copied into
the repository or command history.

**Operator steps after placing the key in ignored `.env` or the deployment secret manager**:

```bash
cd /home/cgma/apps/web_service
HOST_PORT=18080 docker compose -f compose.yaml -f compose.prod.yaml --profile production up --build -d --wait
docker compose -f compose.yaml -f compose.prod.yaml --profile production ps
```

Then use `/aipot` to submit one text practical prompt and inspect the immediate Korean rubric
evidence and final review. Submit one image practical only after the confirmation dialog and check
that the returned evidence contains the generated image. Verify a code practical displays the
sandbox stdout/stderr evidence. Do not put the secret in curl commands, screenshots, commits, or
the study answer field.

**Current local listener note (2026-08-05)**: use `http://192.168.219.130:18080`; the earlier `.121`
address in historical deployment notes no longer accepts the current service.

## 9. AI-POT browser-interaction regression

**Implemented and unit-tested**: completing all 40 locked answers now presents the final submission
action, and locked Q36–Q40 expose a per-question retry control. Frontend lint/typecheck/unit/build,
backend checks, and the live route/content probe passed after the frontend-only promotion.

**Remaining browser check**: Playwright Chromium is still not installed locally, so the exact click
sequence (lock Q40 → submit; retry Q36 → edit → re-lock) was not automated against a real browser.
The existing environment limitation remains; after Chromium is available, run:

```bash
cd /home/cgma/apps/web_service/frontend
PLAYWRIGHT_BASE_URL=http://192.168.219.130:18080 pnpm test:e2e
```

## 12. Learner-stem visual browser check

The Q01 cover/duplicate-choice sanitization has frontend and backend unit coverage, production
build coverage, and will be live after the frontend promotion. A full browser assertion remains
pending only because the local Playwright Chromium executable is unavailable. Once installed, open
any source or generated Q01 and verify that the stem begins at the actual question while answer
choices appear only once in the selectable controls.

## 13. Choice-feedback click browser check

The live endpoint has been verified directly with the answer-only payload and frontend unit tests
cover the payload generated by a choice selection. A full Playwright click-through remains pending
the unavailable local Chromium executable; after it is installed, select Q01 option 1 and confirm
that feedback appears instead of the prior validation-error screen.

## 14. Source-choice browser review

The OCR-derived repair and live API audit confirm that source rounds 02–05 have no placeholder
choices. A visual browser pass remains pending local Playwright Chromium; after installation, open
rounds 03 and 05 and confirm each answer control shows meaningful Korean source text rather than a
`원본 페이지 참조` label.

## 15. Source-path visual browser review

The content check and live API audit confirm that no learner prompt exposes an OCR source path or
continuation note. A browser review remains pending local Playwright Chromium; after installation,
open source round 03 Q31 and confirm the prompt starts directly with the question, while any required
material is shown only as a reviewed crop rather than a filesystem-style source indication.

## 16. Visual-prompt browser review

The live API and content check confirm that prompts with reviewed reference crops no longer repeat
long OCR image descriptions. A browser review remains pending local Playwright Chromium; after it is
installed, open source-round-03 Q36 and source-round-04 Q37 to confirm that each shows the compact
task instruction and image crop only.

## 12. Live Q36/Q40 OpenRouter judge activation

**Implemented and verified in source data**: source round 01 Q36 is `code` execution and Q40 is
`image` execution; both are configured for the evidence-based OpenRouter/Haiku judge path. All 17
sets were also audited to contain Q01–Q40.

**Why live activation is pending**: the current deployed API does not expose evaluator metadata and
the local secret environment has no `OPENROUTER_API_KEY`. A frontend-only promotion preserves the
working existing API but cannot turn its legacy feedback into a genuine model judgment.

**Required promotion after secure key configuration**:

```bash
cd /home/cgma/apps/web_service
HOST_PORT=18080 docker compose -f compose.yaml -f compose.prod.yaml --profile production up --build -d --wait
```

## 10. Browser UUID compatibility coverage

**Implemented and unit-tested**: final submission now falls back to a locally generated API-valid
client submission ID when `crypto.randomUUID` is missing. Both the native and fallback paths are
covered by the frontend unit test suite, and the corrected frontend was promoted to the live stack.

**Remaining limitation**: no local Playwright Chromium is available to run the exact browser that
reported the failure. The live route/readiness checks and production build pass; run the command in
the previous section after installing Chromium to exercise the full submit click path.

## 11. Source-question renderer browser coverage

**Implemented and tested**: source prompts are now parsed into safe text, tables, fenced code, and
declared image segments. The Q16 quote-marker/diagram-table replacement is covered by frontend and
API tests, and the corrected frontend was promoted successfully.

**Remaining browser check**: no local Playwright Chromium is installed to visually inspect the
source round in a production browser. After installing it, run:

```bash
cd /home/cgma/apps/web_service/frontend
PLAYWRIGHT_BASE_URL=http://192.168.219.130:18080 pnpm test:e2e
```
