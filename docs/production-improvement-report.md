# Production Improvement Report

Reviewed: 2026-07-12 (Asia/Seoul); access status amended: 2026-07-13 (Asia/Seoul)
Outcome: **Ready with documented limitations**

## 1. Executive summary

This was a stabilization pass on the existing Next.js/FastAPI application, not a rewrite. The representative workflow remains `Overview → Collection → Detail → Validate`. The review fixed the highest actionable issues found in the baseline: mobile page overflow, overlay keyboard behavior, duplicate action submission risk, form-control contrast, API validation-contract drift, request-ID reflection, missing basic security headers, missing robots/icon routes, and known dependency advisories.

The improved build was first verified as an isolated review deployment. An earlier deployment was available at `http://192.168.219.121:18080` and `http://127.0.0.1:18080`; on 2026-07-13 the operator reported successful 5G access with Wi-Fi disabled. The project was then moved to `/home/cgma/apps/web_service` and recreated with a loopback-only `127.0.0.1:18080` origin. A Cloudflare Tunnel is now the documented public-HTTPS path, but it has not been activated because no tunnel token or hostname was supplied.

## 2. Scope and assumptions

- Preserved framework, routes, API paths, fixtures, generated OpenAPI workflow, mock/HTTP adapter contract, and existing Docker/Compose topology.
- No database exists, and the representative action is deterministic/in-memory. ACID database transactions and idempotency keys are therefore not applicable; the UI now prevents duplicate in-flight submissions.
- The product is treated as an internal operational workspace because the supplied fixtures, routes, and existing documentation indicate that role. The global UI remains English; fixture content intentionally includes Korean and English. Localization was not inferred.
- No Google Ads, AdSense, Google Analytics, GTM, publisher ID, ad slot, consent platform, or ad script exists in the reviewed code. Policy review therefore follows track **D** (prepared for future monetization), not an assertion of current Google eligibility.

## 3. Baseline findings

| Priority | Finding | Baseline evidence | Final disposition |
|---|---|---|---|
| P1 | Detail page overflowed on 320–430px layouts; global `overflow-x:hidden` hid rather than fixed it. | Mobile audit; `scrollWidth` reached 655px on the long detail fixture. | Fixed and browser-verified at 360/390/768/1280/1440px. |
| P1 | Mobile drawer, filter sheet, and confirmation dialog lacked a shared focus trap/restoration and body scroll lock. | Keyboard audit reached background controls; wheel scrolling remained possible. | Fixed with a shared hook; browser and E2E verified. |
| P1 | Action confirmation had no duplicate-in-flight guard. | Two confirm events could start two adapter calls. | Fixed with `runningRef`, pending button state, and disabled escape/backdrop cancellation. |
| P1 | Dependency audit exposed Playwright and PostCSS advisories; a full audit also exposed Vitest. | `pnpm audit` findings: GHSA-7mvr-c777-76hp, GHSA-qx2v-qp2m-jg93, GHSA-5xrq-8626-4rwp. | Updated existing development dependencies and applied a scoped PostCSS override; final audit is clean. |
| P2 | Native control boundary contrast was below the 3:1 non-text contrast target. | Light 1.48:1; dark 1.93:1. | Fixed to 4.76:1 light / 5.71:1 dark. |
| P2 | FastAPI advertised default validation responses rather than the runtime `ErrorEnvelope`; action request accepted unknown fields. | OpenAPI/runtime mismatch; extra JSON properties silently accepted. | Fixed, regenerated schema/types, and tested. |
| P2 | Production ingress lacked basic browser hardening headers and exposed `X-Powered-By`. | Header probe on the original deployment. | Fixed in Next/Caddy and verified on `:18080`. |
| P2 | `/favicon.ico`, `/robots.txt`, and a clear indexing policy were absent; development UI was crawlable. | Browser/network probe returned 404s; generic metadata. | Added SVG icon, robots route, no-index metadata, and no-index dev metadata. |

## 4. Prioritized issue list

No unmitigated P0 was found. All implementation-owned P1 findings above are resolved in the review build. The current origin is loopback-only. Cloudflare public activation and an authentication decision remain a documented P1 deployment gate rather than an unverified claim. Remaining P2/P3 items are in section 19.

## 5. UI and UX improvements

