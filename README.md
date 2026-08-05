# Overnight Web Agent Kit

An operational workspace for finding a sample, inspecting its details, and running one safe validation action. It uses a Next.js frontend, a FastAPI backend, generated OpenAPI TypeScript types, and Docker Compose with Caddy as the only ingress.

The main user journey is:

```text
Overview → Collection → Detail → Validate → result → return to filtered collection
```

The additional personal-study journey is:

```text
AI-POT 학습 → 세트 선택 → 5문제씩 풀이 → 마지막 페이지 제출 → 정답·약점 복습
```

## AI-POT private study

`/aipot` discovers every source round and generated mock held in the local study workspace.
Each 40-question set is split into eight pages of five. Source-round Q01–Q35 use reviewed OCR
transcription; visual-dependent prompts expose only declared, focused assets. Practical prompts
can now be evaluated from the learner's submitted prompt and the generated execution result:

- Text prompts are executed and judged against a question-specific rubric.
- Image prompts require an explicit confirmation before a paid generation request; the generated
  image is retained as evidence.
- Code prompts are generated first, then run in an internal, network-isolated Unix-socket runner
  with bounded CPU, memory, files, and output.
- Missing required source material and unavailable evaluation configuration fail closed: the
  answer is not scored as correct and the UI reports the actionable failure.

Submitted attempts and evaluator evidence are stored transactionally in SQLite in this Compose
project's local `aipot_history` volume. The site has no login, so do not put sensitive or real
work data in an answer.

The production API receives the source material through a read-only Compose mount at
`/aipot-content`. It deliberately returns neither answer keys nor source solution images until
after a submission is scored. The deployed project expects the study material at:

```text
/home/cgma/cgma_git/study/aipot/실전모의고사
```

For host-run API development, set the same location explicitly before starting FastAPI:

```bash
AIPOT_CONTENT_ROOT=/home/cgma/cgma_git/study/aipot/실전모의고사 \
  uv --directory backend run uvicorn app.main:app --reload --port 8000
```

### Practical evaluator configuration

The evaluator is intentionally a separate backend capability, not browser-side scoring. It needs
an OpenRouter key in an ignored `.env` file or a deployment secret manager:

```bash
OPENROUTER_API_KEY=your-secret
```

The defaults use `anthropic/claude-haiku-4.5` for text execution and rubric judging, and
`openai/gpt-image-1` for image execution. Override `AIPOT_JUDGE_MODEL`, `AIPOT_TEXT_MODEL`, or
`AIPOT_IMAGE_MODEL` only when the selected model supports the required structured output or image
operation. Without a configured key, practical evaluation returns a clear 503 response rather
than silently awarding a keyword-match score. Do not commit keys, generated learner artifacts, or
the `aipot_history` volume.

### Source-question rendering contract

Every photographed source round uses one rendering contract, which new sets must follow:

- `data/web-exams/` is the learner-facing question text and answer data.
- `corpus/source-round-*.json` is the single source of truth for reviewed image segments: marker,
  crop filename, alt text, and whether the image replaces the next Markdown block.
- Source text is parsed into safe headings, lists, tables, fenced code blocks, and inline code.
  Markdown quote markers are removed before rendering; links remain readable labels rather than
  executable links; raw HTML is never injected.
- For question 1, omit the photographed test-cover title, timing guidance, and section heading;
  begin at the actual question stem. If a final numbered/circled choice run is also supplied in
  `choices`, omit that run from the stem so each choice appears exactly once, in the answer
  controls. This rule applies to every source and generated set.
- The reviewed OCR transcription is the source of truth for source-round choices. Never substitute
  a label such as `선택지 1 (원본 페이지 참조)`. After changing OCR or source-round learner data,
  run `pnpm aipot:content:check`; the checked-in repair tool derives any missing source choices
  from the final OCR choice block and fails if a placeholder remains.
- Use a declared visual segment for diagrams, screenshots, and quote-image material. Do not append
  a generic “source” caption, expose whole photographed pages, or duplicate an image as a raw
  Markdown table. For example, source round 01 Q16 replaces its concept-diagram table with the
  reviewed diagram and retains the explanatory callout as normal text.
- Never expose OCR workflow notes or local source paths (for example, `보기 계속:` or
  `../../assets/...`) in learner text. If the material is needed to answer a question, declare and
  show only its reviewed crop through the visual-segment metadata.
