# Overnight Web Agent Kit

Next.js와 FastAPI로 만든 내부 운영 워크스페이스입니다. 기본 업무 흐름은
`Overview → Collection → Detail → Validate`이고, `/aipot`에서는 개인용 AI-POT
모의고사를 풀고 이전 풀이를 복습할 수 있습니다. Docker Compose에서는 Caddy만 외부
진입점이며, 프런트엔드와 API는 내부 Docker 네트워크에서 통신합니다.

## 현재 AI-POT 구성

`/aipot` 카탈로그에는 다음 세트만 활성화되어 있습니다.

- `source-round-01`: 원본 촬영 사진 25장으로 검증해 만든 개인 원본문제 Set 1
- `public-set-a`, `public-set-b`: 제공된 공개 자료에서 복원·검증한 세트

원본 사진, OCR, corpus와 필요한 crop은 외부 AI-POT 학습 자료에 보존합니다. 학습자에게는
문제를 푸는 데 필요한 crop만 제공하며, 원본 전체 페이지나 정답 페이지는 노출하지
않습니다. 창작 세트 `generated-mock-01`과 전용 asset은 Linux 휴지통으로 이동했지만,
근거 자료와 제출 이력은 삭제하지 않았습니다.

다음 세트를 만들 때는 [AI-POT 제작·검증 플레이북](docs/aipot-next-set-playbook.md)을
정본으로 사용하세요. 원본 분류, 답안 직접 검증, 보기별 해설, 단답형 허용 표기, 실기형
채점 기준, 출고 체크리스트를 모두 담고 있습니다.

## 구성 안내

| 경로/서비스 | 역할 | 사용할 때 |
| --- | --- | --- |
| `frontend/` | Next.js App Router UI, Tailwind, Vitest/Playwright, 생성된 API 타입 | 화면·UX·프런트 계약 수정 |
| `backend/` | FastAPI, Pydantic 모델, AI-POT 평가와 제출 이력, pytest | API·채점·검증 로직 수정 |
| Compose 서비스 `aipot-sandbox` | 네트워크가 없는 코드 실행 runner | Q36–Q40 코드 실기 평가 |
| `infra/caddy/Caddyfile` | `/api/*`·`/health/*`는 API, 그 외는 Next.js로 프록시 | ingress·응답 헤더 확인 |
| `compose*.yaml` | 개발, production, 선택적 Cloudflare Tunnel Compose overlay | 컨테이너 실행·배포 |
| `tools/` | AI-POT 원본 복원, 답안 매핑, 콘텐츠 검사 도구 | 세트 생성·정답/asset 검증 |
| `docs/` | 출고 기준, 운영·배포 기록, 제한 사항 | 다음 세트 제작·운영 인수인계 |

주요 경로는 `/`, `/items`, `/items/[id]`, `/aipot`, `/aipot/solve/[examId]`,
`/aipot/attempts/[attemptId]`입니다. API는 `/health/*`, `/api/v1/*`,
`/api/v1/aipot/*`에 있습니다. FastAPI/OpenAPI가 계약의 원본이며, frontend는
`frontend/src/lib/api/generated.ts`를 생성해 사용합니다.

## 요구 사항

- Node.js 24+ 및 pnpm 11+
- Python 3.13+ 및 uv
- Docker Engine과 Docker Compose (컨테이너 실행 시)
- AI-POT 콘텐츠를 사용할 경우:
  `/home/cgma/cgma_git/study/aipot/실전모의고사`

## 로컬 설정

프런트엔드와 백엔드는 각각의 manifest와 lockfile을 사용합니다.

```bash
# Frontend: frontend/package.json + frontend/pnpm-lock.yaml
pnpm --dir frontend install --frozen-lockfile

# Backend: backend/pyproject.toml + backend/uv.lock
uv --directory backend sync --locked --group dev
```

수동으로 가상환경을 만들 경우에는 backend에서 다음 순서를 사용합니다.

```bash
cd backend
uv venv
source .venv/bin/activate
uv sync --locked --group dev
```

## 실행

### 로컬 개발 서버

두 터미널에서 실행합니다.

```bash
# Terminal 1: FastAPI
AIPOT_CONTENT_ROOT=/home/cgma/cgma_git/study/aipot/실전모의고사 \
  uv --directory backend run uvicorn app.main:app --reload --port 8000

# Terminal 2: Next.js (기본은 mock data)
pnpm --dir frontend dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 프런트엔드를 FastAPI와 연결하려면 다음처럼
HTTP 모드로 실행합니다.

```bash
NEXT_PUBLIC_DATA_SOURCE=http NEXT_API_ORIGIN=http://localhost:8000 \
  pnpm --dir frontend dev
```

### Docker 개발

개발 overlay는 API와 frontend만 loopback 포트로 엽니다.

```bash
pnpm dev
# 또는: docker compose -f compose.yaml -f compose.dev.yaml up --build
```

접속 주소는 `http://127.0.0.1:3000`이며 API는 `http://127.0.0.1:8000`입니다. 중지는
volume을 제거하지 않는 다음 명령을 사용합니다.

```bash
pnpm dev:down
```

### Docker production 경로

`.env.example`을 복사해 로컬 `.env`를 준비합니다. 기본값은 loopback의 `18080`이며,
production profile에서 Caddy만 host port를 공개합니다.

