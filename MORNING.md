# Morning Handoff

**DEVELOPMENT_STATUS:** COMPLETE — the deployed AI-POT private-study tab now provides 17 sets, immediate locked-answer feedback, Korean choice explanations, 40/20 active-time phases, browser drafts, final review, and local weakness history. Frontend lint/typecheck/unit/build and backend pytest/OpenAPI checks pass.

**DEPLOYMENT_STATUS:** LAN-bound origin healthy on Compose project `overnight-web-agent-kit`, running from `/home/cgma/apps/web_service`.

**EXTERNAL_REACHABILITY:** Direct LAN access is enabled at `192.168.219.130:18080` by an ignored local `.env` setting. 5G/public reachability was not re-tested. A Cloudflare Tunnel public hostname is pending an account tunnel token and hostname; it is not yet claimed.

**PRIMARY_URL:** `http://192.168.219.130:18080`

**AI-POT URL:** `http://192.168.219.130:18080/aipot`

**AI-POT CATALOG:** 17 sets total: five photographed source rounds, ten original practice rounds (01–05 and 11–15), and PDF-based Public Sets A/B. Every set uses the 60 + 15 + 25 = 100 point model.

**AI-POT DATA:** Source material is mounted read-only from `/home/cgma/cgma_git/study/aipot/실전모의고사`; submitted private study history is in the Compose-owned `aipot_history` volume. The pre-existing no-login/plain-HTTP warning applies: this is only for non-sensitive personal study.

**LOOPBACK_STATUS:** Not listening in the current LAN-bound mode; use `PRIMARY_URL` even on the host.

**PROMOTION:** The isolated `:18081` review image was verified, promoted to `:18080`, then removed. On 2026-07-13 the project moved to `/home/cgma/apps/web_service`; the main Compose containers were recreated from that path and then bound to the operator's LAN IP to restore local notebook access. System Caddy on 80/443 and unrelated services were not changed.

**KEY IMPROVEMENTS:** Mobile overflow fixed; modal focus/scroll/escape behavior fixed; duplicate action guard added; control contrast corrected; API error contract and validation hardened; request IDs validated; security headers/robots/icon added; dependency audit clean.

**MANUAL_ACTIONS:** Before activating a remotely managed Cloudflare Tunnel, change local `HOST_BIND_ADDRESS` back to `127.0.0.1`, set its public-hostname origin to `http://caddy:18080`, and place its token only in the untracked `.env`; then run the documented Cloudflare build/deploy commands. Decide an authentication model before handling sensitive data. Safari/WebKit and Lighthouse remain unrun.

**EVIDENCE:** [docs/production-improvement-report.md](docs/production-improvement-report.md) and [docs/deployment-report.md](docs/deployment-report.md).

**2026-08-04 AI-POT CHECKS:** `/aipot`, `/health/ready`, and `/api/v1/aipot/exams` returned successfully after recreating only the API and frontend services. Source Q01–Q40 return OCR text; any visual-dependent prompt receives only its reviewed crop, never a full original page, while source answer pages return 404. Source multiple-choice stems and their four real text/table values are now separated for all 150 questions; source multi-answer questions use checkboxes. Every generated mock supplies visual material for Q36–Q40 (notice, reference photo, code brief, chart, and email). The mobile answer drawer no longer resets its scroll when the timer or answer state updates. Playwright E2E remains blocked locally because its Chromium executable is absent; the added regression is checked in and documented in `docs/skipped-actions.md`.

**2026-08-04 OCR VISUAL CROPS:** A full review of all five original source rounds identified 38 Q01–Q35 and 14 Q36–Q40 diagram, graph, screenshot, and image prompts that need source visuals to be solvable. Each now uses a focused crop from the original photographed page, including source round 1 Q21 and the shared Google Flow settings/result visual for Q34–Q35; nonvisual practical prompts use OCR text only. The API allow-lists only declared crops, and the frontend renders them without interpreting OCR as HTML or links. Browser-local drafts were not touched.

**DEPENDENCY AUDIT:** `pnpm audit` currently reports 19 advisories (13 high, 6 moderate) in existing locked dependencies, including Next.js `16.2.10` with fixes at `16.2.11`. No dependency update was made because it requires an explicit approval and a separate compatibility pass.

**2026-08-05 AI-POT EVALUATOR:** Implemented but not deployed: practical questions now use
persisted execution evidence and rubric scoring rather than exact/keyword matching. Text, image,
and code modes are explicit in the corpus; missing required source files fail closed. The code
runner is a separate no-network Unix-socket Compose service. Frontend/back-end checks pass, but the
ignored local environment has no provider key, so live OpenRouter verification and container
promotion remain pending. Do not record an evaluator key in this file or the repository.

**2026-08-05 AI-POT COMPLETION FLOW:** The frontend at `PRIMARY_URL` was rebuilt and recreated
only. Once Q01–Q40 are locked it now shows `시험 종료 및 답안 제출` in the main area and floating
answer navigator. Locked Q36–Q40 also expose `서술형 다시풀기`, which clears only that prompt's
browser draft and feedback so it can be evaluated again. API and Caddy stayed healthy and unchanged.

**2026-08-05 AI-POT UUID COMPATIBILITY:** The frontend was rebuilt/recreated again to replace the
unsupported direct `crypto.randomUUID()` call used by final submission. It now uses `randomUUID`
when present and a local compatible ID fallback otherwise. The live solve route and API readiness
check passed after promotion; API and Caddy remained unchanged.

**2026-08-05 SOURCE RENDERING:** The frontend was rebuilt/recreated to render source prompts with
the same safe block renderer used by reviewed OCR: Markdown quote markers are removed, tables and
fenced code are rendered as safe elements, and declared diagram segments replace duplicate source
tables. Source round 01 Q16 now shows its reviewed concept diagram and normal explanatory text
without raw `>` syntax or a source caption. The live source-round solve route and API readiness
check passed; API and Caddy remained unchanged.
