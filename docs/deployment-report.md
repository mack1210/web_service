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

## AI-POT practical context relevance gate — 2026-08-05

The evaluator was promoted with a versioned cache contract and a pre-execution Haiku relevance gate.
It receives the reviewed Markdown question context, declared text/image input material, and, where
the supplied source contains it, a provider-derived reference answer. A non-matching answer is
persisted as zero evidence without running a text, code, or image executor. The judge then receives
the same task packet plus the actual generated artifact/result for aligned answers. Public A/B
Q36–Q40 now have task-specific Markdown contexts and rubrics rather than generic screenshot
placeholders; source rounds retain their reviewed prompt and declared source material.

Live verification on port 18080 submitted the reported unrelated living-room image prompt to Public
A Q36. It returned 0/5, `context_alignment.aligned: false`, no executor model run, a Korean
task-mismatch explanation, and the after-lock reference answer. API, frontend, Caddy, and readiness
remained healthy after the API/frontend rebuild.

## AI-POT actual practical-answer sources — 2026-08-05

The practical answer references are no longer inferred scoring summaries. Public A Q36–Q40 were
transcribed from the supplied `AI-POT AI프롬프트활용능력 1급 기본서_구매인증자료.pdf` printed
pages 58–59, and Public B Q36–Q40 from printed page 59. Original source-round examples were read
from their photographed answer pages; rounds 04 and 05 were additionally verified against pages 26
and 28. Each post-lock evidence response now contains both the exact answer example and a source
label, and the frontend displays it under `원문 답안 예시`.

The mounted learner manifests were regenerated. Practical question stems with a reviewed image crop
no longer repeat `[이미지: ...]` or `결과물 이미지` prose; the crop remains the visual evidence. Live
checks confirmed Public A Q36 returns the actual `냉방병 예방 팁 3가지를 알려줘.` answer and its
book citation, while source-round-01 Q39 retains its crop and no longer exposes the redundant
park-image description.

## AI-POT public-set lossless PDF extraction — 2026-08-05

The supplied book contains searchable source text for all Public A/B question pages. A new
source-of-truth extraction tool converts that text into learner-safe Markdown, removes full-page
crops where no information is lost, and retains crops only for genuinely visual evidence. This
applies to every Public A/B question, not only practical questions. Public A Q38 is now represented
by its complete four-row dataset table, a `㉠` prompt cell, and all four output rows; A Q13 is text
only and has no duplicate options in its stem. Public B Q36 still retains its before/after image.

The live API on port 18080 confirmed those three cases. The content check now regenerates/validates
the PDF extraction and runs source assertions so a future set cannot regress to a generic page crop.
## 2026-08-06 — AI-POT supplied sample set

`sample-set-01` is available through the mounted AI-POT content directory. It is generated from the
provided Markdown source, uses the shared 100-point structure, and contains no redundant page-image
attachments because every required table/chart was transcribed losslessly.

## 2026-08-07 — AI-POT catalog reduction

At the operator's request, 17 learner-facing catalog manifests were moved to the local trash from
the mounted `data/web-exams` directory. The live API through Caddy now returns only
`generated-mock-01`, titled `AI-POT 창작 실전 모의고사 01회` (40 questions). OCR transcriptions,
image assets, generated source manifests, and the persisted `aipot_history` volume were preserved;
no service, port, proxy, or container was changed.

## 2026-08-07 — AI-POT response review and inline keywords

The API now returns all prior attempts for each remaining exam, and the dashboard presents a
numbered `기존 응답 보기` link for each one. The Q01–Q30 feedback contract was reduced from five
verbose per-choice fields to one keyword-focused explanation. On answer lock, the frontend renders
each explanation inside its own choice; it no longer moves to a separate all-choice panel.

The retained `generated-mock-01` catalog manifest now contains 120 concise keyword explanations
(four for each multiple-choice question). Only the API and frontend Compose services were rebuilt;
Caddy, the sandbox, ports, mounted OCR/assets, and persisted history were not changed. The live
Caddy API confirmed the history links and the new one-field feedback response.

## 2026-08-07 — AI-POT no-generation practical submission

Q36–Q40 now support an explicit `생성 없이 답안 제출` path once Q01–Q35 are locked and all five
practical answers have been written. It persists the written answers while skipping the evaluator,
image/chart generation, and code execution. The review labels each saved practical answer
`제출됨 · 미평가`; its automatic score is 0, so it is never presented as an evaluated result.