- Keep formulas as plain, escaped LaTeX source unless a reviewed math renderer is deliberately
  introduced. Do not insert untrusted HTML or an unreviewed rendering library to display math.

When adding a source question, add its crop declaration to the corpus manifest first, then add the
learner-facing prompt to the web manifest. Add a frontend rendering test when a new Markdown form
or replacement rule is introduced, and an API test when a new segment field is added.

## What Changed Recently

This project was improved without replacing its framework, routes, API paths, or representative workflow.

- Mobile detail pages no longer create hidden horizontal page overflow.
- Navigation drawer, mobile filters, and confirmation dialogs now keep keyboard focus inside, close with `Escape`, restore focus to their opener, and prevent background scrolling.
- Controls have a consistent visual system, visible focus, 44px touch targets, and accessible border contrast.
- Search is debounced while keeping filters in the URL; result counts are announced to assistive technology.
- Validation actions cannot be started twice while one is already running.
- Missing items have a recoverable browser screen; copy feedback reports failure honestly.
- The API rejects unexpected action fields, documents its real error envelopes, validates reflected request IDs, and disables the demo failure query in production.
- Caddy now sends basic browser security headers; the app has an icon, `robots.txt`, and an intentional no-index policy.
- The dependency audit is checked before handoff; see `docs/skipped-actions.md` for the current upgrade decision when advisories require dependency changes.

For detailed evidence, see [the improvement report](docs/production-improvement-report.md).

## Terms in Plain English

| Term | Meaning here |
| --- | --- |
| **Frontend** | The visible Next.js web app: pages, navigation, filters, dialogs, and theme. |
| **Backend / API** | The FastAPI service that provides sample data and validation results. |
| **OpenAPI contract** | The API's machine-readable description. FastAPI generates it; the frontend generates TypeScript types from it so both sides agree on data shapes. |
| **Mock mode** | The local frontend can use fixed sample fixtures without starting the backend. |
| **HTTP mode** | The frontend calls the FastAPI service through the same `/api/*` origin. Docker production uses this mode. |
| **Caddy ingress** | The single web-facing proxy. It sends page requests to Next.js and `/api/*` or `/health/*` requests to FastAPI. |
| **High port** | A port other than normal web ports 80/443. This app currently uses `18080` because a different system Caddy already owns 80/443. |
| **LAN-only** | Reachable only by devices on the same private network, such as home Wi-Fi. |
| **Publicly reachable** | Reachable from another network, for example mobile 5G with Wi-Fi disabled. This is not the same as having HTTPS or authentication. |
| **HTTPS** | Encrypted browser traffic, normally served on port 443 with a trusted domain/certificate. The current high-port service is plain HTTP. |
| **Health check** | A small endpoint used by Docker and operators to confirm that the service is alive and ready. |

## Current Access and Security Status

The running Compose service publishes Caddy on port `18080`:

- Current local-LAN mode: `http://192.168.219.130:18080` (including `/settings`). This address is set in the ignored local `.env` file.
- In this LAN-bound mode, `127.0.0.1:18080` intentionally does not listen. Use the LAN URL even from the host machine.
- The supplied `.env.example` remains loopback-only for the future Cloudflare Tunnel path. Before enabling the Cloudflare profile, change the local `HOST_BIND_ADDRESS` back to `127.0.0.1`.

Important: the direct LAN origin has **no HTTPS and no login/access-control layer**. Do not enter sensitive or real user data, and do not treat it as a secure public production site. Cloudflare Tunnel supplies the planned public HTTPS path, but an approved authentication design is still required before handling sensitive data. The system Caddy on ports 80/443 is unrelated and is not managed by this Compose project.

## Module Guide

| Path | Role | When to use it |
| --- | --- | --- |
| `frontend/` | Next.js App Router UI, Tailwind styles, browser tests, generated types | Page, component, UX, or frontend contract work |
| `backend/` | FastAPI/Pydantic API, service logic, backend tests | API behavior, validation, health, or error-contract work |
| `/aipot` | Korean-first private AI-POT set selector, solver, answer board, and review | Personal exam practice and weakness analysis |
| `infra/caddy/Caddyfile` | Reverse-proxy and response-header policy | Ingress routing or browser-header work |
| `compose*.yaml` | Development and production Docker topology | Local containers, build, restart, or deployment work |
| `docs/` | UX, preflight, deployment, limitations, and verification evidence | Operations and product handoff |
| `AGENTS.md` | Project development policy | Read before making changes or delegating work |

