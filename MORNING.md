# Morning Handoff

**DEVELOPMENT_STATUS:** COMPLETE — the deployed AI-POT private-study tab now provides the active Source Set 1 and Public A/B sets, immediate locked-answer feedback, Korean choice explanations, 40/20 active-time phases, browser drafts, final review, and local weakness history. Frontend lint/typecheck/unit/build and backend pytest/OpenAPI checks pass.

**DEPLOYMENT_STATUS:** LAN-bound origin healthy on Compose project `overnight-web-agent-kit`, running from `/home/cgma/apps/web_service`.

**EXTERNAL_REACHABILITY:** Direct LAN access is enabled at `192.168.219.130:18080` by an ignored local `.env` setting. 5G/public reachability was not re-tested. A Cloudflare Tunnel public hostname is pending an account tunnel token and hostname; it is not yet claimed.

**PRIMARY_URL:** `http://192.168.219.130:18080`

**AI-POT URL:** `http://192.168.219.130:18080/aipot`

**AI-POT CATALOG:** Seven active sets: image-based private `source-round-01` through `source-round-05` plus `public-set-a`/`public-set-b`. The retired creative `generated-mock-01` manifests and seven dedicated assets were moved to the Linux trash; original photos, OCR/corpus, required crops, and submitted history remain intact. The canonical next-set rules and complete request/resolution history are in [the AI-POT next-set playbook](docs/aipot-next-set-playbook.md).

**AI-POT REVIEW FLOW:** Each saved attempt is now linked as its own numbered `기존 응답 보기` entry. For Q01–Q30, locking a selection opens every choice's concise keyword explanation in that choice's own space; the former separate all-choice detail panel is removed.

**AI-POT PRACTICAL SUBMISSION:** Once Q01–Q35 are locked, learners may either choose `서술형 건너뛰고 종료` and leave Q36–Q40 unanswered (each records 0), or use `생성 없이 답안 제출` for written practical answers. The latter stores the answers without image/chart generation, code execution, or automatic evaluation; each is explicitly recorded as `제출됨 · 미평가` with automatic score 0. Neither path overwrites a practical answer whose evaluation was already locked.

**AI-POT PAGINATION:** The previous/next five-question controls now reset the document scroll position to the top immediately, so a learner who finishes Q05 starts Q06 at its heading.

**AI-POT PREVIOUS RESPONSES:** Opening a saved response now shows the original prompt and all choices. `내 선택` and `정답` appear on their matching choice cards so learners can compare answers in context.

**AI-POT PUBLIC SETS:** The learner catalog includes `public-set-a` and `public-set-b`, recreated from the supplied reference PDF. Their questions use the same current rendering, inline per-choice keyword feedback, and practical submission template as Source Set 1. The A/B answer keys were rechecked against the supplied answer pages; A Q13 accepts both official choices `1|3`.