The submission request carries an opt-in `skip_practical_evaluation` flag. Its backend regression
test proves the evaluator is not called. API and frontend services were rebuilt for this change;
Caddy, the sandbox, ports, mounted assets, and history volume remain unchanged.

## 2026-08-07 — AI-POT five-question page reset

The previous/next five-question controls now reset the document scroll position to the top with no
animation. This prevents a learner who completes the fifth card of a page from landing at the bottom
of the next page. The change is frontend-only; no API, data, service topology, or persisted history
was changed.

## 2026-08-07 — AI-POT previous-response question context

Saved-response reviews now load the retained exam alongside the attempt record. Each review card
shows the original prompt, supplied visual material where applicable, and every original
multiple-choice option. The learner's selection and the recorded correct answer are badged on the
corresponding option cards. This frontend-only release does not alter the attempt, OCR/assets,
catalog, API, Caddy, sandbox, ports, or persisted history.

## 2026-08-07 — AI-POT Public A/B restoration and answer-key reconciliation

`public-set-a` and `public-set-b` were restored from their recoverable learner manifests and rebuilt
from the supplied reference PDF using the current AI-POT format. Both now use the one-field, inline
choice-keyword feedback contract and the current practical-question context. Existing focused public
assets are reused; no source OCR, original-round asset, or study-history data was removed.

The supplied Public A answer page exposed a shifted legacy key after Q13. Direct question/answer-page
comparison corrected A Q13 as the official multiple selection `1|3`, A Q14–Q35, and B Q19. The API
now also recognizes reversed multiple-selection input order and marks every correct option in
immediate feedback. A reproducible public-set check validates the 40-question/100-point structure,
official keys, available choice IDs, practical references, and current choice-feedback shape.

Only the API service was rebuilt and recreated for the multiple-selection feedback correction. The
frontend remained healthy because it already supports `multiple_select`; Caddy, the sandbox, ports,
mounted public assets, and persisted history were unchanged. Live Caddy checks returned the three
active sets and accepted Public A Q13 answer `3|1` as correct with both official options marked.
The same live check accepted Public A Q24's official Korean alias `시그모이드 함수`.

## 2026-08-07 — AI-POT Public A/B evidence completion

The Public A/B PDF was reviewed again for answer-critical evidence. The learner manifests now retain
focused assets only for irreducibly visual material: A Q01's concept diagram, A's framework/workflow,
watermark, video-setting, and reference-image items; B's framework/scatterplot, ComfyUI-setting, and
before/after image items. Textual tables are represented as safe Markdown instead of opaque page
screenshots. In particular, A Q02, Q14, Q15, and Q23 and B Q05, Q22, and Q25 now keep their row and
column relationships, while A Q01 includes the original crop containing the otherwise missing `㉠`.

Live Caddy requests confirmed A Q01 exposes its restricted source asset, A Q02 exposes the comparison
table, A Q14 exposes complete paired option labels, and B Q05 exposes the DBSCAN step table. No new
image was generated; only existing private PDF crops are used.

## 2026-08-07 — AI-POT Public A/B choice-explanation rewrite

The former restored feedback was mechanically derived and contained generic topic labels and leaked
source-page text. All 217 Public A and 192 Public B options now use one concise, question-specific
keyword explanation. The explanation identifies the relevant concept where the option names a tool
or method and always relates that option to the stem's actual criterion. For example, A Q05 now
distinguishes TensorFlow, PyTorch, scikit-learn, and Apache Spark instead of repeating a generic
LLM label. The validation rejects the prior generic phrases and any `AI-POT ... 공개문제` source label.

Combination choices now receive statement-level explanations. Public A Q06, for example, explains why
㉠·㉢·㉣ form the correct LangChain combination and why each alternative fails through ㉡ or ㉤.

The full public-catalog scan found the remaining combination-choice questions at A Q08/Q14 and B
Q01/Q09. Their explanations now identify the membership or mapping error in every answer combination.

## 2026-08-07 — Public A Q08 column restoration

Public A Q08 has been rebuilt as a readable statement table, and every answer explicitly labels
`사전 학습` and `미세 조정` on either side of `|`. `pnpm aipot:public:check` confirms that
option 1 remains correct and rejects non-text or blank source prompts. The live public API also
returns the reconstructed table and all four labelled choices without rebuilding a service.

