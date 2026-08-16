#!/usr/bin/env node

/** Build the learner-facing Set 5 from its photographed source corpus. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const checkOnly = process.argv.includes("--check");
const contentRoot = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const corpusPath = resolve(contentRoot, "corpus/source-round-05.json");
const ocrPath = resolve(contentRoot, "corpus/ocr/source-round-05.md");
const outputPath = resolve(contentRoot, "data/web-exams/source-round-05.json");

const answers = ["1", "3", "1", "3", "2", "4", "3", "4", "4", "2", "1", "2", "1", "1", "4", "3", "2", "3", "1", "3", "1", "4", "4", "1", "4", "2", "3", "1", "2", "4"];
const topics = {
  1: ["C03", "다층 신경망과 XOR"], 2: ["C02", "부스팅"], 3: ["C03", "인공신경망 구성 요소"], 4: ["C05", "트랜스포머"], 5: ["C13", "Google Colab"],
  6: ["C12", "검색증강생성(RAG)"], 7: ["C13", "Google Cloud Vertex AI"], 8: ["C09", "AI 프로젝트 데이터 작업"], 9: ["C04", "일반 AI와 생성형 AI"], 10: ["C09", "검색 엔진"],
  11: ["C06", "RLHF와 RLAIF"], 12: ["C06", "파운데이션 모델"], 13: ["C08", "프롬프트 확장"], 14: ["C07", "작업위임과 보충 요청"], 15: ["C07", "이슈 추가 요청"],
  16: ["C05", "BPE 토큰화"], 17: ["C05", "임베딩"], 18: ["C05", "BERT와 GPT"], 19: ["C07", "프롬프트 기호"], 20: ["C07", "퓨샷 프롬프팅"],
  21: ["C03", "K-폴드 교차검증"], 22: ["C08", "비판적 분석가 관점"], 23: ["C11", "Gemini 활용"], 24: ["C09", "Google Dataset Search"], 25: ["C10", "단계적 추론(Chain-of-Thought) 프롬프팅"],
  26: ["C16", "보이스 클로닝 보안"], 27: ["C09", "탐색적 데이터 분석(EDA)"], 28: ["C16", "AI 환각과 검증"], 29: ["C16", "AI 권리장전"], 30: ["C16", "가치지향적 AI 설계"],
  31: ["C03", "Leave-One-Out 교차검증"], 32: ["C03", "과소적합"], 33: ["C04", "생성적 적대 신경망(GAN)"], 34: ["C07", "Custom GPT 대화스타터"], 35: ["C11", "ChatGPT Images 2.0"],
  36: ["C11", "키워드형 이미지 프롬프트"], 37: ["C13", "짝수·홀수 Python 코드"], 38: ["C11", "키워드형 이미지 프롬프트"], 39: ["C14", "구조화된 지역 소개 프롬프트"], 40: ["C14", "웹사이트 분석 프롬프트"],
};

const choiceReasons = {
  1: ["은닉 노드를 무제한 늘리면 훈련 표현력은 커질 수 있지만 과적합 위험도 커진다. 일반화 성능이 항상 좋아진다는 단정이 오류다.", "은닉층은 입력 특징을 새로운 표현으로 변환해 XOR처럼 단일 직선으로 나뉘지 않는 패턴을 학습할 수 있게 한다.", "ReLU 같은 비선형 활성화 함수가 있어야 층을 여러 개 쌓아도 단순 선형 변환을 넘는 복잡한 결정 경계를 만들 수 있다.", "역전파는 출력 오차의 기울기를 앞쪽 층으로 전달해 다층 신경망의 가중치를 조정하는 표준 학습 방법이다."],
  2: ["복원추출한 여러 모델을 병렬 학습해 평균·투표하는 방법은 배깅이며, 이전 오답에 가중치를 주는 절차가 없다.", "메타 학습기에 개별 모델 출력을 넣는 계층 구조는 스태킹이다. 제시된 순차적 오답 보완 과정과 다르다.", "이전 약한 학습기가 틀린 샘플의 가중치를 키워 다음 학습기가 집중하게 하므로 부스팅의 설명과 일치한다.", "무작위 특성으로 독립 트리를 만들고 같은 가중치로 평균내는 방식은 랜덤 포레스트의 설명이다."],
  3: ["시냅스 강도를 모방해 입력 중요도를 조절하는 것은 가중치, 출력의 기준점을 이동시키는 것은 편향, 비선형성을 주는 것은 활성화 함수, 중간 특징을 뽑는 층은 은닉층이다.", "편향은 입력 중요도를 나타내는 가중치를 대신할 수 없고, 출력층은 입력과 출력 사이의 중간 표현을 학습하는 은닉층이 아니다.", "활성화 함수와 편향의 역할이 뒤바뀌었다. 활성화 함수는 비선형 변환이고 편향은 활성화 이전 값을 조정한다.", "가중치는 활성화 함수가 아니며, 입력층은 중간 특징을 추출하는 은닉층 역할을 하지 않는다."],
  4: ["Self-attention은 모든 토큰 관계를 동시에 계산할 수 있어 GPU 병렬 처리에 유리하다.", "Attention은 멀리 떨어진 토큰도 직접 연결하므로 RNN의 긴 거리 정보 소실 문제를 완화한다.", "Self-attention만으로는 단어 순서를 알 수 없으므로 위치 임베딩 또는 위치 인코딩이 필요하다. 그래서 이 선택지가 부적절하다.", "각 토큰이 다른 토큰과의 관련도를 가중치로 계산하는 것이 self-attention의 핵심 동작이다."],
  5: ["Colab은 상업 운영 서비스의 안정성·무제한 자원을 보장하는 프로덕션 플랫폼이 아니라 학습·실험 환경이다.", "무료 서버 자원과 GPU·TPU 접근, 사전 설치 라이브러리, 공동 편집은 설정 부담을 줄이고 학습·협업을 돕는다.", "무료 런타임에는 사용량·세션 제한이 있으므로 모든 규모의 프로젝트를 무제한으로 수행한다는 설명은 맞지 않는다.", "Colab은 브라우저와 클라우드 런타임을 사용하므로 인터넷 없이 모든 기능을 쓴다는 설명과 맞지 않는다."],
  6: ["(가)는 문서 검색인 첫 단계이고 (나)는 생성인 세 번째 단계이므로, 두 번째·세 번째 조합이 아니다.", "(나)는 결합된 맥락 뒤의 마지막 생성 단계라 두 번째에 올 수 없고, (다)가 먼저 와야 한다.", "(다)는 두 번째가 맞지만 (가)는 이미 첫 단계이므로, 두 번째·세 번째 순서가 아니다.", "검색(가) → 질의·문서 결합(다) → LLM 응답 생성(나)의 순서이므로 두 번째·세 번째는 (다), (나)다."],
  7: ["GCP 기반 기술을 단순 데이터 처리 노하우와 위성 통신망으로 한정할 수 없고 Cloud SQL은 머신러닝 플랫폼명이 아니다.", "Vertex AI는 맞지만 GCP의 전 세계 연결 강점은 지상 광케이블만이 아니라 해저 케이블을 포함한 글로벌 인프라에 있다.", "구글의 인프라 기술, 해저 케이블 네트워크, Vertex AI의 조합이 BigQuery와의 AI 개발 통합 설명에 맞는다.", "Cloud Monitoring은 관측 도구이며 BigQuery와 짝을 이루는 머신러닝 플랫폼 Vertex AI가 아니다."],
  8: ["프로그래밍 환경 구축은 필요하지만 데이터 작업이 최소 40%라는 근거는 아니다.", "모델 학습·튜닝도 중요하지만 문제의 경험칙은 데이터 작업 비중을 약 70%로 본다.", "원시 데이터 변환과 특성 파악이 중요해도 제시된 최소 기간은 60일이 아니라 데이터 전 과정의 70일이다.", "수집·정제·분석이 프로젝트 시간의 약 70%를 차지하므로 100일 프로젝트에서는 최소 70일 배정이 적절하다."],
  9: ["시스템 A는 제한된 데이터·규칙을 사용하므로 생성형 AI가 아니고, 시스템 B는 LLM으로 새 문장을 생성하므로 일반 AI만으로 분류할 수 없다.", "A는 생성 모델이 아니라 특정 작업용 일반 AI이므로 두 시스템을 모두 생성형 AI로 볼 수 없다.", "B는 자연어 대화로 확률적 생성 출력을 만들기 때문에 일반 AI만의 범주에 속하지 않는다.", "A의 규칙·제한 입력 기반 동작은 일반 AI, B의 대규모 언어 모델 기반 자연어 생성은 생성형 AI의 특징이다."],
  10: ["학습 데이터에서 텍스트를 생성하는 기능은 생성형 대화 모델의 특징이지 키워드 검색 엔진의 특징이 아니다.", "크롤링·색인·관련도 순위, 링크 목록, 최신 웹 반영은 독립 요청을 처리하는 검색 엔진의 특징이다.", "실시간 텍스트 생성과 대화 맥락 유지는 검색 결과 링크 제공 방식과 맞지 않는다.", "대화 맥락 유지가 포함되어 있어 각 요청이 독립적인 검색 엔진 설명과 맞지 않는다."],
  11: ["ChatGPT의 실제 대화와 피드백을 개선에 활용하는 순환은 RLHF 적용 사례로 볼 수 있다.", "Claude의 도움됨·무해함 중심 선호 최적화는 인간 피드백 정렬 사례로 제시된다.", "RLAIF는 AI가 만든 피드백을 활용해 인간 라벨링의 확장성 한계를 보완한다.", "RLHF의 첫 시범 데이터는 사람이 모범 응답을 작성한 데이터다. 여러 응답의 순위는 보상 모델 학습 단계의 선호 데이터다."],
  12: ["foundation model이라는 용어의 제시 시점과 핵심 활용은 2019년 강화학습이 아니라 2021년 전이학습의 토대라는 설명이다.", "2021년·전이학습·Stability AI의 Stable Diffusion 조합이 모두 맞는다.", "foundation model 용어는 2020년 메타학습에서 나온 것이 아니며 Stable Diffusion의 개발사는 DeepMind가 아니다.", "Hugging Face는 모델 허브이지만 Stable Diffusion을 만든 조직은 Stability AI이고, 핵심 연결은 전이학습이다."],
  13: ["세 아이디어를 예시와 설명으로 각각 200단어까지 확장하라는 지시는 최소 분량의 제안서 내용을 만드는 목적에 맞는다.", "핵심만 bullet point로 줄이면 최소 2페이지가 필요한 제안서 분량을 충족하지 못한다.", "새 아이디어를 만들라는 요청은 이미 정리된 세 아이디어를 상세화해야 하는 상황과 다르다.", "한 페이지로 압축하면 배경·기대효과·실행 방안을 보강해야 하는 요구와 반대다."],
  14: ["복잡한 판단을 맡기는 작업위임, ‘최선의 방법을 당신이 결정해주세요’, 기존 답에 정보를 더하는 보충 요청, ‘추가하다’의 조합이 맞다.", "더 자세한 설명은 보충 요청의 표현이며 작업위임의 예시가 아니다. 두 기법의 위치도 바뀌었다.", "‘더 자세히 설명’은 이미 나온 답을 보완하는 요청이고 ‘위임하다’는 보충 요청의 동사가 아니다.", "문서 작성 대행은 작업위임 예시일 수 있지만 표의 (ㄱ)·(ㄷ)와 동사 관계가 반대로 배치됐다."],
  15: ["관련 쟁점을 원래 질문에 더해 달라는 요청은 이슈 추가 요청의 범위 확장 방식이다.", "‘~도 고려’와 ‘~측면 포함’은 추가 이슈를 명시하는 전형적 표현이다.", "가정 상황을 넣어 추가 논의를 유도하는 것도 범위를 넓히는 이슈 추가 요청이다.", "근거나 계산 과정을 단계별로 보이라는 요구는 추론 과정 공개 요청이지 새 이슈를 더하는 요청이 아니므로 옳지 않다."],
  16: ["빈도를 세기 전에 병합하면 어떤 쌍이 가장 자주 나오는지 알 수 없으므로 (다)가 (라)보다 앞설 수 없다.", "목표 어휘 크기 확인은 병합 뒤에 해야 하므로 (가)를 빈도 집계와 병합 사이에 둘 수 없다.", "문자를 초기 단위로 분리한 뒤 빈도 집계→최빈 쌍 병합→어휘 크기 확인·반복이 BPE의 순서다.", "초기 어휘집합을 만들지 않고 연속 쌍 빈도를 세는 순서는 BPE의 시작 단계와 맞지 않는다."],
  17: ["원-핫의 차원 증가도 한계지만, 임베딩의 핵심 효과를 희소 벡터 저장으로만 설명하지 못한다.", "원-핫은 사과·바나나의 의미적 가까움을 수치로 표현하지 못하고, 임베딩은 의미·문맥 관계를 연속 벡터로 학습한다.", "0·1 값이라는 사실은 맞지만 임베딩이 해결하는 핵심 한계를 이진 분류 정확도 향상으로 바꾼 것은 틀리다.", "컴퓨터는 텍스트를 직접 의미로 처리하지 못하며 단순 형태 변환은 임베딩의 문맥·의미 표현을 설명하지 못한다."],
  18: ["GPT는 다음 토큰 생성 모델이고 BERT는 MASK 예측 모델이므로 두 모델이 뒤바뀌었다.", "BERT는 빈칸 예측에는 맞지만 생성 모델도 BERT이고 단방향이라는 조합은 틀리다.", "BERT는 양방향 문맥으로 [MASK]를 채우고 GPT는 왼쪽에서 오른쪽으로 다음 토큰을 생성한다.", "GPT는 생성 모델이지만 BERT의 MASK 예측을 맡지 않고 양방향 문맥 모델도 아니다."],
  19: ["Markdown의 하이픈 구분선은 `---`처럼 연속 3개 이상으로 쓰며, 소괄호는 바로 앞 명사·동작의 부연 설명에 쓰일 수 있으므로 ㄱ·ㄷ 조합이 맞다.", "큰따옴표는 직접 인용 외에도 특정 표현의 강조나 문자열 표시에 쓸 수 있고, 단일 대시는 순서 없는 목록에 쓰이므로 ㄴ·ㄹ이 틀리다.", "ㄴ의 큰따옴표 제한과 ㄹ의 순서 목록 설명이 모두 틀려 ㄷ만 맞는 조합이 아니다.", "소괄호의 부연 설명은 맞지만 단일 대시는 순서 있는 목록 전용이 아니므로 ㄹ을 포함하면 틀리다."],
  20: ["퓨샷은 필요할 때 예시를 추가하는 방식이지 제로샷→원샷→퓨샷의 고정 순서를 반드시 거치는 절차가 아니다.", "예시 수에 정확히 5개라는 표준은 없으며 과업 난이도와 모델 반응에 맞춰 수를 조정한다.", "제로샷·원샷으로 작업 형식이 충분히 전달되지 않을 때 여러 예시를 제공하는 퓨샷 프롬프팅을 적용한다.", "전문 용어가 있다고 10개 이상의 예시가 필수인 것은 아니며, 필요한 최소 예시로 형식과 판단 기준을 보여 주면 된다."],
  21: ["K가 커지면 각 반복에서 테스트 비율은 작아지고 학습 데이터는 늘어난다. 학습량이 감소한다는 결론은 도출할 수 없다.", "K가 커질수록 한 fold를 제외한 더 많은 데이터가 학습에 들어가므로 단일 반복의 학습 데이터량은 증가한다.", "일반 K-fold가 계층화하지 않으면 불균형 범주 비율이 fold마다 달라져 성능 추정의 신뢰도가 낮아질 수 있다.", "K번의 검증 점수 평균은 일반화 성능, 표준편차는 분할에 따른 추정 안정성을 보여 준다."],
  22: ["새 포지셔닝과 유통 채널은 창의적 문제해결 관점이며 규제·특허 위험을 먼저 평가하는 요청과 다르다.", "사용자 경험·접근성은 사용자 옹호자 관점의 핵심이지만 법적·규제 리스크 분석을 우선하지 않는다.", "예산과 단계별 실행은 실무 실행자 관점에 맞지만 최악의 시나리오를 찾는 역할은 아니다.", "잠재 위험·규제 위반·최악의 상황을 식별하고 대응 방안을 평가하는 것이 비판적 분석가 관점이다."],
  23: ["최신 뉴스·날씨·교통처럼 최신 정보 접근이 필요한 작업은 Gemini의 Google 연동 강점과 맞는다.", "Google 서비스 통합과 실시간 정보 접근은 Gemini를 활용할 때의 대표적 장점이다.", "텍스트·이미지 등 멀티모달 입력과 Google 생태계 연동이 필요한 작업은 Gemini에 적합하다.", "오프라인에서 과거 데이터만 분석하는 일은 실시간 Google 연동 강점을 활용하지 못하므로 ‘가장 뛰어나다’는 설명이 부적절하다."],
  24: ["Dataset Search는 한 플랫폼에 올린 자료만 제공하는 저장소가 아니라 여러 웹사이트의 데이터셋 메타데이터를 찾는 검색 도구다.", "데이터셋 위치·속성 메타데이터를 색인화해 일반 웹 검색보다 데이터셋 탐색에 맞춘 결과를 제공한다.", "공개 웹사이트에 게시되고 구조화된 메타데이터가 제공된 데이터셋을 찾아 특정 플랫폼 밖의 자료 탐색에도 쓸 수 있다. 모든 공개 데이터셋을 포괄한다고 단정할 수는 없다.", "여러 기관이 제공한 같은 주제의 데이터셋을 함께 찾고 결과별 제공처를 확인할 수 있어, 출처를 비교하며 자료를 고르는 데 도움이 된다."],
  25: ["여러 독립 추론의 다수결을 고르는 설명은 자기 일관성 기법에 가깝지만, 만화의 질문 난이도에 맞춘 답변 복잡도 조절을 직접 설명하지 못한다.", "응답 시간을 기준으로 가장 짧은 답을 고르는 규칙은 질문 복잡도와 답변의 논리적 충실도를 연결하지 못한다.", "중간 복잡도 답만 택하면 간단한 질문과 복잡한 질문에 각각 다른 수준의 답을 준다는 만화의 대응 관계를 잃는다.", "질문이 복잡할수록 필요한 논리 단계를 늘리고, 간단한 질문에는 간단한 답을 내는 단계적 추론이 만화의 대응 관계를 가장 잘 반영한다."],
  26: ["감정·호흡까지 모사하면 진짜와 합성 음성을 가리기 어려워져 사칭 위험이 커진다는 연결은 타당하다.", "통화 중 실시간 변환은 음성 인증을 강화하는 것이 아니라 공격자가 본인 음성을 흉내 내 인증을 우회할 위험을 높인다.", "낮은 탐지율 때문에 기존 음성 인증을 우회해 계좌 접근·본인 확인 사기에 악용될 수 있다.", "다국어로 원 화자가 쓰지 않는 언어까지 재현하면 국제적 사칭·사기 범위가 넓어진다는 연결이 타당하다."],
  27: ["데이터 수집은 전처리 초반 단계이고, 평균 같은 중심 경향은 퍼짐 정도인 표준편차·분산을 뜻하지 않는다.", "데이터 변환은 형식·스케일을 바꾸는 단계이며 상관성은 변수 관계이지 분포의 퍼짐이 아니다.", "시각화와 통계량으로 분포·중심·퍼짐을 파악하는 단계는 데이터 탐색이고, 표준편차·분산은 산포도를 나타낸다.", "데이터 정제는 오류·결측을 고치는 단계이며 ‘집중 위치’는 산포도의 정식 명칭이 아니다."],
  28: ["법률·의료처럼 고위험 영역에서는 AI 출력의 그럴듯함만 믿지 않고 1차 출처·전문가 검증을 거치도록 설계해야 한다.", "최신 모델도 존재하지 않는 판례를 환각할 수 있으므로 형식이 그럴듯하다는 이유로 사실성을 보장할 수 없다.", "최종 사용자가 전문가라도 프롬프트 엔지니어는 검증 필요성과 한계를 명시해 안전한 사용 절차를 지원해야 한다.", "시간·비용을 이유로 판례 검증을 선택 사항으로 두면 허위 인용으로 권리 침해가 생길 수 있다."],
  29: ["자동화 시스템으로 처리됐다는 고지는 통지 및 설명 원칙에 맞는다.", "의사의 검토·수정 기회는 인간 대안·검토 원칙에 가깝고, 안전하고 효과적인 시스템이라는 원칙과의 연결이 잘못됐다.", "성별·인종별 합격률 격차를 사전 검사하는 것은 알고리즘 차별 방지 원칙에 맞는다.", "음성 데이터 수집을 사용자가 켜고 끌 수 있게 하는 것은 데이터 프라이버시 선택권을 보장한다."],
  30: ["성별을 빼도 성적대별 직업 서열을 고정하면 학력 기반 선입견과 기회의 제한이 남는다.", "희망 직업을 묻는 점은 좋지만 성적만으로 실현 가능성을 단정하면 개인의 잠재력과 다양한 경로를 축소한다.", "취업률·연봉 상위 10개만 우선 추천하면 사용자의 흥미·적성·가치관을 고려하지 못한다.", "흥미·적성·가치관을 함께 보고 성별·학력 선입견 없이 장단점을 균형 있게 제시하는 것이 가치지향적 설계다."],
};

const practical = {
  36: { kind: "image", asset: "q36-reference.jpg", criteria: ["잔디밭과 낮 장면", "달리는 남녀 축구선수", "굴러가는 축구공", "초록·보라 유니폼", "실제사진 1:1 비율"], solution: "잔디밭, 달리는 남자 축구선수, 달리는 여자 축구선수, 굴러가는 축구공, 낮, 초록색 유니폼, 보라색 유니폼, 실제사진 스타일, 1:1 비율" },
  37: { kind: "code", criteria: ["숫자 입력", "짝수·홀수 판별", "Python 코드", "주석", "예외 처리와 정상 실행 확인"], solution: "파이썬 코드를 이용해서 입력된 숫자가 짝수인지 홀수인지 판별해주는 간단한 코드를 제작해줘. 각 코드에는 주석을 달아서 어떤 역할을 하는지도 표시해줘. 짝수가 입력되면 ‘짝수 입니다!’, 홀수가 입력되면 ‘홀수 입니다!’, 판별할 수 없는 값이면 ‘다시 입력해주세요!’를 출력하고 제작 후 정상 작동되는지 테스트도 진행해줘.", fixture: { stdin: "2\n" } },
  38: { kind: "image", asset: "q38-reference.jpg", criteria: ["낮잠 자는 아기 실내 장면", "인형·화분·소파·창문", "하얀 벽·주황 햇빛·나무 바닥", "이불·동화책·하얀 커튼", "따뜻한 실제사진 16:9 비율"], solution: "낮잠을 자는 아기, 실내, 인형, 화분, 소파, 창문, 하얀색 벽, 주황색 햇빛, 나무 바닥, 이불, 동화책, 따뜻한 분위기, 하얀색 커튼, 실제 사진 스타일, 16:9 비율" },
  39: { kind: "text", criteria: ["대한민국 17개 광역자치단체", "서울 예시의 순번 형식", "나머지 16개 지역 포함", "지역별 비슷한 분량", "완성형 문장 지시"], solution: "대한민국 17개 광역자치단체를 아래 예시처럼 순번 형식으로 소개해줘. 1. 서울특별시 : 대한민국의 수도이자 최대 도시로, 약 천만 명의 인구가 거주합니다. 정치, 경제, 문화의 중심지이며 한강을 중심으로 25개 자치구로 구성되어 있습니다. 나머지 16개(부산, 대구, 인천, 광주, 대전, 울산, 세종, 경기, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주도)도 동일한 형식과 분량으로 작성해줘." },
  40: { kind: "text", criteria: ["첨부 URL 분석", "기관·조직 식별", "주요 목적과 기능", "제공 서비스", "명사구형 개조식 구조화"], solution: "첨부한 웹사이트 URL을 분석해줘. 해당 사이트가 어떤 기관 또는 조직의 웹사이트인지, 주요 목적과 기능은 무엇인지, 어떤 서비스를 제공하는지 등을 상세히 분석해줘. 분석 결과는 명사구형 개조식으로 구조화하여 제시해주세요." },
};

// The photographed answer page is audit evidence, not an authority when it
// conflicts with the learner-facing stem. Q35's April 2026 ChatGPT release is
// ChatGPT Images 2.0; Nano Banana is a different vendor's model.
const shortAnswerPolicies = {
  31: { aliases: ["leave-one-out cross-validation", "leave one out cross validation", "LOOCV", "LOO 교차검증", "Leave-One-Out 교차검증"] },
  32: { aliases: ["과소적합", "underfitting"] },
  33: { aliases: ["GAN", "generative adversarial network", "생성적 적대 신경망", "생성적 적대 신경망(GAN, Generative Adversarial Network)"] },
  34: { aliases: ["대화스타터", "대화 스타터", "conversation starter"] },
  35: { answer: "ChatGPT Images 2.0", aliases: ["ChatGPT Images 2.0", "ChatGPT Images 2", "챗GPT 이미지 2.0", "챗지피티 이미지 2.0", "gpt-image-2", "GPT-Image-2"] },
};

// Correct ambiguities in the photographed distractors without changing the
// tested concept or the answer position.
const choiceTextOverrides = {
  21: { 3: "전체 검증 완료 후 K개의 성능 지표를 산출하게 되며, 이들의 평균과 표준편차를 통해 모델의 일반화 능력과 추정 안정성을 동시에 평가할 수 있다." },
  24: {
    2: "정부 기관, 대학 연구소, 기업 등 여러 공개 웹사이트에 게시된 데이터셋 메타데이터를 검색 대상으로 하여, 특정 플랫폼에 등록되지 않은 자료도 찾을 때 유용하다.",
    3: "동일한 주제에 대해 여러 기관이나 연구자가 제공한 데이터셋을 한 번에 검색하고, 각 결과의 제공처를 확인할 수 있다.",
  },
  25: { 3: "질문의 복잡도에 맞추어 필요한 논리 단계의 수를 조절하여, 간단한 질문에는 간단히, 복잡한 질문에는 더 정교한 추론을 거친 답변을 생성한다." },
};

function sections(markdown) {
  const parts = markdown.split(/^## Q(\d{2})\s*$/m);
  const result = new Map();
  for (let index = 1; index < parts.length; index += 2) result.set(Number(parts[index]), parts[index + 1].split(/^## (?:부록|출제 설계 추출)/m, 1)[0].trim());
  return result;
}

function cleanPrompt(section) {
  return section
    .replace(/^- Source:.*\n+/m, "")
    .replace(/^- \[판독불가:[^\]]+\]\s*\n?/gm, "")
    .replace(/\s*`?\[판독불가:[^\]]+\]`?/g, "")
    .replace(/\n답:\s*_+\s*$/m, "")
    .trim();
}

function splitChoices(section) {
  const matches = [...section.matchAll(/^([①②③④])\s+([\s\S]*?)(?=^[①②③④]\s+|\s*$)/gm)];
  if (matches.length === 4) {
    return { prompt: section.slice(0, matches[0].index).trim(), choices: matches.map((match) => match[2].trim()) };
  }
  const tableMatches = [...section.matchAll(/^\|\s*([①②③④])\s*\|\s*(.+?)\s*\|\s*$/gm)];
  if (tableMatches.length === 4) {
    const prompt = section.slice(0, tableMatches[0].index)
      .replace(/\n\|\s*선택지.*\n\|\s*[-:| ]+\s*$/m, "")
      .trim();
    const choices = tableMatches.map((match) => match[2].split("|").map((value) => value.trim()).join(" · "));
    return { prompt, choices };
  }
  throw new Error(`Could not parse four choices from source text:\n${section.slice(-800)}`);
}

function visualFields(question) {
  return question.visuals?.length ? { visuals: question.visuals } : {};
}

function choiceFeedback(number, choice, index) {
  const explanation = choiceReasons[number]?.[index];
  if (!explanation) throw new Error(`Missing option-specific explanation for Q${number} option ${index + 1} (${choice}).`);
  return { explanation };
}

function practicalQuestion(base, number, section) {
  const spec = practical[number];
  const prompt = cleanPrompt(section).replace(/^\*\*실습형 — 프롬프트 작성\*\*\n+/m, "").replace(/^\[36~40\].*?\n+/m, "").trim();
  return {
    id: `source-r05-q${String(number).padStart(2, "0")}`, number, type: "practical_prompt", chapter: topics[number][0], topic: topics[number][1],
    prompt, source_page: base.source_page, ...visualFields(base), points: 5, answer: "", accepted_answers: [],
    explanation: "원본 결과물의 필수 조건을 빠짐없이 반영한 프롬프트인지 확인하세요.",
    ...(spec.asset ? { asset: `../assets/source-round-05/${spec.asset}`, asset_alt: base.primary_visual?.alt ?? "문항 참고 자료" } : {}),
    rubric: spec.criteria.map((criterion) => ({ criterion, points: 1, keywords: [criterion] })),
    evaluation: { kind: spec.kind, availability: "available", input_assets: spec.asset ? [spec.asset] : [], context_markdown: prompt, provider_solution: spec.solution, source_criteria: spec.criteria, reference_source: "AI-POT 실전 모의고사 05회 정답·해설 사진 (촬영 페이지 25)", ...(spec.fixture ? { fixture: spec.fixture } : {}), ...(spec.kind === "image" ? { options: { quality: "low" } } : {}) },
  };
}

function build() {
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8"));
  const sourceSections = sections(readFileSync(ocrPath, "utf8"));
  const questions = corpus.questions.map((base) => {
    const number = base.number;
    const section = sourceSections.get(number);
    if (!section) throw new Error(`Missing OCR for Q${number}.`);
    if (number >= 36) return practicalQuestion(base, number, section);
    if (number >= 31) {
      const policy = shortAnswerPolicies[number];
      const answer = policy.answer ?? String(base.answer);
      const aliases = policy.aliases;
      return { id: `source-r05-q${String(number).padStart(2, "0")}`, number, type: "short_answer", chapter: topics[number][0], topic: topics[number][1], source_page: base.source_page, ...visualFields(base), prompt: cleanPrompt(section), points: 3, answer, accepted_answers: aliases, explanation: `기대 정답은 ${answer}이다.` };
    }
    const parsed = splitChoices(cleanPrompt(section));
    const choices = parsed.choices.map((text, index) => choiceTextOverrides[number]?.[index] ?? text);
    return { id: `source-r05-q${String(number).padStart(2, "0")}`, number, type: "multiple_choice", chapter: topics[number][0], topic: topics[number][1], source_page: base.source_page, ...visualFields(base), prompt: parsed.prompt, points: 2, answer: answers[number - 1], accepted_answers: [answers[number - 1]], choices: choices.map((text, index) => ({ id: String(index + 1), text, feedback: choiceFeedback(number, text, index) })) };
  });
  return { id: "source-round-05", title: "AI-POT 실전 모의고사 05회 (개인 학습용 원본)", source_kind: "private_photographed_book", known_limitations: [], questions };
}

const next = `${JSON.stringify(build(), null, 2)}\n`;
if (checkOnly) {
  if (!existsSync(outputPath)) throw new Error("Set 5 learner manifest is missing. Run: node tools/build-aipot-source-round-05.mjs");
  if (readFileSync(outputPath, "utf8") !== next) throw new Error("Set 5 learner manifest is stale. Run: node tools/build-aipot-source-round-05.mjs");
  console.log("Validated image-based source-round-05 learner manifest.");
} else {
  writeFileSync(outputPath, next, "utf8");
  console.log(`Wrote ${outputPath}`);
}