- Reworked visual tokens into a coherent surface, border, primary, radius, motion, and typography system in `frontend/src/app/globals.css`.
- Removed document-level horizontal clipping. The detail code header stacks on narrow screens, and grid children now use `min-w-0`; long code remains locally scrollable.
- Standardized controls with a 44px minimum size, stronger boundary contrast, focus treatment, and consistent button states.
- Debounced collection text search by 250ms while preserving URL filters; a polite result-count announcement communicates updates.
- Added a friendly, recoverable browser not-found UI for missing items.
- Made clipboard feedback truthful: it now announces a manual-copy fallback if clipboard access fails.

## 6. Design-system changes

`globals.css` now owns semantic CSS tokens for background/surface/foreground/muted/border/primary/status colors, radii, shadows, motion, and focus. `Button`, `ThemeControl`, and the `.control` class consume these tokens. Measured contrast checks:

| Pair | Result |
|---|---:|
| Light control border / white surface | 4.76:1 |
| Dark control border / dark surface | 5.71:1 |
| Light primary / white primary text | 6.70:1 |
| Dark foreground / dark background | 17.22:1 |

## 7. Code-quality improvements

- Added `useModalFocus`, a narrow reusable client hook for focus containment, Escape behavior, opener restoration, and body-scroll locking.
- Preserved richer HTTP errors (`status`, `code`, `requestId`, `retryable`) in `RequestError` so UI recovery can distinguish a missing item.
- Normalized server-side query whitespace to match the mock adapter.
- Added Pydantic `extra="forbid"`, bounded path IDs, documented `422`/`500` error envelopes, and regenerated OpenAPI TypeScript types.
- Validated externally supplied request IDs before reflecting them. Invalid IDs are replaced by UUIDs.
- Moved E2E screenshots to Playwright test-output directories so the suite does not depend on a host-specific `../artifacts` path.

## 8. Architecture changes

No framework or API architecture migration occurred. The only runtime addition is `INTERNAL_API_ORIGIN` for server-side detail existence checking inside Docker. The API remains internal to the Compose network; Caddy remains the only published service.

The frontend Dockerfile now installs the exact pnpm version with npm before executing pnpm. This is a build reliability fallback: Corepack's direct Node fetch repeatedly timed out in this Docker environment while npm's retrying client succeeded. The project still uses pnpm and its committed lockfile for dependency installation.

## 9. Accessibility review

Automated checks and manual browser interaction were both used; this is not a claim of full WCAG 2.2 conformance.

| Review area | Result |
|---|---|
| Semantic landmarks/headings/labels | Representative browser accessibility snapshots expose banner, main, navigation, headings, regions, complementary content, dialogs, labels, and status text. |
| Keyboard drawer | Initial focus is the close button; Tab remains inside; Escape closes and restores `Open navigation menu`; body scroll locks while open. |
| Mobile filters | Initial focus is `Done`; Escape closes and restores `Filters`; body scroll locks. |
| Confirmation dialog | Initial focus is `Run validation`; Tab wraps to `Cancel`; Escape restores `Validate input`; pending state disables cancellation. |
| Focus visibility and target size | Shared visible 3px focus outline; primary controls use `min-h-11` / 44px. |
| Reduced motion | Existing `prefers-reduced-motion` override retained. |
| Contrast | Control boundary contrast remediated; values in section 6. |
| Responsive reflow | Detail page `scrollWidth === clientWidth` at 360, 390, 768, 1280, and 1440px. |

## 10. Performance and Core Web Vitals

These are local browser lab observations, not real-user field Core Web Vitals and not Lighthouse scores. Lighthouse was not installed because adding a new dependency was not authorized.

| Metric | Baseline | Review build | Notes |
|---|---:|---:|---|
| DOMContentLoaded | ~40ms | 27ms | Separate local runs; directional only. |
| Load | ~135ms | 124ms | Separate local runs; directional only. |
| Transfer bytes | 188,827 B | 188,663 B | Fresh Chromium session. |
| JavaScript transfer | 159,282 B | 160,210 B | Small change; no material regression. |
| CSS transfer | 13,019 B | 13,375 B | Token additions. |
| Requests | 32 | 32 | No request-count regression. |
| Third-party requests | 0 | 0 | No ads/analytics scripts detected. |
| Layout shift in this lab run | not captured | 0 | In-page `layout-shift` aggregate; not field CLS. |

The largest emitted static JS chunk is 227,533 bytes. Future performance work should start with runtime user data and actual image/content requirements rather than speculative code splitting.

## 11. SEO review

The project is intentionally no-index until a public product domain, canonical URL, and content strategy exist. `robots.txt` returns `User-Agent: *` / `Disallow: /`; page metadata is descriptive; the dev UI is explicitly no-index; and an SVG app icon is served. A sitemap and canonical URL were not fabricated because there is no approved public hostname or public-content decision.