## 2026-08-07 — Public A/B short-answer exact policy

Public A/B Q24–Q30 now document and enforce a finite exact-answer policy. They are scored locally
against the canonical answer and only the reviewed aliases; Haiku cannot broaden a short-answer
match. Public A Q25 accepts `k-fold cross-validation`, `K-fold validataion`, and `K-fold 교차검증`,
but rejects `5-fold cross validation`. The immediate locked-answer panel now shows the canonical
`기대 정답`.

For Q36–Q40, Haiku continues to receive the original question, task context, learner answer, and
provider reference solution before it evaluates the practical response. Regression tests assert all
four inputs are supplied to the judge.

The frontend service alone was rebuilt and recreated to publish the immediate `기대 정답` label.
It reached healthy status, and the Public A solve route returned HTTP 200. API, Caddy, sandbox,
mounted source assets, and persisted history were left running and unchanged.

## 2026-08-07 — Public A/B prompt and choice-bank clarity

The Public A PDF review rebuilt Q26–Q29 into faithful readable structures, including the Q27 CSV
schema, the requested age-distribution pie chart, and the Q28 prompt/result relationship. The same
audit identified a layout loss in Public B Q29; B Q26–Q29 have been structured consistently.

Public A/B Q31–Q35 use shared choice banks. Rather than repeating the answer-key sentence beneath
every option, each option now defines itself and then states its relation to the current blank. The
live API verifies the corrected A stems and B item explanations. This is mounted study data only;
no service was rebuilt or restarted.

## 2026-08-07 — Public A/B prompt cleanup and unified task tables

The Public A/B extraction path now removes trailing `( )` answer artifacts, redundant answer-line
placeholders, invisible PDF control characters, and known PDF word-wrap splits. The answer UI is
the sole answer entry point. Public A Q37's image-generation instructions now preserve `[이미지 생성]`
and `동작` as complete readable text.

Public A Q38 was corrected from two disconnected tables into one `구분 | 내용` table: dataset,
prompt, and expected response are now parallel rows. Static checks cover all 80 prompts and the
live API confirms the corrected A Q37/Q38 payload. This is mounted content only; no service restart
was required.

The same all-prompt scan found structural label loss in Public A Q18 and Public B Q11/Q12. A Q18 now
has explicit remote-ratio, employment, experience, and education rows; B Q11 separates the added
education request from the result, and B Q12 separates the masking request from its result. Live API
requests confirm each repaired payload.

## 2026-08-07 — Public A/B practical-answer scoring clarity

PDF pages 58–59 were rechecked against the published practical tasks. Public A Q36's source answer
example is exactly `냉방병 예방 팁 3가지를 알려줘.`; it is the only example printed for that item.
The adjacent source explanation establishes that `3가지` is the required range limit, rather than
requiring exact sentence reproduction.

All Public A/B Q36–Q40 practical contexts now expose their source-PDF criteria. Feedback and
historical reviews display those criteria first, followed by a concise one-point-per-item learning
rubric and an expandable source answer. The prior duplicated context-mismatch rationale is removed.

The evaluator now recognizes an answer that refines the question's displayed initial response to
the required number of results as relevant context. Thus the Q36 answer form “최초 응답에서 3가지만
남겨줘” reaches execution/evaluation rather than being blocked by the relevance precheck. API and
frontend were rebuilt/recreated and became healthy; `GET /aipot/solve/public-set-a` returned HTTP
200. Caddy was not restarted or modified.

## 2026-08-07 — Practical retry scope

Practical retry is deliberately per-question: it removes only the selected Q36–Q40 answer, lock,
and feedback state. The separate in-progress whole-set reset controls were removed from the sidebar
and results card. Other question answers, scores, timer state, and feedback are preserved.

## 2026-08-07 — Practical relevance versus scoring

The Q37 report exposed an incorrect relevance-gate behavior: a multi-sentence image prompt missing
the black-and-white requirement was relevant but was prevented from executing. Relevance now means
an attempt to perform the given task. Completeness, sentence form, style, ratio, and subject details
are execution-and-judge scoring concerns rather than pre-execution blockers. Clearly unrelated tasks
remain blocked. The evaluation contract version was bumped to invalidate stored mismatch results for
the same answer.

## 2026-08-07 — Public A/B practical execution audit