**AI-POT PUBLIC EVIDENCE:** Public A/B now classify source evidence per question. Irreducibly visual concepts and UI states retain focused PDF crops (including Public A Q01's ㉠ concept diagram); tables and text-only material are reconstructed as readable Markdown, so no question depends on a missing visual fact.

**AI-POT PUBLIC CHOICE EXPLANATIONS:** Every Public A/B option now has a question-specific keyword explanation. It explains the relevant concept and whether the option meets the stem; generic placeholder prose and leaked PDF page labels are rejected by the public-set validation.

For combination options, explanations identify the status of each included statement rather than repeating the overall answer; Public A Q06 explicitly distinguishes LangChain statements ㉠·㉢·㉣ from the prompt and deepfake statements ㉡·㉤.

The same statement-level rule now covers every Public A/B combination question: A Q06/Q08/Q14 and B Q01/Q09.

**AI-POT DATA:** Source material is mounted read-only from `/home/cgma/cgma_git/study/aipot/실전모의고사`; submitted private study history is in the Compose-owned `aipot_history` volume. The pre-existing no-login/plain-HTTP warning applies: this is only for non-sensitive personal study.

**LOOPBACK_STATUS:** Not listening in the current LAN-bound mode; use `PRIMARY_URL` even on the host.

**PROMOTION:** The isolated `:18081` review image was verified, promoted to `:18080`, then removed. On 2026-07-13 the project moved to `/home/cgma/apps/web_service`; the main Compose containers were recreated from that path and then bound to the operator's LAN IP to restore local notebook access. System Caddy on 80/443 and unrelated services were not changed.

**KEY IMPROVEMENTS:** Mobile overflow fixed; modal focus/scroll/escape behavior fixed; duplicate action guard added; control contrast corrected; API error contract and validation hardened; request IDs validated; security headers/robots/icon added.

**MANUAL_ACTIONS:** Before activating a remotely managed Cloudflare Tunnel, change local `HOST_BIND_ADDRESS` back to `127.0.0.1`, set its public-hostname origin to `http://caddy:18080`, and place its token only in the untracked `.env`; then run the documented Cloudflare build/deploy commands. Decide an authentication model before handling sensitive data. Safari/WebKit and Lighthouse remain unrun.

**EVIDENCE:** [docs/production-improvement-report.md](docs/production-improvement-report.md) and [docs/deployment-report.md](docs/deployment-report.md).

**2026-08-04 AI-POT CHECKS:** `/aipot`, `/health/ready`, and `/api/v1/aipot/exams` returned successfully after recreating only the API and frontend services. Source Q01–Q40 return OCR text; any visual-dependent prompt receives only its reviewed crop, never a full original page, while source answer pages return 404. Source multiple-choice stems and their four real text/table values are now separated for all 150 questions; source multi-answer questions use checkboxes. Every generated mock supplies visual material for Q36–Q40 (notice, reference photo, code brief, chart, and email). The mobile answer drawer no longer resets its scroll when the timer or answer state updates. Playwright E2E remains blocked locally because its Chromium executable is absent; the added regression is checked in and documented in `docs/skipped-actions.md`.

**2026-08-04 OCR VISUAL CROPS:** A full review of all five original source rounds identified 38 Q01–Q35 and 14 Q36–Q40 diagram, graph, screenshot, and image prompts that need source visuals to be solvable. Each now uses a focused crop from the original photographed page, including source round 1 Q21 and the shared Google Flow settings/result visual for Q34–Q35; nonvisual practical prompts use OCR text only. The API allow-lists only declared crops, and the frontend renders them without interpreting OCR as HTML or links. Browser-local drafts were not touched.

**DEPENDENCY AUDIT:** `pnpm audit` currently reports 20 advisories (14 high, 6 moderate) in existing locked dependencies, including Next.js `16.2.10` with fixes at `16.2.11`. No dependency update was made because it requires an explicit approval and a separate compatibility pass.

**2026-08-05 AI-POT EVALUATOR:** Live: practical questions use persisted execution evidence and
rubric scoring rather than exact/keyword matching. Text, image, and code modes are explicit in the
corpus; missing required source files fail closed. The code runner is a separate no-network
Unix-socket Compose service. The provider secret is configured only in ignored local environment
data; never record it in this file or the repository.

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

**2026-08-05 Q36–Q40 NAVIGATION:** Every set now uses the same eight-page Q01–Q40 navigator from
the start, including direct floating-bar access to Q36–Q40 and final submission once all answers
are locked. The frontend-only correction is live. Source round 01's staged evaluator configuration
is Q36 code and Q40 image. The evaluator API is now promoted and reports each practical mode to the
frontend, so image questions open a paid-generation confirmation before their answer is locked.

**2026-08-05 LIVE IMAGE EVALUATION:** Verified source-round-03 Q36 end to end. An unconfirmed image
request returned the explicit confirmation guard; one confirmed request produced a private 1024×1536
PNG through the configured image model and was scored by the configured Haiku judge using the actual
artifact. API and isolated sandbox runner are healthy on port 18080.

**2026-08-05 LEARNER STEM SANITIZATION:** Q01 source cover/instruction text and duplicated final
numbered choice lines are now removed by the shared frontend renderer and API manifest sanitizer.
Only the actual question stem is shown above the selectable choices. The README records this as a
one-source rendering contract for every current and future set. The frontend-only promotion passed
its health check and both the source and generated solver-route checks on port 18080.

**2026-08-05 CHOICE-FEEDBACK COMPATIBILITY:** The live API rejects an unused `confirm_media: false`
field. The frontend now sends the legacy answer-only payload for ordinary choices and adds the flag
only for an explicit image evaluation. The frontend-only promotion is healthy on port 18080, and a
live Q01 answer-feedback request returned a scored result.

**2026-08-05 SOURCE CHOICE RECOVERY:** Repaired 63 placeholder choice groups across source rounds
02–05 from their reviewed OCR transcriptions, including all affected Q01–Q30 choices in rounds 03
and 05. The live API now returns zero placeholder choices; the repair/validation tool is documented
as the one-source maintenance path for future source sets.

**2026-08-05 SOURCE-PATH SANITIZATION:** Removed ten OCR workflow/source-path notes, including
`보기 계속: ../../assets/...`, from learner prompts across source rounds. Existing reviewed image
segments remain intact; live checks across source rounds 01–05 found no exposed source-path text.

**2026-08-05 IMAGE-DESCRIPTION SANITIZATION:** Removed five verbose OCR image/result-description
blocks when their reviewed reference crop is already attached. Learners see the instruction and the
image segment, not a redundant textual restatement. The shared content check validates this rule.

**2026-08-05 PRACTICAL CONTEXT GATE:** Every available Q36–Q40 evaluator now receives reviewed
Markdown task context and the original input asset(s) before execution. Public A/B practical
placeholders were replaced with concise, task-specific Markdown and rubrics. An unrelated Public A
Q36 living-room image prompt was live-verified at 0/5 without running the executor; the post-lock
review displays the provider-derived reference answer where the supplied source contained one.

**2026-08-05 ACTUAL PRACTICAL ANSWERS:** Replaced reconstructed Q36–Q40 reference strings with
the book’s actual public A/B answer examples (printed pp.58–59) and the original-round photographed
answer examples (including rounds 04 p.26 and 05 p.28). The answer panel now shows `원문 답안 예시`
and its citation only after lock. The shared content contract removes duplicate bracketed image
descriptions from practical stems whenever the reviewed crop is displayed.

**2026-08-05 LOSSLESS PUBLIC TEXT EXTRACTION:** Public A/B learner stems now come from the supplied
book PDF rather than full-page crop images wherever the source is completely text-convertible. A
Q38 is rendered as dataset/result Markdown tables with `㉠` in its original prompt cell; A Q13 is
text only with choices kept in controls. Only diagrams, UI pipeline screenshots, and image
transformation/reference material retain a crop. The extraction and assertions are part of the
shared content check.
## 2026-08-06 — supplied sample set

- `sample-set-01` is generated from the provided Markdown package by
  `tools/import-aipot-provided-sample-set.mjs`; do not hand-edit its manifest or duplicate
  text-convertible source images.
- It intentionally normalizes the source's Q35 prompt-writing item to a PEST short answer so the
  shared 100-point scoring contract remains 30×2, 5×3, and 5×5.

## 2026-08-07 — Public A Q08 column restoration

Public A Q08 now renders its five statements as a `진술 | 내용` table. Every option names both
groups explicitly as `사전 학습: … | 미세 조정: …`; option 1 remains the official answer. The
public extraction contract also rejects any non-text or blank question prompt.

## 2026-08-07 — Public A/B short-answer exact policy

Public A/B Q24–Q30 are strict local answer-key checks, not semantic similarity grading. The key
uses a canonical expected answer plus a reviewed, finite alias list; A Q25 accepts
`k-fold cross-validation`, `K-fold validataion`, and `K-fold 교차검증`, while `5-fold cross
validation` remains incorrect. The lock result now displays the canonical `기대 정답` immediately.

Haiku remains responsible for Q36–Q40 practical evaluation only. Its judge payload includes the
original question, complete task context, the learner answer, and the provider reference solution.

**2026-08-07 DEPLOYMENT — SHORT-ANSWER FEEDBACK:** Rebuilt and recreated only the frontend service
to publish the immediate `기대 정답` label. The API, Caddy, sandbox, source assets, and history
volume were not recreated. The frontend is healthy and the public A solve route returns HTTP 200.

## 2026-08-07 — Public A/B prompt and choice-bank clarity

Public A Q26–Q29 now preserve their functional relationships as readable tables: archive's two
capabilities, CSV columns and the age-distribution pie-chart request, the prompt/result distinction
for zero-shot CoT, and the data-cleaning blank. The same audit found B Q29's reasoning instruction
had lost its visual relationship; B Q26–Q29 now use equally clear tables.

Every Public A/B Q31–Q35 choice-bank item now explains that item itself before saying whether it
answers the current blank. For example, A distinguishes img2vid, txt2vid, word2vec and Re-cut;
B distinguishes resolution, KSampler steps, WaterMark, ComfyUI, Seed and CFG. Each question's
choice explanations are asserted to be unique.

## 2026-08-07 — Public A/B prompt cleanup and unified task tables

All Public A/B learner prompts now remove trailing empty answer brackets and duplicate answer-line
placeholders; the UI supplies the actual answer field. The PDF extractor also removes invisible
control characters and repairs wrapped technical terms. Public A Q37 now presents the `[이미지 생성]`
instruction without the split tab label or broken `동작` word.

Public A Q38 now uses one `구분 | 내용` table in which the dataset, requested prompt, and response
result are peer rows. The extraction test rejects trailing placeholders, hidden PDF characters, and
split technical terms across all 80 Public A/B prompts.

The final prompt audit also rebuilt A Q18's AI-job dataset rows and B Q11/Q12's prompt-versus-result
relationships as Markdown tables. Apart from intentional code blocks, no suspicious single-line
PDF-wrap boundary remains across either public set.

## 2026-08-07 — Public A/B practical-answer scoring clarity

The source PDF confirms that Public A Q36 provides one answer example only: `냉방병 예방 팁 3가지를
알려줘.` Its accompanying explanation requires the range-limiting condition `3가지`; it does not
require the learner to reproduce that exact wording. Public A/B Q36–Q40 now carry the source-PDF
criteria separately from the learning rubric.

The practical feedback and history views now show `PDF 원문 채점 기준` first, then a compact
`채점 항목 · 각 1점` result. They no longer repeat the same long judge rationale beneath every
one-point item; the source answer stays available in a collapsed section.

Q36-style answers that explicitly refine the displayed initial response (for example, asking to
leave only three items) are recognized as in-context range-limiting requests and proceed to the
practical execution/evaluation step instead of being rejected before execution. API and frontend
were rebuilt and recreated; both are healthy, and the Public A solve route returns HTTP 200. Caddy,
the source-PDF mount, generated assets, and persisted history were not changed.

## 2026-08-07 — Practical retry scope

`서술형 다시풀기` now clears only the selected Q36–Q40 answer, its lock, and its feedback; all
other answers and scores remain intact. The active-practice sidebar and results view no longer offer
a whole-set reset, preventing an accidental global restart during practical review.

## 2026-08-07 — Practical relevance versus scoring

An incomplete but recognizable Q37 image prompt must be generated and scored, not rejected as a
context mismatch. The relevance gate now reserves rejection for clearly unrelated tasks; missing
style, ratio, subject, or formatting requirements are scored after execution. The evaluator contract
version was advanced so previous context-blocked results do not remain cached.

## 2026-08-07 — Public A/B practical execution audit

All ten Public A/B Q36–Q40 questions now bypass the pre-execution relevance gate and are evaluated
from their actual execution result. This includes an imperfect Q36 range-limiting answer and every
image prompt after the learner confirms generation. A clearly unrelated non-public practical answer
keeps the protective pre-execution block.

Public B Q38's evaluator context now includes the visible Earth Day source conditions instead of
claiming that the Korean source was unreadable. A static assertion guards those conditions.

## 2026-08-07 — Practical partial-score visibility

Practical feedback and previous-attempt review now distinguish score states visually: a completed
criterion is green, a criterion with a nonzero but incomplete score is amber, and a missed criterion
is red. A partially correct question total is likewise amber and labelled `부분 정답·보완 필요`.

The active-practice `문항 바로가기` numbers use the same green/amber/red state, including an
accessible `부분 정답` label for an amber number. Previous-attempt question cards already share the
amber partial-score state.

## 2026-08-07 — Practical execution progress

During text execution/evaluation or confirmed image generation/evaluation, the action button now
shows its spinner with a task-specific label and a visible status row with another spinning indicator.
The status is exposed to assistive technology while the answer remains locked against duplicate
submission.

## 2026-08-07 — Media confirmation and public visual recovery

Reloading a saved image-practical answer no longer calls the feedback endpoint without its prior
media confirmation. The client preserves saved practical feedback, sends an image request only after
the user confirms it, and keeps the confirmation dialog open through the request. The fallback
confirmation error is now actionable Korean.

The original-PDF asset audit restored the missing A Q40 book-and-gavel image and B Q37 Earth Day
poster. B Q36 already has its before/after image; B Q38–Q40 are text/response-source tasks whose
source content is represented in the learner prompt.

## 2026-08-07 — Final submission keeps locked practical evidence

When a learner locks Q36–Q40, the execution and score evidence is now treated as the durable source
for final submission. The client sends its evidence ID with the final answer and the API saves that
already-created result directly, including confirmed image generations. A hash lookup remains only
as a legacy/retry fallback. Unconfirmed practical text still uses the explicit no-generation
submission confirmation rather than silently creating paid media at final submission.

## 2026-08-07 — Image-based private source Set 1

`source-round-01` is now built from the 25 original photographed pages rather than a PDF. The first
21 photos supply questions and the final four supply the answer/explanation audit. The learner set
contains all 40 structured questions, only required source crops, direct-solve answer mappings, and
per-question practical criteria. The reviewed web manifest takes precedence over archival OCR so a
known OCR error such as Q01 `적응` cannot be reintroduced at runtime.

The active creative Set 01 manifest, legacy generated manifest, and dedicated asset folder were
moved to the Linux trash. Public A/B remain active.

## 2026-08-07 — Image-based private source Set 2

`source-round-02` is generated from 24 photographed pages, while the 20 question pages remain
separate from the four answer/explanation audit pages. The learner manifest contains 40 questions,
100 points, only the required crops, dedicated practical rubrics, and unique per-option
explanations. Q04 restores the original table as a PCA/t-SNE multi-select question.

## 2026-08-07 — Image-based private source Set 4

`source-round-04` is generated from 26 photographed pages: 21 question pages and five
answer/example audit pages. It provides 40 learner-safe questions (100 points), reviewed
Q01–Q35 answer mappings, strict short-answer aliases, and five one-point criteria for each
practical question. Only Q37, Q39, and Q40 expose focused reference crops; full photographs
and answer pages remain audit-only.

## 2026-08-07 — AI-POT full-set restart restored

Every started AI-POT set now exposes `처음부터 다시 풀기` beside the timer. A focus-managed
confirmation dialog clears only that set’s local draft, locked feedback, and timers; submitted
attempt history remains available. The frontend was rebuilt and recreated successfully.

## 2026-08-08 — AI-POT any-time submission deployed

Every AI-POT set now offers `시험 종료 및 답안 제출` in the header, navigator, and problem-body
action area, including Q31–Q35. Partial attempts persist unanswered questions with an explicit
`미응답` flag; they do not enter wrong-answer-note or weakness-topic aggregation. The API and
frontend services were rebuilt and recreated successfully, while Caddy and the sandbox remained up.

## 2026-08-08 — AI-POT unanswered aggregation and Set 4 recovery

Unanswered reviews remain visible as `미응답`, but are excluded from every chapter-result
numerator and denominator; a chapter containing only blanks is no longer rendered as a misleading
0% result. Chapter rendering now retains an unknown source-set code as its fallback title, which
prevents Set 4's `C18` and later codes from raising a server error during submission. The scoped
API service was rebuilt and is healthy; Caddy and the frontend were left running.

## 2026-08-08 — Set 4 Q20 visual asset recovery

The source-visual metadata for Set 4 Q20 was already present in the exam response, but its crop was
blocked by the API asset allow-list and returned 404. The scoped API service was rebuilt after the
allow-list was aligned with corpus visual metadata. It is healthy, and Q20's source crop now returns
HTTP 200 as `image/jpeg` through Caddy; Caddy, the frontend, and the sandbox were not restarted.

## 2026-08-08 — Set 4 Q28 scenario-list recovery

The API had mistaken Q28's numbered case facts for duplicate answer choices and removed all four
facts from the learner prompt. It now removes a numbered terminal list only when its text exactly
matches the rendered answer controls. The scoped API service was rebuilt and is healthy; all four
Q28 case facts are present through Caddy. Caddy, the frontend, and the sandbox were not restarted.

## 2026-08-08 — Set 4 Q28 learner prompt rendering recovery

The frontend duplicated-choice filter was also treating Q28's numbered case facts as answer
controls, so it hid the phrase `다음과 같은 문제점들이 발견되었다` and the facts that follow.
It now removes a terminal numbered block only when it exactly matches the actual answer choices.
The scoped frontend service was rebuilt and recreated; Caddy, the API, and the sandbox were not
restarted.

## 2026-08-08 — Set 5 Q04 underline recovery

Set 5 Q04's photographed source underlines the `㉠` model marker itself. Its reviewed OCR and
learner manifest now preserve that marker as underline markup, which the deployed frontend already
renders semantically. The Set 5 manifest was regenerated and verified through Caddy; no service
restart was required.

## 2026-08-08 — AI-POT wrong-note Set 1

- [x] Generated `sample-set-01` as a 100-question, 100-point personal wrong-note set from the newest submissions in A, B, 1, 2, 3, and 4 only; blank responses are excluded.
- [x] Added review-mode API support and a Q100 feedback/submission regression test.
- [x] Scoped API and frontend rebuild/recreation completed and both services are healthy. Caddy and the history volume were not restarted or removed; the live API returns all 100 questions.
- [ ] Interactive browser verification remains blocked by the absent Chromium executable; the exact command is recorded in `docs/skipped-actions.md`.

## 2026-08-08 — AI-POT wrong-note Set 1 removed

- [x] The active `sample-set-01` manifest was moved to the Linux trash at the operator's request. The review-mode API/frontend structure and the regeneration tool remain for a later replacement.

## 2026-08-08 — AI-POT wrong-note Set 1 recreated

- [x] Recreated `sample-set-01` as 50 two-point questions (100 points total): 27 short-option four-choice questions and 23 finite-alias short-answer questions.
- [x] The generator selects only the newest submitted attempt for A, B, 1, 2, 3, and 4; blank answers are excluded. Public B's current Q26/Q28 errors are included, while Public A Q38 remains excluded because its stored rubric conflicts with the reviewed source.
- [x] Scoped API and frontend rebuild/recreation completed; both are healthy, and the live API returns `wrong_note`, 50 questions, 100 total points, and Q50 immediate feedback. Caddy and the history volume were preserved.
- [ ] Targeted browser verification remains blocked by the absent Chromium executable; the exact command is recorded in `docs/skipped-actions.md`.

## 2026-08-08 — Wrong-note navigator refinement

- [x] The review-set navigator now renders plain question numbers (for example, `12`, not `Q12`) and fixes every row to five 44px targets.
- [x] The scoped frontend service was rebuilt/recreated and is healthy; the Set 1 solve route returns HTTP 200 through Caddy. Caddy and API were not restarted.

## 2026-08-08 — Wrong-note descriptive-source exclusion

- [x] Regenerated Set 1 without any item sourced from an original short-answer or practical-prompt question. The active API still reports 50 questions and 100 points; Q12 is now a ComfyUI seed multiple-choice review item rather than the prior practical-derived item.

## 2026-08-08 — Wrong-note duplicate repair

- [x] Replaced repeated stem/template combinations with independently worded, concept-specific review scenarios. A validator now rejects an identical rendered question fingerprint.

## 2026-08-16 — `web.heybobma.dedyn.io` HTTPS activation

- [x] The existing system Caddy now proxies `web.heybobma.dedyn.io` to the app ingress at `127.0.0.1:18080`; Let's Encrypt completed public TLS validation and issued the certificate.
- [x] The project Caddy keeps its `127.0.0.1:18080` ingress for the system Caddy and, with the optional LAN overlay, also binds the explicitly requested direct-test address `192.168.219.199:18080`. The system Caddy, API, frontend, sandbox, and persistent history volume were not restarted or removed.
- [x] Local SNI HTTPS verification returned 200 for `/` and `/health/ready` through the domain. LAN clients may still require router NAT loopback or split DNS; see `docs/skipped-actions.md`.

## 2026-08-16 — Cloudflare Workers build configuration

- [x] The Next.js frontend now builds as an OpenNext Cloudflare Worker. `frontend/wrangler.jsonc`
  declares `.open-next/worker.js` and `.open-next/assets`; the configuration test and production
  OpenNext build passed locally. The local Workers preview returned HTTP 200 at `127.0.0.1:8787`.
- [x] Cloudflare tooling is pinned in the frontend pnpm manifest/lockfile. The independent FastAPI
  dependency set remains managed by `backend/pyproject.toml` and `backend/uv.lock`.
- [ ] The frontend production audit still reports 14 pre-existing advisories (8 high, 6 moderate),
  including Next.js `16.2.10`; remediation requires a separately approved dependency upgrade.
- [ ] Account-level deployment remains pending: the existing root `npx wrangler deploy` now builds
  the frontend automatically; provide an approved, reachable HTTPS FastAPI `NEXT_API_ORIGIN`.