## Requirements

- Node.js 24+ and pnpm 11+
- Python 3.13+ and uv
- Docker Engine plus Docker Compose for container runs

## Local Setup

From the project root:

```bash
pnpm --dir frontend install --frozen-lockfile
uv --directory backend sync --locked --group dev
```

The frontend and backend have separate dependency sources of truth:

- Frontend: `frontend/package.json` and `frontend/pnpm-lock.yaml`
- Backend: `backend/pyproject.toml` and `backend/uv.lock`

## Run Locally

Run the API and UI in separate terminals:

```bash
# Terminal 1 — FastAPI
uv --directory backend run uvicorn app.main:app --reload --port 8000

# Terminal 2 — Next.js using fixtures by default
pnpm --dir frontend dev
```

Open `http://localhost:3000`.

To make the local UI use the FastAPI service instead of fixtures:

```bash
NEXT_PUBLIC_DATA_SOURCE=http NEXT_API_ORIGIN=http://localhost:8000 \
  pnpm --dir frontend dev
```

## Docker Development

Docker development publishes only loopback ports, so it does not expose the app to your network:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

Open `http://127.0.0.1:3000`. Stop only this development stack with:

```bash
docker compose -f compose.yaml -f compose.dev.yaml down
```

Do not add `-v` unless you intentionally want to discard this project's Docker volumes.

## Docker: Build, Run, and Verify the Deployed Module

The production Compose profile starts three services: `api`, `frontend`, and `caddy`. Only Caddy publishes a host port.

```bash
cp .env.example .env
HOST_PORT=18080 docker compose -f compose.yaml -f compose.prod.yaml --profile production up --build -d --wait
HOST_PORT=18080 docker compose -f compose.yaml -f compose.prod.yaml --profile production ps
curl --fail --show-error http://127.0.0.1:18080/health/ready
curl --fail --show-error http://127.0.0.1:18080/api/v1/meta
```

To recreate the running project after a code/image update, without touching system Caddy or ports 80/443:

```bash
HOST_PORT=18080 docker compose -f compose.yaml -f compose.prod.yaml --profile production up --build -d --wait
```

Inspect only this project's logs:

```bash
HOST_PORT=18080 docker compose -f compose.yaml -f compose.prod.yaml --profile production logs --tail=100
```

See [deployment-report.md](docs/deployment-report.md) for the deployed state and [skipped-actions.md](docs/skipped-actions.md) for the public-security limitations.

## Cloudflare Deployment

This application has a server-rendered Next.js frontend **and** a FastAPI API behind the same `/api/*` origin. The supported no-rewrite path is Cloudflare Tunnel in front of the existing Docker stack: Cloudflare supplies the public hostname and HTTPS, while `cloudflared` reaches Caddy over the internal Docker network. The application code and the `/api/*` contract remain unchanged.

Do not deploy only `frontend/` to Cloudflare Workers or Pages as a substitute for this command: that would leave the current FastAPI API unavailable. Cloudflare supports Next.js through OpenNext and FastAPI through Python Workers, but converting this two-runtime service into independently deployed Workers would add dependencies and change the deployment topology; it is intentionally not part of this stabilization project.

### Cloudflare “Set up your application” screen

The **Build command** and **Deploy command** fields on that screen belong to Cloudflare Workers Builds. They do not run this Docker Compose application or a persistent Tunnel, so this is not the correct Cloudflare product for the current full-stack deployment.

| Field | Value for this project |
| --- | --- |
| Build command | Leave unset; do not connect this repository as a Workers Build. |
| Deploy command | Leave unset; do not use the Workers Builds deployment flow. |

If the screen requires either value, go back and create a **Cloudflare Zero Trust → Networks → Tunnels** remotely managed tunnel instead. The Docker commands in the next section run on the application host or its CI runner; they are **not** values to paste into the Workers Builds screen.

### Tunnel setup

