# AI-POT 다음 세트 제작·검증 플레이북

이 문서는 AI-POT 실전형 모의고사 다음 세트를 만들 때 사용하는 정본이다. 과거
운영 문서는 당시 상태를 보존하는 이력이며, 세트 구성·콘텐츠 품질·검증 기준은 이
문서를 우선한다. 원본 사진/PDF, OCR, 평가 이력은 학습자 화면의 문항 데이터와
구분한다.

## 1. 현재 확정 상태

- 학습자 카탈로그의 활성 세트는 `source-round-01`부터 `source-round-05`와
  `public-set-a`, `public-set-b`다.
- `source-round-01`은 PDF가 아니라 원본 촬영 사진 25장(문제 21장, 정답·해설
  감사용 4장)에서 만든 개인 원본문제 Set 1이다. 활성 manifest는
  `/home/cgma/cgma_git/study/aipot/실전모의고사/data/web-exams/source-round-01.json`이며,
  생성기는 `tools/build-aipot-source-round-01.mjs`다.
- 원본 사진, OCR, corpus, 필요한 crop은 보존한다. 전체 원본 페이지는 감사 자료이며
  학습자 화면에 그대로 노출하지 않는다. 문제를 푸는 데 꼭 필요한 그림·표·UI 상태만
  선언한 crop으로 제공한다.
- `source-round-02`는 원본 촬영 사진 24장(문제 20장, 정답·해설 4장)에서 만든
  개인 원본문제 Set 2다. 활성 manifest는
  `/home/cgma/cgma_git/study/aipot/실전모의고사/data/web-exams/source-round-02.json`이며,
  생성기와 검증기는 각각 `tools/build-aipot-source-round-02.mjs`,
  `tools/test-aipot-source-round-02.mjs`다.
- `source-round-03`은 원본 촬영 사진 27장(문제 22장, 정답·해설 5장)에서 만든
  개인 원본문제 Set 3이다. 활성 manifest는
  `/home/cgma/cgma_git/study/aipot/실전모의고사/data/web-exams/source-round-03.json`이며,
  생성기와 검증기는 각각 `tools/build-aipot-source-round-03.mjs`,
  `tools/test-aipot-source-round-03.mjs`다.
- 이전 창작 세트 `generated-mock-01`의 활성/레거시 manifest와 전용 이미지 7개는
  `gio trash`로 Linux 휴지통으로 옮겼다. 원본 OCR·기반 자료·제출 이력은 삭제하지
  않았다. Linux 휴지통은 보통 `~/.local/share/Trash/files`에 있으며, 별도 정리 전까지
  자동으로 지워진다고 가정하지 않는다.
- 과거 `MORNING.md`나 배포 문서의 “창작 Set 01만 활성” 같은 날짜별 문구는 당시의
  상태 기록이다. 현재 카탈로그 여부는 위 manifest와 `GET /api/v1/aipot/exams`로
  확인한다.

## 2. 요청·해결 이력

각 항목은 사용자의 요청을 빠뜨리지 않기 위해 시간순으로 남긴 것이다. `재사용 규칙`은
다음 세트에서 반드시 적용할 기준이고, `근거`는 구현 또는 검사 위치다.

