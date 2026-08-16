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

## 2026-08-05 browser UUID compatibility promotion

- The final-submission client identifier now has a no-`randomUUID` fallback for older browser
  implementations. This was a frontend-only rebuild/recreation; API, Caddy, and the host binding
  remained unchanged.
- The active solve route and `/health/ready` passed after promotion.

## 2026-08-05 source-question rendering promotion

- Source prompts now share a safe renderer for quote-marker removal, tables, fenced code, and
  declared diagram segments. The canonical source-round corpus owns visual marker metadata; no
  whole source page or generic source caption is exposed.
- This was a frontend-only promotion. The active source-round solve route and `/health/ready`
  passed at `http://192.168.219.130:18080`; API, Caddy, and host binding remained unchanged.

## 2026-08-05 all-question navigation promotion

- The shared practice solver now exposes Q01–Q40 as eight five-question pages and in the answer
  navigator for every set. Q36–Q40 are no longer gated behind an internal display filter.
- This was a frontend-only promotion; live route/readiness checks passed. Provider-backed practical
  judging still requires API promotion with `OPENROUTER_API_KEY` supplied outside version control.

## 2026-08-05 learner-stem sanitization coverage

- Q01 cover instructions are removed after the objective-test heading, and a final complete
  numbered/circled duplicate choice block is excluded whenever those choices are rendered as answer
  controls. The frontend and backend test suites each exercise this contract.
- `README.md` is the one-source policy for current and future source/generated sets. The frontend
  promotion is limited to the UI; the same API sanitizer is ready for the next secure API release.

## 2026-08-05 choice-feedback compatibility coverage

- Ordinary feedback requests now send exactly `{ "answer": "..." }`, retaining compatibility with
  the currently deployed API. Image evaluation adds `confirm_media` only when explicitly requested.
- Frontend unit tests cover both payload forms. A live answer-only Q01 request returned `200` with a
  scored response after the frontend-only promotion.

## 2026-08-05 source-choice recovery coverage

- `pnpm aipot:content:check` scans every source-round learner manifest and fails if an unrecovered
  `원본 페이지 참조` placeholder exists; the repair tool derives replacements from reviewed OCR.
- The live API was queried for source rounds 02–05 after recovery: every response contained 40
  questions and zero placeholders. A round-03 answer-feedback request returned recovered choices.

## 2026-08-05 source-path sanitization coverage

- The content repair/check tool removes OCR workflow notes containing `보기 계속`, `Related visual
  source`, or `../../assets/...` from learner prompts without removing declared visual assets.
- The live API was queried for source rounds 01–05; no learner prompt exposed any of those source
  indications. A source-round-02 Q31 reviewed image crop remained available after sanitization.

## 2026-08-05 duplicate image-description coverage

- The content check rejects a trailing OCR image/result description on a question whose corpus entry
  declares a reviewed `primary_visual`. It preserves the learner instruction and image asset.
- Live checks across source rounds 01–05 found no duplicate image descriptions on visual questions;
  source-round-03 Q36 retained its reference crop after the cleanup.

## 2026-08-05 live practical evaluator verification

- The API and network-isolated `aipot-sandbox` runner are running. Live practical metadata reports
  image/text/code modes to the frontend, which enables the required paid-image confirmation dialog.
- Source-round-03 Q36 was checked with both paths: the unconfirmed request returned the expected
  confirmation guard, and a confirmed request generated a private 1024×1536 PNG and received a
  rubric score based on that actual artifact. The provider key is not recorded here or in Git.

## 2026-08-05 practical context gate coverage

- Backend evaluator tests cover an unrelated practical answer: every criterion is zero, no executor
  runs, and the after-lock reference answer is retained. Tests also confirm that the judge receives
  the reviewed context and provider reference.
- `pnpm aipot:content:check` validates the practical-context source of truth in addition to source
  choice/image-content policies. The public A/B Q36–Q40 context is emitted as safe Markdown.
- A live Public A Q36 request with the reported unrelated living-room image prompt returned 0/5,
  `aligned: false`, and `executor_model: not run: context mismatch`.

## 2026-08-05 actual-answer and visual-description coverage

- `aipot:content:check` now fails if an available Q36–Q40 evaluator lacks both a source answer and
  source citation, or if an asset-backed practical prompt still contains a duplicate bracketed image
  description.
