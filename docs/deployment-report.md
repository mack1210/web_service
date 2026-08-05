# Deployment Report

Reviewed: 2026-07-12 (Asia/Seoul); migration status amended: 2026-07-13 (Asia/Seoul)
Deployment status: **healthy LAN-bound origin deployment**
External reachability: **Cloudflare Tunnel pending account token and public hostname**

## Current endpoints

| Purpose | URL | Evidence |
|---|---|---|
| LAN URL | `http://192.168.219.121:18080` | After the operator requested LAN access, `/settings` returned 200 and the service listener was bound to this host IP on 2026-07-13. |
| Loopback URL | `http://127.0.0.1:18080` | Intentionally unavailable in the current LAN-bound mode; use the LAN URL from the host and other Wi-Fi devices. |
| Origin binding | `192.168.219.121:18080` | The ignored local `.env` selects this LAN IP. `ss -ltn 'sport = :18080'` verifies the listener. |
| Prior mobile layout verification | `http://192.168.219.121:18080/items/inventory-reconciliation` | Before loopback migration, Chromium at 390px reported `scrollWidth === clientWidth` and found the validation action. |
| Cloudflare public status | Public hostname not configured | No Cloudflare account token or hostname is in the workspace; public HTTPS is not claimed. |

The isolated review stack on `:18081` was verified and then promoted into the main `overnight-web-agent-kit` Compose project on `:18080`. The review stack was removed after promotion. The project was then moved to `/home/cgma/apps/web_service`; only the main project containers were recreated there. Both API and frontend remain Docker-network internal; Caddy is the only port-published container and currently binds the requested host LAN address.

```text
LAN / loopback → Caddy host :18080 → frontend :3000
                                    └→ /api/* and /health/* → api :8000
```

## Build and runtime evidence

| Check | Exact command or probe | Result |
|---|---|---|
| Compose config | `docker compose -f compose.yaml -f compose.prod.yaml --profile production config --quiet` | exit 0 |
| Caddy config | `docker run --rm -v "$PWD/infra/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.10-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` | exit 0 |
| Frontend image | `docker build --network=host --target runner --build-arg NEXT_API_ORIGIN=http://api:8000 --build-arg NEXT_PUBLIC_DATA_SOURCE=http -t overnight-web-agent-kit-review-frontend:latest -f frontend/Dockerfile frontend` | exit 0 |
| Isolated review stack | `COMPOSE_PROJECT_NAME=overnight-web-agent-kit-review HOST_PORT=18081 docker compose -f compose.yaml -f compose.prod.yaml --profile production up -d --no-build --wait` | exit 0; api/frontend/caddy healthy before promotion |
| Main-stack promotion | `HOST_PORT=18080 docker compose -f compose.yaml -f compose.prod.yaml --profile production up -d --no-build --force-recreate --wait` | exit 0; api/frontend/caddy healthy |
| Core routes | `curl` probes of `/`, `/health/ready`, `/api/v1/meta`, `/robots.txt`, `/icon.svg`, and a valid detail | all 200 |
| Validation contract | POST action with an unexpected field | 422 `ErrorEnvelope` with `validation_error` |
| Request-ID safety | Invalid external `X-Request-ID` header | response used a generated UUID |
| Security headers | `curl -I http://127.0.0.1:18080/` | `nosniff`, referrer, permissions, and frame headers present; no `X-Powered-By` |

## Docker network fallback

The first normal Compose build encountered repeated Corepack/Node `fetch` timeouts while downloading `pnpm-11.5.2.tgz` from the npm registry. This was a build-environment network issue, not an application failure. The frontend Dockerfile now installs the exact pnpm version via npm with retries; pnpm still installs the committed lockfile. A host-network Docker build then completed successfully, and the resulting image was run and health-checked.

## Security boundary and Cloudflare promotion decision