| ID | 요청 | 해결 및 재사용 규칙 | 근거 |
| --- | --- | --- | --- |
| R01 | AI-POT 모의고사를 정리하고 지정 세트만 남기기 | 카탈로그 노출과 원본 자료 보관을 분리했다. 이후 “창작 세트는 전부 제거” 요청으로 결정이 바뀌었으므로, 새 삭제 전에는 대상·보존 자산·복구 경로를 반드시 다시 확인한다. | catalog manifest, `gio trash` 이력 |
| R02 | OCR·asset 등 기반 자료는 남기기 | learner manifest만 제거하거나 교체하고 OCR/corpus/원본/필요 asset은 삭제 대상에서 제외한다. | read-only AI-POT content mount |
| R03 | 풀이 횟수에 따른 기존 응답 보기 | 세트 카드에서 저장된 시도별 링크를 제공하고 최신순으로 표시한다. | history API와 학습 화면 |
| R04 | 객관식 설명을 지우고 다시 넣기 | 별도 해설 패널을 쓰지 않는다. 선택이 잠긴 뒤 각 선택지 카드 안에서 그 선택지의 설명을 펼친다. | `study-screens.tsx`, choice feedback |
| R05 | 정답/오답만이 아닌 모든 보기에 설명 | 모든 객관식 선택지에 `feedback.explanation`을 작성한다. 정답만 설명하거나 공통 문장을 복제하지 않는다. | public/source content checks |
| R06 | 문제를 직접 풀어 정답 매칭 확인 | 정답지 전사가 아니라 문항을 직접 풀어 rationale을 남긴 뒤, 정답 페이지와 대조한다. 충돌하면 원본 증거와 풀이를 다시 확인한다. | `directRationales`, answer-key tools |
| R07 | 주관식·서술형도 직접 풀기 | 단답은 기대 답과 허용 표기를, 실기는 모범 프롬프트와 항목별 채점 근거를 작성한다. | Set 1 Q31–Q40 manifest |
| R08 | Q36–Q40에 생성 없이 제출 | 실행·이미지 생성 없이도 답을 저장할 수 있다. 이 경로는 명시적으로 `제출됨 · 미평가`, 자동 0점이며 생성 비용을 만들지 않는다. | practical submission API/UI |
| R09 | Q05 뒤 다음 페이지는 맨 위 | 5문항 페이지 이동 때 문서 상단으로 이동한다. 다음 세트 화면에도 같은 pagination helper를 사용한다. | `scrollToPageTop` 흐름 |
| R10 | 이전 풀이에서 문제와 선지도 보기 | 저장 응답 화면은 원래 stem과 모든 선택지를 보이고, 해당 카드에 `내 선택`과 `정답`을 표시한다. | attempt review 화면 |
| R11 | 창작 test set과 asset 삭제 전 대상 질문 | 삭제는 활성 set, 레거시 manifest, 전용 asset, 원본 근거 자료를 구분한 목록을 먼저 제시한 뒤 결정한다. | creative Set 01 삭제 이력 |
| R12 | WSL/Linux 휴지통 위치와 삭제 주기 | `gio trash`는 복구 가능한 휴지통 이동이다. 휴지통 위치와 정리 정책은 환경마다 다르므로, 복구 가능 여부를 확인한 뒤에만 비운다. | Linux desktop trash convention |
| R13 | 창작 외 세트 목록 확인 | active catalog와 recoverable manifest를 별도로 조회한다. 이름만 비슷한 세트를 추정하지 않는다. | `GET /api/v1/aipot/exams` |
| R14 | public-set A/B를 현재 템플릿으로 생성·검증 | 공개 PDF를 텍스트/표/필요 crop으로 재구성하고 답안을 직접 검증했다. Public A Q13은 공식 복수 정답 `1|3`을 허용한다. | `aipot:public:check` |
| R15 | 문제 정보가 누락되지 않게 PDF를 다시 읽기 | 추출 텍스트만으로 풀 수 없는 사실은 crop으로 남기고, 표와 문장은 접근 가능한 Markdown으로 재구성한다. “보기에 필요한 정보가 없는 stem”은 출고 금지다. | extraction and question-text tests |
| R16 | 일반적이고 틀린 보기 설명 개선 | 선택지 설명은 그 선택지의 핵심 용어·문항 조건·맞음/틀림 이유를 함께 설명한다. `관련해 구분해야`, `방법 또는 운영 주장` 같은 placeholder는 금지한다. | `normalize-aipot-public-choice-feedback.mjs` |
| R17 | LangChain 조합 문항 품질 확인 | 조합 문항은 각 ㉠~㉤ 문장의 참/거짓과 개념을 설명하고, 조합 번호의 정오만 반복하지 않는다. | Public A Q06 등 검사 |
| R18 | 비슷한 유형 전수 조사·개선 | 조합형, 표 짝짓기형, 시각 의존형을 유형 단위로 검색하고 동일 결함을 일괄 교정·검사한다. 한 문항만 고치고 끝내지 않는다. | public feedback/question tests |
| R19 | 사전학습/미세조정 표의 구분선 명확화 | 두 분류는 표 머리글·열 경계·선택지의 좌우 대응이 보이게 작성한다. OCR 줄바꿈으로 표 경계가 사라지면 Markdown 표 또는 crop을 사용한다. | Public A Q08 검사 |
| R20 | 단답형 Haiku 정책을 엄격하게 | 요청은 Haiku에 문항·답안을 함께 주는 방식이었으나, 단답의 정확성 요구를 지키기 위해 구현은 Haiku가 아닌 로컬 기대 답·검토된 허용 변형의 유한 매칭으로 확정했다. 예: `K-fold cross-validation`, `K-fold validataion`, `K-fold 교차검증`은 같은 정답으로 허용하되 자유서술로 완화하지 않는다. Haiku에는 Q36–Q40의 원문 문항·맥락·학습자 답·참고 답을 전달한다. | `service.py`, practical evaluator |
| R21 | Set A Q26–Q29 표/표현 개선 및 B 점검 | 비교 기준·축·단위·열 제목이 불명확한 표는 원본을 다시 대조한다. Set B에도 같은 유형을 찾아 같은 기준으로 수정한다. | public-set audit workflow |
| R22 | Q31–Q35 항목별 설명을 각각 작성 | 여러 항목을 묻는 문항은 항목마다 서로 다른 개념 설명을 제공한다. 같은 해설을 항목 수만큼 복제하지 않는다. | public choice feedback normalization |
| R23 | 불필요한 `()`·이상한 개행·Q38 표 결속 개선 | dangling `()`를 제거하고 문장 중간 강제 개행을 복원한다. 한 데이터셋의 입력·프롬프트·응답 결과는 같은 표/블록에서 대응되게 한다. | text extraction/content checks |
| R24 | 서술형 채점이 지나치게 장황함 | 먼저 실제 원문/PDF 채점 기준을 제시하고, 기준마다 최대 1점으로 간결히 표시한다. 모델의 장황한 반복 설명은 결과 UI에 그대로 노출하지 않는다. | practical evaluator/UI |
| R25 | 원문 답안 예시가 실제로 맞는지 확인 | 모범 답은 생성한 문장이 아니라 출처의 예시인지 대조하고, 출처·쪽수와 함께 기록한다. 예시는 허용답의 전부가 아니다. | practical context sources |
| R26 | 적절한 서술형은 실제 실행되어야 함 | 입력 형식이 완벽하지 않다는 이유만으로 context mismatch 처리하지 않는다. recognizable한 prompt는 실행하고, 품질 부족은 rubric에서 감점한다. | relevance-gate correction |
| R27 | 서술형 다시 풀기는 문항별 | retry는 Q36–Q40 각각의 답과 실행 결과만 교체한다. 전체 시험 답을 초기화하거나 다시 실행하지 않는다. | practical retry UI |
| R28 | Q37 영어 이미지 프롬프트가 부당하게 0점 | 여러 문장/일부 조건 누락을 실행 불가로 취급하지 않는다. 이미지 생성 후 참고 특징·언어·스타일 등 rubric별로 평가한다. | image practical evaluation fix |
| R29 | Set A/B 서술형 전반 보수 | 공개 A/B Q36–Q40은 실제 출처 채점 기준, 5개의 1점 criterion, 실행 가능한 context를 모두 갖춰야 한다. | `enrich-aipot-practical-context.mjs` |
| R30 | 부분점수 색 표시 | criterion 1점은 초록, 0점은 빨강, 부분 달성은 주황으로 표시한다. 표시는 문항 총점이 아니라 criterion 단위다. | practical result UI |
| R31 | 문항바로가기·이전 풀이 번호도 주황 | 부분점수가 있는 문항 번호는 navigator와 저장 응답 보기에서 주황으로 표시한다. | question navigator/review UI |
| R32 | 이미지 생성·실행평가 버튼의 로딩 | 중복 제출을 막으면서 진행 중 spinner/disabled 상태를 명시한다. 성공·실패·재시도 상태도 구분한다. | practical action UI |
| R33 | 유료 미디어 확인 오류 조사 | 저장된 이미지 답을 화면 재진입 때 재실행하지 않는다. 최초 생성 전 확인만 요구하고, lock된 평가 ID를 보존한다. | media-confirmation flow |
| R34 | Q40 및 Set B 누락 이미지 대조 | 원본과 learner manifest를 전수 비교한다. A Q40 book/gavel crop, B Q37 Earth Day poster처럼 필요한 시각 자료는 복원하고, 텍스트 문제에는 불필요한 이미지 생성하지 않는다. | source asset audit |
| R35 | 시험 종료·답안 제출 불가 | final submit은 기존에 lock된 practical evaluation ID를 받아 그 결과를 즉시 저장한다. 계약 hash 조회는 재시도 fallback일 뿐 정상 경로가 아니다. | evidence-ID submission regression |
| R36 | fallback만 무생성 제출, 정상은 즉시 저장 | 정상 실행/이미지 결과는 lock 시점에 저장하고 제출 때 재생성·재평가하지 않는다. 미확인 답만 명시적 무생성 제출로 보낸다. | service/repository practical persistence |
| R37 | 개인 원본문제 Set 1을 사진 기반으로 제작 | 원본이 PDF라고 가정하지 않고 사진 inventory부터 검증했다. Q01–Q30 직접 풀이 정답, Q31–Q35 단답/선택은행, Q36–Q40 5점 rubric, 필요한 crop을 갖춘 40문항/100점으로 만들었다. | Set 1 builder and test |
| R38 | 다음 세트를 위한 전체 기록 | 이 플레이북을 정본으로 만들고, 새 세트마다 아래 체크리스트와 검증 게이트 결과를 같은 문서의 세트별 기록에 추가한다. | 이 문서 |
| R39 | Set B 전체 보기의 엉뚱한 선택지 설명 점검 | 공용 선택은행 설명은 `choice_bank` 유형에만 적용한다. 일반 객관식은 같은 숫자 ID를 써도 그 문항의 개념으로 설명해야 한다. | `normalize-aipot-public-choice-feedback.mjs`, public feedback 검사 |
| R40 | Q7 GAN을 포함한 Set B 해설 중복·오류 점검 | 모든 선택지는 문항별 고유 설명을 갖고, GAN에서는 생성자·판별자와 인코더를 정확히 구분한다. 정오만 반복하거나 다른 문항의 설명을 붙이는 것은 금지한다. | Public B Q02/Q07 feedback 검사 |
| R41 | Q11 기대 정답과 “보완: RAG” 불일치 | `chapter`와 `topic`은 실제 문항 개념이어야 한다. 이 값은 복습 추천의 근거이므로 answer key와 함께 전수 대조한다. | `publicQuestionMetadata`, answer-mapping 검사 |
| R42 | Q13·Q15 등 구조가 한 줄로 뭉개진 문제 | 역할·단계·파라미터·입출력 관계는 제목, Markdown 표, 코드 블록으로 재구성한다. 원문 줄바꿈이 정보 관계를 잃게 하면 출고하지 않는다. | Public B Q13/Q15/Q16 text 검사 |
| R43 | Q31–Q35 문제 문맥 누락과 정답 누설 | 공통 파이프라인 문맥과 답안 방법은 각 문항에서 보존하되, stem에는 정답값을 넣지 않는다. 선택지는 화면의 답안 control에서만 제공한다. | Public B Q31–Q35 text·feedback 검사 |
| R44 | Q17 표와 원본 사진의 중복 | 원본 crop이 표와 완전히 같은 정보만 담고 답안 판단용 시각 자료가 없으면 접근 가능한 표만 제공한다. 중복 사진을 유지하지 않는다. | Public B Q17 asset/text 검사 |
| R45 | Q18 사진 및 Q19 처리 구조 누락 | 답안 판단에 사진이 필요한 Q18 같은 문항은 원본 crop을 유지한다. Q19처럼 처리 단계가 핵심인 문항은 텍스트 표로 구조를 보존한다. | Public B Q18 asset, Q19 text 검사 |
| R46 | 비슷한 단답형 전수 점검 | canonical answer와 검토된 유한 alias만 허용한다. 띄어쓰기·하이픈·한글 명칭·공식 인쇄 변형은 추가할 수 있지만 다른 개념은 허용하지 않는다. 예: `backpropagation`, `역전파`, `역전파 알고리즘`은 허용하고 `gradient descent`는 거부한다. | answer-key/sync 도구, API 회귀 검사 |
| R47 | Set B에 서술형 미풀이 종료가 없음 | Q01–Q35를 확정한 뒤 Q36–Q40을 미응답·0점으로 남기고 확인 대화상자를 거쳐 종료할 수 있다. 일부 답안만 작성했다면 생성 없이 미평가로 저장할 수 있으며, 이미 평가를 잠근 답안을 이 경로로 덮어쓰지 않는다. | practical submission UI/API 검사 |
| R48 | 중도 제출이 서술형 단계에 묶임 | 학습자는 시작 전·이론·실습·결과 단계 어느 때나 현재 답안으로 제출할 수 있다. 미응답은 명시적으로 flag하고 오답노트·약점 주제·챕터별 정오답 집계의 분자와 모수에서 제외한다. 따라서 미응답만 있는 C01/C02 등 챕터를 0%로 표시하지 않는다. 작성했지만 실행하지 않은 실기 답안만 기존의 무생성 제출 확인을 거친다. | practice solver, submission API/UI 검사 |
| R49 | 밑줄·굵은 글씨로 지목한 내용이 평문으로 사라짐 | 발문이 ‘밑줄 친 내용’, ‘굵은 글씨의 내용’처럼 서식 자체를 답안 판단 대상으로 지목하면, learner prompt에도 같은 범위와 서식을 보존한다. 밑줄은 `__내용__`, 굵은 글씨는 `**내용**`으로 전사하고, 단순히 “강조된 부분”이라고 바꾸거나 span을 넓히거나 줄이지 않는다. Set 4 Q08처럼 지목된 모든 항목을 검사한다. | source validator의 서식 범위 회귀 검사, renderer 검사 |

