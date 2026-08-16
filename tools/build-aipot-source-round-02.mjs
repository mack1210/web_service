#!/usr/bin/env node

/** Build the learner-facing Set 2 from its photographed source corpus. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const checkOnly = process.argv.includes("--check");
const contentRoot = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const corpusPath = resolve(contentRoot, "corpus/source-round-02.json");
const ocrPath = resolve(contentRoot, "corpus/ocr/source-round-02.md");
const outputPath = resolve(contentRoot, "data/web-exams/source-round-02.json");

const answers = ["3", "4", "1", "1|3", "2", "4", "2", "2", "1", "1", "3", "2", "4", "3", "1", "4", "4", "3", "2", "1", "2", "3", "1", "2", "3", "4", "1", "2", "3", "1"];
const topics = {
  1: ["C01", "AI 정의"], 2: ["C02", "딥러닝 역사"], 3: ["C12", "RAG"], 4: ["C03", "차원 축소"], 5: ["C03", "PCA"],
  6: ["C03", "서포트 벡터 머신"], 7: ["C13", "TensorFlow"], 8: ["C04", "생성형 AI 용어"], 9: ["C06", "파운데이션 모델"], 10: ["C06", "미세조정"],
  11: ["C11", "동영상 생성 방식"], 12: ["C07", "프롬프트 구성 요소"], 13: ["C08", "전가하기 프롬프팅"], 14: ["C05", "바이그램"], 15: ["C05", "Word2Vec"],
  16: ["C05", "화용 분석"], 17: ["C07", "Markdown 제목"], 18: ["C10", "반복 개선 프롬프팅"], 19: ["C07", "퓨샷 프롬프팅"], 20: ["C03", "시그모이드 함수"],
  21: ["C03", "역전파"], 22: ["C11", "Gemini 이미지 생성"], 23: ["C09", "Hugging Face"], 24: ["C10", "소크라테스식 문답"], 25: ["C10", "레시피 패턴"],
  26: ["C11", "ChatGPT 이미지 편집"], 27: ["C12", "LangChain"], 28: ["C13", "PyTorch"], 29: ["C13", "스키마"], 30: ["C16", "AI 생성물 저작권"],
  31: ["C11", "ComfyUI 프롬프트"], 32: ["C11", "ComfyUI 스텝"], 33: ["C11", "ComfyUI 시드"], 34: ["C11", "ComfyUI 이미지 크기"], 35: ["C11", "ComfyUI 배치 크기"],
  36: ["C09", "관광예절 Q&A 프롬프트"], 37: ["C11", "욕실 이미지 프롬프트"], 38: ["C13", "온도 변환 코드 프롬프트"], 39: ["C14", "트리맵 시각화 프롬프트"], 40: ["C11", "교실 이미지 프롬프트"],
};

// Explanations are intentionally option-specific: the learner should learn
// why the selected statement is right or wrong, not see the answer repeated.
const explanations = {
  1: ["AI의 학습·추론·지각·언어 이해 능력을 컴퓨터로 구현한다는 설명은 AI의 일반적 정의에 맞는다.", "인간의 지능적 행동을 모방해 문제 해결과 의사결정을 돕는다는 설명도 AI의 범위에 포함된다.", "고정 규칙만 따르고 경험으로 성능을 개선하지 않는 시스템은 전통적 규칙 기반 프로그램에 가깝다. AI의 일반적 정의로는 옳지 않다.", "데이터에서 패턴을 학습하고 경험에 따라 성능을 개선하는 능력은 현대 AI의 핵심 특징이다."],
  2: ["Deep Blue의 체스 승리는 주로 탐색·규칙 기반 AI의 이정표이며, 딥러닝 용어의 역사와 직접 연결되는 사건은 아니다.", "AlexNet의 2012년 ImageNet 성과는 대규모 데이터와 GPU 기반 딥러닝의 가능성을 널리 알린 사건이다.", "GAN은 2014년에 제안된 딥러닝 기반 생성 모델로, 딥러닝 발전 흐름의 한 사례다.", "2016년 인간을 이긴 사례는 바둑의 AlphaGo다. 장기는 이 설명의 사실관계와 맞지 않는다."],
  3: ["RAG는 검색한 외부 문서를 생성 모델의 문맥에 넣으므로, 지식베이스 갱신만으로 최신 정보를 반영할 수 있다.", "검색 단계가 학습 후 문서도 찾아 올 수 있으므로 최신 정보 반영에 모델 파라미터 재학습이 반드시 필요한 것은 아니다.", "RAG는 검색 문서를 근거로 생성 모델이 답을 작성하는 구조다. 단순 요약만 하도록 제한되지 않는다.", "신뢰할 수 있는 검색·인용은 환각을 줄이는 데 도움을 줄 수 있으며, 출처의 신뢰성은 별도 검증할 수 있다."],
  4: ["PCA는 분산을 잘 보존하는 새 축으로 특성 수를 줄이는 차원 축소 기법이다.", "K-means는 중심점과 거리로 데이터를 묶는 군집화 알고리즘이며 차원 축소가 아니다.", "t-SNE는 고차원 이웃 구조를 낮은 차원에 펼쳐 시각화하는 차원 축소 기법이다.", "DBSCAN은 밀도 연결된 점을 묶는 군집화 기법으로 특성 축을 줄이지 않는다."],
  5: ["PCA는 분산이 큰 방향을 주성분으로 잡아 중요한 변동을 보존한다.", "PCA는 분산이 작은 방향을 제거해 노이즈를 줄인다. 분산이 큰 차원을 제거한다는 설명은 반대다.", "주성분 몇 개로 2~3차원에 투영하면 고차원 데이터의 대략적 구조를 시각적으로 살필 수 있다.", "차원을 줄이면 후속 모델의 입력 수와 계산량이 감소해 분석·학습 효율이 좋아질 수 있다."],
  6: ["불순도 감소로 if-then 분기를 만드는 것은 의사결정트리의 방식이다.", "주변 k개 이웃의 다수결로 분류하는 것은 k-NN의 방식이다.", "가중치와 역전파로 비선형 패턴을 학습하는 것은 다층 신경망의 방식이다.", "SVM은 경계와 가장 가까운 서포트 벡터까지의 마진을 크게 하도록 분리 초평면을 찾는다."],
  7: ["PyTorch는 연구·동적 그래프에 강점이 있는 Meta 계열 프레임워크지만, Google 개발과 TensorFlow Lite 단서에는 맞지 않는다.", "TensorFlow는 Google이 개발했고 분산 학습·배포 도구와 TensorFlow Lite를 제공하므로 요구사항에 맞는다.", "ONNX Runtime은 여러 프레임워크 모델의 추론 실행 엔진으로, 문제의 Google 딥러닝 프레임워크 자체는 아니다.", "Scikit-learn은 전통적 머신러닝 중심 라이브러리로 대규모 딥러닝 분산 학습·Lite 배포 조건과 다르다."],
  8: ["A는 파라미터를 직접 바꾸는 미세조정을 프롬프트 엔지니어링과 혼동했고, E도 멀티모달의 여러 데이터 형식 처리 특성과 반대다.", "C의 새 콘텐츠 생성, D의 프롬프트 작성·입력, F의 작업 지시 입력이라는 설명이 모두 정확하다.", "B의 소량 도메인 데이터 경량 모델과 G의 하드웨어 설계 직업 설명은 LLM·프롬프트 엔지니어 정의와 맞지 않는다.", "A·E·G는 각각 미세조정, 멀티모달, 프롬프트 엔지니어의 역할을 잘못 설명한 조합이다."],
  9: ["파운데이션 모델은 과제마다 처음부터 새로 만들기보다 대규모 사전학습 지식을 바탕으로 다양한 과제에 활용한다. 따라서 이 설명이 옳지 않다.", "대규모 텍스트·이미지·코드 학습으로 범용 패턴과 지식을 익히는 것은 파운데이션 모델의 특징이다.", "파운데이션 모델은 지시와 예시만으로 새 과업을 수행하는 제로샷·퓨샷 능력을 보일 수 있다.", "사전학습된 범용 지식은 전이학습과 미세조정의 출발점이 되어 새 과제 적응을 돕는다."],
  10: ["사전학습 모델을 특정 과업의 예시 데이터와 지도 손실로 다시 조정하는 과정은 미세조정이다.", "전이학습은 이미 배운 지식을 다른 과제에 활용하는 넓은 개념이며, 제시된 구체적 재학습 절차의 이름은 미세조정이다.", "강화학습은 행동 뒤 보상 신호로 정책을 최적화하는 방식으로, 지도 예시와 손실을 이용한 설명과 다르다.", "제로샷 학습은 추가 학습 없이 프롬프트만으로 과업을 수행하는 방식이다."],
  11: ["txt2vid는 텍스트 지시로 영상을 생성하는 실제 방식이다.", "img2vid는 정지 이미지를 입력으로 받아 움직이는 영상으로 확장하는 실제 방식이다.", "doc2vid는 이 문항에서 다루는 표준 동영상 생성 입력 방식이 아니다.", "vid2vid는 기존 영상을 변환하거나 편집해 새 영상으로 만드는 방식이다."],
  12: ["전문가 역할과 광고 카피 작성 요청이 있으므로 지시는 이미 들어 있다.", "제목·본문 글자 수와 해시태그 개수는 있지만, 무엇을 피하거나 지켜야 하는지에 대한 제약조건은 제시되지 않았다.", "제품명·성분·가격은 모델이 처리할 입력 자료로 제공됐다.", "제목·본문·해시태그라는 결과 구조가 지정되어 있어 출력 형식도 포함돼 있다."],
  13: ["설명 요구는 이미 선택한 내용의 이유·개념을 풀어 달라는 요청에 가깝다.", "시나리오·예시 생성은 상황이나 사례를 만들어 달라는 방식이지 모델에게 결정을 넘기는 방식은 아니다.", "보충 요청은 기존 답을 더 자세히 설명해 달라는 후속 요청이다.", "여러 전략 중 모델이 직접 최적안을 선택하고 이유를 대게 했으므로 작업위임·전가하기에 해당한다."],
  14: ["유니그램은 한 개의 항목을 분석 단위로 삼는다.", "트라이그램은 연속된 세 개 항목의 묶음이다.", "바이그램은 연속된 두 단어를 한 묶음으로 추출하므로 제시된 N=2 예시와 일치한다.", "다이어그램은 도식·그림을 뜻할 뿐 n-그램 언어 모델의 단위 명칭이 아니다."],
  15: ["Word2Vec은 주변 단어와의 관계, 즉 문맥을 통해 단어 의미를 벡터로 학습한다.", "공기 통계는 단어 관계를 파악하는 데 쓰이지만, 의미가 사전적 정의로 결정된다는 부분은 분포 가설과 맞지 않는다.", "형태소·품사 정보는 언어 분석에 쓰일 수 있으나 Word2Vec의 핵심 학습 신호는 주변 문맥이다.", "음운 유사성과 발화 상황은 소리·화용 분석의 요소이며 단어 임베딩의 중심 원리가 아니다."],
  16: ["형태소 분석은 단어를 형태소로 나누고 품사를 식별하는 단계다.", "구문 분석은 단어 사이의 문법 관계와 문장 구조를 파악한다.", "의미 분석은 단어·문장의 의미와 중의성을 해석한다.", "화용 분석은 화자·청자 관계와 상황 맥락을 고려해 발화의 실제 의도와 기능을 해석한다."],
  17: ["백틱은 코드나 인라인 코드를 표시하는 기호다.", "별표 두 개는 굵은 글씨를 표시한다.", "꺾쇠괄호는 인용문 블록을 표시한다.", "Markdown에서 #의 개수는 제목 수준을 나타내며 ###은 3단계 제목이다."],
  18: ["평가와 피드백으로 프롬프트를 고쳐 가므로 반복 개선은 품질과 정확도를 높일 수 있다.", "반복 프롬프팅은 대화 피드백을 활용하지만, 모델 파라미터가 데이터로 계속 학습·적응한다는 뜻은 아니다.", "이 기법의 핵심은 결과 평가 뒤 피드백을 반영해 다시 시도하는 순환이다. 예시나 반복 피드백이 전혀 없다는 설명은 옳지 않다.", "초안-평가-수정 과정을 둘 수 있어 정밀성과 명확성이 필요한 복잡한 결과물을 다듬는 데 유용하다."],
  19: ["제로샷은 예시 없이 과업 지시만 제공한다.", "퓨샷은 여러 입력·출력 예시를 보여 주어 새 입력에 같은 패턴을 적용하게 하는 방식이다.", "원샷은 예시를 정확히 하나만 제공하는 경우다.", "생각의 사슬은 답에 이르는 중간 추론 단계를 유도하는 기법으로, 여러 분류 예시 제공과는 다르다."],
  20: ["시그모이드는 모든 실수 입력을 0~1 사이로 매핑하는 로지스틱 S자 함수로 이진 분류 출력층에 자주 쓴다.", "ReLU는 음수 입력을 0으로 만들고 양수에서 선형 증가하므로 S자형 0~1 포화 함수가 아니다.", "Tanh는 S자 곡선이지만 출력 범위가 -1~1이다.", "소프트맥스는 여러 클래스 점수를 합이 1인 확률 분포로 바꾸는 함수다."],
  21: ["(가)는 입력에서 출력으로 값을 전달해 예측을 만드는 순전파 설명이다.", "(나)는 손실에서 연쇄 법칙으로 각 가중치 기울기를 출력층에서 입력층 방향으로 계산하는 역전파 설명이다.", "(다)는 계산한 기울기로 파라미터를 갱신하는 경사하강법 단계다.", "(라)는 배치 정규화로 분포를 조정하는 별도 학습 안정화 기법이다."],
  22: ["DALL-E 3는 OpenAI의 이미지 생성 모델이며 Gemini에 공개된 코드명이라는 조건과 다르다.", "Midjourney는 독립 이미지 생성 서비스로 Google Gemini의 해당 모델명이 아니다.", "원본 자료의 2025년 Gemini 이미지 생성 모델 코드명은 나노바나나다.", "Stable Diffusion은 Stability AI 계열의 생성 모델로 Google의 해당 발표 모델이 아니다."],
  23: ["Hugging Face는 Transformers·Datasets·Accelerate 생태계와 모델 카드·데이터셋 허브를 제공하므로 설명에 맞는다.", "TensorFlow Hub는 TensorFlow용 재사용 모델 저장소로, 문제의 광범위한 커뮤니티·프롬프팅 리소스 허브와 다르다.", "PyTorch Hub는 PyTorch 모델을 불러오는 저장소 기능이며 제시된 플랫폼 전체를 가리키지 않는다.", "Kaggle은 데이터 사이언스 경진대회·노트북 플랫폼으로 Transformers 라이브러리 생태계의 중심 허브는 아니다."],
  24: ["플라톤은 이데아론으로 알려진 철학자이며 단계별 질문을 통한 비판적 문답 기법의 명칭과 다르다.", "서로 다른 관점을 질문으로 검토하고 근거를 캐묻는 방식은 소크라테스식 문답법에서 이름을 딴 프롬프팅이다.", "아리스토텔레스는 논리학·삼단논법과 관련이 깊지만, 이 기법의 명칭은 소크라테스에서 왔다.", "피타고라스는 수학·정리로 알려져 있으며 제시된 대화식 검증 방법과 관련 없다."],
  25: ["퓨샷은 예시를 통해 모델에 과업 형식을 보여 주는 방식으로, 단계 산출물을 연결하는 파이프라인이 핵심은 아니다.", "생각의 사슬은 하나의 문제를 풀며 중간 추론을 전개하게 한다. 단계별 산출물 규격을 사전에 설계하는 패턴과는 다르다.", "레시피 패턴은 순서화된 단계, 단계별 입력·출력, 측정 가능한 지시와 최종 산출 규격을 미리 정하는 프롬프팅 방식이다.", "제로샷은 예시 없이 한 번의 지시로 과업을 요청하는 방식이다."],
  26: ["Suno는 음악 생성 서비스로 ChatGPT의 이미지 보기·편집 아이콘을 구동하는 모델이 아니다.", "Donut tape는 이 문항의 ChatGPT 이미지 기능 모델명이 아니다.", "GPT-QWEN-2는 제시된 OpenAI ChatGPT 이미지 편집 기능과 다른 계열의 명칭이다.", "원본 화면 자료에서 이미지 보기 또는 편집 기능은 GPT-image-2 모델로 작동한다고 안내한다."],
  27: ["LangChain은 Harrison Chase가 만든 오픈소스 LLM 애플리케이션 프레임워크로, 체인의 출력이 다음 단계 입력으로 이어지게 한다.", "LangGraph는 상태를 가진 에이전트 워크플로를 그래프로 구성하는 LangChain 생태계 도구다.", "LangSmith는 LLM 애플리케이션의 추적·평가·관측 도구다.", "LangServe는 LangChain 체인을 API로 배포하기 위한 도구다."],
  28: ["TensorFlow는 정적 그래프 중심으로 시작한 Google의 딥러닝 프레임워크이며 Meta의 동적 그래프 설명과 다르다.", "PyTorch는 Meta가 개발했고 실행 시 그래프를 구성하는 동적 계산 그래프 특성으로 연구와 Transformers 미세조정에 널리 쓰인다.", "Keras는 고수준 신경망 API로 TensorFlow 등 여러 백엔드 위에서 모델을 쉽게 구성하게 한다.", "Optuna는 하이퍼파라미터 탐색·최적화 라이브러리로 딥러닝 계산 그래프 프레임워크가 아니다."],
  29: ["스키마는 데이터베이스 구조·제약을 정의하는 메타데이터 집합이라는 설명이 맞다.", "스키마는 데이터 사전에 저장되어 데이터베이스의 논리 구조를 설명할 수 있다.", "실제 저장 값이 바뀔 때마다 함께 바뀌는 것은 인스턴스(데이터 상태)다. 스키마의 설명으로는 잘못됐다.", "외부·개념·내부의 3계층은 데이터베이스 스키마를 설명하는 구조다."],
  30: ["현행 저작권 체계에서는 인간의 창작적 기여가 저작물 성립의 전제이므로, 인간 개입 없이 AI만 생성한 결과는 일반적으로 저작권 보호 대상이 되기 어렵다.", "AI 개발사가 자동으로 창작자가 되거나 모든 권리를 취득한다는 일반 규칙은 없다.", "프롬프트 입력만으로 사용자에게 무조건 저작권이 발생하지 않으며, 인간의 창작적 기여와 관할 법제를 따져야 한다.", "국제 협약이 AI 산출물에 인간 개입 없이 자동 저작권을 준다는 일반 원칙은 없다."],
};

const choiceBank = ["보라색 은하수 유리병", "잔디밭 위의 아이들", "하늘을 나는 비행기", "책상 위에 놓인 책", "김이 올라오는 커피", "10", "20", "30", "40", "50", "현재 시드값 유지", "시드 무작위 재설정", "시드값 증가", "시드값 감소", "시드값 초기화", "2048", "1024", "256", "512", "128", "5", "7", "1", "4", "2"];

const practical = {
  36: { kind: "text", context: "첨부된 관광예절 텍스트만 근거로 국가별 핵심 관광예절을 Q&A로 정리한다. 국가마다 질문 2개와 한 문장 답을 쓰고 Markdown으로 구조화한다.", solution: "첨부한 파일에 포함된 각 국가의 관광예절 내용을 Q&A 형식으로 변환해 주세요. 국가별로 가장 중요한 질문 2개씩을 선정하여 작성하되, 각 국가 이름을 명확히 표시해 구분이 쉽게 해주세요. 각 질문에 대한 답변은 핵심 내용만을 담은 1문장으로 간결하게 작성하고, 전체 문서는 마크다운 형식으로 가독성 높게 구조화해 주세요.", criteria: ["첨부 파일 내용만 사용", "국가별 핵심 질문 2개", "질문·답변 Q&A 형식", "답변 한 문장", "Markdown 구조화"] },
  37: { kind: "image", asset: "q37-reference.jpg", context: "참고 사진을 바탕으로 현대식 욕실을 한국어 키워드형 프롬프트로 재현한다. 욕조, 세면대·거울, 유리 샤워부스, 은은한 조명과 실제사진 스타일을 포함한다.", solution: "모던 욕실 인테리어, 화이트 타일, 워크인 샤워 부스, 독립형 욕조, 큰 거울, 깔끔한 디자인, 스파 같은 분위기, 부드러운 수건, 미니멀 장식, 은은한 조명, 크롬 수전, 우아한 심플함, 밝은 공간, 편안한 안식처, 현대적 스타일, 럭셔리한 느낌, 고급스러운 욕실, 16:9비율, 실제 사진 스타일로 그려줘.", criteria: ["현대식 욕실", "독립형 욕조", "세면대와 큰 거울", "유리 샤워부스와 조명", "한국어 키워드형 실제사진"] },
  38: { kind: "code", context: "섭씨 값을 화씨로 변환하는 실행 가능한 Python 코드를 생성하게 한다. 코드 블록, 예외처리, 주석과 정상 실행 확인을 요청한다.", solution: "섭씨를 화씨로 변환하는 파이썬 코드를 작성하세요. 코드는 python으로 시작해서 코드 블록 형식으로 작성하세요. 오류가 발생했을 때에는 오류 메시지가 출력될 수 있게 예외처리를 함께 생성할 것. 코드가 잘 작동하는지 확인할 수 있게 주석도 함께 달아 놓을 것.", criteria: ["섭씨·화씨 변환", "Python 코드 블록", "예외처리", "설명 주석", "정상 실행 확인"], fixture: { stdin: "25\n" } },
  39: { kind: "text", asset: "q39-reference.jpg", context: "첨부한 도시별 인구·성별 xlsx 자료를 트리맵으로 시각화하게 한다. 도시별 면적, 성별 분할, 색 범례와 제목을 포함한다.", solution: "첨부한 자료를 트리맵(Treemap) 방식으로 시각화시켜서 그려줘. 트리맵 그래프 밑에 색깔별 범례도 함께 그려줘.", criteria: ["첨부 xlsx 자료 사용", "트리맵 시각화", "도시별 인구 면적", "성별 분할", "색상 범례와 제목"] },
  40: { kind: "image", asset: "q40-reference.jpg", context: "비어 있는 교실을 한국어 키워드형 프롬프트로 재현한다. 칠판, 책상·학생 의자, 창문 햇빛과 그림자, 따뜻한 실제사진 스타일을 포함한다.", solution: "밝은 교실, 책상 줄, 칠판, 햇빛 들어오는 창문, 학생 의자, 깨끗한 실내, 교육 공간, 따뜻한 분위기, 실제사진 스타일, 16:9 비율로 그려줘.", criteria: ["비어 있는 교실", "칠판과 책상·의자", "창문 햇빛과 그림자", "따뜻한 분위기", "한국어 키워드형 실제사진"] },
};

function sections(markdown) {
  const parts = markdown.split(/^## Q(\d{2})\s*$/m);
  const result = new Map();
  for (let index = 1; index < parts.length; index += 2) result.set(Number(parts[index]), parts[index + 1].split(/^## 부록/m, 1)[0].trim());
  return result;
}

function cleanPrompt(number, section) {
  let prompt = section.replace(/^- (?:Source|Related visual source):.*\n+/gm, "").replace(/\n답:\s*_+\s*$/m, "").trim();
  if (number === 1) prompt = prompt.replace(/^`AI-POT 실전 모의고사 02회`[^\n]*\n\n/, "");
  if ([37, 40].includes(number)) prompt = prompt.replace(/\| 결과물 \| \[이미지:[^\n]*\n?/g, "").trim();
  return prompt;
}

function splitChoices(section) {
  const lines = section.split("\n");
  for (let start = lines.length - 4; start >= 0; start -= 1) {
    const choices = [];
    for (let offset = 0; offset < 4; offset += 1) {
      const match = lines[start + offset]?.match(/^\s*([1-4])[.)]\s+(.+?)\s*$/);
      if (!match || Number(match[1]) !== offset + 1) break;
      choices.push(match[2]);
    }
    if (choices.length === 4) return { prompt: lines.slice(0, start).join("\n").trim(), choices };
  }
  throw new Error(`Could not parse four choices from source text:\n${section.slice(-500)}`);
}

function visualFields(question) {
  return question.visuals?.length ? { visuals: question.visuals } : {};
}

function choiceFeedback(number, index) {
  const explanation = explanations[number]?.[index];
  if (!explanation) throw new Error(`Missing option explanation for Q${number} option ${index + 1}.`);
  return { explanation };
}

function bankFeedback(number, text) {
  const correct = { 31: "보라색 은하수 유리병", 32: "20", 33: "시드 무작위 재설정", 34: "1024", 35: "1" }[number];
  const fact = {
    31: "프롬프트에는 purple galaxy bottle과 glass bottle이 들어 있으므로 보라색 은하수 유리병이 예상 결과다.",
    32: "KSampler의 스텝 수가 20으로 설정되어 있어 노이즈 제거는 20회 진행한다.",
    33: "생성 후 제어가 randomize이므로 현재 시드는 유지되지 않고 무작위로 재설정된다.",
    34: "빈 잠재 이미지의 높이가 1024로 설정되어 있어 세로 길이는 1024다.",
    35: "빈 잠재 이미지의 배치 크기가 1이므로 한 번에 이미지 1장이 생성된다.",
  }[number];
  if (text === correct) return { explanation: fact };
  const definition = {
    "잔디밭 위의 아이들": "사람과 잔디를 묘사한 이미지 결과",
    "하늘을 나는 비행기": "비행 장면을 묘사한 이미지 결과",
    "책상 위에 놓인 책": "책을 주제로 한 이미지 결과",
    "김이 올라오는 커피": "음료를 주제로 한 이미지 결과",
    "10": "KSampler의 노이즈 제거 반복 횟수 후보",
    "20": "KSampler의 노이즈 제거 반복 횟수 후보",
    "30": "KSampler의 노이즈 제거 반복 횟수 후보",
    "40": "KSampler의 노이즈 제거 반복 횟수 후보",
    "50": "KSampler의 노이즈 제거 반복 횟수 후보",
    "현재 시드값 유지": "같은 초기 노이즈 값을 계속 쓰는 시드 제어 방식",
    "시드 무작위 재설정": "생성할 때마다 새 초기 노이즈 값을 뽑는 시드 제어 방식",
    "시드값 증가": "현재 시드값에 순차 변화를 주는 시드 제어 방식",
    "시드값 감소": "현재 시드값을 낮추는 시드 제어 방식",
    "시드값 초기화": "시드값을 처음 상태로 되돌리는 제어 방식",
    "2048": "이미지 너비나 높이에 넣을 수 있는 픽셀 크기 후보",
    "1024": "이미지 너비나 높이에 넣을 수 있는 픽셀 크기 후보",
    "256": "이미지 너비나 높이에 넣을 수 있는 픽셀 크기 후보",
    "512": "이미지 너비나 높이에 넣을 수 있는 픽셀 크기 후보",
    "128": "이미지 너비나 높이에 넣을 수 있는 픽셀 크기 후보",
    "5": "한 번에 처리할 이미지 수를 정하는 배치 크기 후보",
    "7": "한 번에 처리할 이미지 수를 정하는 배치 크기 후보",
    "1": "한 번에 처리할 이미지 수를 정하는 배치 크기 후보",
    "4": "한 번에 처리할 이미지 수를 정하는 배치 크기 후보",
    "2": "한 번에 처리할 이미지 수를 정하는 배치 크기 후보",
  }[text];
  const relevance = number === 31
    ? "이 문항은 프롬프트가 가리키는 생성 결과를 묻는다."
    : number === 32
      ? "이 문항은 KSampler의 스텝 수만 확인한다."
      : number === 33
        ? "이 문항은 생성 후 시드 제어값을 확인한다."
        : number === 34
          ? "이 문항은 빈 잠재 이미지의 높이값을 확인한다."
          : "이 문항은 빈 잠재 이미지의 배치 크기를 확인한다.";
  return { explanation: `${text}은(는) ${definition}다. ${relevance} ${fact}` };
}

function practicalQuestion(base, number, section) {
  const spec = practical[number];
  const prompt = cleanPrompt(number, section)
    .replace(/^### 실습형 — 프롬프트 작성\n+/m, "")
    .replace(/\n답: __+\s*$/m, "")
    .trim();
  return {
    id: `source-r02-q${String(number).padStart(2, "0")}`, number, type: "practical_prompt", chapter: topics[number][0], topic: topics[number][1],
    prompt, source_page: base.source_page, ...visualFields(base), points: 5, answer: "", accepted_answers: [],
    explanation: "원본 결과물의 필수 조건을 빠짐없이 반영한 프롬프트인지 확인하세요.",
    ...(spec.asset ? { asset: `../assets/source-round-02/${spec.asset}`, asset_alt: base.primary_visual?.alt ?? "문항 참고 자료" } : {}),
    rubric: spec.criteria.map((criterion) => ({ criterion, points: 1, keywords: [criterion] })),
    evaluation: { kind: spec.kind, availability: "available", input_assets: spec.asset ? [spec.asset] : [], context_markdown: spec.context, provider_solution: spec.solution, source_criteria: spec.criteria, reference_source: "AI-POT 실전 모의고사 02회 답안 예시 사진", ...(spec.fixture ? { fixture: spec.fixture } : {}), ...(spec.kind === "image" ? { options: { quality: "low" } } : {}) },
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
      const prompt = cleanPrompt(number, section);
      const sharedVisual = number === 31 ? visualFields(base) : { visuals: [{ marker: "[ComfyUI 이미지 생성 노드 설정]", file: "q31-visual-01.jpg", source_page: 14, alt: "프롬프트, KSampler, 잠재 이미지, VAE 디코드가 연결된 ComfyUI 설정 화면" }] };
      return { id: `source-r02-q${String(number).padStart(2, "0")}`, number, type: "choice_bank", chapter: topics[number][0], topic: topics[number][1], source_page: base.source_page, ...sharedVisual, prompt, points: 3, answer: String(base.answer), accepted_answers: [String(base.answer)], multiple_selection: false, choices: choiceBank.map((text, index) => ({ id: String(index + 1), text, feedback: bankFeedback(number, text) })) };
    }
    if (number === 4) {
      const prompt = cleanPrompt(number, section);
      const choices = ["PCA", "K-means", "t-SNE", "DBSCAN"];
      return { id: "source-r02-q04", number, type: "multiple_select", chapter: topics[number][0], topic: topics[number][1], source_page: base.source_page, prompt, points: 2, answer: "1|3", accepted_answers: ["1|3"], choices: choices.map((text, index) => ({ id: String(index + 1), text, feedback: choiceFeedback(number, index) })) };
    }
    const parsed = splitChoices(cleanPrompt(number, section));
    return { id: `source-r02-q${String(number).padStart(2, "0")}`, number, type: "multiple_choice", chapter: topics[number][0], topic: topics[number][1], source_page: base.source_page, ...visualFields(base), prompt: parsed.prompt, points: 2, answer: answers[number - 1], accepted_answers: [answers[number - 1]], choices: parsed.choices.map((text, index) => ({ id: String(index + 1), text, feedback: choiceFeedback(number, index) })) };
  });
  return { id: "source-round-02", title: "AI-POT 실전 모의고사 02회 (개인 학습용 원본)", source_kind: "private_photographed_book", known_limitations: [], questions };
}

const next = `${JSON.stringify(build(), null, 2)}\n`;
if (checkOnly) {
  if (!existsSync(outputPath)) throw new Error("Set 2 learner manifest is missing. Run: node tools/build-aipot-source-round-02.mjs");
  if (readFileSync(outputPath, "utf8") !== next) throw new Error("Set 2 learner manifest is stale. Run: node tools/build-aipot-source-round-02.mjs");
  console.log("Validated image-based source-round-02 learner manifest.");
} else {
  writeFileSync(outputPath, next, "utf8");
  console.log(`Wrote ${outputPath}`);
}