The deployed high port is plain HTTP and no authentication/authorization model has been approved. The current Compose deployment binds `:18080` to the requested LAN IP. A prior 5G observation showed that an earlier origin was publicly reachable; 5G/public reachability has not been re-tested after this LAN rebinding. Existing system Caddy owns ports 80/443 and was read only; it was neither restarted nor reloaded.

Before normal public use, create a remotely managed Cloudflare Tunnel with the origin `http://caddy:18080`, provide an approved public hostname, and choose an identity mechanism. Follow the exact build/deploy/verification procedure in `docs/skipped-actions.md`. This is a material product/security decision, not a deployment detail that can safely be invented.

## Rollback and cleanup

The running deployment can be stopped without touching the system Caddy on 80/443, unrelated services, or volumes:

```bash
cd /home/cgma/apps/web_service
HOST_PORT=18080 docker compose -f compose.yaml -f compose.prod.yaml --profile production down
```

Do not use `down -v`, Docker prune, or any command that removes unrelated containers, networks, or volumes.

Detailed product, accessibility, security, policy, and testing evidence is in [production-improvement-report.md](production-improvement-report.md).

## AI-POT study module — 2026-08-03

`/aipot` is deployed through the existing Next.js and FastAPI services; Caddy was not changed or recreated. The API container has a read-only mount from `/home/cgma/cgma_git/study/aipot/실전모의고사` at `/aipot-content` and a dedicated `aipot_history` Compose volume at `/app/data` for local submitted-attempt history.

| Check | Result |
| --- | --- |
| `GET /aipot` | 200; Korean-first AI-POT dashboard is present |
| `GET /api/v1/aipot/exams` | 200; 10 sets, from `source-round-01` to `generated-mock-05` |
| Public exam payload | 40 questions; no answer-key fields in question objects |
| Source asset allow-list | required question page 200; source answer page 404 |
| API/frontend container health | both healthy after an API/frontend-only rebuild; Caddy remained healthy and unchanged |

The route is intentionally a single-user personal-study feature. It has no authentication, and the existing LAN/plain-HTTP security limits remain in force.

The 2026-08-03 `pnpm audit` reports existing dependency advisories (15 total, including Next.js `16.2.10` fixes available at `16.2.11`). No dependency update was included in this feature deployment because upgrades require an approved, separate compatibility pass.

## AI-POT OCR, visual prompts, and answer-board scroll — 2026-08-04

Only the API and frontend services were rebuilt/recreated; Caddy, its routes, and the published port remained unchanged. The source-round API now exposes reviewed OCR text for Q01–Q40 and withholds full source-page assets. It exposes only declared, focused source crops where a table, graph, or image is needed. Every generated mock now includes a visual prompt asset for Q36–Q40: a policy notice, reference photo, code brief, sales chart, and customer email.

The answer drawer focus lock was also adjusted so routine timer/answer rerenders do not refocus its close button and force the drawer back to its top. The new hook regression test, frontend lint/typecheck/build, backend API tests/Ruff, and live `/aipot` smoke check all passed.

The same deployment now parses all 150 source multiple-choice OCR records into a question stem plus four actual option values. Final numbered/circled option blocks and table-form option rows are removed from the stem and rendered in the answer area. Questions whose original answer format permits multiple selections use checkboxes; single-answer questions retain radio buttons. Live checks confirmed source Q01's text options and source round 2 Q04's table-derived multi-select options.

## AI-POT current-technology depth rounds — 2026-08-04

The mounted study corpus now includes generated rounds 11–15, for a 15-set catalog. Each round retains the original exam pattern (30 multiple-choice, 5 short-answer, 5 practical prompts) and includes visual/data material for every practical prompt. The new tracks cover agents/MCP, multimodal document AI, RAG evaluation, inference/operations, and AI safety/governance. Their manifests record the primary-source review links and date; the hosting API discovers the new files automatically. The frontend catalog label was rebuilt/recreated to show the dynamic count; the API and Caddy were not recreated.

### OCR reading-density adjustment

OCR passage quote markers are now rendered as compact normal text instead of indented blockquotes. This was a frontend-only recreation; no draft key, submission history, API record, or source OCR file was changed, so existing browser-local temporary answers—including source round 1—remain intact.