## 3. 다음 세트 제작 절차

### 3.1 원본 접수와 증거 분류

1. 원본 종류를 먼저 확정한다. 촬영 사진, PDF, OCR, 기존 manifest는 서로 대체물이
   아니다. 사진 기반이면 사진 inventory, PDF 기반이면 쪽수/추출 범위를 기록한다.
2. 원본 파일은 감사 자료로 보존한다. 삭제 요청이 있어도 learner manifest, 전용 asset,
   OCR/corpus, 원본 페이지, 제출 이력을 한꺼번에 지우지 않는다.
3. 문항마다 다음 표를 만든다: `문항 번호`, `원본 위치`, `텍스트만으로 충분한가`,
   `필요한 crop`, `재구성한 표`, `정답 근거`, `검수자`. 새 asset을 만들기보다 원본의
   필요한 부분을 crop하는 것을 우선한다.
4. 시각 자료가 유일한 정보일 때만 crop을 learner manifest에 선언한다. 원본 전체 페이지,
   정답 페이지, 불필요한 장식 이미지는 공개하지 않는다.
5. OCR은 초안일 뿐이다. 문장 중간 개행, `()` 꼬리, 잘린 표, 인식 오류를 원본과 대조해
   수정한다. Set 1의 Q01 `적응`, Q14 백틱, Q23 `인포그래픽`처럼 직접 확인한 수정은
   builder와 검증기에 회귀 조건으로 남긴다.