1. In Cloudflare Zero Trust, create a **remotely managed** tunnel and public hostname. Set its service to `http://caddy:18080` because `cloudflared` and Caddy share Docker's `app_net` network.
2. Copy `.env.example` to `.env`; set `CLOUDFLARE_TUNNEL_TOKEN` to the tunnel token. It is a secret and must never be committed.
3. Change the local `.env` value to `HOST_BIND_ADDRESS=127.0.0.1` before activating the Tunnel profile so the origin cannot be reached directly from the network.

### Build command for the application host or CI runner

```bash
HOST_BIND_ADDRESS=127.0.0.1 HOST_PORT=18080 \
  docker compose -f compose.yaml -f compose.prod.yaml -f compose.cloudflare.yaml \
  --profile production --profile cloudflare build
```

### Deploy command for the application host or CI runner

```bash
HOST_BIND_ADDRESS=127.0.0.1 HOST_PORT=18080 \
  docker compose -f compose.yaml -f compose.prod.yaml -f compose.cloudflare.yaml \
  --profile production --profile cloudflare up -d --wait
```

### Verification

```bash
curl --fail --show-error http://127.0.0.1:18080/health/ready
curl --fail --show-error --max-time 15 https://app.example.com/health/ready
docker compose -f compose.yaml -f compose.prod.yaml -f compose.cloudflare.yaml \
  --profile production --profile cloudflare ps
```

No Cloudflare account, tunnel token, or hostname is stored in this repository, so the public-Tunnel command cannot be run until those are supplied. Cloudflare's current [Tunnel setup guide](https://developers.cloudflare.com/tunnel/setup/) documents the tunnel token flow; its [Next.js Workers guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) and [FastAPI Python Workers guide](https://developers.cloudflare.com/workers/languages/python/packages/fastapi/) explain the separate migration path that is intentionally deferred here.

## Test and Verify

Run these before handing off a change:

```bash
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test

pnpm aipot:content:check
pnpm --dir frontend build
pnpm --dir frontend audit

uv --directory backend run ruff check .
uv --directory backend run pytest

uv --directory backend run python -m app.openapi
pnpm --dir frontend generate:api
docker compose -f compose.yaml -f compose.prod.yaml --profile production config --quiet
```

For browser coverage, first install a local Chromium browser if needed:

```bash
pnpm --dir frontend exec playwright install chromium
PLAYWRIGHT_BASE_URL=http://127.0.0.1:18080 pnpm --dir frontend test:e2e
```

If a local Playwright browser is unavailable, use the existing container fallback against a running ingress:

```bash
docker run --rm --entrypoint /bin/sh --network host \
  -v "$PWD/frontend:/work" -w /work \
  -e PLAYWRIGHT_BASE_URL=http://127.0.0.1:18080 \
  -e PLAYWRIGHT_CHROMIUM_EXECUTABLE=/ms-playwright/chromium-1232/chrome-linux64/chrome \
  mcr.microsoft.com/playwright/mcp:latest -lc './node_modules/.bin/playwright test'
```

## OpenAPI Contract Workflow

FastAPI is the source of truth. After changing an API model or route:

```bash
uv --directory backend run python -m app.openapi
pnpm --dir frontend generate:api
git diff -- backend/openapi.json frontend/src/lib/api/generated.ts
```

Commit both generated files with the API change. The frontend aliases generated schemas in `frontend/src/lib/api/types.ts`; it does not redefine the API contract.

## Dependency Management

Use the existing package manager for the component you are changing:

```bash
# Frontend
pnpm --dir frontend add <package>
pnpm --dir frontend add -D <package>
pnpm --dir frontend remove <package>

# Backend
uv --directory backend add <package>
uv --directory backend add --dev <package>
uv --directory backend remove <package>
uv --directory backend lock
```

Adding a dependency needs explicit approval. Do not hand-edit lockfiles; use pnpm or uv so manifests and lockfiles stay synchronized.

## Development Policy

Read [AGENTS.md](AGENTS.md) before changing code. In short: preserve routes/contracts and unrelated user work, use pnpm and uv, add tests for behavior changes, regenerate OpenAPI types with API changes, avoid destructive Docker/Git commands, and keep deployment documentation accurate.

## Further Documentation

- [UX contract](docs/ux-contract.md)
- [Improvement report](docs/production-improvement-report.md)
- [Preflight](docs/preflight.md)
- [Deployment report](docs/deployment-report.md)
- [Skipped actions and limitations](docs/skipped-actions.md)
- [Morning handoff](MORNING.md)