The A/B public practical sets require learning feedback from imperfect answers, so Q36–Q40 are now
always executed before their five one-point criteria are judged. The previous pre-execution relevance
call cannot produce `not run: context mismatch` for these ten questions. Image questions still require
the existing explicit media-generation confirmation. The evaluator contract version was advanced again
to invalidate results stored under the former public gating behavior.

The B Q38 execution context was also repaired: it now contains the Earth Day poster, child with globe,
forest/clear sky, `Earth Day`, and 1:1 source conditions, rather than an unavailable-source claim.

## 2026-08-07 — Practical partial-score visibility

The solver and historical review now use the same score-state treatment. Full-credit criteria are
green, nonzero partial-credit criteria are amber, and zero-credit criteria are red. A nonzero but
non-perfect question score is also amber rather than being presented as a blanket wrong answer.

The active answer navigator now gives a partially correct number the same amber state and a `부분 정답`
accessibility label. Historical review cards retain the equivalent amber partial-score treatment.

## 2026-08-07 — Practical execution progress

Practical submission now visibly communicates the asynchronous work: the action button spins and
changes to a text- or image-specific in-progress label, and a status row shows the same progress.
The controls are disabled while the evaluator runs, preventing duplicate submissions.

## 2026-08-07 — Media confirmation and public visual recovery

The paid-media error was traced to saved image-practical feedback being refreshed without
`confirm_media=true` after a reload or evaluator-contract change. Saved practical feedback is now
preserved locally instead of re-executed. New image requests are guarded before the API call and the
confirmation dialog remains open while its confirmed request runs. The server fallback message is
now Korean and tells the learner exactly which confirmation action is needed.

PDF crop review restored two missing learner visuals: Public A Q40's generated book-and-gavel image
and Public B Q37's Earth Day poster. Public B Q36 was already attached; Q38–Q40 are source text or
expected-response structures, not omitted reference images.

## 2026-08-07 — Final submission keeps locked practical evidence

Final submissions now carry the ID returned when each practical answer was locked. The API binds that
ID to the exact exam, question, and answer hash, then saves the completed score and artifact directly.
This prevents a later evaluator-contract change from blocking an already-confirmed image or text
result. The legacy hash lookup remains as a recovery fallback only.

## 2026-08-07 — Image-based private source Set 1

The active catalog now includes `source-round-01`, built from 25 photographed source images: 21
question pages and four answer/explanation pages. A source builder creates the learner manifest and
a regression validator checks all 40 question structures, direct-solve answer mappings, required
crops, and the original-photo inventory. The API deliberately treats this reviewed web manifest as
authoritative instead of reapplying archival OCR choices.

The creative `generated-mock-01` active/legacy manifests and its seven dedicated assets were moved
to the Linux trash. Public A/B were not changed.

## 2026-08-07 — Image-based private source Set 2

`source-round-02` was added as a content-only learner manifest generated from 24 photographed
source pages. Its dedicated builder and validator cover the 40-question, 100-point structure,
official Q01–Q35 answers, Q04 multi-select restoration, source crops, practical rubrics, and
unique option explanations. No API contract or deployment configuration changed.

Frontend lint, typecheck, unit tests, production build; backend Ruff and pytest; root production
dependency audit; and Compose validation passed. The frontend production audit reports existing
Next.js·PostCSS·sharp findings and the full content command remains blocked by pre-existing
`source-round-03` placeholder·생성기 오류; Set 2's dedicated content validation passed. The live endpoint was not
checked because no service was listening on local port 18080; the retry command is in
`docs/skipped-actions.md`.

## 2026-08-07 — Image-based private source Set 4

`source-round-04` was added as a content-only learner manifest generated from 26 photographed
source pages. Its builder and validator cover the 40-question, 100-point structure, reviewed
Q01–Q35 answer mapping, strict Q31–Q35 aliases, individual option feedback, and five one-point
practical rubrics. The API exposes only Q37, Q39, and Q40 focused reference assets; raw pages and
answer/example pages remain unavailable to learners. No API contract, Caddy, or Compose setting changed.

## 2026-08-07 — AI-POT restart control deployment

The frontend was rebuilt and the scoped `frontend` Compose service was recreated without changing
the API, Caddy, or system Caddy. It is healthy and serves the restored full-set restart control:
after a learner starts any AI-POT set, `처음부터 다시 풀기` appears beside the timer and opens a
confirmation dialog before clearing local in-progress state.