### 3.2 문항 구조와 콘텐츠 작성

40문항 100점의 현재 실전형 템플릿을 그대로 쓰는 세트라면 Q01–Q30은 객관식 각 2점,
Q31–Q33은 단답형 각 3점, Q34–Q35는 선택은행 각 3점, Q36–Q40은 실기형 각 5점으로
구성한다. 원본의 배점이 다르면 원본을 우선하되 합계와 유형을 검사기에 명시한다.

- stem에는 답을 고르는 데 필요한 사실을 모두 제공한다. `㉠`이나 표의 열, UI 상태가
  이미지만 보고 알 수 있다면 해당 crop 또는 접근 가능한 표를 반드시 제공한다.
- 발문이 밑줄·굵은 글씨·기울임·색상 등으로 특정 텍스트를 지목하면, 그 텍스트와 강조
  범위를 learner prompt에서 원본과 동일하게 보존한다. 밑줄은 `__내용__`, 굵은 글씨는
  `**내용**`으로 작성한다. 서식이 답안 판단과 무관하다는 것을 원본으로 확인한 경우에만
  생략할 수 있으며, 확인하지 않은 OCR 평문화는 금지한다.
- 표는 열 제목, 구분선, 단위, 대응 관계가 보이게 한다. “사전 학습 | 미세 조정”처럼
  답 분류가 두 영역인 경우 머리글과 경계를 보존한다.
- 조합형은 ㉠·㉡ 등의 개별 문장을 별도로 판정할 수 있어야 한다. 선택지는 조합 결과를
  표시하되 설명은 포함된 각 문장의 상태를 다룬다.
- 모든 객관식 선택지에는 고유한 `feedback.explanation`을 둔다. 설명은 선택지의 용어,
  stem의 판정 기준, 맞음/틀림의 이유를 포함한다. 출처 페이지명, placeholder, 다른
  선택지에 그대로 붙인 문장은 금지한다.
- 단답형은 기대 답·동의어·오탈자 허용 범위를 명시한다. 선택은행은 공통 문맥과
  문항별 빈칸을 보존하되 stem에 정답값을 넣지 않는다. 단답의 판정은 핵심 용어
  정확성을 우선하고, 장황하지만 핵심이 다른 답을 맞게 처리하지 않는다.
- Q36–Q40은 원문 채점 기준을 먼저 전사하고 criterion을 1점씩 분해한다. 모범 답,
  원문 출처, 입력 자료, 실행 방식, 허용되는 대체 표현을 함께 기록한다.

### 3.3 정답과 채점 검증

