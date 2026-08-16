#!/usr/bin/env node
/** Build the learner-facing Set 3 from its photographed source corpus. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const checkOnly = process.argv.includes("--check");
const contentRoot = process.env.AIPOT_CONTENT_ROOT ? resolve(process.env.AIPOT_CONTENT_ROOT) : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const corpusPath = resolve(contentRoot, "corpus/source-round-03.json");
const ocrPath = resolve(contentRoot, "corpus/ocr/source-round-03.md");
const outputPath = resolve(contentRoot, "data/web-exams/source-round-03.json");

const answers = ["2", "2", "2", "4", "1", "3", "1", "3", "2", "3", "4", "2", "1", "3", "4", "3", "2", "1", "4", "1", "1", "2", "4", "1", "3", "4", "1", "2", "3", "4"];
const topics = {
  1: ["C01", "AI 발전 단계"], 2: ["C01", "DARPA와 전략 컴퓨팅"], 3: ["C02", "배깅"], 4: ["C02", "로지스틱 회귀"], 5: ["C08", "에이전트 AI"],
  6: ["C02", "홀드아웃 검증"], 7: ["C06", "사전학습"], 8: ["C04", "VAE 잠재 공간"], 9: ["C12", "검색과 생성형 AI"], 10: ["C07", "프롬프트 엔지니어"],
  11: ["C05", "자연어 처리 목표"], 12: ["C05", "BERT"], 13: ["C05", "GloVe"], 14: ["C05", "ELMo"], 15: ["C07", "제로샷 프롬프팅"],
  16: ["C07", "시맨틱 필터 패턴"], 17: ["C07", "Markdown 굵게 표시"], 18: ["C03", "ReLU 활성화 함수"], 19: ["C03", "비용 함수"], 20: ["C13", "OpenAI Codex"],
  21: ["C14", "Google Dataset Search"], 22: ["C07", "프롬프트 A/B 테스팅"], 23: ["C07", "제로샷 CoT"], 24: ["C11", "CFG Scale"], 25: ["C13", "OpenAI API 키"],
  26: ["C07", "Nucleus Sampling"], 27: ["C14", "GPT for Excel AI.LIST"], 28: ["C16", "워터마크"], 29: ["C16", "생성형 AI 윤리"], 30: ["C16", "프롬프트 인젝션과 탈옥"],
  31: ["C14", "NotebookLM AI 오디오 오버뷰"], 32: ["C14", "NotebookLM 보고서"], 33: ["C14", "NotebookLM 슬라이드 자료"], 34: ["C14", "NotebookLM 인포그래픽"], 35: ["C14", "NotebookLM 플래시 카드"],
  36: ["C11", "이미지 생성 프롬프트"], 37: ["C07", "정보성 글쓰기 프롬프트"], 38: ["C13", "코드 생성 프롬프트"], 39: ["C11", "키워드형 이미지 프롬프트"], 40: ["C07", "문서 작성 프롬프트"],
};
const facts = {
  1: "현재 상용 AI는 Narrow AI이고 AGI·ASI는 아직 실현되지 않았으므로 기준 2의 설명이 틀렸다.", 2: "전략 컴퓨팅 구상(SCI)은 DARPA가 추진했다.", 3: "복원 추출 표본의 독립 학습 결과를 투표·평균으로 합치는 방식은 Bootstrap Aggregating, 즉 배깅이다.", 4: "연속 입력을 0~1 확률의 S자 곡선으로 바꾸는 이진 분류 모델은 로지스틱 회귀다.", 5: "자율 실행·외부 도구 연동·결과 평가와 수정은 각각 B·D·E에 대응한다.",
  6: "한 번의 훈련·테스트 분할인 홀드아웃 검증의 특징은 ㄴ·ㄷ·ㄹ이다.", 7: "레이블 없는 대규모 텍스트에서 토큰을 복원해 범용 언어 구조를 익히는 단계는 사전학습이다.", 8: "VAE가 연속적이고 보간 가능한 표현을 만들도록 유도하는 공간은 잠재 공간이다.", 9: "생성형 AI는 대화 맥락을 활용할 수 있으므로 이전 대화를 기억하지 못한다는 ㉡이 틀렸다.", 10: "무대의 속삭임, 터미널 표시, AI 입력문이라는 단서는 prompt이며 이를 다루는 역할은 프롬프트 엔지니어다.",
  11: "문맥 의미 파악·문장 생성·언어 변환의 순서는 언어 이해·언어 생성·언어 번역이다.", 12: "BERT는 Bidirectional Encoder Representations from Transformers의 약자다.", 13: "전체 말뭉치의 전역 동시 출현 통계를 학습하는 임베딩은 GloVe다.", 14: "ELMo는 왼쪽→오른쪽과 오른쪽→왼쪽 언어 모델을 결합한다.", 15: "사전 예시 없이 단일 질문을 바로 처리하는 방식은 제로샷 프롬프팅이다.",
  16: "유지·삭제 기준으로 입력을 걸러내는 것은 시맨틱 필터 패턴이다.", 17: "Markdown의 굵게 표시는 텍스트 양쪽에 별표 두 개(`**`)를 쓴다.", 18: "음수는 0, 양수는 그대로 통과시키는 ReLU는 활성화 함수의 한 종류다.", 19: "실제값과 예측값의 제곱 오차를 평균내어 최적화하는 값은 비용 함수다.", 20: "코드 작성·변환·설명을 지원하는 ChatGPT 기능은 Codex다.",
  21: "웹 전반의 공개 데이터셋을 색인하는 전문 검색 엔진은 Google Dataset Search다.", 22: "두 프롬프트 버전을 같은 지표로 비교하는 방법은 A/B 테스팅이다.", 23: "예시 없이 짧은 추론 트리거로 단계적 사고를 유도하는 기법은 제로샷 CoT다.", 24: "Stable Diffusion에서 프롬프트 충실도를 조절하는 값은 CFG Scale이다.", 25: "OpenAI Python 클라이언트의 API 키 인수명은 api_key다.",
  26: "누적 확률 범위의 토큰만 남기는 샘플링은 Nucleus Sampling(top-p)이다.", 27: "GPT for Excel에서 단일 열 목록을 생성하는 함수는 AI.LIST다.", 28: "시카고대의 미세 교란 이미지 보호 도구는 Glaze이지 워터마크가 아니다.", 29: "실존 인물의 사실성을 높이는 프롬프트 개발은 허위정보 위험을 낮추는 원칙에 맞지 않는다.", 30: "A·C·E는 원래 기능을 바꾸는 프롬프트 인젝션, B·D는 안전 제약을 우회하는 탈옥이다.",
};
const choiceReasons = {
  1: ["기준 1은 Narrow AI·AGI·ASI의 작업 범위를 각각 제한적·범용·인간 초월로 올바르게 구분한다.", "AGI는 새 상황에 적응하는 일반 지능이므로, 추가 학습 없이는 대응하지 못한다는 Narrow AI의 한계가 이 행에 잘못 배치됐다.", "기준 3은 현재 상용 AI가 Narrow AI이고 AGI·ASI가 아직 실현되지 않았다는 현황을 정확히 설명한다.", "학습·적응 능력 행에 Narrow AI의 한계가 AGI 설명으로 섞여 있으므로 모든 기준이 맞을 수 없다."],
  2: ["ARPA-E는 에너지 분야 고등연구기관으로 전략 컴퓨팅 구상을 주도한 국방 연구기관과 다르다.", "DARPA는 미국 국방부 산하 고등연구계획국으로 1980년대 전략 컴퓨팅 구상을 추진했다.", "IARPA는 정보기관 공동체의 연구를 지원하는 조직으로 1984년 SCI의 주체가 아니다.", "DRDO는 인도 국방연구개발기구이므로 미국 정부의 SCI 사례와 맞지 않는다."],
  3: ["Bayesian averaging은 사후확률을 결합하는 베이지안 접근이며 복원추출 표본을 독립 학습하는 절차의 명칭은 아니다.", "Bootstrap Aggregating은 bootstrap 표본별 모델을 병렬 학습한 뒤 분류는 투표, 회귀는 평균으로 결합하는 배깅이다.", "Batch accumulation은 표준 앙상블 명칭이 아니며 미니배치 누적과 배깅의 분산 감소를 혼동한 표현이다.", "Bias adjustment는 편향 보정 일반 표현일 뿐 독립 표본 모델의 예측을 종합하는 기법은 아니다."],
  4: ["선형 회귀는 연속값을 직선으로 예측하며 0~1 확률의 S자형 이진 분류 모델이 아니다.", "서포트 벡터 머신은 최대 마진 경계를 찾는 분류기이며 제시된 sigmoid 확률 곡선이 핵심이 아니다.", "신경망도 분류에 쓸 수 있지만 sigmoid와 0.5 임계값으로 특정한 알고리즘 명칭은 로지스틱 회귀다.", "로지스틱 회귀는 sigmoid로 성공 확률을 계산하고 0.5 기준으로 두 클래스를 나눈다."],
  5: ["B는 목표 달성을 위한 자율 계획·실행, D는 API·도구 연동, E는 결과 평가·수정으로 세 특성과 정확히 대응한다.", "A는 사용자의 매번 지시에 반응하는 일반 챗봇 방식이고 C는 대화 맥락 이해이므로 자율 수행·외부 연동의 설명이 아니다.", "C는 외부 환경과 직접 상호작용하는 기능이 아니라 대화 의도와 맥락을 파악하는 기능이다.", "A는 자가 개선이 아니라 사용자 지시마다 답하는 방식이므로 (다)의 설명이 될 수 없다."],
  6: ["ㄱ은 여러 fold를 순환하는 교차검증 설명이므로 한 번 분할하는 연구원 B의 방식에 포함되지 않는다.", "ㄱ이 교차검증이므로 홀드아웃의 특징 ㄴ·ㄷ·ㄹ 조합에 섞이면 안 된다.", "훈련·테스트를 한 번 나누고 일반적으로 70~80% 대 20~30%를 쓰며 분할에 따라 결과가 달라질 수 있다는 ㄴ·ㄷ·ㄹ이 맞다.", "ㄱ은 반복 검증, ㄴ은 단일 분할이므로 두 방법을 함께 선택한 조합은 대화의 방법을 정확히 나타내지 못한다."],
  7: ["레이블 없는 대규모 텍스트에서 토큰 복원으로 언어의 일반 패턴을 익힌 뒤 미세조정하는 과정은 사전학습이다.", "미세조정은 사전학습 모델을 특정 과업 데이터로 추가 학습하는 다음 단계다.", "프롬프트 튜닝은 모델 입력의 연속 프롬프트 등을 최적화하는 기법으로 500억 토큰의 범용 언어 학습 단계가 아니다.", "인컨텍스트 학습은 추론 시 예시를 문맥에 넣는 방식이지 모델 파라미터를 대규모로 사전학습하는 단계가 아니다."],
  8: ["Dormant Domain은 VAE의 표준 용어가 아니며 연속 보간 가능한 표현 공간을 뜻하지 않는다.", "Hidden Stratum은 은닉층을 연상시키는 비표준 표현으로 평균·분산의 확률 표현 공간 명칭이 아니다.", "잠재 공간은 VAE가 입력을 확률분포로 인코딩해 샘플링과 선형 보간을 가능하게 하는 표현 공간이다.", "Reserved Interval은 구간을 보류한다는 뜻일 뿐 VAE의 KL 정규화가 만드는 구조를 설명하지 못한다."],
  9: ["㉠의 크롤링·색인·문서 탐색 설명은 일반 검색엔진의 작동 방식과 맞다.", "㉡은 생성형 AI가 각 질문을 독립 처리해 이전 대화를 기억하지 못한다고 했지만 대화형 모델은 제공된 문맥을 활용할 수 있어 틀렸다.", "㉢의 키워드 매칭과 관련성 순위 계산 뒤 링크 목록 제공은 검색서비스의 전형적 결과 방식이다.", "㉣은 검색은 최신 웹을 반영할 수 있고 생성 모델은 학습 시점 지식에 제한될 수 있다는 차이를 적절히 짚었다."],
  10: ["인스트럭션 아키텍트는 널리 쓰이는 표준 직무명이 아니며 prompt의 다의어 단서를 전문 역할명으로 연결한 답은 아니다.", "쿼리 코디네이터는 표준 AI 직무명으로 정착한 표현이 아니며 프롬프트 설계 업무를 가리키지 않는다.", "프롬프트 엔지니어는 모델에 줄 입력을 설계·개선하는 역할로 무대·터미널·ChatGPT의 prompt 단서를 모두 설명한다.", "리스폰스 옵티마이저는 표준 직무명으로 쓰이지 않으며 입력 문장을 설계하는 사람의 명칭이 아니다."],
  11: ["언어 이해 다음에는 문장 생성이 와야 하는데 ①은 생성과 번역의 자리를 바꿨다.", "②는 ㄱ의 문맥 이해를 언어 생성으로, ㄴ의 자연어 생성을 언어 이해로 잘못 배치했다.", "③은 번역·생성·이해 순서라서 ㄱ·ㄴ·ㄷ의 설명 순서와 모두 맞지 않는다.", "문맥 의미 판별은 언어 이해, 자연스러운 문장 만들기는 언어 생성, 언어 간 변환은 언어 번역이다."],
  12: ["BERT의 E는 Embedding이 아니라 Encoder이며 R은 Retrieval이 아니라 Representations다.", "BERT는 양방향 Transformer 인코더 표현을 뜻하는 Bidirectional Encoder Representations from Transformers의 약자다.", "Entity Recognition Toolkit은 개체명 인식 도구를 연상시키지만 BERT의 공식 확장명이 아니다.", "Evaluation and Response Testing은 평가·응답 시험 표현으로 BERT 논문의 모델명과 무관하다."],
  13: ["GloVe는 전체 말뭉치의 전역 동시 출현 행렬을 활용하므로 제시된 학습 과정과 일치한다.", "Word2Vec은 주로 슬라이딩 윈도우의 국소 문맥에서 단어를 예측하며 전역 공기 통계가 핵심이 아니다.", "FastText는 subword 정보를 이용해 희소 단어 표현을 보완하는 임베딩으로 전역 공기 통계 모델이 아니다.", "BERT는 Transformer 기반 문맥 임베딩 모델이지 정적 전역 공기 통계로 단어 벡터를 학습하는 GloVe 방식이 아니다."],
  14: ["상위·하위 계층은 신경망 구조 방향이지 ELMo의 양방향 문장 읽기 방향을 나타내지 않는다.", "초기·최종 상태는 일반적 처리 순서를 말할 뿐 좌우 문맥을 각각 예측하는 두 언어 모델의 방향이 아니다.", "ELMo는 왼쪽에서 오른쪽과 오른쪽에서 왼쪽으로 읽는 언어 모델 출력을 결합해 문맥 임베딩을 만든다.", "인코더·디코더는 seq2seq 구조의 구성요소로 ELMo의 전방·역방향 언어 모델 방향과 다르다."],
  15: ["퓨샷 프롬프팅은 입력·출력 예시를 여러 개 제공하므로 예시가 없다는 도식과 맞지 않는다.", "생각의 사슬은 중간 추론 단계를 유도하는 기법이고 도식의 핵심인 예시 없는 즉시 응답을 뜻하지 않는다.", "인스트럭션 튜닝은 학습 단계에서 지시 데이터로 모델을 조정하는 방법으로 한 번의 사용자 프롬프트 기법이 아니다.", "제로샷 프롬프팅은 예시 없이 지시나 질문만 주고 모델이 바로 답하게 한다."],
  16: ["콘텐츠 리파이닝은 생성된 내용을 다듬는 데 초점이 있어 유지·삭제 조건으로 입력을 선별하는 구조와 다르다.", "시맨틱 스크리닝은 일반적 표현일 수 있으나 원본의 기준 기반 필터링 패턴 정식 명칭은 아니다.", "시맨틱 필터 패턴은 010 번호만 유지하고 지역번호·공백·비마스킹 값을 제외하는 의미 기반 필터링이다.", "인포메이션 시빙 테크닉은 표준 프롬프트 패턴명이 아니며 이 사례의 명시적 유지·삭제 규칙을 설명하지 못한다."],
  17: ["#은 Markdown 제목 수준을 표시하는 기호로 글자 굵기를 만드는 용도가 아니다.", "별표 두 개로 텍스트를 감싸면 Markdown에서 굵게 표시된다.", "백틱은 인라인 코드나 코드 블록 표시에 쓰이며 강조용 굵게 표시 기호가 아니다.", "1.은 순서 있는 목록의 항목을 시작하는 표기다."],
  18: ["ReLU는 활성화 함수의 한 종류이므로 그래프가 설명하는 ㉠의 상위 분류가 활성화 함수다.", "전달 함수는 신호 처리에서 쓰일 수 있는 넓은 표현이지만 ReLU를 묻는 표준 명칭은 아니다.", "점화 함수는 재귀나 점화식 문맥의 표현으로 ReLU의 분류명이 아니다.", "촉매 함수는 화학적 비유에 가깝고 입력의 비선형 변환을 담당하는 신경망 함수를 뜻하지 않는다."],
  19: ["손실률은 비율을 뜻할 수 있지만 표의 평균 제곱 오차처럼 학습에서 최소화하는 목적 함수를 정확히 지칭하지 않는다.", "편향 조정값은 모델의 절편이나 보정값에 관련된 항목이지 네 샘플의 제곱 오차 평균이 아니다.", "경사 하강 계수는 학습률처럼 갱신 크기를 정하는 값이지 오차를 계산해 최소화하는 함수가 아니다.", "비용 함수는 실제값과 예측값의 차이를 수치화해 모델이 최소화하도록 만드는 목적 함수다."],
  20: ["Codex는 자연어 지시를 바탕으로 코드 생성·설명·변환을 지원하는 OpenAI의 코딩 기능이다.", "Cipher는 암호화 방식이나 암호문을 뜻하며 프로그래밍 보조 기능명은 아니다.", "Compiler는 소스 코드를 번역하는 도구로 대화형 코드 설명·완성을 포괄하지 않는다.", "Syntax는 프로그래밍 언어의 문법 규칙을 뜻하며 기능이나 제품 이름이 아니다."],
  21: ["Google Dataset Search는 인터넷상의 공개 데이터셋을 분야별 메타데이터로 찾아주는 전문 검색엔진이다.", "Microsoft Azure Open Datasets는 Azure 생태계에서 제공하는 데이터셋 서비스로 웹 전체를 색인하지 않는다.", "AWS Data Exchange는 데이터 제공자와 구독자가 거래하는 AWS 마켓플레이스이며 일반 웹 검색엔진이 아니다.", "European Data Portal은 유럽 공공데이터 중심 포털로 전 세계 웹의 모든 공개 데이터셋을 대상으로 하지 않는다."],
  22: ["프롬프트 체이닝은 한 단계 출력이 다음 단계 입력이 되는 워크플로이며 두 버전을 비교하는 실험이 아니다.", "A/B 테스팅은 두 프롬프트를 같은 목표와 지표로 시험해 더 좋은 결과를 내는 버전을 선택한다.", "퓨샷 러닝은 예시를 제공해 모델의 과업 수행을 유도하는 방법이지 버전 성능 비교 방법이 아니다.", "프롬프트 템플릿화는 재사용 가능한 입력 틀을 만드는 작업으로 A와 B의 성과 측정·선택 절차가 아니다."],
  23: ["퓨샷 템플릿은 여러 예시를 포함하므로 예시가 필요 없다는 표의 핵심 조건과 반대다.", "원샷 리커전은 표준 프롬프팅 명칭이 아니며 짧은 추론 트리거만 쓰는 방식을 뜻하지 않는다.", "멀티샷 시퀀스는 여러 예시나 순차 입력을 전제로 하므로 최소 길이의 예시 없는 접근과 다르다.", "제로샷 CoT는 ‘단계별로 생각해보자’처럼 짧은 지시로 예시 없이 단계적 추론을 유도한다."],
  24: ["CFG Scale은 classifier-free guidance의 강도를 조절해 생성 이미지가 프롬프트를 얼마나 따를지 결정한다.", "CFD Scale은 Stable Diffusion의 표준 프롬프트 충실도 파라미터명이 아니다.", "CGF Scale은 공식 설정명이 아니며 CFG의 약자 순서를 바꾼 그럴듯한 표현이다.", "CFA Scale은 모델 적응을 연상시키는 비표준 명칭으로 guidance 강도 설정이 아니다."],
  25: ["api_token_key는 OpenAI Python SDK의 OpenAI 생성자에서 사용하는 인수명이 아니다.", "key_api는 인수 순서를 바꾼 표현일 뿐 SDK가 인식하는 키워드가 아니다.", "api_key는 OpenAI 클라이언트에 인증 키를 전달하는 공식 키워드 인수다.", "api_access는 접근 권한을 연상시키지만 Python SDK의 인증 인수명이 아니다."],
  26: ["Thermal Equilibrium Sampling은 top-p의 표준 명칭이 아니며 누적 확률 후보군을 정의하지 않는다.", "Spectral Density Sampling은 주파수 분석 용어에 가깝고 언어 모델 토큰 누적 확률 절단 방식이 아니다.", "Quantum State Sampling은 양자 상태를 연상시키는 비표준 표현으로 top-p와 무관하다.", "Nucleus Sampling은 누적 확률이 p가 될 때까지의 상위 토큰만 후보로 남기는 top-p 방식이다."],
  27: ["AI.LIST는 결과를 단일 열의 여러 행으로 나열하므로 트렌드 목록·체크리스트 생성에 맞는다.", "AI.ASK는 일반 질의응답에 쓰는 함수로 목록을 세로로 펼치는 전용 출력 방식이 아니다.", "AI.EXTRACT는 텍스트에서 특정 정보를 뽑는 용도라 새 항목을 순번 목록으로 생성하는 요구와 다르다.", "AI.TABLE은 여러 열의 표 구조를 생성할 때 적합하며 선형 단일 열 리스트 요구와 다르다."],
  28: ["워터마크는 가시적·비가시적 식별 정보를 넣어 출처·저작권·이력을 표시할 수 있으므로 옳다.", "시카고대가 만든 미세 교란 도구는 이미지에 스타일 보호 신호를 넣는 Glaze이므로 워터마크의 설명으로는 옳지 않다.", "C2PA 같은 출처 증명 표준과 암호화 메타데이터는 콘텐츠의 생성·변조 이력 확인에 활용될 수 있다.", "워터마크는 AI 생성물임을 알리고 출처를 표시하는 용도로도 활용된다."],
  29: ["사실관계 검증과 프롬프트 설계 지침은 실존 공인 허위 이미지가 만드는 혼란을 줄이는 예방책이다.", "명예훼손·허위정보 악용 가능성을 사전 평가하는 체크리스트는 책임 있는 이미지 생성 운영에 도움이 된다.", "실존 인물의 특징을 더 세밀하게 묘사해 사실성을 높이는 것은 오용·오인을 줄이는 대신 강화할 수 있어 부적절하다.", "워터마크와 출처 표시는 딥페이크·허위정보 확산 위험을 알리고 추적성을 높이는 안전장치다."],
  30: ["D는 안전정책 우회를 통한 유해 콘텐츠 생성이므로 유형 Y여야 하며 ①은 D를 유형 X에 잘못 넣었다.", "B는 안전 제약을 무력화하는 탈옥이고 E는 비밀정보 출력으로 기능을 바꾸려는 인젝션이므로 ②의 분류가 뒤바뀌었다.", "B·D만 유형 Y인 것은 맞지만 A·C·E가 유형 X여야 하므로 ③은 두 열을 반대로 배치했다.", "A·C·E는 원래 과업을 바꾸는 인젝션이고 B·D는 콘텐츠 안전 제한을 우회하는 탈옥이다."],
};
const choiceBank = ["웹 스크래핑", "블록체인 원장", "플래시 카드", "벡터 임베딩", "피벗 테이블", "쉘 스크립트", "커널 모듈", "REST API", "보고서", "인포그래픽", "정규 표현식", "하이퍼바이저", "디버깅 로그", "컨테이너 이미지", "캐시 메모리", "로드 밸런서", "AI 오디오 오버뷰", "DNS 레코드", "토큰 리미터", "배치 파일", "패킷 스니퍼", "슬라이드 자료", "방화벽 규칙", "힙 메모리", "체크섬 검증"];
const choiceBankDefinitions = {
  "웹 스크래핑": "웹 페이지에서 데이터를 자동 수집하는 기술",
  "블록체인 원장": "거래 기록을 분산 저장하는 원장 구조",
  "플래시 카드": "앞면의 질문과 뒷면의 답으로 학습하는 카드 형식",
  "벡터 임베딩": "텍스트나 객체를 수치 벡터로 표현하는 방법",
  "피벗 테이블": "표 데이터를 집계하고 재구성하는 스프레드시트 기능",
  "쉘 스크립트": "명령줄 작업을 자동화하는 스크립트",
  "커널 모듈": "운영체제 커널에 적재해 기능을 확장하는 코드",
  "REST API": "HTTP 자원 중심으로 시스템을 연동하는 인터페이스",
  "보고서": "소스 내용을 문서 형태로 정리하는 NotebookLM 기능",
  "인포그래픽": "소스 내용을 하나의 시각 이미지로 요약하는 NotebookLM 기능",
  "정규 표현식": "문자열의 패턴을 검색·치환하는 표기법",
  "하이퍼바이저": "가상 머신을 생성·관리하는 소프트웨어",
  "디버깅 로그": "프로그램 실행 상태와 오류를 기록한 출력",
  "컨테이너 이미지": "컨테이너 실행 환경을 묶어 둔 패키지",
  "캐시 메모리": "자주 쓰는 데이터를 빠르게 보관하는 저장소",
  "로드 밸런서": "요청을 여러 서버에 분산하는 네트워크 구성 요소",
  "AI 오디오 오버뷰": "소스를 AI 진행자 두 명의 대화형 오디오로 만드는 NotebookLM 기능",
  "DNS 레코드": "도메인 이름과 네트워크 정보를 연결하는 DNS 항목",
  "토큰 리미터": "모델이나 API의 토큰 사용량을 제한하는 설정",
  "배치 파일": "여러 명령을 순서대로 실행하는 자동화 파일",
  "패킷 스니퍼": "네트워크 패킷을 캡처·분석하는 도구",
  "슬라이드 자료": "소스를 발표용 슬라이드로 만드는 NotebookLM 기능",
  "방화벽 규칙": "네트워크 통신을 허용하거나 차단하는 정책",
  "힙 메모리": "동적으로 할당되는 프로그램 메모리 영역",
  "체크섬 검증": "데이터의 손상 여부를 검증하는 무결성 검사",
};
const practical = {
  36: { kind: "image", asset: "q36-reference.jpg", context: "밝은 낮의 아늑한 카페를 사실적인 일러스트로 생성하는 한국어 문장형 프롬프트를 작성한다. 큰 창문 햇살, 나무 테이블의 김 나는 라떼와 노트북, 안경 쓴 20대 여성과 배경의 책장·화분·액자 두 개를 포함한다.", solution: "밝은 낮의 아늑한 카페를 사실적인 일러스트로 그려줘. 큰 창문으로 햇살이 들어오고 앞쪽 나무 테이블에는 김 나는 라떼와 노트북이 있어. 가운데에는 안경을 쓴 20대 여성이 회색 니트를 입고 긴 생머리를 한쪽으로 넘긴 채 앉아 있으며, 뒤쪽에는 책장과 녹색 화분, 벽의 액자 두 개가 보이고 부드러운 자연광이 비치게 해줘.", criteria: ["한글 완성 문장형의 밝은 낮 아늑한 카페·사실적 일러스트", "큰 창문 햇살과 나무 테이블", "김 나는 라떼와 노트북", "안경 쓴 20대 여성·회색 니트·긴 생머리", "책장·녹색 화분·액자 두 개와 자연광"] },
  37: { kind: "text", context: "한국의 대표 찌개 5가지를 순번형으로 나열하고, 각 찌개의 재료 또는 맛 특징을 한 문장으로 설명하는 200자 이내의 문장형 프롬프트를 작성한다.", solution: "한국의 대표적인 찌개 5가지를 1번부터 5번까지 순서대로 소개하고, 각 찌개마다 주요 재료 또는 맛의 특징을 한 문장으로 설명해줘.", criteria: ["한국 대표 찌개 5가지", "1~5번 순번형 나열", "각 찌개별 설명", "재료 또는 맛 특징", "200자 이내의 문장형 지시"] },
  38: { kind: "code", context: "사용자에게 정수를 입력받아 홀수 또는 짝수를 출력하는 Python 코드를 생성하게 하는 150자 이내의 문장형 프롬프트를 작성한다. 숫자가 아닌 입력에는 정확한 오류 메시지로 처리하고 정상 실행을 요구한다.", solution: "사용자에게 정수를 입력받아 홀수 또는 짝수를 출력하는 파이썬 코드를 작성해줘. 숫자가 아닌 값을 입력하면 ‘오류 : 올바른 정수를 입력해주세요.’를 출력하도록 예외 처리하고 정상 실행되는지 확인해줘.", criteria: ["정수 입력", "홀수·짝수 판별", "Python 코드 생성", "숫자가 아닌 입력 예외 처리", "정상 실행·150자 이내의 완성 문장형 지시"], fixture: { stdin: "7\n" } },
  39: { kind: "image", asset: "q39-reference.jpg", context: "16:9 모던 미니멀 거실을 위한 한국어 키워드형 이미지 프롬프트를 작성한다. 큰 통창 자연광, 화이트 소파, 우드 커피 테이블, 실내 식물, 중성 색상, 북유럽 스타일의 아늑하고 고급스러운 느낌을 포함한다.", solution: "모던 미니멀 거실, 16:9, 큰 통창, 자연광, 화이트 소파, 우드 커피 테이블, 실내 식물, 중성 색상 팔레트, 깔끔한 선, 넓은 공간, 현대적 가구, 부드러운 조명, 아늑한 분위기, 북유럽 스타일, 우아한 심플함, 따뜻하고 고급스러운 느낌", criteria: ["한글 키워드형의 16:9 모던 미니멀 거실", "큰 통창과 자연광", "화이트 소파와 우드 커피 테이블", "실내 식물과 중성 색상", "북유럽 스타일의 아늑하고 고급스러운 분위기"] },
  40: { kind: "text", context: "대한대학교 청춘페스티벌 2026의 축제 준비 계획서 초안을 생성하게 하는 300자 이내의 문장형 프롬프트를 작성한다. 일정은 표로, 핵심 항목은 Markdown 굵게, 문체는 명사구형 개조식으로 요구한다.", solution: "대한대학교 청춘페스티벌 2026의 축제 준비 계획서 초안을 작성해줘. 축제 개요와 사전 준비·당일 운영·사후 평가를 포함하고, 상세 일정은 담당 부서가 있는 표로 정리해줘. 핵심 항목은 Markdown 굵게 표시하며 문체는 명사구형 개조식으로 쓰고 300자 이내로 지시해줘.", criteria: ["대한대학교 청춘페스티벌 2026 계획서", "축제 개요와 준비·운영·사후 평가", "담당 부서가 있는 상세 일정 표", "Markdown 굵게 강조", "명사구형 개조식·300자 이내의 완성 문장형 지시"] },
};

function sectionMap(markdown) { const parts = markdown.split(/^## Q(\d{2})\s*$/mu); const result = new Map(); for (let i = 1; i < parts.length; i += 2) result.set(Number(parts[i]), parts[i + 1].split(/^## 부록:/mu, 1)[0].trim()); return result; }
function clean(section) { return section.replace(/^- (?:Source|보기 계속):.*\n+/gmu, "").replace(/^### 실습형 \/ 프롬프트 작성 \[36~40\] \[서술형\]\n+/mu, "").trim(); }
function parseChoices(section, number) {
  const matches = [...section.matchAll(/([①②③④])(?:\s*\|\s*|\s+)/gu)].slice(-4);
  if (matches.length !== 4) throw new Error(`Q${number}: could not parse four choices.`);
  return { stem: section.slice(0, matches[0].index).trim(), choices: matches.map((match, index) => section.slice(match.index + match[0].length, matches[index + 1]?.index).replace(/\n?\|?\s*$/u, "").replace(/\s*\|\s*/gu, " · ").replace(/\n+/gu, " ").trim()) };
}
function feedback(number, choice, index) { return { explanation: choiceReasons[number]?.[index] ?? `${facts[number]} ‘${choice}’이(가) 이 기준에 맞는지 정의와 적용 범위를 대조하세요.` }; }
function choiceBankFeedback(number, text) {
  const definition = choiceBankDefinitions[text];
  const answer = number === 34 ? "인포그래픽" : "플래시 카드";
  const target = number === 34 ? "소스 내용을 하나의 시각 이미지로 요약하고 방향·상세도를 설정하는 기능" : "앞면 질문·뒷면 답변의 학습 카드를 자동 생성하는 기능";
  if (text === answer) return `‘${text}’은(는) ${definition}이므로 ${target}과 일치한다.`;
  return `‘${text}’은(는) ${definition}이므로 ${target}을 묻는 이 문항의 정답이 아니다.`;
}
function practicalQuestion(base, number, section) {
  const spec = practical[number];
  const prompt = spec.asset ? clean(section).replace(/\n{2}결과물은 [\s\S]*$/u, "").trimEnd() : clean(section);
  return { id: `source-r03-q${String(number).padStart(2, "0")}`, number, type: "practical_prompt", chapter: topics[number][0], topic: topics[number][1], source_page: base.source_page, prompt, points: 5, answer: "", accepted_answers: [], explanation: "원본 결과물과 필수 조건을 모두 반영한 프롬프트인지 확인하세요.", ...(spec.asset ? { asset: `../assets/source-round-03/${spec.asset}`, asset_alt: base.primary_visual?.alt ?? "문항 참고 자료" } : {}), rubric: spec.criteria.map((criterion) => ({ criterion, points: 1, keywords: [criterion] })), evaluation: { kind: spec.kind, availability: "available", input_assets: spec.asset ? [spec.asset] : [], context_markdown: spec.context, provider_solution: spec.solution, source_criteria: spec.criteria, reference_source: "AI-POT 실전 모의고사 03회 정답·해설 사진 (촬영 페이지 23~27)", ...(spec.fixture ? { fixture: spec.fixture } : {}), ...(spec.kind === "image" ? { options: { quality: "low" } } : {}) } };
}
function build() {
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8")); const sections = sectionMap(readFileSync(ocrPath, "utf8"));
  const questions = corpus.questions.map((base) => {
    const number = base.number; const section = sections.get(number); if (!section) throw new Error(`Missing OCR for Q${number}.`); if (number >= 36) return practicalQuestion(base, number, section);
    const prompt = clean(section);
    if (number >= 31 && number <= 33) {
      const shortAnswers = { 31: ["17", ["17", "⑰"], "AI 오디오 오버뷰"], 32: ["9", ["9", "⑨"], "보고서"], 33: ["22", ["22", "㉒"], "슬라이드 자료"] };
      const [answer, accepted_answers, feature] = shortAnswers[number]; return { id: `source-r03-q${String(number).padStart(2, "0")}`, number, type: "short_answer", chapter: topics[number][0], topic: topics[number][1], source_page: base.source_page, prompt, points: 3, answer, accepted_answers, explanation: `원문은 보기의 번호를 쓰도록 요구한다. ${feature}에 해당하는 번호는 ${answer}번이다.` };
    }
    if (number === 34 || number === 35) { const answer = number === 34 ? "10" : "3"; return { id: `source-r03-q${String(number).padStart(2, "0")}`, number, type: "choice_bank", chapter: topics[number][0], topic: topics[number][1], source_page: base.source_page, prompt: prompt.split(/\n보기:/u, 1)[0].trim(), points: 3, answer, accepted_answers: [answer], multiple_selection: false, choices: choiceBank.map((text, index) => ({ id: String(index + 1), text, feedback: { explanation: choiceBankFeedback(number, text) } })) }; }
    const parsed = parseChoices(prompt, number); if (number === 11) parsed.choices[2] = "언어 번역 · 언어 생성 · 언어 이해"; return { id: `source-r03-q${String(number).padStart(2, "0")}`, number, type: "multiple_choice", chapter: topics[number][0], topic: topics[number][1], source_page: base.source_page, ...(base.visuals?.length ? { visuals: base.visuals } : {}), prompt: parsed.stem, points: 2, answer: answers[number - 1], accepted_answers: [answers[number - 1]], choices: parsed.choices.map((text, index) => ({ id: String(index + 1), text, feedback: feedback(number, text, index) })) };
  });
  return { id: "source-round-03", title: "AI-POT 실전 모의고사 03회 (개인 학습용 원본)", source_kind: "private_photographed_book", known_limitations: [], questions };
}
const next = `${JSON.stringify(build(), null, 2)}\n`;
if (checkOnly) { if (!existsSync(outputPath)) throw new Error("Set 3 learner manifest is missing. Run: node tools/build-aipot-source-round-03.mjs"); if (readFileSync(outputPath, "utf8") !== next) throw new Error("Set 3 learner manifest is stale. Run: node tools/build-aipot-source-round-03.mjs"); console.log("Validated image-based source-round-03 learner manifest."); } else { writeFileSync(outputPath, next, "utf8"); console.log(`Wrote ${outputPath}`); }
