# AI-POT 새 세트 만들기

AI-POT의 새 40문항 세트를 원본 근거와 함께 학습자 화면에 추가하는 안내서다. 콘텐츠를
먼저 만들고, 정답·시각 자료·실기 평가를 검증한 뒤에만 카탈로그에 노출한다. 제작 기준의
정본은 [다음 세트 플레이북](docs/aipot-next-set-playbook.md)이며, 이 문서는 그 기준을
실행 순서로 정리한다.

## 시작 전

- 원본 사진·PDF·OCR·기존 manifest를 서로 대체하지 않는다. 원본은 감사용으로 보존하고,
  학습자에게는 필요한 텍스트와 최소 crop만 제공한다.
- 새 의존성, 외부 API, 데이터베이스는 추가하지 않는다. 필요하면 먼저 승인받고 frontend는
  `pnpm`, backend는 `uv`로 lockfile을 동기화한다.
- 활성 세트는 콘텐츠 루트의 `data/web-exams/*.json`에서 자동으로 발견된다. 새 파일을
  만들기 전 기존 manifest나 asset을 삭제하지 않는다.

## 구성 안내

| 위치 | 역할 | 새 세트에서 할 일 |
| --- | --- | --- |
| `docs/aipot-next-set-playbook.md` | 제작·검수의 정본 | R01–R47과 출고 체크리스트를 먼저 확인하고 출고 기록을 추가한다. |
| `tools/build-aipot-source-round-01.mjs` | 사진 기반 Set 1 생성 예시 | 새 사진 기반 세트용 전용 builder를 이 구조로 만든다. 기존 파일을 다른 회차에 그대로 실행하지 않는다. |
| `tools/test-aipot-source-round-01.mjs` | Set 1 콘텐츠 회귀 검사 예시 | 새 세트의 문항 수·정답·asset·rubric을 검사하는 validator를 만든다. |
| `tools/extract-aipot-public-question-text.mjs` | Public A/B PDF 추출기 | 새 공개 PDF는 원본 쪽수·정답지에 맞춘 별도 추출 규칙과 테스트를 추가한다. |
| `tools/enrich-aipot-practical-context.mjs` | 실기 Q36–Q40 맥락·rubric | 새 실기형의 출처 기준, 모범 답, 입력 asset, 5개 criterion을 등록한다. |
| `data/web-exams/` | 학습자용 manifest | 검증된 새 세트만 이곳에 생성한다. |

## 로컬 준비

프로젝트 루트에서 frontend와 backend 의존성을 각자의 lockfile 기준으로 준비한다.

```bash
pnpm install --frozen-lockfile
uv --directory backend sync --locked

export AIPOT_CONTENT_ROOT=/home/cgma/cgma_git/study/aipot/실전모의고사
test -d "$AIPOT_CONTENT_ROOT/data/web-exams"
```

의존성의 기준 파일은 `frontend/package.json`·`frontend/pnpm-lock.yaml`과
`backend/pyproject.toml`·`backend/uv.lock`이다. 새 패키지가 반드시 필요할 때만 승인 후
`pnpm add` 또는 `uv add`를 사용하고, manifest나 lockfile을 직접 편집하지 않는다.

## 1. 원본 종류를 선택한다

| 원본 | 제작 경로 |
| --- | --- |
| 촬영된 시험지 | `source-round-NN`으로 만든다. 원본 사진 inventory, OCR, corpus, 필요한 crop, 전용 builder/test를 함께 관리한다. |
| 공개 PDF | PDF 쪽수와 정답·해설 페이지를 대조한 전용 추출기와 assertion을 만든다. Public A/B 전용 상수나 정답을 새 세트에 재사용하지 않는다. |
| 제공된 Markdown | 원본 Markdown을 단일 근거로 두고 importer와 validator를 만든다. 텍스트 표로 충분한 정보를 이미지로 중복하지 않는다. |

새 사진 기반 세트의 최소 경로는 다음과 같다.