1. 제작자가 먼저 외부 정답을 보지 않고 전 문항을 직접 푼다. 객관식에는 간결한 풀이
   근거를, 단답에는 기대 답과 허용 표기를, 실기에는 criterion별 충족 예를 작성한다.
2. 그 다음 원본 정답/해설과 비교한다. 불일치 시 단순히 answer key를 덮어쓰지 말고
   stem, 선택지, 사진/PDF, 출처 쪽수를 다시 확인한다. 해결한 충돌은 regression test로
   고정한다.
3. 단답 자동 평가는 Haiku 의미 판정이 아니라 문항 데이터의 기대 답과 검토된 허용 변형을
   정규화해 유한하게 매칭한다. UI에는 정확한 기대 답을 보여 준다. Haiku는 Q36–Q40에서만
   원문 문항, task context, 학습자 답, provider 참고 답을 함께 받아 실기 평가한다.
4. 실기 평가는 형식 gate가 아니라 rubric 점수다. 답이 recognizable하면 실행한 뒤,
   빠진 조건만 criterion별로 감점한다. 실행하지 못한 경우에만 원인과 재시도 방법을
   분명히 표시한다.
5. 이미지/코드/텍스트 실행 결과는 문항을 lock할 때 저장한다. 최종 제출은 동일한
   evaluation ID를 검증해 저장하며 다시 유료 생성이나 재평가를 하지 않는다.

## 4. 학습 화면과 제출 UX 계약

- Q01–Q30 선택을 lock하면 해당 선택지 카드 안에서 모든 선택지 설명을 확인할 수 있다.
  설명은 다른 선택지 칸으로 이동하지 않는다.
- 객관식·단답·선택은행의 정답 결과와 이전 시도는 문제 전문, 모든 보기, 내 선택,
  정답을 함께 보여 준다.
- 5문항 paging은 이동 직후 상단으로 스크롤한다. 모든 주 조작은 loading, disabled,
  오류, 재시도 상태를 제공하며 중복 제출을 막는다.
- 실기형은 문항별 재풀이만 가능하다. 전체 시험 재시작으로 다른 문항을 초기화하지
  않는다.
- 실기 결과는 원문/PDF 채점 기준 → criterion별 1점 점수 → 실행 근거 순으로 짧게
  보여 준다. 완전 충족은 초록, 부분 충족은 주황, 0점은 빨강으로 표현한다. navigator와
  이전 풀이 번호도 부분점수 문항은 주황을 사용한다.
- 이미지 생성은 최초 실행 전에만 유료 미디어 확인을 받는다. 잠긴 결과를 새로고침해
  다시 평가하는 과정에서 재확인을 요구하거나 "Confirm the paid media" 오류를 내면
  안 된다.
- Q01–Q35를 확정한 학습자는 Q36–Q40을 전혀 풀지 않고 `서술형 건너뛰고 종료`할 수
  있다. 이 다섯 문항은 미응답·0점으로 저장한다.
- 시작 전을 포함한 어느 단계에서나 `시험 종료 및 답안 제출`을 사용할 수 있다. 답하지
  않은 문항은 `미응답` flag와 0점으로 저장하되, 오답노트·약점 주제·챕터별 정오답 집계의
  분자와 모수에는 포함하지 않는다. 미응답만 있는 챕터는 0%로 표시하지 않는다.
- 답안을 작성했지만 실행하지 않으려는 경우 `생성 없이 답안 제출`을 사용한다. 이
  답안은 미평가·0점으로 저장하며, 정상 실행이 이미 완료된 답을 이 경로로 덮어쓰지
  않는다.

## 5. 세트 출고 검증 게이트

### 필수 콘텐츠 검사

새 세트용 builder/validator를 만들거나 기존 validator를 확장한 뒤 다음을 확인한다.

- 문항 수, 순서, 유형, 배점 합계, 비어 있거나 잘린 prompt, 모든 선택지와 해설,
  기대 답/허용 답, rubric 5개와 각 1점.
- 원본 inventory 수, manifest가 선언한 모든 asset의 존재, 시각 의존 문항의 crop 제공,
  원본 정답·사진이 learner 화면에 노출되지 않는지.
- 직접 풀이 answer mapping, 복수정답, 표/조합 문항의 개별 설명, Q36–Q40의 실제 출처
  채점 기준과 모범 답.
- 발문이 지목한 밑줄·굵은 글씨 등의 서식 범위가 learner prompt와 renderer에서 동일하게
  보이는지. 해당 유형이 있으면 각 지목 span을 validator 회귀 조건으로 고정한다.

기본 명령은 다음과 같다.

```bash
pnpm aipot:source:check
pnpm aipot:public:check
pnpm aipot:content:check
pnpm aipot:playbook:check
```

### 애플리케이션 회귀 검사

콘텐츠 외 코드/API를 바꾼 경우 다음을 실행한다. FastAPI model/route가 바뀌면 OpenAPI와
생성 client도 반드시 갱신하고 커밋한다.

```bash
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
uv --directory backend run ruff check .
uv --directory backend run pytest
uv --directory backend run python -m app.openapi
pnpm --dir frontend generate:api
docker compose config --quiet
git diff --check
```

API가 바뀌지 않은 콘텐츠/문서 작업에는 OpenAPI 생성으로 이미 검증된 파일을 불필요하게
변경하지 않는다. 배포가 필요한 코드 변경이면 API와 frontend만 재생성하고 Caddy, 80/443,
다른 컨테이너, `aipot_history` volume은 건드리지 않는다.

### 수동 최종 확인

1. 활성 카탈로그가 의도한 세트만 반환하는지 확인한다.
2. 각 세트에서 visual crop, 객관식 lock, 기존 응답 보기, Q05→Q06 상단 이동, 실기
   문항별 재시도, 서술형 미풀이 종료, 무생성 제출, 최종 제출을 확인한다.
