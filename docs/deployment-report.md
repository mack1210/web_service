# Deployment Report

Reviewed: 2026-07-12 (Asia/Seoul); migration status amended: 2026-07-13 (Asia/Seoul)
Deployment status: **healthy loopback origin deployment**
External reachability: **Cloudflare Tunnel pending account token and public hostname**

## Current endpoints

| Purpose | URL | Evidence |
|---|---|---|
| Loopback URL | `http://127.0.0.1:18080` | After migration to `/home/cgma/apps/web_service`, `GET /health/ready` and `/api/v1/meta` returned 200 on 2026-07-13. |
| Origin binding | `127.0.0.1:18080` | `ss -ltn 'sport = :18080'` showed only the loopback listener after the Compose recreation. |
| Prior mobile layout verification | `http://192.168.219.121:18080/items/inventory-reconciliation` | Before loopback migration, Chromium at 390px reported `scrollWidth === clientWidth` and found the validation action. |
| Cloudflare public status | Public hostname not configured | No Cloudflare account token or hostname is in the workspace; public HTTPS is not claimed. |

The isolated review stack on `:18081` was verified and then promoted into the main `overnight-web-agent-kit` Compose project on `:18080`. The review stack was removed after promotion. The project was then moved to `/home/cgma/apps/web_service`; only the main project containers were recreated there. Both API and frontend remain Docker-network internal; Caddy is the only port-published container and now binds the host loopback address.

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

The deployed high port is plain HTTP and no authentication/authorization model has been approved. A prior 5G observation showed that an earlier origin was publicly reachable. The current Compose recreation binds `:18080` to `127.0.0.1`, so direct external access is no longer provided by this application deployment. Existing system Caddy owns ports 80/443 and was read only; it was neither restarted nor reloaded.

Before normal public use, create a remotely managed Cloudflare Tunnel with the origin `http://caddy:18080`, provide an approved public hostname, and choose an identity mechanism. Follow the exact build/deploy/verification procedure in `docs/skipped-actions.md`. This is a material product/security decision, not a deployment detail that can safely be invented.

## Rollback and cleanup

The running deployment can be stopped without touching the system Caddy on 80/443, unrelated services, or volumes:

```bash
cd /home/cgma/apps/web_service
HOST_PORT=18080 docker compose -f compose.yaml -f compose.prod.yaml --profile production down
```

Do not use `down -v`, Docker prune, or any command that removes unrelated containers, networks, or volumes.

Detailed product, accessibility, security, policy, and testing evidence is in [production-improvement-report.md](production-improvement-report.md).