- The evaluator test asserts that a post-lock response carries the answer reference and its source.
- Live Public A Q36 feedback returned the book answer and `AI-POT AI프롬프트활용능력 1급 기본서
  구매인증자료 p.58–59`; the live source-round-01 Q39 API payload retained its image crop and
  omitted its former bracketed description.

## 2026-08-05 public PDF text-extraction coverage

- The Public A/B extraction assertion checks the book-derived source data directly: A Q13 must be
  text-only with no copied choices; A Q38 must include its full dataset, `㉠` cell, and expected
  result without a crop; B Q36 must retain its before/after crop; and B Q39 must retain its full
  file facts as text with no crop.
- The live API confirmed A Q13 and A Q38 have `asset_url: null` with the complete appropriate text,
  while B Q36 retains its visual asset and no accidental Q37/Q38 heading.
## AI-POT supplied sample set

- Run `pnpm aipot:content:check`; it rebuild-validates `sample-set-01` from its supplied Markdown
  source and asserts the 40-question, 100-point structure.
- Confirm Q01–Q30 expose answer choices only in controls, Q35 is the PEST short answer, and Q36–Q40
  carry provider references for practical evaluation.

## 2026-08-07 AI-POT catalog selection

- The learner-facing catalog intentionally exposes only `generated-mock-01` (`AI-POT 창작 실전 모의고사 01회`). The other catalog manifests are recoverable from the local trash.
- OCR, source and generated manifests, visual assets, submission history, Compose services, and network configuration were not removed or changed.
- Verification: `docker compose exec -T caddy wget -qO - http://127.0.0.1:18080/api/v1/aipot/exams` must return exactly that one set.

## 2026-08-07 AI-POT response review and inline keywords

- `GET /api/v1/aipot/history` now returns `previous_attempts` per displayed exam. Each summary must link to its saved attempt response and be ordered newest first.
- Q01–Q30 feedback exposes `choice_feedback[].explanation` only; the prior definition/purpose/reason/similarity/difference fields are intentionally absent.
- The learner UI expands every choice's explanation in that choice's own space after an answer is locked. The catalog source is checked with `pnpm aipot:keywords:check`.
- Live verification: a locked Q01 response contained the selected-choice keyword explanation, and the active dashboard history reported its existing attempt.

## 2026-08-07 no-generation practical submission

- `skip_practical_evaluation: true` is an explicit submission-only option. It must not call the evaluator, image/chart generator, or code runner.
- The frontend enables `생성 없이 답안 제출` only when Q01–Q35 are locked and all Q36–Q40 textareas contain a response.
- The stored review must preserve each answer and show `제출됨 · 미평가`, `evaluation: null`, and `자동 평가를 건너뜀`; the automatic score is 0.

## 2026-08-07 five-question page reset

- Activating either five-question page control must call `window.scrollTo({ top: 0, left: 0, behavior: "auto" })` after changing pages.
- The behavior is covered by a frontend unit test; it must not alter answer-board question navigation, which scrolls to a specific question instead.

## 2026-08-07 previous-response question context

- Opening a saved attempt retrieves its active exam and shows the original prompt, applicable source visual, and every multiple-choice option in the review card.
- `내 선택` and `정답` must appear on the original selected/correct option cards; a component test covers mismatched selected and correct choices.
- If a removed historical exam cannot be fetched, the saved review summary remains available without fabricated question content.

## 2026-08-07 Public A/B restoration and answer-key reconciliation

- The active catalog contains `generated-mock-01`, `public-set-a`, and `public-set-b`; Public A/B each contain 40 questions totaling 100 points.
- Run `pnpm aipot:public:check` to assert PDF extraction, practical contexts, all-choice one-field keyword feedback, official answer keys, and valid answer-to-choice mappings.
- Public A Q13 is `multiple_select` with official answer `1|3`; entering `3|1` must score as correct and mark both choices in immediate feedback.
- Short-answer aliases printed in the official answer pages are accepted too; for example, Public A Q24 accepts `sigmoid` and `시그모이드 함수`.
- The current `aipot:content:check` intentionally validates the active generated/public catalog rather than the unavailable sample-set manifest.
- Live Caddy verification returns three sets and confirms Public A Q13 as `multiple_select` with both correct choices marked for `3|1`.

## 2026-08-07 Public A/B evidence completion