OCR tables are rendered through a narrow, local parser into React table elements. The renderer recognizes only table delimiters, line breaks, bold text, and inline code; it never injects raw HTML and deliberately renders OCR link labels as text rather than following any URL. Bare quote markers (`>`) are discarded. This keeps untrusted source OCR from becoming executable content.

### Inline original visual crops

A full review of source rounds 1–5 identified 38 visual-dependent prompts. Each now replaces its OCR-only description with a focused crop from the original photographed page, placed at each marker's original location. This includes source round 1 Q21, Q18's gradient-descent graph, Q34–Q35's shared Google Flow settings/result visual, RLHF post-its, activation plots, prompting diagrams, heatmaps, UI screenshots, image evidence, and visual short-answer questions. The manifest explicitly declares the crop filename, marker, and alt text; the API serves source assets only when declared for that question, so arbitrary mounted files remain unavailable. Live manifest checks report 13, 10, 5, 2, and 8 visual questions for source rounds 1–5 respectively. Browser-local draft storage and submitted-history data were not changed.

The same audit added 14 focused visual crops to Q36–Q40 across the five source rounds. These practical prompts now retain their OCR instructions and show only their relevant image, graph, or table region; text/code-only practical prompts show no camera page. Full `page-*.jpg` source images are no longer exposed by the API.

## AI-POT evidence evaluator — 2026-08-05 (implemented, not yet deployed)

The AI-POT practical evaluator is implemented as a separate FastAPI capability backed by SQLite
inside the existing `aipot_history` volume. A submitted prompt is executed, the resulting text,
image, or sandboxed code output is retained as evidence, and a rubric judge scores that evidence.
The same stored evidence is returned by immediate feedback and final review; it is not recomputed
or replaced by a keyword-match score.

The added `aipot-sandbox` Compose service has no network, no host port, a read-only root
filesystem, a temporary writable `/tmp`, dropped Linux capabilities, and communicates with the API
only through a named-volume Unix socket. Image generation requires an explicit browser confirmation
before the billable request. Questions whose required original input file is unavailable fail
closed and receive no score.

This change has not recreated the currently running API/frontend containers. The ignored local
environment did not contain an evaluator credential at verification time, so a live provider call
and production promotion were intentionally not attempted. The implementation checks are recorded
in the current handoff; deployment must first place the credential in the secret-managed or ignored
environment and then run the documented Compose promotion command.

### Current listener correction — 2026-08-05

The running Compose Caddy listener was rechecked during this evaluator work and is healthy at
`http://192.168.219.130:18080`; `/health/ready` and `/aipot` returned 200. Earlier `.121` references
above record the historical host binding and should not be used as the current access URL.

## AI-POT finish and practical retry correction — 2026-08-05

Only the frontend Compose service was rebuilt/recreated on the existing `:18080` stack. After all
40 answers are locked, the active study screen now exposes `시험 종료 및 답안 제출` in both the main
content and floating answer navigator instead of leaving a disabled “no unanswered questions”
message. Each locked Q36–Q40 also exposes `서술형 다시풀기`; it clears only that local prompt answer,
lock, and feedback for a fresh evaluation.

The API and Caddy services were not recreated. Frontend health, `/health/ready`, and the live
`/aipot/solve/generated-mock-01` page were checked successfully after promotion.

## AI-POT submission-ID compatibility correction — 2026-08-05

The final-submission path no longer assumes that `crypto.randomUUID()` exists. It now uses that
browser API when available and otherwise generates a local `aipot-...` client submission ID, which
satisfies the API's idempotency-ID requirement. Only the frontend service was rebuilt/recreated;
the live solve route and API readiness endpoint returned successfully afterward.

## AI-POT source Markdown rendering correction — 2026-08-05

