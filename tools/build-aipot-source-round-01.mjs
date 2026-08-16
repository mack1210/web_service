#!/usr/bin/env node

/**
 * Build the learner-facing private Set 1 from the 25 photographed source
 * pages. The corpus remains the audit record; this output is the active
 * manifest consumed by the API.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const checkOnly = process.argv.includes("--check");
const contentRoot = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const corpusPath = resolve(contentRoot, "corpus/source-round-01.json");
const ocrPath = resolve(contentRoot, "corpus/ocr/source-round-01.md");
const outputPath = resolve(contentRoot, "data/web-exams/source-round-01.json");

const sourceAnswers = ["1", "4", "3", "1", "3", "2", "1", "3", "4", "1", "3", "1", "2", "3", "2", "1", "4", "3", "1", "2", "3", "1", "4", "4", "1", "3", "2", "3", "4", "4"];

// Each option gets its own explanation. Repeating the correct-answer rationale
// for every distractor makes review look complete while teaching nothing.
const choiceExplanations = {
  1: { 1: "적응은 사용자의 발음·억양 같은 새 사용 환경을 반영해 이미 배포된 모델의 성능을 계속 개선하는 능력이다.", 2: "추론은 학습이 끝난 모델로 입력에 대한 판단이나 예측을 내리는 단계다. 사용 습관을 다시 반영해 모델을 개선하는 과정까지 뜻하지는 않는다.", 3: "학습은 데이터로 모델의 일반 패턴을 익히는 넓은 과정이다. 이 사례의 핵심은 개인 사용자의 변화에 맞춰 계속 조정하는 적응이다.", 4: "최적화는 손실 함수를 줄이도록 파라미터를 찾는 기법이다. 사용자별 발음 습관을 반영하는 기능 명칭으로는 적응이 더 정확하다." },
  2: { 1: "토양·기상 데이터를 분석해 관개 시점과 물 사용량을 조절하는 것은 스마트 농업에서 가능한 AI 활용이다.", 2: "드론 영상으로 병충해 구역을 찾아 정밀 살포 경로를 계획하는 것은 AI가 지원할 수 있는 농업 의사결정이다.", 3: "수요·재고·물류를 함께 분석해 식량 손실과 유통 비용을 줄이는 것은 공급망 최적화의 대표적 활용이다.", 4: "AI는 태양광 발전량을 예측하거나 배분을 최적화할 수는 있어도 태양의 핵융합 반응을 제어해 태양광량을 늘릴 수는 없다." },
  3: { 1: "온디바이스 AI는 데이터를 기기 안에서 처리할 수 있어 외부 전송을 줄이고 개인정보 보호에 도움이 된다.", 2: "클라우드 AI는 통신 지연이 있을 수 있지만 서버 자원을 이용해 온디바이스보다 큰 모델을 운용할 수 있다.", 3: "온디바이스 모델은 기기에 배포해야 하므로 대규모 서버에서 즉시 갱신하는 클라우드 모델보다 실시간 업데이트가 더 쉽다고 보기 어렵다.", 4: "스마트폰 사진 보정과 차량 차선 유지 보조는 낮은 지연이 필요한 기기 내 AI 활용 사례다." },
  4: { 1: "K-평균은 정답 라벨 없이 가까운 중심점에 데이터를 배정하고 중심점을 다시 계산해 군집을 만드는 알고리즘이다.", 2: "의사결정트리는 조건에 따라 데이터를 분기해 예측·분류하는 지도학습 모델이며 중심점을 반복 갱신하지 않는다.", 3: "서포트 벡터 머신은 범주 사이의 경계와 마진을 찾는 지도학습 기법으로, 거리 기반 중심 군집화와 다르다.", 4: "순환 신경망은 이전 순서 정보를 이용해 시퀀스를 처리하는 신경망으로, 점들을 중심점 기준으로 묶는 알고리즘이 아니다." },
  5: { 1: "현재 상태의 안정성과 환경 예측 가능성은 가치 함수가 누적 보상을 계산하는 두 항목이 아니다. 가치 함수는 현재 선택 뒤의 보상까지 본다.", 2: "행동 복잡도나 계산 비용은 구현상의 고려 사항일 수 있지만, 가치 함수가 장기 전략을 평가하는 핵심은 즉시 보상과 미래 보상이다.", 3: "가치 함수는 즉각적인 보상과 이후 받을 보상을 함께 평가하므로, 당장 손해처럼 보여도 장기적으로 유리한 선택을 할 수 있다.", 4: "학습 속도·보상 밀도·불확실성은 환경 특성이나 학습 조건이다. 이 문맥에서 피하려는 것은 미래 보상을 무시하는 근시안적 선택이다." },
  6: { 1: "Transformer는 어텐션으로 토큰·시퀀스 관계를 처리하는 구조다. 생성자와 판별자가 경쟁하는 두 신경망 구조를 뜻하지 않는다.", 2: "GAN은 가짜 데이터를 만드는 생성자와 진짜·가짜를 구별하는 판별자가 서로 성능을 겨루며 학습하는 생성 모델이다.", 3: "RNN은 이전 시점의 은닉 상태를 활용해 순서가 있는 데이터를 처리한다. 위조자와 감별자가 경쟁하는 구조는 RNN의 핵심이 아니다.", 4: "ResNet은 잔차 연결로 매우 깊은 신경망 학습을 돕는 이미지 인식 구조다. 생성자와 판별자의 적대적 학습을 정의하지 않는다." },
  7: { 1: "RLHF는 사람이 여러 응답 중 선호하는 답을 평가해 보상 신호로 만들고, 그 신호로 모델 응답을 더 유용하고 안전하게 조정하는 방법이다.", 2: "DPO도 선호 데이터로 모델을 조정할 수 있지만, 이 문항처럼 인간 평가를 보상 신호로 삼아 강화학습 단계까지 설명하는 일반적 절차의 명칭은 RLHF다.", 3: "ICL은 프롬프트 안의 예시·문맥을 보고 즉석에서 과업을 수행하는 방식이며, 인간 평가로 모델 자체를 최적화하는 학습 과정이 아니다.", 4: "RAG는 외부 문서를 검색해 답변 근거로 넣는 구조다. 응답 선호도를 보상으로 사용해 모델을 개선하는 기술은 아니다." },
  8: { 1: "처음부터 특정 태스크 데이터로 학습하는 것은 전용 모델 구축에 가깝다. 제시문은 이미 학습된 파운데이션 모델을 추가 학습하는 경우다.", 2: "설명은 파운데이션 모델 자체의 정의다. 문제는 그 기반 모델을 특정 분야에 맞게 미세조정한 뒤의 모델을 묻는다.", 3: "특정 도메인·작업에 추가 학습한 모델은 그 분야의 용어·패턴에 더 잘 맞아 전문적이고 정확한 결과를 낼 수 있다.", 4: "방대한 인터넷 텍스트·이미지·코드로 일반 능력을 익히는 것은 파운데이션 모델의 사전학습 설명이지, 특화 모델의 설명은 아니다." },
  9: { 1: "보상 모델은 지도학습 미세조정 모델의 응답을 사람이 비교한 뒤 훈련한다. 보상 모델 훈련이 첫 단계가 될 수는 없다.", 2: "지도학습 미세조정 뒤에는 사람 선호를 학습한 보상 모델이 먼저 필요하다. 보상 모델 없이 강화학습 최적화를 진행하는 순서가 아니다.", 3: "강화학습 최적화는 준비된 보상 모델을 이용하는 마지막 단계다. 이를 첫 단계에 두면 필요한 기반이 빠진다.", 4: "RLHF는 먼저 지도학습으로 기본 응답을 맞추고, 사람 선호로 보상 모델을 훈련한 뒤, 그 보상으로 강화학습 최적화를 한다." },
  10: { 1: "상품·서비스·오류·기타처럼 정해진 범주에 고객 의견을 배정하는 작업은 텍스트 분류다.", 2: "요약은 긴 의견에서 핵심 내용을 짧게 압축하는 작업이다. 의견을 담당 부서별 범주로 나누는 작업과 다르다.", 3: "변환은 형식·표현·언어 등을 바꾸는 작업이다. 주어진 기준에 따라 항목을 라벨로 구분하는 것은 분류다.", 4: "생성은 새 텍스트나 콘텐츠를 만들어 내는 작업이다. 기존 VOC를 네 범주에 배정하는 목적에는 맞지 않는다." },
  11: { 1: "워드피스도 서브워드 토큰화지만, 어휘를 선택할 때 우도 향상을 기준으로 하며 '가장 빈번한 문자 쌍 병합'이라는 BPE 절차와 다르다.", 2: "유니그램 언어 모델은 후보 서브워드 집합에서 확률적으로 어휘를 줄여 가는 방식이다. 빈도 높은 쌍을 반복 병합하지 않는다.", 3: "BPE는 데이터 압축에서 출발해 가장 자주 나타나는 문자 쌍을 계속 병합하여 서브워드 어휘를 만드는 토큰화 기법이다.", 4: "SentencePiece는 공백에 의존하지 않는 토크나이저 도구·프레임워크로 BPE나 유니그램 방식을 지원할 수 있다. 제시문의 특정 병합 알고리즘 명칭은 BPE다." },
  12: { 1: "TF(Term Frequency)는 한 문서 안에서 단어가 등장한 횟수 또는 빈도를 뜻하므로 TF-IDF의 앞부분에 들어간다.", 2: "IDF는 여러 문서에서 드문 단어에 더 큰 가중치를 주는 역문서 빈도다. 한 문서 안의 등장 횟수를 세는 값이 아니다.", 3: "DF는 특정 단어를 포함한 문서의 수다. 한 문서 안에서 그 단어가 몇 번 반복됐는지는 TF가 나타낸다.", 4: "CF는 말뭉치 전체에서 단어가 나온 횟수를 가리킬 수 있지만, TF-IDF의 문서별 빈도 요소는 아니다." },
  13: { 1: "의미 분석은 구문 분석으로 문법 구조를 파악한 뒤 진행하는 것이 자연스럽다. 형태소 뒤에 의미를 먼저 두는 순서가 아니다.", 2: "형태소 분석으로 단어·품사를 나눈 뒤 구문 관계를 분석하고, 의미와 문맥상 의도를 차례로 해석하는 올바른 순서다.", 3: "구문 분석은 단어의 형태·품사 정보를 바탕으로 한다. 형태소 분석보다 먼저 시작할 수 없다.", 4: "화용 분석은 문맥 속 의도를 해석하는 마지막 단계이며, 의미 분석 전에 둘 수 없다." },
  14: { 1: "큰따옴표는 문자열 인용에 쓰이지만, 이 문항에서 명령과 데이터의 경계를 표시하는 단일 격리 기호는 아니다.", 2: "작은따옴표도 문자열 표기에 쓰일 수 있으나, 프롬프트에서 데이터 블록을 분리하는 예시의 기호는 백틱이다.", 3: "백틱은 코드·데이터처럼 명령으로 해석하지 않을 부분을 감싸 명령과 입력 데이터를 구분하는 데 사용할 수 있다.", 4: "하이픈 블록은 목록이나 구획을 만들 수 있지만 단일 특수문자로 데이터를 격리하는 기호라는 조건과 맞지 않는다." },
  15: { 1: "ReLU는 음수 입력을 0으로 만들고 양수 영역에서 선형으로 증가한다. 음수 출력이 있는 원점 대칭 S자 곡선이 아니다.", 2: "Tanh는 출력이 -1에서 1 사이이고 원점 대칭인 S자 곡선이어서 음수 입력에 음수 출력을 낸다.", 3: "Sigmoid는 S자 곡선이지만 출력 범위가 0에서 1이며 원점 대칭도 아니다.", 4: "Leaky ReLU는 음수 영역에 작은 기울기를 남기는 꺾인 선형 함수로, -1~1 범위의 포화 곡선이 아니다." },
  16: { 1: "원샷 프롬프팅은 하나의 입력·출력 예시를 제공해 모델에 원하는 과업 형식과 패턴을 보여 주는 방식이다.", 2: "제로샷 프롬프팅은 예시 없이 과업 지시만 제시한다. 문제처럼 예시가 하나 있는 경우에는 해당하지 않는다.", 3: "퓨샷 프롬프팅은 보통 여러 개의 예시를 제공한다. 단 하나의 예시만 쓰는 경우는 원샷이다.", 4: "멀티샷은 여러 예시를 준다는 뜻으로 사용할 수 있지만, 제시문은 예시 수를 정확히 하나로 한정했다." },
  17: { 1: "화자 역할 설정은 모델에게 교사·변호사처럼 어떤 관점에서 말할지를 지정한다. 설명을 받을 사람의 수준을 정하는 기법은 아니다.", 2: "맥락 제공은 배경 자료·상황을 덧붙여 답변 근거를 주는 방식이다. 청소년이나 노인처럼 수신자를 지정하는 것과 다르다.", 3: "출력 형식 지정은 표·목록·분량처럼 답변의 모양을 정한다. 대상의 배경지식에 맞춘 난이도 조정은 청자 지정의 역할이다.", 4: "청자 지정은 고등학생·노인처럼 응답 대상을 명시해 용어, 비유, 설명 속도를 그 대상의 배경지식에 맞추게 한다." },
  18: { 1: "역전파는 손실에 대한 각 가중치의 기울기를 계산하는 절차다. 계산한 기울기의 반대 방향으로 실제 값을 이동시키는 알고리즘은 경사하강법이다.", 2: "확률적 최적화는 무작위 표본 등을 사용하는 넓은 방법군이다. 제시문처럼 현재 기울기의 반대 방향으로 반복 이동하는 구체적 방법은 경사하강법이다.", 3: "경사하강법은 비용 함수의 현재 기울기 반대 방향으로 가중치를 조금씩 갱신해 최소 비용 지점을 찾는다.", 4: "학습률은 한 번에 얼마나 이동할지를 정하는 값일 뿐, 어느 방향으로 이동해 최소값을 찾는 전체 알고리즘 명칭은 아니다." },
  19: { 1: "Microsoft Copilot은 GPT 기반으로 Windows와 Microsoft 365에 통합되고, Bing 등 웹 검색 연동을 통해 업무·웹 정보 지원을 제공한다.", 2: "Claude는 Anthropic의 AI 어시스턴트다. Windows 작업 표시줄과 Microsoft 365 앱에 통합된 제품이라는 단서와 맞지 않는다.", 3: "Gemini는 Google의 AI 모델·서비스 계열이다. 문제의 Windows·Word·Excel·PowerPoint 통합은 Microsoft Copilot의 특징이다.", 4: "LLaMA는 Meta가 공개한 대규모 언어 모델 계열이다. 제시된 운영체제와 생산성 도구 통합형 어시스턴트 명칭이 아니다." },
  20: { 1: "GitHub는 소스 코드 저장소와 협업 플랫폼이다. 데이터 사이언스 경진대회와 투표 기반 데이터셋 커뮤니티라는 설명은 Kaggle에 가깝다.", 2: "Kaggle은 Google이 인수한 데이터 사이언스 커뮤니티로, 데이터셋·노트북·경진대회를 제공해 분석 실습과 검증된 자료 탐색에 쓰인다.", 3: "TensorFlow Datasets는 TensorFlow에서 사용할 데이터셋을 제공하는 라이브러리다. 사용자 투표·분석 코드·경진대회 중심의 커뮤니티 플랫폼은 아니다.", 4: "Hugging Face는 모델·데이터셋·데모를 공유하는 허브이지만, 2017년 Google 인수와 정기 경진대회라는 단서는 Kaggle을 가리킨다." },
  21: { 1: "제로샷 프롬프팅은 예시 없이 과업을 지시하는 방식이다. 메인 질문을 스스로 하위 질문으로 나누고 답을 합치는 절차를 포함하지 않는다.", 2: "생각의 나무는 여러 추론 경로를 가지처럼 탐색·평가하는 기법이다. 제시문처럼 필요한 하위 질문을 만들고 순차 답변을 합치는 방식은 Self-Ask다.", 3: "Self-Ask 프롬프팅은 복잡한 질문을 하위 질문으로 분해하고 각 중간 답을 이용해 최종 답을 구성하도록 유도한다.", 4: "메타 프롬프팅은 프롬프트를 만들거나 개선하도록 모델에 지시하는 넓은 접근이다. 이 문항의 단계적 자기 질문 절차를 직접 뜻하지 않는다." },
  22: { 1: "자기 일관성 프롬프팅은 같은 질문에 여러 추론 경로를 샘플링한 뒤 가장 자주 나온 답을 선택해 안정성을 높이는 기법이다.", 2: "생각의 사슬 프롬프팅은 하나의 답에 이르는 단계적 추론을 드러내게 한다. 여러 답을 생성해 다수결로 고르는 절차가 필수는 아니다.", 3: "제로샷 프롬프팅은 예시 없이 지시만 제공하는 방법이다. 독립 추론을 여러 번 실행하고 투표하는 기법은 아니다.", 4: "퓨샷 프롬프팅은 입력·출력 예시를 여러 개 제공해 형식을 학습시키는 방식이다. 동일 질문의 여러 추론 결과를 다수결로 집계하지 않는다." },
  23: { 1: "인터널그래피는 정보 시각화 형식의 표준 명칭이 아니다. 아이콘·차트·문자를 조합해 정보를 전달하는 형식은 인포그래픽이다.", 2: "인포컷은 제시된 정보 시각화 형식을 지칭하는 일반 용어가 아니다. 문제의 막대그래프·플로차트 결합은 인포그래픽의 특징이다.", 3: "인포메이션은 '정보'를 뜻하는 일반 단어일 뿐 시각적 계층과 차트를 결합한 콘텐츠 형식의 명칭이 아니다.", 4: "인포그래픽은 복잡한 정보를 아이콘, 차트, 타이포그래피로 시각화해 관계·비교·흐름을 빠르게 전달하는 형식이다." },
  24: { 1: "AUTOMATIC1111은 Stable Diffusion 웹 UI로 널리 쓰이지만, KSampler·CLIP·VAE를 선으로 연결하는 노드 그래프 인터페이스는 ComfyUI의 특징이다.", 2: "Midjourney는 주로 채팅 기반 프롬프트로 이미지를 생성하는 서비스다. 사용자가 Stable Diffusion 처리 노드를 직접 연결하는 도구가 아니다.", 3: "DALL-E는 텍스트 지시로 이미지를 생성하는 모델·서비스이며, 화면처럼 KSampler와 CLIP 노드를 조립하는 인터페이스를 제공하지 않는다.", 4: "ComfyUI는 KSampler, CLIP 텍스트 인코딩, 잠재 이미지, VAE 디코드 같은 Stable Diffusion 노드를 시각적으로 연결해 워크플로를 구성한다." },
  25: { 1: "슬라이드 추가는 기존 프레젠테이션 안에 표지·내용·마무리 슬라이드를 넣고 템플릿·레이아웃을 선택하는 기능이다.", 2: "파일에서 만들기는 업로드한 문서·파일을 바탕으로 새 슬라이드를 생성하는 기능이다. 기존 PPT의 특정 위치에 슬라이드를 삽입하는 기능과 다르다.", 3: "텍스트에서 만들기는 입력하거나 붙여 넣은 텍스트를 슬라이드 초안으로 바꾸는 기능이다. 현재 자료에 슬라이드를 추가하는 작업이 아니다.", 4: "주제에서 만들기는 주제·키워드에서 프레젠테이션을 시작하는 기능이다. 기존 PPT의 표지나 마무리 슬라이드를 삽입하는 기능과 구분된다." },
  26: { 1: "관계 시각화는 변수·항목 사이의 연결이나 상관관계를 보여 주는 데 초점이 있다. 제시문은 여러 범주의 크기·성과 차이를 비교한다.", 2: "분포 시각화는 값이 어느 구간에 얼마나 퍼져 있는지를 보여 준다. 도시와 월별 값을 나란히 비교하는 히트맵 분류와는 다르다.", 3: "비교 시각화는 여러 범주·그룹의 값과 성과 차이를 한눈에 대조하게 하며, 제시된 히트맵과 열거된 차트 유형의 목적에 맞는다.", 4: "공간 시각화는 지도나 위치 좌표처럼 지리적 배치를 나타내는 데 초점이 있다. 이 문제의 핵심은 위치가 아니라 범주별 차이 비교다." },
  27: { 1: "과적합은 훈련 데이터에 지나치게 맞아 새 데이터에서 성능이 떨어지는 현상이다. 존재하지 않는 사실을 그럴듯하게 만들어 내는 현상과 다르다.", 2: "환각은 생성 AI가 근거가 없거나 사실이 아닌 내용을 자신 있게 만들어 내는 현상으로, 가공의 역사 사건을 사실처럼 답한 사례에 해당한다.", 3: "편향성은 데이터·모델이 특정 집단이나 관점에 체계적으로 치우치는 문제다. 허구 정보를 만들어 내는 현상을 뜻하지 않는다.", 4: "토큰 제한은 한 번에 입력·출력할 수 있는 텍스트 길이의 한계다. 허위 사건을 생성한 직접 원인을 설명하는 개념은 아니다." },
  28: { 1: "공정성은 집단별로 차별적 결과가 없는지를 다룬다. 사례의 공통점은 실험·가격·추천 기준을 사용자에게 알리지 않았다는 점이다.", 2: "책임성은 문제가 생겼을 때 책임 주체와 구제 절차를 분명히 하는 원칙이다. 알고리즘 작동 기준을 공개하지 않은 문제의 직접 명칭은 투명성 부족이다.", 3: "투명성은 이용자가 AI의 사용 여부, 판단 기준, 한계를 알 수 있게 하는 원칙이다. 세 사례 모두 중요한 실험·가격·추천 기준을 숨겼다.", 4: "개인정보보호는 개인 식별 정보의 수집·이용·보관을 적절히 제한하는 원칙이다. 여기서는 정보 처리보다 의사결정 기준의 비공개가 공통 문제다." },
  29: { 1: "JavaScript도 동적 타이핑 언어지만 1991년 귀도 반 로섬이 만든 언어가 아니며 코드 블록을 들여쓰기로 강제하지 않는다.", 2: "C++은 Bjarne Stroustrup이 개발한 정적 타입 언어로 중괄호를 사용한다. 제시된 창시자·동적 타이핑·들여쓰기 단서와 맞지 않는다.", 3: "Ruby는 동적 타입 언어지만 Yukihiro Matsumoto가 만든 언어다. 1991년 귀도 반 로섬과 들여쓰기 문법이라는 단서는 Python이다.", 4: "Python은 1991년 귀도 반 로섬이 만든 인터프리터 언어로, 동적 타이핑과 들여쓰기 기반 블록 문법을 사용한다." },
  30: { 1: "오류 로깅은 발생한 오류 정보와 원인을 기록하는 일이다. 오류가 난 뒤 try-except로 대체 흐름을 실행하는 처리 메커니즘 자체는 아니다.", 2: "입력 검증은 잘못된 값을 받기 전에 형식·범위를 확인하는 예방 절차다. API 타임아웃처럼 실행 중 발생한 예외를 잡아 복구하는 방식과 다르다.", 3: "방어적 프로그래밍은 검증·기본값·안전한 설계를 포괄하는 넓은 원칙이다. 표의 try-except와 오류 발생 후 대응 절차의 구체적 명칭은 예외처리다.", 4: "예외처리는 try-except 등으로 실행 중 비정상 상황을 포착하고, 경고·기본값·캐시 사용 같은 대체 경로를 제공해 프로그램 종료를 막는다." },
};

const topics = {
  1: ["C01", "AI 적응"], 2: ["C01", "AI 활용 한계"], 3: ["C04", "온디바이스 AI"], 4: ["C02", "K-평균 군집화"], 5: ["C02", "강화학습 가치 함수"],
  6: ["C04", "GAN"], 7: ["C06", "RLHF"], 8: ["C06", "도메인 특화 모델"], 9: ["C06", "RLHF 단계"], 10: ["C09", "텍스트 분류"],
  11: ["C05", "BPE 토큰화"], 12: ["C05", "TF-IDF"], 13: ["C05", "자연어 처리 단계"], 14: ["C07", "프롬프트 구분 기호"], 15: ["C03", "Tanh 활성화 함수"],
  16: ["C07", "원샷 프롬프팅"], 17: ["C08", "청자 지정"], 18: ["C03", "경사하강법"], 19: ["C13", "Microsoft Copilot"], 20: ["C09", "Kaggle 데이터셋"],
  21: ["C10", "Self-Ask 프롬프팅"], 22: ["C10", "자기 일관성 프롬프팅"], 23: ["C14", "인포그래픽"], 24: ["C11", "ComfyUI"], 25: ["C14", "PPT 슬라이드 추가"],
  26: ["C14", "비교 시각화"], 27: ["C15", "환각"], 28: ["C16", "AI 투명성"], 29: ["C13", "Python"], 30: ["C13", "예외처리"],
  31: ["C03", "차원의 저주"], 32: ["C03", "단층 퍼셉트론"], 33: ["C03", "VAE 인코더"], 34: ["C11", "Google Flow img2vid"], 35: ["C11", "Google Flow 출력 수"],
  36: ["C13", "BMI 코드 생성 프롬프트"], 37: ["C11", "이미지 생성 프롬프트"], 38: ["C14", "월별 매출 선 그래프"], 39: ["C11", "키워드형 이미지 프롬프트"], 40: ["C16", "워터마크 이미지 편집"],
};

const choiceBank = [
  "img2img", "txt2vid", "img2vid", "vid2vid", "as2vid",
  "1:1 비율", "가로가 긴 비율", "세로가 긴 비율", "타원형 비율", "마름모 비율",
  "2", "4", "6", "8", "10",
  "다음 장면을 생성", "장면 빌더로 이동", "해당 영상 삭제", "영상 다시 생성", "객체 추가",
  "첫 번째 연필 버튼", "두 번째 하트 버튼", "세 번째 화살표 버튼", "네 번째 액자 버튼", "다섯 번째 더보기 버튼",
];

const practical = {
  36: {
    kind: "code",
    context: "키와 몸무게를 입력받아 BMI를 계산하는 Python 코드를 생성하게 하는 프롬프트를 작성한다. 숫자가 아닌 입력에는 오류 메시지를 출력하고, 생성한 코드가 정상 실행되는지 확인하게 한다.",
    solution: "키와 몸무게를 입력받아 BMI를 계산하는 파이썬 코드를 작성해줘. 숫자가 아닌 값이 입력되면 오류 메시지를 출력해줘.",
    criteria: ["키와 몸무게 입력", "BMI 계산", "Python 코드 생성", "숫자가 아닌 입력 오류 처리", "정상 실행 확인"],
    fixture: { stdin: "1.70\n65\n" },
  },
  37: {
    kind: "image", asset: "q37-reference.jpg",
    context: "사람이 없는 밝고 깨끗한 학교 복도를 16:9 실제사진 스타일로 생성한다. 양쪽 벽에는 사물함이 줄지어 있고, 큰 창문의 빛이 광택 바닥에 반사된다.",
    solution: "양쪽 벽면에 사물함이 줄지어 설치된 밝고 깨끗한 학교 복도입니다. 광택이 나는 바닥은 복도를 따라 있는 큰 창문을 통해 들어오는 햇빛을 반사하고 있습니다. 눈높이는 현대적인 실내 디자인과 정돈된 공간, 그리고 환영하는 교육 환경을 조성하는 훌륭한 조명을 특징으로 합니다. 이 장면을 16:9 비율의 실제사진 스타일로 그려주세요.",
    criteria: ["사람이 없는 학교 복도", "양쪽 벽 사물함", "창문빛과 광택 바닥 반사", "16:9 비율", "실제사진 스타일"],
  },
  38: {
    kind: "text", asset: "q38-reference.jpg",
    context: "첨부된 월별 매출표.xlsx를 바탕으로 월별 매출액 선 그래프를 생성하게 한다. 가로축은 월별 시간 흐름, 세로축은 매출액, 글자색은 검은색, 선은 파란색으로 지시한다.",
    solution: "첨부한 파일 속 매출 데이터를 선 그래프로 시각화하여 그려줘. 세로축은 매출액, 가로축은 월별 시간 흐름을 표현해야 해. 글자색은 검은색으로 하고, 선은 파란색으로 해줘.",
    criteria: ["첨부 파일 매출 데이터 사용", "선 그래프", "가로축 월별 시간 흐름", "세로축 매출액", "검은 글자와 파란 선"],
  },
  39: {
    kind: "image", asset: "q39-reference.jpg",
    context: "공원 산책로 이미지 생성을 위한 한국어 키워드형 프롬프트다. 나무가 늘어선 길, 푸른 잔디, 벤치, 화창한 날, 실제사진 16:9 비율을 포함한다.",
    solution: "공원 산책로, 나무가 늘어선 길, 푸른 잔디, 벤치, 평화로운 분위기, 자연 풍경, 화창한 날, 실제사진 스타일, 16:9 비율",
    criteria: ["공원 산책로와 나무", "푸른 잔디와 벤치", "평화로운 자연 풍경", "화창한 날", "실제사진 16:9 비율"],
  },
  40: {
    kind: "image", asset: "q40-reference.jpg",
    context: "첨부된 운하 사진을 바탕으로 저작권 보호용 워터마크를 적용한다. ‘영진닷컴’ 문구를 화면 중앙에 대각선으로, 이미지의 약 50% 크기로 표현한다.",
    solution: "첨부한 이미지에 ‘영진닷컴’이라는 글자를 워터마크를 적용한 것, 화면 정중앙에서 대각선 방향으로 표현하고, 이미지의 50% 수준의 크기로 그릴 것",
    criteria: ["첨부 원본 이미지 사용", "‘영진닷컴’ 워터마크", "화면 정중앙 배치", "대각선 방향", "이미지의 약 50% 크기"],
  },
};

function sectionMap(markdown) {
  const parts = markdown.split(/^## Q(\d{2})\s*$/m);
  const result = new Map();
  for (let index = 1; index < parts.length; index += 2) {
    result.set(Number(parts[index]), parts[index + 1].split(/^## (?:부록|출제 설계 추출)/m, 1)[0].trim());
  }
  return result;
}

function withoutSource(section) {
  return section.replace(/^- Source:.*\n+/m, "").trim();
}

function splitFourChoices(section) {
  const lines = section.split("\n");
  for (let start = lines.length - 4; start >= 0; start -= 1) {
    const values = [];
    for (let offset = 0; offset < 4; offset += 1) {
      const match = lines[start + offset]?.match(/^\s*([1-4])[.)]\s+(.+?)\s*$/);
      if (!match || Number(match[1]) !== offset + 1) break;
      values.push(match[2]);
    }
    if (values.length === 4) return { stem: lines.slice(0, start).join("\n").trim(), choices: values };
  }
  throw new Error(`Could not parse four choices from source text:\n${section.slice(-500)}`);
}

function cleanPrompt(number, value) {
  let prompt = withoutSource(value)
    .replace(/\n답:\s*_+\s*$/m, "")
    .replace(/\s*`\(\s*\)`\s*$/m, "")
    .trim();
  if (number === 1) prompt = prompt.replace(/^[\s\S]*?### 객관식\s*\n/, "").trim();
  if (number === 14) {
    prompt = prompt.replace("[판독불가: \"텍스트 A …\"로 시작하는 예시 문장](A)", "텍스트 A, B, C, D 각각의 문자열이 주어졌습니다.(A)");
  }
  if ([37, 39, 40].includes(number)) {
    prompt = prompt.replace(/^\| (?:원본 이미지|결과물) \| \[(?:이미지|원본과 같은)[^\n]*\] \|\n?/gm, "").trim();
  }
  return prompt;
}

function feedback(number, choice, index) {
  const explanation = choiceExplanations[number]?.[index + 1];
  if (!explanation) throw new Error(`Missing choice explanation for Q${number} option ${index + 1} (${choice}).`);
  return {
    explanation,
  };
}

const choiceBankCategories = {
  img2img: "이미지를 입력으로 받아 다른 이미지로 변환하는 방식",
  txt2vid: "텍스트 지시만으로 영상을 생성하는 방식",
  img2vid: "정지 이미지를 입력으로 받아 영상으로 확장하는 방식",
  vid2vid: "기존 영상을 입력으로 받아 다른 영상으로 변환하는 방식",
  as2vid: "오디오나 음성 신호를 바탕으로 영상을 만드는 방식",
  "1:1 비율": "정사각형 화면 비율 설정",
  "가로가 긴 비율": "가로형 화면 비율 설정",
  "세로가 긴 비율": "세로형 화면 비율 설정",
  "타원형 비율": "표준 영상 생성 방식이나 출력 수를 뜻하지 않는 화면 비율 표현",
  "마름모 비율": "표준 영상 생성 방식이나 출력 수를 뜻하지 않는 화면 비율 표현",
  "다음 장면을 생성": "다음 장면을 이어 생성하는 화면 동작",
  "장면 빌더로 이동": "장면 구성 화면으로 이동하는 동작",
  "해당 영상 삭제": "현재 영상을 제거하는 동작",
  "영상 다시 생성": "현재 조건으로 영상을 다시 만드는 동작",
  "객체 추가": "장면에 객체를 더하는 편집 동작",
  "첫 번째 연필 버튼": "편집 기능을 가리키는 화면 버튼",
  "두 번째 하트 버튼": "선호·저장 같은 반응 기능을 가리키는 화면 버튼",
  "세 번째 화살표 버튼": "공유·이동 같은 화면 기능을 가리키는 버튼",
  "네 번째 액자 버튼": "프레임·보기 관련 화면 기능을 가리키는 버튼",
  "다섯 번째 더보기 버튼": "추가 메뉴를 여는 화면 버튼",
};

function choiceBankFeedback(number, text) {
  if (number === 34) {
    if (text === "img2vid") return { explanation: "img2vid는 정지 이미지 프레임을 입력으로 받아 움직이는 영상으로 확장하는 방식이므로 화면 자료의 프레임 동영상 생성 설정과 일치한다." };
    if (["2", "4", "6", "8", "10"].includes(text)) return { explanation: `${text}은(는) 한 번에 생성할 결과의 수를 정하는 값일 수 있다. 입력 프레임을 영상으로 만드는 방식 자체는 img2vid다.` };
    const category = choiceBankCategories[text];
    return { explanation: `${text}은(는) ${category}다. 정지 이미지를 영상으로 바꾸는 이 문항의 생성 방식은 아니다.` };
  }

  if (text === "2") return { explanation: "화면의 출력 수 설정은 한 번의 생성에서 영상 2개를 만들도록 되어 있으므로 이 값이 맞다." };
  if (["4", "6", "8", "10"].includes(text)) return { explanation: `${text}도 출력 개수를 나타낼 수 있는 값이지만, 화면 자료의 한 번 생성 결과 수는 ${text}개가 아니라 2개다.` };
  const category = choiceBankCategories[text];
  return { explanation: `${text}은(는) ${category}다. 한 번의 생성에서 나오는 영상 수를 나타내는 옵션은 아니다.` };
}

function sourceVisuals(base) {
  return base.visuals?.length ? { visuals: base.visuals } : {};
}

function practicalQuestion(base, number, sourceText) {
  const spec = practical[number];
  const prompt = cleanPrompt(number, sourceText)
    .replace(/^### \[36~40\].*?\n+/m, "")
    .replace(/^### 실습형 — 프롬프트 작성\n+/m, "");
  return {
    id: `source-r01-q${String(number).padStart(2, "0")}`,
    number,
    type: "practical_prompt",
    chapter: topics[number][0],
    topic: topics[number][1],
    prompt,
    source_page: base.source_page,
    ...sourceVisuals(base),
    points: 5,
    answer: "",
    accepted_answers: [],
    explanation: "원본 결과물과 필수 조건을 모두 반영한 프롬프트인지 확인하세요.",
    ...(spec.asset ? { asset: `../assets/source-round-01/${spec.asset}`, asset_alt: base.primary_visual?.alt ?? "문항 참고 자료" } : {}),
    rubric: spec.criteria.map((criterion) => ({ criterion, points: 1, keywords: [criterion] })),
    evaluation: {
      kind: spec.kind,
      availability: "available",
      input_assets: spec.asset ? [spec.asset] : [],
      context_markdown: spec.context,
      provider_solution: spec.solution,
      source_criteria: spec.criteria,
      reference_source: "AI-POT 실전 모의고사 01회 정답·해설 사진 (촬영 페이지 22)",
      ...(spec.fixture ? { fixture: spec.fixture } : {}),
      ...(spec.kind === "image" ? { options: { quality: "low" } } : {}),
    },
  };
}

function build() {
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8"));
  const sections = sectionMap(readFileSync(ocrPath, "utf8"));
  const questions = corpus.questions.map((base) => {
    const number = base.number;
    const sourceText = sections.get(number);
    if (!sourceText) throw new Error(`Missing photographed transcription for Q${number}`);
    if (number >= 36) return practicalQuestion(base, number, sourceText);
    if (number === 34 || number === 35) {
      const prompt = number === 34
        ? "### [34~35] 공통 화면 자료\n\n다음 Google Flow 화면 자료를 보고, 입력 프레임으로 동영상을 생성한 방식의 보기 번호를 고르시오.\n\n[Google Flow 화면 자료]"
        : "Q34와 같은 Google Flow 화면 자료를 보고, 한 번의 생성에서 출력되는 영상 수의 보기 번호를 고르시오.\n\n[Google Flow 화면 자료]";
      const answer = number === 34 ? "3" : "11";
      return {
        id: `source-r01-q${String(number).padStart(2, "0")}`,
        number, type: "choice_bank", chapter: topics[number][0], topic: topics[number][1], source_page: base.source_page, ...sourceVisuals(base),
        prompt,
        points: 3, answer, accepted_answers: [answer], multiple_selection: false,
        choices: choiceBank.map((text, index) => ({
          id: String(index + 1), text,
          feedback: choiceBankFeedback(number, text),
        })),
      };
    }
    if (number >= 31) {
      const expected = String(base.answer);
      const accepted = number === 31
        ? ["차원의 저주", "curse of dimensionality", "차원의 저주(curse of dimensionality)"]
        : number === 32 ? ["단층 퍼셉트론", "single layer perceptron", "single-layer perceptron"]
          : ["인코더", "encoder"];
      return {
        id: `source-r01-q${String(number).padStart(2, "0")}`,
        number, type: "short_answer", chapter: topics[number][0], topic: topics[number][1], source_page: base.source_page, ...sourceVisuals(base),
        prompt: cleanPrompt(number, sourceText), points: 3, answer: expected,
        accepted_answers: accepted, explanation: `기대 정답은 ${expected}이다.`,
      };
    }
    const parsed = splitFourChoices(cleanPrompt(number, sourceText));
    const choices = parsed.choices;
    if (number === 1) choices[0] = "적응";
    if (number === 23) choices[0] = "인터널그래피";
    return {
      id: `source-r01-q${String(number).padStart(2, "0")}`,
      number, type: "multiple_choice", chapter: topics[number][0], topic: topics[number][1], source_page: base.source_page, ...sourceVisuals(base),
      prompt: parsed.stem, points: 2, answer: sourceAnswers[number - 1],
      accepted_answers: [sourceAnswers[number - 1]],
      choices: choices.map((text, index) => ({ id: String(index + 1), text, feedback: feedback(number, text, index) })),
    };
  });
  return {
    id: "source-round-01",
    title: "AI-POT 실전 모의고사 01회 (개인 학습용 원본)",
    source_kind: "private_photographed_book",
    known_limitations: [],
    questions,
  };
}

const next = `${JSON.stringify(build(), null, 2)}\n`;
if (checkOnly) {
  if (!existsSync(outputPath)) throw new Error("Set 1 learner manifest is missing. Run: node tools/build-aipot-source-round-01.mjs");
  if (readFileSync(outputPath, "utf8") !== next) throw new Error("Set 1 learner manifest is stale. Run: node tools/build-aipot-source-round-01.mjs");
  const manifest = JSON.parse(next);
  if (manifest.questions.length !== 40) throw new Error("Set 1 must contain all 40 questions.");
  if (JSON.stringify(manifest).includes("판독불가") || JSON.stringify(manifest).includes("원본 1회 문항")) throw new Error("Set 1 still contains unresolved source placeholders.");
  console.log("Validated image-based source-round-01 learner manifest.");
} else {
  writeFileSync(outputPath, next, "utf8");
  console.log(`Wrote ${outputPath}`);
}