- Public A Q01 must expose `/api/v1/aipot/exams/public-set-a/assets/q01.png`; this crop contains the diagram's otherwise unavailable `㉠` fact.
- A Q02/Q14/Q15/Q23 and B Q05/Q22/Q25 must use readable Markdown tables or complete structured option labels, not a full-page crop.
- `tools/test-aipot-public-question-text.mjs` verifies the A Q01 asset, A Q02 comparison table, A Q14 option structure, B Q05 DBSCAN table, and absence of leaked next-section headings.

## 2026-08-07 Public A/B choice-explanation rewrite

- Every Public A/B choice must have exactly `feedback.explanation`, with no generic topic placeholder or PDF page/source label.
- `pnpm aipot:public:check` validates all 409 explanations; it must reject `관련해 구분해야`, `방법 또는 운영 주장`, and `AI-POT AI 프롬프트활용능력` in choice feedback.
- Public A Q06 must explain the included statements for every combination, including ㉤ as a deepfake/생성 AI description rather than a LangChain feature.
- A Q06/Q08/Q14 and B Q01/Q09 are the complete current combination-choice set; each option must have statement-level rather than generic correct/incorrect feedback.

## 2026-08-07 Public A Q08 column restoration

- [x] Q08 displays the `사전 학습 | 미세 조정` boundary in the prompt and every answer choice.
- [x] `pnpm aipot:public:check` asserts Q08's answer and that every Public A/B question prompt is non-empty text.
- [x] `GET http://192.168.219.130:18080/api/v1/aipot/exams/public-set-a` returns the repaired Q08 table and all four labelled choices.

## 2026-08-07 Public A/B short-answer exact policy

- [x] Public A/B Q24–Q30 use only canonical answers and a finite reviewed alias list; no LLM semantic match can award their score.
- [x] Public A Q25 accepts `k-fold cross-validation`, `K-fold validataion`, and `K-fold 교차검증`, but rejects `5-fold cross validation`.
- [x] The locked feedback panel displays the canonical `기대 정답`; previous-answer review continues to display `정답`.
- [x] Practical Q36–Q40 Haiku evaluation passes question, complete context, learner answer, and reference solution to its judge.
- [x] The frontend was rebuilt/recreated only; it is healthy and `/aipot/solve/public-set-a` returns HTTP 200.

## 2026-08-07 Public A/B prompt and choice-bank clarity

- [x] Public A Q26–Q29 and Public B Q26–Q29 preserve their prompt, data/result, and blank relationships as readable Markdown tables.
- [x] Every Public A/B Q31–Q35 choice-bank explanation is unique per item and teaches the item's actual concept.
- [x] Live API verification confirms A Q26–Q29 structured prompts and B Q32's KSampler/CFG explanations.

## 2026-08-07 Public A/B prompt cleanup and unified task tables

- [x] All 80 Public A/B prompts reject terminal empty answer brackets, redundant answer placeholders, and invisible PDF controls.
- [x] The extractor repairs PDF word-wrap splits such as `알고리즘` and `업데이트`; A Q37 has a complete `[이미지 생성]` instruction.
- [x] A Q38 has one parallel `데이터셋 | 프롬프트 | 응답결과` task table, verified through the live API.
- [x] The final scan rebuilt A Q18 and B Q11/Q12 data/request-result structures; outside intentional code blocks, no suspicious PDF word-wrap boundary remains.

## 2026-08-07 Public A/B practical-answer scoring clarity

- [x] PDF pages 58–59 confirm that A Q36's sole printed answer example is `냉방병 예방 팁 3가지를 알려줘.` and that `3가지` is the required scope condition.
- [x] Every Public A/B Q36–Q40 context has source-PDF criteria, verified by `pnpm aipot:public:check`.
- [x] Feedback and previous-attempt views place `PDF 원문 채점 기준` before compact `채점 항목 · 각 1점` scoring; the source answer is collapsible.
- [x] A Q36-style initial-response refinement bypasses the unrelated-context block and reaches practical execution in backend regression tests.
- [x] `ruff`, backend pytest (29 passed), frontend unit tests (37 passed), lint, typecheck, production build, and `git diff --check` passed.
- [x] API and frontend were rebuilt/recreated, became healthy, and `/aipot/solve/public-set-a` returned HTTP 200; Caddy was unchanged.

## 2026-08-07 Practical retry scope

- [x] `서술형 다시풀기` clears only the selected practical-question state; a regression test proves neighboring theory and practical answers remain.
- [x] Whole-set reset controls were removed from active practice and the interim results card.
- [x] Frontend tests (38 passed), lint, typecheck, production build, and `git diff --check` passed.