## 2026-08-08 — AI-POT any-time submission deployment

The API and frontend Compose services were rebuilt and recreated to expose any-time submission for
every AI-POT set, including Set 3 Q31–Q35. The learner can submit before starting or at any point in
theory, practical, and results. Unanswered reviews now carry an explicit `is_unanswered` flag and
`미응답` result; wrong-answer-note and weakness-topic aggregation exclude them. Caddy, the system
Caddy, and `aipot-sandbox` were not restarted. Both recreated services reached healthy state, the
publicly bound Caddy origin returned the Set 3 manifest, and `/health/ready` returned HTTP 200.

## 2026-08-08 — AI-POT unanswered aggregation and Set 4 recovery

The scoped `api` Compose service was rebuilt and recreated. Blank responses are now excluded from
chapter-result numerators and denominators, so blank-only chapters are omitted instead of shown as
0%. The server now safely uses an unknown source-set chapter code as its display title, resolving
the Set 4 `KeyError: 'C18'` that prevented result submission. Caddy, system Caddy, frontend, and
`aipot-sandbox` were not restarted. The recreated API reached healthy state; `/health/ready` and
the Set 4 exam endpoint returned HTTP 200 through Caddy.

## 2026-08-08 — Set 4 Q20 visual asset recovery

The scoped `api` Compose service was rebuilt and recreated to serve corpus-declared visual crops
from reviewed source manifests. The recreated API is healthy; `/health/ready` and
`GET /api/v1/aipot/exams/source-round-04/assets/q20-visual-01.jpg` returned HTTP 200 through
Caddy, with the latter served as `image/jpeg`. Caddy, system Caddy, frontend, and
`aipot-sandbox` were not restarted.

## 2026-08-08 — Set 4 Q28 scenario-list recovery

The scoped `api` Compose service was rebuilt and recreated after the manifest sanitizer was changed
to compare numbered terminal text with the actual UI choices before removing it. This retains Q28's
four numbered case facts while still removing true duplicated choices. The recreated API is healthy,
and the Set 4 endpoint through Caddy contains all four Q28 facts. Caddy, system Caddy, frontend,
and `aipot-sandbox` were not restarted.

## 2026-08-08 — Set 4 Q28 learner prompt rendering recovery

The scoped `frontend` Compose service was rebuilt and recreated after its prompt renderer was
changed to retain numbered terminal content unless it exactly matches the answer controls. This
restores Q28's `다음과 같은 문제점들이 발견되었다` introduction and the four case facts in the
learner card. The API response through Caddy was confirmed to contain that phrase. Caddy, system
Caddy, API, and `aipot-sandbox` were not restarted.

## 2026-08-08 — Set 5 Q04 underline recovery

The reviewed Set 5 manifest was regenerated so Q04 exposes the source-photo underline as
`__㉠__`. The deployed frontend renderer converts that marker to semantic underlined text. The
live Set 5 endpoint was verified through Caddy to contain the marker; no Compose service needed
recreation, and Caddy, API, and `aipot-sandbox` were not restarted.

## 2026-08-08 — AI-POT wrong-note Set 1 prepared

`sample-set-01` was generated as a 100-question, 100-point personal review set. Its provenance
records the newest selected submission per allowed target set, excludes blank responses, and does
not manufacture a Public B attempt. The scoped API and frontend were rebuilt/recreated and are
healthy; the live API returns `study_mode: wrong_note`, 100 questions, and Q100. Caddy and
`aipot_history` were not restarted or removed.

## 2026-08-08 — AI-POT wrong-note Set 1 removed

At the operator's request, only the active `sample-set-01` learner manifest was moved to the Linux trash. The general 100-question review-mode support and the regeneration tool remain in place for the next version. Caddy, API/frontend service topology, and `aipot_history` were preserved.

## 2026-08-08 — AI-POT wrong-note Set 1 recreated

`sample-set-01` has been regenerated as a 50-question, 100-point review set (two points each), using
the newest submitted attempt per allowed target: Public A/B and source rounds 1–4. It is intentionally
weighted by the learner's current error types rather than split evenly by round: A 13, B 4, round 1 0,
round 2 6, round 3 2, and round 4 25. Public A Q38 is retained only as an excluded provenance record
because its stored scoring criterion conflicts with the reviewed prompt and reference answer.