1. 원본 사진을 회차별 디렉터리에 보존하고, 문제 페이지·정답/해설 페이지 수를 inventory로 기록한다.
2. `corpus/source-round-NN.json`에 원본 페이지와 시각 segment를, `corpus/ocr/source-round-NN.md`에 검토한 OCR을 만든다.
3. `assets/source-round-NN/`에 정답 판단에 꼭 필요한 crop만 저장한다. 전체 문제·정답 페이지는 learner asset으로 선언하지 않는다.
4. `tools/build-aipot-source-round-NN.mjs`가 `data/web-exams/source-round-NN.json`을 생성하게 한다. 직접 생성한 manifest를 손으로 고치는 대신 builder의 원천 데이터를 고친다.
5. `tools/test-aipot-source-round-NN.mjs`에서 40문항/100점, 순서, 유형, 정답, 선택지 해설, asset 존재, 실기 rubric을 검사한다. `package.json`의 콘텐츠 검사에 새 validator를 연결한다.

## 2. 학습자용 문항을 작성한다

원본 배점이 다르면 원본을 우선한다. 현재 실전형 템플릿은 Q01–Q30 객관식(각 2점),
Q31–Q33 단답형(각 3점), Q34–Q35 선택은행(각 3점), Q36–Q40 실기형(각 5점)으로 100점이다.

- 모든 prompt는 혼자서 답을 고르는 데 필요한 사실을 담아야 한다. 표의 열, 빈칸, 단계,
  입력/출력 관계는 Markdown 표·제목·코드 블록으로 보존한다.
- 선택지는 prompt에 다시 넣지 않는다. 선택지에는 각각 고유한
  `feedback.explanation`을 작성하고, 선택지의 용어·문항 조건·정오 이유를 설명한다.
- `choice_bank` 설명은 choice bank에만 적용한다. 일반 객관식과 숫자 ID가 같아도 다른
  문항의 설명을 재사용하지 않는다.
- `chapter`와 `topic`은 정답·해설·복습 추천의 기준이다. 각 문항의 실제 개념과 맞는지
  정답지 대조 때 함께 확인한다.
- 이미지 crop은 답안 근거가 원문 시각 자료에만 있을 때 유지한다. Q17처럼 같은 정보를
  가진 표로 완전히 대체할 수 있으면 이미지를 제거하고, Q18처럼 사진 자체가 필요한
  문제는 반드시 asset을 선언한다.
- Q31–Q35처럼 공통 화면/파이프라인을 참조하는 문제는 공통 문맥과 답안 방식을 보존하되,
  정답값을 stem에 넣지 않는다.

## 3. 정답과 단답형을 검수한다

1. 정답지를 보기 전에 제작자가 전 문항을 직접 풀고 간단한 근거를 작성한다.
2. 원본 정답·해설과 비교한다. 불일치하면 answer key만 바꾸지 말고 stem, 선택지, 표,
   사진/PDF, 출처 쪽수를 다시 확인한다.
3. 객관식은 answer가 실제 choice ID인지, 복수 정답은 `1|3`처럼 모든 정답을 표현하는지
   검증한다.
4. 단답형은 canonical answer와 검토된 `accepted_answers`만 등록한다. 띄어쓰기, 하이픈,
   한글 명칭, 공식 인쇄 오탈자처럼 같은 개념인 표기만 alias로 추가한다.

예를 들어 `backpropagation`, `역전파`, `역전파 알고리즘`은 같은 답으로 허용할 수 있지만,
`gradient descent`처럼 다른 개념은 오답이어야 한다. 단답형에 의미 유사도나 LLM 자유 판정을
추가하지 않는다.

## 4. 실기 Q36–Q40을 준비한다

- 원본의 채점 기준과 모범 답을 출처·쪽수와 함께 기록한다. 모범 답은 허용 답안 전체가
  아니라 채점 보정용 참고 자료다.
- criterion은 5개, 각 1점으로 분해한다. `evaluation.context_markdown`,
  `provider_solution`, `source_criteria`, 필요한 `input_assets`와 실행 종류(`text`,
  `image`, `code`)를 명시한다.