## 2026-08-07 Practical relevance versus scoring

- [x] A recognizable but incomplete image prompt bypasses the relevance block, executes, and reaches the judge; backend regression coverage verifies this behavior.
- [x] Clearly unrelated text-task image prompts remain pre-execution 0-point outcomes.
- [x] Ruff, backend pytest (30 passed), public-set checks, frontend typecheck, and `git diff --check` passed.

## 2026-08-07 Public A/B practical execution audit

- [x] Regression coverage enumerates every A/B Q36–Q40 combination and proves it reaches an executor and judge even when the relevance client would reject it.
- [x] The non-public unrelated-task protection remains covered separately.
- [x] B Q38's execution context contains all five visible source conditions and rejects the unavailable-source wording.

## 2026-08-07 Practical partial-score visibility

- [x] Full, partial, and missed score tones are unit tested; a 3/5 practical result is labelled `부분 정답·보완 필요` and its completed 1/1 criterion is green.
- [x] The current solve view and previous-attempt review share the same green/amber/red criterion states.
- [x] Frontend tests (39 passed), lint, typecheck, production build, and `git diff --check` passed.

## 2026-08-07 Partial-score navigator state

- [x] The active `문항 바로가기` state distinguishes complete, partial, missed, and unanswered answers; partial answers are amber.
- [x] Previous-attempt review uses the same amber partial state.
- [x] Frontend tests (40 passed), lint, typecheck, production build, and `git diff --check` passed.

## 2026-08-07 Practical execution progress

- [x] A practical execution shows an accessible spinner-backed status row and an `aria-busy` action button.
- [x] Frontend tests (41 passed), lint, typecheck, production build, and `git diff --check` passed.

## 2026-08-07 Media confirmation and public visual recovery

- [x] Locked practical answers are not refreshed through a new evaluator request; image requests require confirmed media before the API call.
- [x] A Q40 and B Q37 now require their original-PDF image crops; B Q36 remains covered and B Q38–Q40 source structures were verified against the crops.
- [x] Public-set checks, Ruff, backend pytest (40 passed), frontend tests (42 passed), lint, typecheck, production build, and `git diff --check` passed.

## 2026-08-07 Final submission keeps locked practical evidence

- [x] Final submission supplies the immediate practical-evaluation ID; the server validates its exam, question, and answer binding before persisting the completed result.
- [x] A contract-change regression test verifies an already locked image result remains submit-ready without a second paid generation.
- [x] OpenAPI/client generation, Ruff, backend pytest (42 passed), frontend tests (43 passed), lint, typecheck, production build, and `git diff --check` passed.
- [x] API and frontend were rebuilt/recreated and became healthy; the live final-submission endpoint accepted a no-answer attempt with the new evidence-ID field.

## 2026-08-07 Image-based private source Set 1

- [x] The Set 1 builder and validator confirm all 25 source photos, all 40 learner questions, direct-solve answer mappings, one-point practical criteria, and required visual assets.
- [x] A backend regression test confirms a reviewed source web manifest cannot be overwritten by older OCR choice text.
- [x] Content validation, Ruff, backend pytest (43 passed), frontend tests (44 passed), lint, typecheck, production build, and `git diff --check` passed.
- [x] API and frontend were rebuilt/recreated and became healthy. The live catalog contains only Set 1 and Public A/B; Q01 returns `적응`, six representative crops return HTTP 200, and direct answers Q01–Q35 all return full credit.

## 2026-08-07 Image-based private source Set 2

- [x] `source-round-02` is generated from 24 photographed pages and validates as 40 questions and 100 points.
- [x] The source validator covers the official Q01–Q35 answers, Q04's PCA/t-SNE multi-select, source assets, practical rubrics, and non-generic choice feedback.
- [x] Set 2's source validation, frontend lint/typecheck/tests/build, backend Ruff/pytest, root production dependency audit, Compose config, and `git diff --check` passed.
- [ ] Frontend production audit reports existing Next.js·PostCSS·sharp vulnerabilities; no dependency update was made for this content-only change.
- [ ] The full content command is blocked by pre-existing `source-round-03` placeholder choices and a generator syntax error; no unrelated source-round-03 content was modified.
- [ ] Live API retrieval was not run because no process listened on `127.0.0.1:18080`; see `docs/skipped-actions.md` for the startup and verification commands.

## 2026-08-07 Image-based private source Set 4