3. 비용이 드는 이미지 생성은 자동 smoke test로 반복하지 않는다. 확인 대화상자와
   저장된 evidence-ID의 재제출을 먼저 단위/API 테스트로 검증한다.
4. Playwright Chromium이 설치된 환경에서는 다음을 실행한다.

```bash
cd frontend
pnpm exec playwright install chromium
PLAYWRIGHT_BASE_URL=http://192.168.219.130:18080 pnpm test:e2e
```

## 6. 새 세트 기록 템플릿

새 세트를 출고할 때 이 문서 끝에 아래 형식으로 한 블록을 추가한다.

```md
## 세트 N — YYYY-MM-DD

- 원본: 사진/PDF, 파일 수·쪽수, 보존 위치
- learner manifest: ID와 생성기/validator
- 증거 분류: text-only 문항 수, crop 문항 번호와 이유
- 직접 풀이: 검수자, answer-key 충돌과 해결 근거
- 단답: 기대 답과 허용 변형
- 실기: 원문 criterion 출처, 실행/무생성 정책
- 검사: 실행한 명령과 결과
- 수동 검증: 실행한 항목, 미실행 항목과 이유
- 변경/삭제: 대상, 보존 자료, 휴지통·복구 정보
```

## 7. 알려진 한계와 금지 사항

- 이 호스트는 Playwright Chromium이 없어 전체 브라우저 E2E가 보류된 적이 있다. 브라우저
  검증을 하지 않았으면 “실행하지 않음”으로 기록하고 통과라고 주장하지 않는다.
- 유료 미디어 공급자 실행은 비용·확인 절차를 수반한다. 실제 실행과 fake evaluator/API
  검증을 구분한다.
- 새로운 의존성은 추가하지 않는다. 필요해지면 먼저 승인받고 `pnpm`/`uv`로 lockfile을
  동기화한다.
- `/aipot-content` 원본 mount는 읽기 전용이다. learner manifest를 다시 만들 때는
  지정된 생성기만 쓰고, 원본 사진/OCR를 덮어쓰지 않는다.
- 카탈로그 축소나 asset 삭제는 파괴적 작업이다. 대상이 모호하면 멈추고 목록·보존안·복구
  가능성을 제시한다.
- 운영 상태가 바뀌면 `MORNING.md`, `docs/deployment-report.md`, `docs/preflight.md`,
  `docs/skipped-actions.md`에 실제 결과와 미실행 근거를 반영한다.

## 세트 2 — 2026-08-07

- 원본: 촬영 사진 24장(`2회/images/`), 검토 OCR·corpus·정답표는
  `/home/cgma/cgma_git/study/aipot/실전모의고사/`에 보존했다.
- learner manifest: `source-round-02`; 생성기
  `tools/build-aipot-source-round-02.mjs`, validator
  `tools/test-aipot-source-round-02.mjs`.
- 증거 분류: text-only 22문항, crop 문항 Q06·Q10·Q14·Q16·Q18–Q21·Q26·Q31 및
  Q37·Q39·Q40 참고 이미지. 원본 전체 페이지·정답 페이지는 learner asset으로 노출하지 않는다.
- 직접 풀이: OCR 문항을 정답표(Q01–35)와 대조했다. Q04는 원본 표의 PCA·K-means·t-SNE·DBSCAN을
  복수선택 보기로 복원했으며 정답은 PCA와 t-SNE(`1|3`)다.
- 단답: Q31–Q35는 원본의 다중 보기 번호 답안 방식(각 `1`, `7`, `12`, `17`, `23`)을 보존했다.
- 실기: Q36–Q40은 원본 답안 예시를 provider solution으로만 보관하고, 문항별 5개·각 1점 rubric과
  기존 실행/무생성 제출 정책을 적용했다.
- 검사: Set 2 전용 생성·검사, frontend lint/typecheck/unit/build, backend Ruff/pytest,
  root production dependency audit, Compose config, `git diff --check`를 통과했다. frontend
  production audit의 기존 Next.js·PostCSS·sharp 취약점은 별도 정리가 필요하다. 이후
  `source-round-03` placeholder·생성기 문법 오류를 정리해 전체 콘텐츠 검사가 통과했다.
- 수동 검증: 브라우저·유료 이미지 생성은 실행하지 않았고, 로컬 18080 서비스가 없어
  live API 검증은 `docs/skipped-actions.md`에 기록했다.
- 변경/삭제: 새 learner manifest만 생성했으며 원본·기존 세트·asset은 삭제하지 않았다.

## 세트 3 — 2026-08-07

- 원본: 촬영 사진 27장(`3회/images/`), 검토 OCR·corpus·정답표는
  `/home/cgma/cgma_git/study/aipot/실전모의고사/`에 보존했다.
- learner manifest: `source-round-03`; 생성기
  `tools/build-aipot-source-round-03.mjs`, validator
  `tools/test-aipot-source-round-03.mjs`.
- 증거 분류: text-only 33문항, crop 문항 Q03·Q04·Q15·Q18·Q28 및
  Q36·Q39 참고 이미지. 원본 전체 페이지·정답 페이지는 learner asset으로 노출하지 않는다.
- 직접 풀이: OCR로 전 문항의 풀이 근거를 작성한 뒤 정답표(Q01–Q35)와 대조했다.
  Q11의 판독 불확실 비정답 보기는 표의 자연어 처리 순서에 맞춰 복원했다. 이후 전수
  감사에서 Q31–Q33이 기능명이 아니라 보기 번호를 요구한다는 것을 재확인해 그 매칭을
  보정했다.