- recognizable한 답안은 실행 후 rubric에서 감점한다. 명백히 다른 과제만 실행 전에
  차단한다.
- 평가 결과는 문항 lock 시점의 evidence ID를 재사용한다. 최종 제출에서 유료 이미지
  생성이나 평가를 다시 실행하지 않는다.
- Q01–Q35를 확정한 학습자는 서술형을 미응답·0점으로 남기고 종료할 수 있다. 작성했지만
  실행하지 않은 답은 `생성 없이 답안 제출`로 미평가·0점으로 저장한다.
- 제출은 시작 전·이론·실습·결과 어느 단계에서나 가능하다. 미응답 문항은 `미응답` flag와
  0점으로 저장하며, 오답노트·약점 주제·챕터별 정오답 집계의 분자와 모수에는 넣지 않는다.
  미응답만 있는 챕터는 0%로 표시하지 않는다.

## 5. 생성·검증·미리보기

새 세트의 전용 builder와 validator를 만든 뒤 프로젝트 루트에서 실행한다.

```bash
# 새 세트 전용 명령 예시: 실제 파일명과 ID로 바꾼다.
node tools/build-aipot-source-round-NN.mjs
node tools/test-aipot-source-round-NN.mjs

# 공통 콘텐츠 검사
pnpm aipot:content:check

# 코드 변경이 있었다면 추가 실행
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
uv --directory backend run ruff check .
uv --directory backend run pytest
```

FastAPI 모델이나 route를 바꿨을 때만 다음 계약 생성을 실행하고 결과 파일을 함께 커밋한다.

```bash
uv --directory backend run python -m app.openapi
pnpm --dir frontend generate:api
```

콘텐츠만 바꾼 경우 API는 read-only mount의 manifest를 요청마다 읽으므로, 서비스 재생성으로
검증을 대신하지 않는다. 새 manifest가 보이는지 API로 확인한다.

```bash
curl --fail --show-error \
  http://192.168.219.130:18080/api/v1/aipot/exams
curl --fail --show-error \
  http://192.168.219.130:18080/api/v1/aipot/exams/source-round-NN
```

## Docker: 전체 학습 모듈 실행

코드·Docker 설정까지 변경했거나 운영 환경에서 확인해야 할 때만 기존 Compose 경로를 사용한다.
`api`는 콘텐츠를 `/aipot-content`에 읽기 전용으로 mount하고, `frontend`와 `api`는 Caddy를
통해서만 외부에 제공된다.

```bash
HOST_PORT=18080 \
  docker compose -f compose.yaml -f compose.prod.yaml --profile production up --build -d --wait
HOST_PORT=18080 \
  docker compose -f compose.yaml -f compose.prod.yaml --profile production ps
curl --fail --show-error http://127.0.0.1:18080/health/ready
```

80/443의 시스템 Caddy, 다른 컨테이너, `aipot_history` volume은 건드리지 않는다. Compose
정의만 확인할 때는 다음 명령을 쓴다.

```bash
docker compose -f compose.yaml -f compose.prod.yaml --profile production config --quiet
```

## 출고 전 기록

플레이북의 `## 세트 N — YYYY-MM-DD` 템플릿을 채운다. 원본 inventory, manifest ID,
text-only/crop 판정, 직접 풀이와 answer-key 대조, 단답 alias, 실기 출처/무생성 정책,
실행한 검사와 미실행 항목을 남긴다.

마지막으로 다음을 확인한다.

- 모든 문항의 stem·선택지·표·시각 자료가 답을 풀기에 충분하다.
- 원본 정답/해설 페이지와 `provider_solution`은 lock 전 learner payload에 노출되지 않는다.
- 각 객관식 해설은 고유하고, 단답 alias는 같은 개념만 허용한다.
- 새로운 crop, 복수 정답, 표 구조, 종료 흐름에는 회귀 검사를 추가했다.
- `git diff --check`가 통과하며, 운영 상태를 실제로 바꿨다면 관련 운영 문서도 함께 갱신했다.