- [x] `source-round-04` is generated from 26 photographed pages and validates as 40 questions and 100 points.
- [x] The source validator covers Q01–Q35 answer mapping, learner-safe OCR reconstruction, short-answer aliases, Q36–Q40 five-point rubrics, and required visual assets.
- [x] The all-set content command and `git diff --check` passed.
- [ ] Live API and browser retrieval were not run; the exact verification commands are in `docs/skipped-actions.md`.

## 2026-08-07 AI-POT full-set restart

- [x] Any started phase (theory, practical, or results) exposes `처음부터 다시 풀기` beside the timer.
- [x] Confirmation clears only the current local draft and preserves submitted attempts.
- [x] Frontend unit tests (46 passed), lint, typecheck, production build, Compose config validation, and `git diff --check` passed.
- [x] The `frontend` service was rebuilt/recreated and is healthy; the Caddy-to-frontend request returned HTTP 200.
- [ ] Targeted Playwright verification is blocked by the absent Chromium executable; the exact install and test command is in `docs/skipped-actions.md`.

## 2026-08-08 AI-POT unanswered aggregation and Set 4 recovery

- [x] Blank reviews are omitted from chapter-result numerators and denominators; blank-only chapters do not render as 0%.
- [x] A regression test verifies that an answered unknown chapter code such as Set 4 `C18` renders safely instead of failing submission.
- [x] Backend Ruff and pytest (46 passed), documentation validators, Compose config validation, the actual Set 4 aggregation check, and `git diff --check` passed.
- [x] The scoped API service was rebuilt/recreated and is healthy; `/health/ready` and `GET /api/v1/aipot/exams/source-round-04` returned HTTP 200 through Caddy.
- [ ] Interactive Playwright verification remains blocked by the absent Chromium executable; the exact install and test command is in `docs/skipped-actions.md`.

## 2026-08-08 AI-POT any-time submission

- [x] Submission is available before starting and throughout theory, practical, and result phases; Q31–Q35 also show an in-body `현재 답안 제출` action.
- [x] Unanswered reviews have explicit `미응답`/`is_unanswered` state and are excluded from wrong-answer-note and weakness-topic aggregation.
- [x] Backend Ruff and pytest (45 passed), frontend tests (49 passed), lint, typecheck, production build, documentation validators, Compose config validation, and `git diff --check` passed.
- [x] Scoped API and frontend rebuild/recreation completed; both are healthy, Caddy remained running, `GET /health/ready` returned HTTP 200, and the Set 3 exam endpoint returned HTTP 200 through Caddy.
- [ ] Targeted Playwright verification is blocked by the absent Chromium executable; the exact install and test command is in `docs/skipped-actions.md`.

## 2026-08-08 Set 4 Q20 visual asset recovery

- [x] Corpus-declared Q20 visual crops are included in the API asset allow-list; the regression test asserts a reviewed source crop returns HTTP 200 and its file bytes.
- [x] Backend Ruff and pytest (46 passed), Compose configuration, and `git diff --check` passed.
- [x] The scoped API service was rebuilt/recreated and reached healthy state; `/health/ready` and Q20's JPEG crop URL returned HTTP 200 through Caddy.
- [ ] Interactive browser verification remains blocked by the absent Chromium executable; the exact command is recorded in `docs/skipped-actions.md`.

## 2026-08-08 Set 4 Q28 scenario-list recovery

- [x] The manifest sanitizer removes a terminal numbered list only when its text matches the UI choices; a regression test preserves a non-choice four-item scenario list.
- [x] Backend Ruff and pytest (47 passed), Compose configuration, and `git diff --check` passed.
- [x] The scoped API service was rebuilt/recreated and reached healthy state; all four Q28 scenario facts were confirmed through Caddy.
- [ ] Interactive browser verification remains blocked by the absent Chromium executable; the exact command is recorded in `docs/skipped-actions.md`.

## 2026-08-08 Set 4 Q28 learner prompt rendering recovery

- [x] The frontend preserves a numbered scenario list when it differs from the answer-choice text; a regression test covers Q28-style content.
- [x] Frontend unit tests (51 passed), typecheck, lint, production build, Compose configuration, and `git diff --check` passed before handoff.
- [x] The scoped frontend service was rebuilt/recreated; the Q28 introductory phrase remains present in the Set 4 API response through Caddy.
- [ ] Interactive browser verification remains blocked by the absent Chromium executable; the exact command is recorded in `docs/skipped-actions.md`.