The scoped API and frontend services were rebuilt/recreated and reached healthy state. Through Caddy,
the live endpoint reports `study_mode: wrong_note`, 50 questions, 100 total points, a final Q50, and
valid Q50 immediate feedback. Caddy, system Caddy, and `aipot_history` were not restarted or removed.

## 2026-08-08 — Wrong-note navigator refinement

The review-set navigator now shows only the question number rather than a `Q`-prefixed identifier and
uses five controls per row. Screen readers retain the explicit `문항 {number} {status}` label. The
scoped frontend was rebuilt/recreated and is healthy; the Set 1 solve route returned HTTP 200 through
Caddy. API and Caddy were not restarted.

## 2026-08-08 — Wrong-note descriptive-source exclusion

Set 1 was regenerated directly in the mounted learner-content corpus. Its builder now permits source
questions of type `multiple_choice` or `choice_bank` only; all `short_answer` and `practical_prompt`
origins, including the former Q12/Q13 practical-derived items, are recorded as excluded provenance.
The 50-question, 100-point set remains available through the live API without a service restart.

## 2026-08-08 — Wrong-note duplicate repair

Set 1 was regenerated with distinct, concept-specific scenario wording for every repeated source concept;
no rendered question fingerprint is duplicated. The validator now rejects a repeated type, normalized
prompt, and choice-set combination before the set can ship. The mounted content update is live without
restarting API, frontend, or Caddy.

## 2026-08-16 — `web.heybobma.dedyn.io` public HTTPS route

The existing system Caddy now owns the public hostname and reverse-proxies it to this project's
Caddy ingress at `127.0.0.1:18080`. Caddy's Let's Encrypt TLS-ALPN validation was received from
public validation addresses and completed successfully; the certificate was downloaded at
2026-08-16 13:14 KST. A subsequent local SNI request to `https://web.heybobma.dedyn.io/` returned
HTTP 200, and `/health/ready` returned the API readiness JSON through both Caddy layers.

The project Caddy keeps its loopback ingress for system-Caddy HTTPS and, with the optional
`compose.lan.yaml` overlay, also binds the explicitly requested LAN test address
`192.168.219.199:18080`, rather than all interfaces.

The active direct-LAN test endpoint is `http://192.168.219.199:18080/`. Start or retain that
listener with `docker compose -f compose.yaml -f compose.lan.yaml --profile production up -d
--wait caddy`; the default Compose file alone intentionally leaves only the loopback ingress.
The system Caddy, API, frontend, sandbox, and `aipot_history` volume were preserved. The origin's
attempt to reach its own public IP timed out, which is consistent with absent NAT loopback; this
does not affect external HTTPS reachability, but local-LAN hostname access needs router hairpin NAT
or a split-DNS override.

## 2026-08-16 — Cloudflare Workers frontend build path

The frontend now has a separate Cloudflare Workers delivery artifact: OpenNext builds Next.js into
`frontend/.open-next/worker.js` plus `.open-next/assets`, and `frontend/wrangler.jsonc` deploys
those paths with `nodejs_compat`. `wrangler deploy --dry-run` validated the Worker and 29 assets,
and local `wrangler dev` returned HTTP 200 for `/`. No Cloudflare account deployment, domain
change, origin-route change, or Compose mutation was performed.

For Workers Builds configured at repository root, the existing `npx wrangler deploy` command now
uses root `wrangler.jsonc` to reinstall the isolated frontend dependency graph with a frozen pnpm
install and generate the OpenNext Worker before upload. `pnpm cloudflare:deploy` remains the
equivalent explicit local command using the pinned frontend toolchain.

The Worker needs `NEXT_PUBLIC_DATA_SOURCE=http` and an approved public HTTPS
`NEXT_API_ORIGIN` in Cloudflare Build Variables and secrets. That API origin must not be the same
hostname routed to this Worker, or Next's `/api/*` rewrite would loop. Selecting/exposing that
origin and its authentication boundary remains an operator security decision.

The follow-up production dependency audit reports 14 pre-existing advisories (8 high and 6
moderate), including Next.js `16.2.10` and transitive PostCSS/sharp paths. The Cloudflare adapter
addition did not update application dependencies; a separately approved upgrade and compatibility
pass is required before representing the Worker deployment as security-remediated.