- 단답: Q31 `17/⑰`, Q32 `9/⑨`, Q33 `22/㉒`를 유한 허용 답으로 두고, 답을 고르는 데
  필요한 원문 보기를 각 prompt에 보존한다. Q34–Q35는 원본의 25개 선택은행 방식으로
  유지하며 모든 보기에 고유한 설명을 둔다.
- 실기: Q36–Q40은 원본 답안 예시를 provider solution으로만 보관하고, 문항별 5개·각
  1점 rubric과 기존 실행/무생성 제출 정책을 적용했다.
- 검사: `node tools/build-aipot-source-round-03.mjs`,
  `node tools/test-aipot-source-round-03.mjs`,
  `node tools/build-aipot-source-round-03.mjs --check` 통과.
- 수동 검증: 브라우저·유료 이미지 생성은 실행하지 않았다.
- 변경/삭제: 새 learner manifest만 생성했으며 원본·기존 세트·asset은 삭제하지 않았다.

## 세트 5 — 2026-08-07

- 원본: 촬영 사진 28장(문제 24장, 정답·해설 4장),
  `/home/cgma/cgma_git/study/aipot/실전모의고사/5회/images`에 보존.
- learner manifest: `source-round-05`,
  `tools/build-aipot-source-round-05.mjs`와
  `tools/test-aipot-source-round-05.mjs`로 생성·검증.
- 증거 분류: text-only 문항은 Markdown으로 재구성했다. Q01, Q02, Q05, Q12, Q24,
  Q31, Q32, Q34와 실기 Q36·Q38은 원문 시각 자료가 답안 근거이므로 필요한 crop만
  선언했다. 정답·해설 페이지는 learner manifest에 노출하지 않는다.
- 직접 풀이: Q01–Q30의 개념 풀이와 Q31–Q35의 용어를 먼저 대조했다. 원본 정답표는
  감사 증거이지만 learner stem과 충돌하면 정답으로 덮어쓰지 않는다. Q35는 2026-04-21
  OpenAI의 ChatGPT 발표와 stem의 제품·시점이 일치하는 `ChatGPT Images 2.0`으로
  보정했다. 사진 정답표의 `나노바나나`는 다른 공급자 모델이므로 이 문항의 허용 답이
  아니다.
- 단답: Leave-One-Out 교차검증, 과소적합, GAN, 대화스타터, ChatGPT Images 2.0의
  검토된 동일 표기만 허용한다. `나노바나나`는 Q35에서 명시적으로 거부한다.
- 전수 감사 보정: Q06·Q19의 정답 반대 해설, Q21의 K/N 용어, Q24의 복수 모호
  distractor, Q25의 주제·선택지·해설, Q39–Q40의 빈 OCR bullet을 바로잡았다. Q23은
  촬영 정답표 `②`가 아니라 stem을 직접 풀어 유일하게 부적절한 `④`를 learner 정답으로
  유지한다. 이 예외와 Q35의 정답표 충돌은 validator 회귀 조건으로 남긴다.
- 실기: 원본 답안 예시(페이지 25)를 `provider_solution`으로 보존하고, 각 문항을
  1점씩 5개 criterion으로 채점한다. 이미지 실행은 기존 유료 미디어 확인·lock된
  evidence-ID 정책을 따르며, 무생성 제출은 0점으로 저장한다.
- 검사: `node tools/build-aipot-source-round-05.mjs`,
  `node tools/build-aipot-source-round-05.mjs --check`,
  `node tools/test-aipot-source-round-05.mjs`.
- 수동 검증: 정답·해설 촬영 페이지의 answer key를 확인했다. 새 manifest의 API 노출과
  브라우저/유료 이미지 실행은 이 콘텐츠 변경 단계에서 실행하지 않았다.
- 변경/삭제: 새 manifest와 전용 builder·validator만 추가했으며, 기존 세트·원본·asset은
  삭제하거나 이동하지 않았다.

## 세트 4 — 2026-08-07

- 원본: 촬영 사진 26장(문제 21장, 정답·해설/예시 5장), 검토 OCR·corpus·답안 예시는
  `/home/cgma/cgma_git/study/aipot/실전모의고사/`에 보존했다.
- learner manifest: `source-round-04`; 생성기
  `tools/build-aipot-source-round-04.mjs`, validator
  `tools/test-aipot-source-round-04.mjs`.
- 증거 분류: Q01–Q36·Q38은 text-only로 재구성했다. Q37(모래 장면), Q39(로고),
  Q40(학습 장면)만 답안 근거인 crop을 선언했다. 전체 원본과 정답·예시 페이지는
  learner asset으로 노출하지 않는다.
- 직접 풀이: Q01–Q30은 OCR을 바탕으로 먼저 판정하고 촬영한 정답표와 대조했다.
  Q14의 `구체적인`, Q16의 `밥값`은 원본 페이지를 재확인해 OCR 판독 표기를 해소했다.
- 보기 해설: Q01–Q30의 정답·오답 각각에 해당 선택지의 개념과 문항 조건에 따른 판정
  이유를 기록했다. 정답 번호만 반복하는 범용 문구는 validator가 거부한다.
- 전수 감사 보정: Q03·Q18·Q28의 선택지별 해설을 해당 보기와 정답에 맞게 고쳤고,
  Q10의 Softmax 선택지를 기술적으로 정확하게 정규화해 오답이 하나만 남도록 했다.
  Q33의 비원문 alias를 제거하고, Q35의 canonical 표기를 `글레이즈(Glaze)`로 고정했다.