Only the frontend Compose service was rebuilt/recreated. The source solver now uses the reviewed
safe-block renderer rather than writing a source prompt into a raw paragraph. Markdown quote
markers are removed before rendering; tables and code fences are structured React elements; links
remain text labels; and declared visual segments replace duplicate source blocks without a generic
source caption. The source round 01 Q16 concept diagram path is covered by regression tests. The
live source-round solve route and API readiness endpoint passed after promotion; API and Caddy were
not recreated.

## AI-POT all-question navigation correction — 2026-08-05

Only the frontend service was rebuilt/recreated. Every one of the 17 manifests was audited with
Q01–Q40 present, and the shared solver now exposes all eight pages and Q36–Q40 floating-bar targets
from the start instead of filtering the practice section until a timer phase change. Final submission
is available after all 40 locks. The live source-round solve route and API readiness check passed.

Source round 01’s checked-in evaluator modes are Q36 `code` and Q40 `image`, both designed for the
evidence-based provider/judge path. The currently running API has not been promoted with that path
because its OpenRouter secret is not configured; this report does not claim keyword feedback is a
model judgment.

## AI-POT learner-stem sanitization correction — 2026-08-05

The shared source renderer and API manifest sanitizer now strip the Q01 photographed cover and
instructions through the objective-section heading. They also remove a final complete numbered or
circled choice run when the same choices are already supplied to answer controls. This keeps the
question stem focused and prevents duplicate answer text in every set. The frontend-only service
was rebuilt/recreated successfully; both source and generated solve routes and API readiness passed.

## AI-POT choice-feedback compatibility correction — 2026-08-05

The currently running API validates the original answer-only feedback payload and rejects an unused
`confirm_media: false` field. The frontend now omits that field for ordinary choice, short-answer,
and non-image practical feedback, sending it only when an image evaluation is explicitly confirmed.
The frontend was rebuilt/recreated; its health check, source solver route, and a live Q01 feedback
request all passed on port 18080. API and Caddy were unchanged.

## AI-POT source-choice recovery — 2026-08-05

The learner manifests for source rounds 02–05 contained 63 placeholder choice groups, including all
affected theory choices in rounds 03 and 05. The reviewed OCR transcription was used as the single
source of truth to recover the corresponding final numbered and table choice blocks. A validation
tool now fails if `원본 페이지 참조` remains. Because the API reads the mounted content on each
request, no container recreation was necessary: live checks for all four source rounds returned
40 questions and zero placeholders, and a round-03 feedback response used the recovered choice text.

## AI-POT source-path prompt sanitization — 2026-08-05

Ten learner prompts contained OCR workflow notes such as `보기 계속: ../../assets/...` or
`Related visual source: ...`. These notes were removed from the mounted learner manifests while
preserving declared reviewed visual crops. The shared content check now fails on either a placeholder
choice or a source-path prompt note. Live API checks across source rounds 01–05 found neither form
of exposed source metadata; no container recreation was necessary.

## AI-POT duplicate image-description sanitization — 2026-08-05

Five practical prompts repeated a verbose OCR description of a visual result even though each had a
reviewed reference crop. The content sanitizer removes those final image/result-description blocks
only when the corpus declares `primary_visual`, preserving instructions, constraints, and the crop.
The live API confirmed no such duplicate text on visual questions and confirmed that source-round-03
Q36 still exposes its reviewed reference asset. No container recreation was necessary.

## AI-POT live practical evaluator activation — 2026-08-05

The API and its isolated `aipot-sandbox` runner were rebuilt/recreated after the provider secret was
securely configured outside version control. The live exam payload now labels practical questions as
`image`, `text`, `code`, or `unavailable`; the frontend consequently requests explicit confirmation
before paid image generation. Source-round-03 Q36 was verified end to end: an unconfirmed request
returned `409 aipot_media_confirmation_required`, and one confirmed request generated a private
1024×1536 PNG (`image/png`) through `openai/gpt-image-1`. The actual artifact was stored privately
and scored with all five rubric criteria by `anthropic/claude-haiku-4.5`. API, sandbox, frontend,
Caddy, the solve route, and readiness endpoint were healthy afterward.
