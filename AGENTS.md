# Project Development Policy

This file applies to work inside `overnight-web-agent-kit/`. Follow higher-level repository instructions first.

## Product and scope

- Improve the existing operational workspace; do not replace Next.js, FastAPI, Docker Compose, routing, API paths, or generated-contract workflow without explicit approval.
- Preserve visible workflows: Overview → Collection → Detail → Validate.
- Preserve mock and HTTP adapter compatibility. Do not add a database, authentication system, payment flow, public claims, ads, analytics, or legal wording without a confirmed product decision.
- Do not fabricate sample/business claims, user data, credentials, domains, or policy compliance.

## Dependencies and contracts

- Use pnpm for `frontend/` and uv for `backend/`.
- Ask before adding dependencies. Update existing dependencies only when justified, then run the relevant audit and tests.
- Do not hand-edit lockfiles. Use pnpm or uv to keep the manifest and lockfile synchronized.
- FastAPI/OpenAPI is the API source of truth. After an API model or route change, run:

  ```bash
  uv --directory backend run python -m app.openapi
  pnpm --dir frontend generate:api
  ```

- Commit `backend/openapi.json` and `frontend/src/lib/api/generated.ts` with the corresponding API change.

## Quality bar

- Add or update tests for behavior changes. Do not silence test, lint, type, or accessibility failures merely to make a command pass.
- At minimum run affected checks; before a handoff, run frontend lint/typecheck/unit tests/build, backend Ruff/pytest, contract generation, dependency audit, and Compose config validation when feasible.
- Use Playwright for changed critical flows, responsive behavior, dialogs, navigation, and keyboard interactions when a browser is available.
- Target WCAG 2.2 AA practices: semantic landmarks, labels, visible focus, keyboard support, 44px primary targets, adequate non-text contrast, reduced motion, and no unintended page overflow.

## Code and UX conventions

- Prefer small, readable, typed changes. Apply SOLID/DRY/KISS proportionately; avoid speculative abstraction and unrelated refactors.
- Keep reusable visual values in design tokens and shared components. Do not use global `overflow-x: hidden` to mask a layout defect.
- All overlays must use the project modal-focus pattern: initial focus, contained Tab order, Escape behavior, opener restoration, and scroll locking.
- Keep loading, empty, partial, error, success, and recoverable states explicit for changed user flows.
- Use database transactions and idempotency only when persistent, multi-step operations actually exist. The current representative action is in-memory; UI-level duplicate-submission prevention is required.

## Security and deployment

- Keep frontend and API internal to the Docker network; Caddy is the only published application service.
- Ports 80/443 belong to an unrelated system Caddy. Never stop, replace, or restart it. Do not modify its routes without explicit domain and authentication authority.
- The production origin binds to loopback by default. Use `compose.cloudflare.yaml` and a remotely managed Cloudflare Tunnel for public HTTPS; its token stays in an untracked secret source. Do not set `HOST_BIND_ADDRESS=0.0.0.0` or claim secure/public-production readiness without explicit authority.
- Do not use destructive Docker commands (`down -v`, prune, removal of unrelated containers/images/volumes). Preserve unrelated services and user changes.
- Update `MORNING.md`, `docs/deployment-report.md`, `docs/preflight.md`, and `docs/skipped-actions.md` whenever operational status changes.

## Git and documentation

- Inspect Git status before editing. Never overwrite, revert, stage, or format unrelated user changes.
- Use `apply_patch` for source/document edits. Prefer focused commits that include only this project.
- Keep README commands executable and aligned with declared package scripts, Compose services, environment variables, and lockfiles.
- Record blocked infrastructure or browser steps in `docs/skipped-actions.md` with the attempt, observed error, impact, exact manual command, and verification command.