- 단답: Q31 `model`, Q32 `import`, Q33 `주제에서 만들기`, Q34 `기술의 합목적성 원칙`,
  Q35 `글레이즈(Glaze)`와 같은 개념의 검토된 표기만 허용한다.
- 실기: 원본 예시 답안(페이지 26)은 `provider_solution`으로만 보관하고, 각 문항은
  5개·각 1점 criterion으로 평가한다. 기존 실행/무생성 제출 및 이미지 확인 정책을 따른다.
- 검사: `node tools/build-aipot-source-round-04.mjs`,
  `node tools/test-aipot-source-round-04.mjs`, `pnpm aipot:content:check`,
  `git diff --check`를 통과했다.
- 수동 검증: Q14·Q16과 Q36·Q38 원문 페이지를 사진으로 대조했다. 브라우저와 유료 이미지
  생성은 실행하지 않았다. `curl http://127.0.0.1:18080/api/v1/aipot/exams/source-round-04`는
  로컬 서비스 미기동으로 연결되지 않았고, 재확인 절차는 skipped-actions에 기록했다.
- 변경/삭제: 새 learner manifest와 전용 builder·validator만 추가했으며 원본·기존 세트·asset은 삭제하지 않았다.

## 오답 노트 Set 1 — 2026-08-08

- 원본: `public-set-a`, `public-set-b`, `source-round-01`~`source-round-04`의 제출 이력과 검토된 learner manifest다. 원본 사진·PDF·OCR·기존 세트는 보존했다.
- learner manifest: `sample-set-01` (`AI-POT 오답 노트 Set 1 · 시험 직전 100문제`), 생성기 `backend/app/features/aipot/wrong_note_set.py`, 검사기 `tools/test-aipot-wrong-note-set-01.mjs`.
- 증거 선택: 대상 세트별 최신 제출 1회만 사용하고 공란 답안은 `is_unanswered` 기록과 관계없이 제외했다. Public B는 제출이 없고 Source 1의 최신 제출은 응답 오답이 없다.
- 콘텐츠: 회차별 균등 배분 없이 결손 유형을 가중해 100문항·각 1점으로 구성했다. 모든 문항은 단답형 또는 짧은 보기의 단일 정답 4지선다이며, 실기·선택은행 원문은 검토된 핵심 개념 확인으로 변환했다.
- 예외: Public A Q38의 저장된 ‘천 단위 환산’ 감점 근거는 원문과 참고 답안에 없어서 변형 근거로 쓰지 않았고, provenance에 제외 사유를 남겼다.

## 오답 노트 Set 1 재생성 — 2026-08-08

- 사용자 요청에 따라 위 100문항 버전을 교체해 `sample-set-01`을 총 50문항·문항당 2점·100점으로 재생성했다. 결과 화면의 100점 계약은 유지한다.
- 6개의 독립 감사에서 같은 선택 조건을 적용했다: `public-set-a`, `public-set-b`, `source-round-01`~`source-round-04` 각각의 최신 제출 1회, 공란·미응답 제외, 응답했지만 부분/오답만 채택. Source 1은 최신 응답 오답이 없어 출제 0문항이지만 최신 시도는 provenance에 보존한다.
- 최신 Public B 제출의 Q26(VAE), Q28(결측치 처리)을 포함했다. 이전 기록의 ‘Public B 미제출’은 과거 상태이므로 이 재생성 기록이 우선한다.
- 회차별 균등 분배를 하지 않고 현재 결손을 가중했다: A 13, B 4, Source 1 0, Source 2 6, Source 3 2, Source 4 25문항. 모든 문항은 단답형 또는 짧은 보기의 단일정답 4지선다이며, 단답은 검토된 유한 alias만 쓴다.
- Public A Q38은 원문·참고 답안에 없는 ‘천 단위 환산’ criterion 때문에 계속 제외한다. 생성기와 검사기는 모든 문항의 selected latest-review provenance, 50개 연속 번호, 2점 배점, 4개 보기/고유 해설 또는 finite alias를 검증한다.

## 오답 노트 Set 1 서술형 출처 제외 — 2026-08-08

- 사용자 요청에 따라 원문 출처가 `short_answer` 또는 `practical_prompt`인 오답에서 파생한 Set 1 항목을 모두 제거했다. 따라서 기존 Public A Q37 실기에서 파생했던 Q12·Q13도 제거됐으며, 재생성 뒤 같은 번호는 남은 객관식 출처의 다른 문항을 가리킨다.
- 50문항·문항당 2점·100점 제약은 유지했다. 남은 `multiple_choice`·`choice_bank` 원문 오답의 개념 변형을 오류 유형 비중에 따라 가중했으며, 여전히 단답형 또는 짧은 보기의 단일정답 4지선다만 사용한다.
- `wrong_note_set.py`는 source manifest의 실제 문항 유형을 읽어 허용 유형만 선택하고, 검사기는 모든 rendered `source_reference`를 다시 대조한다. 제외된 최신 리뷰와 원문 유형은 provenance에 보존한다.

## 오답 노트 Set 1 중복 문항 보정 — 2026-08-08

- 서술형 출처를 제외한 뒤 남은 오답 개념을 기계적으로 같은 stem에 얹은 변형이 반복된 것을 감사했다. 같은 답을 묻더라도 각 문항은 다른 장면·조건·대조 포인트를 사용하도록 source-fact별로 검토된 scenario를 분리했다.
- 모든 문항의 `type + 정규화 prompt + 정렬된 choice text` fingerprint가 고유해야 한다. 생성기 단위 테스트와 manifest validator가 이 조건을 검사해 동일 문항이 다시 유입되면 출고를 실패시킨다.