## 12. Google Ads review

Track B (Google Ads destination) is not currently applicable: no paid-traffic destination configuration, price/offer, conversion form, or business identity was found. If the product becomes a paid-traffic landing page, retest common-browser/mobile operation, domain/final-URL consistency, disclosures, form data minimization, recoverable navigation, and public TLS before advertising.

Reference reviewed on 2026-07-12: [Google Ads policies](https://support.google.com/google-ads/answer/6008942?hl=en).

## 13. Google AdSense / publisher review

Track D is applicable: the code has no Google publisher script, ad unit, publisher ID, ads.txt, consent platform, analytics tag, or third-party network request. Therefore no live publisher placement can be approved or rejected in this scope.

Future implementation gates:

- Do not place ads beside action controls, navigation, dialogs, error/transition pages, or low-value/development UI; publisher policies prohibit ads that interfere with content or cause unintended interactions and prohibit ads on screens without publisher content. [Google Publisher Policies](https://support.google.com/adsense/answer/10502938?hl=en), [screens without publisher content](https://support.google.com/publisherpolicies/answer/11112688?hl=en)
- Reserve fixed slot space to avoid layout shift, label ad placements accurately, and keep publisher content primary.
- Add a real privacy disclosure and applicable consent handling before Google ad code or data use is introduced. [AdSense Program policies](https://support.google.com/adsense/answer/48182?hl=en), [EEA ad-services data use](https://business.safety.google/privacy/google-services/ads/)
- Add and validate ads.txt only after a real seller/publisher relationship exists. [ads.txt guide](https://support.google.com/adsense/answer/12171612?hl=en)

No policy issue was detected within the reviewed code, content, and test scope as of 2026-07-12. Final eligibility and enforcement decisions remain with Google.

## 14. Security and data-handling review

- Added `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=(), microphone=()`, and `X-Frame-Options: SAMEORIGIN` at Caddy; disabled Next's `X-Powered-By` header. Verified by `curl -I` against the review deployment.
- No secrets, credentials, real-user data, database, CORS configuration, or user-code execution was found. The action endpoint is deterministic and uses typed request data.
- Development-only synthetic `q=__error__` behavior is disabled when `APP_ENV=production`.
- Authentication and TLS remain absent at the origin. The current origin is loopback-only; do not activate the Cloudflare public hostname for sensitive or real-user data until a domain/TLS path and approved authentication model are in place.
- A strict CSP/HSTS were not added: CSP needs a production script/style audit, and HSTS is inappropriate before a verified HTTPS hostname.

## 15. Automated and manual testing results

| Command / activity | Result |
|---|---|
| `pnpm --dir frontend lint` | exit 0 |
| `pnpm --dir frontend typecheck` | exit 0 |
| `pnpm --dir frontend test` | exit 0; 7 tests passed |
| `uv --directory backend run ruff check .` | exit 0 |
| `uv --directory backend run pytest` | exit 0; 9 passed, one upstream FastAPI/Starlette TestClient deprecation warning |
| `uv --directory backend run python -m app.openapi && pnpm --dir frontend generate:api` | exit 0 |
| `pnpm --dir frontend audit` | exit 0; no known vulnerabilities |
| `pnpm --dir frontend build` | exit 0; production build succeeded |
| Caddy `validate` | exit 0 |
| `docker build --network=host ... frontend/Dockerfile` | exit 0 after Corepack fallback change |
| Review Compose `up -d --no-build --wait` | exit 0; api/frontend/caddy healthy |
| Containerized Playwright E2E against `:18081` | exit 0; 6 passed, 2 intentional desktop-only skips |
| Manual keyboard/responsive/browser console checks | completed; no browser console errors; one Performance API warning came from the measurement script itself |

## 16. Before-and-after evidence

- Baseline screenshots retained: `artifacts/screenshots/chromium-collection-flow.png`, `mobile-chromium-collection-flow.png`, and `mobile-chromium-navigation.png`.
- Review screenshots: `artifacts/screenshots/review-collection-desktop.png`, `review-collection-mobile.png`, `review-detail-desktop.png`, and `review-mobile-navigation.png`.
- The baseline and review captures were not produced with identical viewport dimensions, so no pixel-diff claim is made. The review screenshots are visual evidence only; the responsive and keyboard checks above are the comparable verification.

## 17. Changed files and rationale

Key groups:

- `frontend/src/app/globals.css`, `components/ui/*`, `components/layout/*`, `hooks/use-modal-focus.ts`: visual tokens, control contrast, 44px targets, and reusable modal accessibility behavior.
- `frontend/src/features/items/*`, `app/items/[id]/page.tsx`: mobile reflow, search behavior/announcements, duplicate-action guard, copy feedback, recoverable missing-item state.
- `backend/app/features/samples/*`, `backend/app/main.py`, generated OpenAPI files: stricter validation, contract fidelity, safe request IDs, production-safe demo behavior.
- `frontend/package.json`, lockfile, workspace overrides: patched Playwright/PostCSS/Vitest advisories without adding a project dependency.
- `infra/caddy/Caddyfile`, `next.config.ts`, `compose.yaml`, `frontend/Dockerfile`: header hardening, powered-by removal, internal API origin, and deterministic pnpm Docker install.
- `frontend/e2e/flow.spec.ts` and unit/backend tests: coverage for modal behavior, missing states, API validation, request IDs, and E2E artifact portability.

## 18. Pre-existing failures

At the start, lint, typecheck, existing unit tests, backend checks, baseline production build, and the old deployment health checks passed. Pre-existing concerns were mobile overflow, overlay focus behavior, low control-border contrast, missing SEO utility routes, permissive action requests, contract mismatch, insecure public high-port risk, and dependency audit advisories. The upstream TestClient deprecation warning remains outside application code.

## 19. Remaining limitations

| Priority | Limitation | Impact / next action |
|---|---|---|
| P1 public-security gate | No public domain, Cloudflare Tunnel token/hostname, TLS path, or authentication/authorization decision. | The origin is loopback-only. Complete the documented Cloudflare Tunnel and identity work in `docs/skipped-actions.md` before normal public use. |
| P2 | A missing detail renders the correct browser not-found state, but Next 16 streams the server `notFound()` fallback with HTTP 200 in this dynamic route. | User-visible recovery is verified; a future public SEO implementation should use a server/edge strategy that can guarantee a 404 status before streaming. |
| P2 | No canonical URL, sitemap, public content strategy, privacy notice, consent flow, or business identity is defined. | Correctly no-indexed; needs product/legal decisions before public search or ads. |
| P2 | UI language is English while sample fixture data is intentionally bilingual. | Choose localization policy before translating global UI. |
| P3 | No WebKit/Safari run and no Lighthouse binary. | Exact commands are listed in `docs/skipped-actions.md`. |

## 20. Future recommendations

1. Create the Cloudflare Tunnel/public hostname and an identity boundary before normal public use; keep the origin loopback-only and add a real privacy/terms/contact surface before handling real users.
2. Replace fixtures with authenticated, persistent data only when a product data model exists; add transactional/idempotent backend behavior at that time.
3. Add a public SEO/content plan, canonical URLs, sitemap, and a true HTTP-404 architecture only after a public information architecture is approved.
4. Before adding ad or analytics code, run a new policy, privacy/consent, performance, and layout-stability review against the actual placements.
5. Add WebKit and a throttled Lighthouse run when the browser/dependency is approved and available.

## Verification matrix

| Area | Baseline | Change | Verification | Final status |
|---|---|---|---|---|
| Mobile detail reflow | 655px overflow on small mobile | `min-w-0`, stacked code header, no body clipping | Browser width checks 360–1440 | Pass |
| Overlay keyboard UX | No trap/restore/scroll lock | Shared modal-focus hook | Manual browser + mobile E2E | Pass |
| Duplicate action | No in-flight guard | `runningRef`, pending dialog safeguards | Unit/component and E2E flow | Pass |
| API contract | Runtime/OpenAPI mismatch | Envelope responses, strict extra fields | 9 pytest + generated types | Pass |
| Dependency security | 3 advisories across audits | Existing packages patched/overridden | `pnpm audit` | Pass |
| Browser headers | Missing baseline headers | Caddy headers, powered-by disabled | `curl -I :18080` | Pass |
| SEO basics | icon/robots 404; generic metadata | icon, robots, no-index metadata | HTTP 200 routes | Pass |
| Production package | Old deployment only | Verified review Compose, promoted main stack, then relocated it to `~/apps/web_service` with a loopback origin | Docker healthy checks, endpoint probes, `ss` listener check | Pass; Cloudflare pending |
| Public reachability | Earlier 5G observation was user-reported | New deployment is loopback-only; Cloudflare Tunnel prepared but not activated | Loopback listener check; no token/hostname in workspace | Documented P1 limitation |