```bash
cp .env.example .env
pnpm prod:up
docker compose -f compose.yaml -f compose.prod.yaml --profile production ps
curl --fail --show-error http://127.0.0.1:18080/health/ready
curl --fail --show-error http://127.0.0.1:18080/api/v1/meta
```

`aipot_history` volume에는 제출 이력과 SQLite 평가 증거가 저장됩니다. `down -v`를
사용하지 마세요. 이 Compose 프로젝트는 시스템 Caddy가 이미 사용하는 80/443을 관리하지
않으며, 이를 중지·교체·재시작해서는 안 됩니다.

선택적 Cloudflare Tunnel은 `compose.cloudflare.yaml`의 `cloudflare` profile을 사용합니다.
토큰은 추적하지 않는 `.env` 또는 비밀 관리 도구에만 두고, 공개 HTTPS와 별개로 인증 정책은
승인 후 결정해야 합니다. 현재 direct origin은 로그인 없는 개인 학습용이므로 민감한 자료를
입력하지 마세요.

## AI-POT 콘텐츠와 평가

Compose의 API는 학습 자료를 읽기 전용으로 `/aipot-content`에 mount합니다. learner
manifest는 `data/web-exams/`에 있고, 원본 corpus/OCR는 감사·복원 자료입니다. Source Set 1은
`tools/build-aipot-source-round-01.mjs`가 manifest를 만들며, Public A/B는 PDF 추출·정답
매핑 도구가 유지합니다.

학습 화면의 주요 계약은 다음과 같습니다.

- 객관식은 답을 확정하면 모든 보기의 설명을 해당 보기 카드 안에서 보여 줍니다.
- 이전 풀이에는 문제, 모든 선택지, 내 선택과 정답을 함께 보여 줍니다.
- 단답형은 기대 답과 검토된 허용 표기를 엄격히 매칭합니다.
- Q36–Q40은 원문 기준을 1점씩 채점합니다. 이미지 생성은 명시적 유료 미디어 확인 후에만
  실행하며, 이미 lock된 평가 결과는 최종 제출에서 재생성하지 않습니다.
- `생성 없이 답안 제출`은 실행·이미지 생성·자동평가 없이 실기 답안을 보관하는 fallback이며,
  해당 문항은 `미평가`, 자동 0점으로 남습니다.
- 시작 전·이론·실습·결과 어느 단계에서나 현재 답안을 제출할 수 있습니다. 미응답은
  `미응답` flag와 0점으로 저장되며 오답노트·약점 주제·챕터별 정오답 집계의 분자와 모수에는
  포함하지 않습니다. 따라서 미응답만 있는 챕터를 0%로 표시하지 않습니다.

실기 평가에는 ignored `.env` 또는 비밀 관리 도구의 `OPENROUTER_API_KEY`가 필요합니다.
기본 모델은 Haiku 텍스트/채점 모델과 이미지 모델이며, 키가 없으면 평가를 정답으로
추정하지 않고 오류를 반환합니다.

## 검사와 테스트

콘텐츠를 바꾼 뒤에는 먼저 다음을 실행합니다.

```bash
pnpm aipot:content:check
```

이 명령은 Source Set 1 원본/asset/답안, Public A/B 텍스트·표·실기 기준·보기별 설명·정답
매핑, 다음 세트 플레이북, 세트 제작 가이드의 필수 항목을 검사합니다. 개별 확인에는
`pnpm aipot:playbook:check` 또는 `pnpm aipot:create-set:check`를 사용합니다.

코드 변경 전 handoff 검사입니다.

```bash
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build

uv --directory backend run ruff check .
uv --directory backend run pytest

docker compose -f compose.yaml -f compose.prod.yaml --profile production config --quiet
git diff --check
```

Playwright 브라우저가 설치된 환경에서는 다음도 실행합니다.

```bash
pnpm --dir frontend exec playwright install chromium
PLAYWRIGHT_BASE_URL=http://127.0.0.1:18080 pnpm --dir frontend test:e2e
```

현재 호스트의 브라우저 실행 제한과 의존성 감사 결과는
[skipped actions](docs/skipped-actions.md)에 기록합니다. 의존성 추가·업데이트는 사전 승인
없이는 하지 않습니다.

## OpenAPI 계약

FastAPI가 API 계약의 원본입니다. API model이나 route를 바꾼 뒤에는 생성 파일 두 개를
함께 갱신하고 커밋합니다.

```bash
uv --directory backend run python -m app.openapi
pnpm --dir frontend generate:api
git diff -- backend/openapi.json frontend/src/lib/api/generated.ts
```

## 의존성 관리

lockfile을 직접 수정하지 말고 해당 생태계의 도구를 사용합니다.

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

새 의존성이나 기존 의존성 업데이트는 먼저 승인받아야 합니다.

## 참고 문서

- [AI-POT 다음 세트 제작·검증 플레이북](docs/aipot-next-set-playbook.md)
- [AI-POT 운영 상태](MORNING.md)
- [배포 기록](docs/deployment-report.md)
- [사전 점검](docs/preflight.md)
- [보류 작업·제한 사항](docs/skipped-actions.md)
- [UX 계약](docs/ux-contract.md)
- [프로젝트 개발 정책](AGENTS.md)