## 2026-08-08 Set 5 Q04 underline recovery

- [x] The reviewed OCR and generated manifest preserve Q04's underlined `㉠` marker from the source photograph.
- [x] All source-manifest checks, frontend unit tests (51 passed), typecheck, lint, and `git diff --check` passed.
- [x] The Set 5 endpoint was verified through Caddy to contain `__㉠__`; the deployed frontend has the matching underline renderer.
- [ ] Interactive browser verification remains blocked by the absent Chromium executable; the exact command is recorded in `docs/skipped-actions.md`.

## 2026-08-08 AI-POT wrong-note Set 1

- [x] `sample-set-01` selects only the newest submissions for A, B, 1, 2, 3, and 4, excluding blank answers.
- [x] Its validator checks 100 one-point questions, only short answers or four-option multiple choice, and target-set provenance.
- [x] Backend/frontend checks and the scoped API/frontend rebuild completed. Both services are healthy; Caddy and the history volume were not restarted or removed.
- [ ] Browser-level Q100 interaction remains blocked by the absent Chromium executable; see `docs/skipped-actions.md`.

## 2026-08-08 AI-POT wrong-note Set 1 removal

- [x] The active `sample-set-01` manifest was moved to Linux trash; the catalog no longer exposes the set.
- [x] The 100-question review-mode implementation and regeneration tooling were retained for the requested remake.

## 2026-08-08 AI-POT wrong-note Set 1 recreation

- [x] Generated `sample-set-01` with exactly 50 two-point questions (100 total): only finite-alias short answers or four short-option multiple-choice questions.
- [x] Provenance records the newest submitted attempt for each target A, B, 1, 2, 3, and 4. It allows Public B's current submitted mistakes, excludes blank answers, and traces every rendered question to a selected review.
- [x] Public A Q38 is explicitly excluded because its stored partial-score criterion is contradicted by the reviewed prompt/reference answer.
- [x] Backend Ruff/pytest (50 passed), frontend lint/typecheck/unit tests (52 passed), production build, content/playbook validators, dependency audit, Compose config, and `git diff --check` passed. API contracts were regenerated from FastAPI.
- [x] Scoped API/frontend rebuild/recreation is healthy; live Caddy verification returned `wrong_note`, Q01–Q50, 100 points, and Q50 immediate feedback.
- [ ] Browser-level Q50 interaction is pending the unavailable Chromium executable; see `docs/skipped-actions.md`.

## 2026-08-08 Wrong-note navigator refinement

- [x] Review navigation presents a plain visible number and an accessible `문항 {number}` status label; the grid has five equal controls per row with the existing 44px minimum target height.
- [x] Frontend lint, typecheck, unit tests (53 passed), production build, and `git diff --check` passed. The scoped frontend was rebuilt/recreated and its Set 1 solve route returned HTTP 200 through Caddy.

## 2026-08-08 Wrong-note descriptive-source exclusion

- [x] The Set 1 generator and manifest validator reject rendered content derived from source `short_answer` or `practical_prompt` questions; only `multiple_choice` and `choice_bank` origins remain.
- [x] Backend Ruff/pytest (51 passed), full content validation, and `git diff --check` passed. The live API reports the regenerated 50-question/100-point set.

## 2026-08-08 Wrong-note duplicate repair

- [x] Every repeated concept now uses a distinct reviewed scenario; no rendered type/prompt/choice fingerprint repeats.
- [x] The wrong-note validator and a backend regression test enforce this rule. Backend Ruff/pytest (52 passed), full content validation, and `git diff --check` passed.

## 2026-08-16 Public hostname revalidation

- [x] `web.heybobma.dedyn.io` resolves to the configured public IPv4 address; the active system Caddy configuration proxies it to `127.0.0.1:18080`.
- [x] Caddy logs confirm successful Let's Encrypt TLS-ALPN validation and certificate issuance. Local SNI HTTPS requests to `/` and `/health/ready` returned HTTP 200.
- [x] The project Caddy retains `127.0.0.1:18080` for system-Caddy HTTPS and, with the optional LAN overlay, also listens on the explicitly requested direct-test address `192.168.219.199:18080`; its Compose configuration validated and its scoped recreation reached healthy status.
- [ ] The host cannot verify the public hostname from its own LAN because its public-IP connection times out. The router's NAT-loopback/split-DNS decision is recorded in `docs/skipped-actions.md`.
