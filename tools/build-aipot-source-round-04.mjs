#!/usr/bin/env node

/** Builds learner-safe Set 4 from reviewed OCR; photographs remain audit-only. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const checkOnly = process.argv.includes("--check");
const root = process.env.AIPOT_CONTENT_ROOT ? resolve(process.env.AIPOT_CONTENT_ROOT) : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const corpusPath = resolve(root, "corpus/source-round-04.json");
const ocrPath = resolve(root, "corpus/ocr/source-round-04.md");
const outputPath = resolve(root, "data/web-exams/source-round-04.json");
const answers = ["4", "3", "1", "3", "2", "2", "1", "3", "4", "4", "3", "1", "2", "1", "3", "4", "2", "1", "3", "4", "4", "2", "2", "1", "3", "3", "4", "1", "4", "2"];
const topics = ["AI 역사", "에이전트 AI", "데이터의 영향", "랜덤 포레스트", "AI 생명주기", "Azure 서비스", "AWS 보안·저장소", "AI 프레임워크", "분류 성능 지표", "어텐션 메커니즘", "VAE 디코더", "사전학습과 미세조정", "LoRA", "프롬프트 엔지니어링", "프롬프트 기법", "자연어와 프로그래밍 언어", "n-gram", "토픽 모델링", "Word2Vec", "Shot prompting", "Markdown", "역할·청자 지정", "Perplexity", "데이터 플랫폼", "지식 생성 프롬프팅", "GPT for Excel", "AI 공정성", "AI 윤리", "AI 산출물 저작권", "편향 없는 프롬프트", "OpenAI Responses API", "Python JSON", "GPT for PowerPoint", "AI 윤리", "AI 학습 보호"];
const reasons = [
  "1980년대 전략 컴퓨팅 투자와 역전파에 따른 연결주의 부활은 2차 AI 부흥의 특징이다.",
  "목표를 자율 수행하고 전략을 수정하며 여러 도구를 연결하는 (가)·(다)·(라)가 에이전트 AI의 자율성이다.",
  "대화 로그가 누적되며 성능이 점차 좋아진 (가)는 지속적인 성능 개선, 여러 차량 분야에 적용한 (나)는 다양한 분야로의 적용 가능, 레이블 데이터를 추가해 정확도가 오른 (다)는 효과적인 학습 가능에 해당한다.",
  "이전 트리의 잔차를 순차 보정하는 방식은 부스팅이며, 독립 트리의 배깅·투표를 쓰는 랜덤 포레스트의 원리가 아니다.",
  "결측값 대체는 전처리, 배포 뒤 지표 추적은 모니터링, 후보 모델 초기 비교는 모델 설계·구현 단계에 해당한다.",
  "대용량 객체 보관은 Blob Storage, 전 세계 정적 콘텐츠 가속은 CDN, 관리형 관계형 DB는 Azure SQL Database다.",
  "논리적 네트워크 격리는 VPC, 권한 제어는 IAM, 대용량 객체 저장은 S3가 담당한다.",
  "TensorFlow의 계산 그래프·TPU 활용을 단순 로지스틱 회귀에 ‘최적’이라고 단정한 ㉢이 맞지 않는다.",
  "정밀도는 0.8, 재현율은 TP/(TP+FN)이며 두 값을 조화평균한 F1 점수는 약 0.73이다.",
  "Value는 어텐션 가중합에 쓰는 정보 벡터이며 Query·Key 유사도를 직접 계산하는 기준 벡터가 아니다.",
  "VAE 디코더는 잠재 벡터를 데이터 공간으로 복원하므로 차원을 축소해 저차원 출력을 만든다는 ㉢이 틀리다.",
  "의료 도메인 데이터로 하는 두 번째 단계는 도메인 최적화이며 사전학습보다 상대적으로 적은 연산 자원을 쓴다.",
  "기존 가중치를 고정하고 작은 어댑터만 학습해 비용을 줄이는 방식은 LoRA 같은 파라미터 효율 미세조정이다.",
  "정확성·효율성·재현성은 요구사항 부합, 시행착오 감소, 일관된 품질이라는 세 목표와 대응한다.",
  "자료의 데이터와 인사이트를 바탕으로 새 마케팅 전략을 만드는 것은 원본 기반 창작을 유도하는 기법이다.",
  "자연어는 문맥과 오류 허용성 때문에 해석이 달라질 수 있지만 프로그래밍 언어는 정확한 구문을 요구한다.",
  "바이그램인 모델 Y가 문맥 보존과 희소성 사이의 균형으로 가장 높은 정확도를 보였다.",
  "토픽 모델링은 분석 전에 주제 수를 정해야 하며 문서가 하나의 주제에만 고정되지는 않는다.",
  "Word2Vec은 함께 또는 인접해 자주 등장하는 단어의 관계를 CBOW·Skip-gram으로 학습한다.",
  "제로샷은 예시 없이 지시만 주고, 원샷은 하나의 입출력 예시로 원하는 관계·형식을 보여 준다.",
  "여러 줄 코드 블록은 백틱 세 개로 감싸며 단일 백틱은 문장 안의 인라인 코드에 쓴다.",
  "두 대상은 역할이 아니라 답변을 받을 청자의 숙련도 차이를 나타내므로 ㉡은 부적절하다.",
  "Perplexity는 생성형 검색과 인용을 결합하고 여러 관점 비교·팩트 체크에 적합하므로 ㄱ·ㄷ·ㅁ이 맞다.",
  "경진대회와 분석 코드가 있는 곳은 Kaggle이고, 모델·데이터 연결을 확인하는 양방향 참조 기능은 Hugging Face의 강점이다.",
  "관련 지식을 생성·활성화한 뒤 답변에 연결하는 방식이지 사후 검증을 핵심으로 하지는 않는다.",
  "분류에는 AI.CHOICE, 추출에는 AI.EXTRACT, 형식 통일에는 AI.FORMAT, 아이디어 열거에는 AI.LIST가 맞다.",
  "실제 재범하지 않은 사람을 고위험군으로 오분류한 비율은 X 43.1%, Y 21.9%로 X가 약 두 배 높다.",
  "성별·인종 차별은 다양성 존중, 평가 사실과 기준을 숨긴 것은 투명성, 책임 회피는 책임성, 과도한 개인정보 수집은 프라이버시 보호 문제다. 문제에 제시된 순서는 ①과 같다.",
  "순수 AI 생성물은 인간 창작자가 분명하지 않아 보호가 어렵지만 인간의 창의적 선별·수정은 보호 근거가 될 수 있다.",
  "연령만으로 학습 특성을 일반화하는 두 번째 시나리오는 고정관념을 강화하므로 윤리적 설계 원칙에 맞지 않는다.",
];
// A rejected option must explain its own error. Merely repeating the answer
// number makes post-lock review useless, especially for combination questions.
const distractorReasons = {
  1: ["1차 AI 부흥은 1950~60년대의 초기 상징주의 연구 시기다. 1980년대 전략 컴퓨팅 투자와 역전파 부활을 설명하지 않는다.", "1차 AI 겨울은 기대에 못 미친 성과로 연구비가 줄어든 시기다. 국가 주도 대규모 투자와 연결주의 부활의 시기가 아니다.", "딥러닝 혁명은 2006년 이후 대규모 데이터·GPU와 함께 전개됐다. 제시문의 1980년대 사건보다 훨씬 뒤다."],
  2: ["(나)는 새 사용자 입력을 기다리는 반응형 응답이므로 자율 계획·실행을 뜻하지 않는다. 그래서 (가)·(다)·(라)만 묶어야 한다.", "(나)는 에이전트 AI의 자율적 재계획 특성이 아니며, (가)의 목표 기반 자율 실행도 빠져 있다.", "(나)는 반응형 질의응답 설명이므로 포함하면 에이전트 AI만의 특성이라는 조건에 맞지 않는다."],
  3: ["(가)는 대화 로그가 쌓이며 성능이 점차 좋아진 지속적인 성능 개선이고, (나)는 여러 차량 분야로 넓어진 적용 가능성이다. 두 항목을 바꾼 ②는 맞지 않는다.", "(가)의 대화 로그 누적은 지속적인 성능 개선이고, (다)의 레이블 데이터 추가에 따른 정확도 향상은 효과적인 학습 가능이다. ③은 둘을 바꾸었다.", "(가)는 지속적인 성능 개선, (나)는 다양한 분야로의 적용 가능, (다)는 효과적인 학습 가능이므로 ④처럼 세 항목을 바꾸어 연결할 수 없다."],
  4: ["부트스트랩 표본으로 여러 트리를 독립 학습시키는 배깅은 랜덤 포레스트의 핵심 구성이다.", "노드마다 임의 특성 부분집합을 쓰는 것은 트리 상관을 낮추는 랜덤 포레스트의 특징이다.", "분류에서 각 트리의 예측을 다수결로 합치는 것은 랜덤 포레스트의 정상적인 최종 결정 방식이다."],
  5: ["B의 배포 뒤 정확도 추적은 성능 평가가 아니라 결과물 배포 및 모니터링 단계다.", "A의 결측값 보완은 문제 정의가 아니라 데이터 수집 및 전처리이며, C의 후보 모델 비교도 이 조합과 맞지 않는다.", "A의 중앙값 대체는 전처리지만 B는 모니터링이고 C는 모델 설계·구현이므로 이 표의 단계 배치가 틀리다."],
  6: ["Azure Monitor는 관측 서비스라 전 세계 정적 파일 전송을 가속하는 CDN 역할을 하지 못한다.", "Azure SQL Database는 객체 파일 장기 보관용이 아니고 Blob Storage는 관계형 트랜잭션 DB가 아니다.", "Azure Monitor는 저장소가 아니며 Virtual Machines는 관리형 SQL 서비스가 아니어서 요구사항과 맞지 않는다."],
  7: ["EC2는 가상 서버이지만 순서의 첫 요구는 네트워크 격리(VPC), 둘째는 권한(IAM), 셋째는 저장소(S3)다.", "S3는 객체 저장소이지 논리적으로 격리된 가상 네트워크가 아니며 RDS도 권한 관리 서비스가 아니다.", "IAM은 권한 관리만 담당하고 EC2는 네트워크 격리 서비스가 아니며 RDS는 무제한 객체 저장소가 아니다."],
  8: ["㉠의 K-means와 Scikit-learn 연결은 타당하다. 군집화 문제에 적합한 라이브러리라는 설명이다.", "㉡의 랜덤 포레스트 제공과 분류·군집화 활용도 Scikit-learn의 기능과 부합한다.", "㉣의 TensorFlow Lite는 학습 모델을 모바일 기기에 배포할 때 쓰는 도구이므로 부적절한 진술이 아니다."],
  9: ["양성 예측 1,000건 중 실제 양성 800건은 정밀도 0.8이다. 재현율은 실제 양성 1,200건을 분모로 계산한다.", "정확도는 TN까지 알아야 계산할 수 있고, 이 자료의 (가)는 정밀도다. (다)도 정밀도가 아니라 F1 점수다.", "(나)는 실제 양성 중 맞힌 비율인 재현율이며, (다)는 정밀도·재현율을 함께 반영한 F1 점수다."],
  10: ["Query는 어떤 정보를 찾을지 나타내는 기준 벡터이므로 설명이 맞다.", "Key는 Query와 비교되어 관련성을 계산하는 입력 특징 벡터이므로 설명이 맞다.", "Query와 Key의 유사도 점수에 Softmax를 거쳐 정규화된 값이 Attention Weight이므로 이 설명은 맞다."],
  11: ["인코더와 대칭 또는 비대칭 구조를 선택할 수 있다는 설명은 디코더 설계의 일반적인 고려 사항이다.", "학습 뒤에는 표준 정규분포 잠재 벡터를 디코더에 넣어 새 샘플을 만들 수 있으므로 이 설명은 맞다.", "연속적인 잠재 공간은 학습 데이터 사이의 벡터에서도 의미 있는 새 데이터를 생성하게 하므로 ㉣은 맞다."],
  12: ["자기지도학습은 일반 언어 패턴을 익히는 사전학습 단계의 특징이다. 의료 도메인 적응 단계의 직접 특징이 아니다.", "ㄱ과 ㄹ은 모두 첫 사전학습 단계에 해당한다. 두 번째 단계는 ㄴ·ㄷ처럼 도메인 특화와 낮은 연산 부담이 핵심이다.", "ㄹ의 일반 언어 패턴 학습은 대규모 사전학습의 목적이므로 도메인 미세조정의 특징과 함께 고를 수 없다."],
  13: ["전체 파인튜닝은 모든 가중치를 갱신하므로 팀장이 피하려 한 큰 메모리·계산 비용을 그대로 감수한다.", "프롬프트 튜닝은 가중치를 거의 건드리지 않지만, 대화에서 원하는 성능 향상에는 부족하다고 이미 배제됐다.", "도메인 데이터로 전체 가중치를 재학습하면 비용이 커진다는 이유로 팀장이 선택하지 않은 방식이다."],
  14: ["창의성·다양성·유연성은 유용한 결과 특성일 수 있지만 제시한 정확성·비용 절감·일관성의 세 목표와 대응하지 않는다.", "복잡성·경고성·세밀성은 대화의 시간·비용 절감 및 동일 품질 보장과 연결되지 않는다.", "신속성과 편의성은 일부 효율과 닿지만 정확성과 재현성을 빠뜨리고 자동성은 제시된 목표가 아니다."],
  15: ["가능한 옵션을 넓게 탐색하는 방식은 제시문의 원본 판매·설문 자료를 근거로 전략을 만드는 요청과 다르다.", "기존 메시지를 유지해 표현만 바꾸는 것은 재서술에 가깝고, 자료 분석으로 새 전략을 만들라는 조건을 충족하지 않는다.", "관련 없는 개념을 결합하는 발상 기법은 주어진 데이터에서 인사이트를 뽑아 마케팅 전략을 만드는 방식이 아니다."],
  16: ["자연어도 시대와 사용에 따라 변하지만, 프로그래밍 언어만 진화하고 자연어가 고정된다는 비교는 틀리다.", "처리량은 언어의 본질적 구분이 아니며 프로그래밍 언어도 병렬·대량 처리가 가능하다.", "자연어는 다국어일 수 있고 프로그래밍 언어가 다국어 처리를 필수로 요구한다는 설명도 맞지 않는다."],
  17: ["모델 X의 한 단어 예시는 유니그램이지 트라이그램이 아니며 문맥 보존도도 가장 낮다.", "모델 Z는 긴 5-gram에 가까운 문맥 단위라 유니그램이 아니고, 희소성이 높아 정확도도 낮다.", "n값이 커질수록 미등장 조합이 급증해 정확도가 항상 오르지 않는다. 모델 Z의 61%가 반례다."],
  18: ["토픽 모델은 한 게시글에 여러 주제를 확률로 배정할 수 있으므로 반드시 하나의 그룹에만 넣는 단일 분류 방식이 아니다.", "긍정·부정 판정은 감성 분석의 목적이다. 이 분석은 단어 분포를 바탕으로 숨은 주제를 찾는다.", "단어의 문맥적 의미를 통합하는 것은 문맥 임베딩의 강점에 가깝다. 이 확률 기반 토픽 모델은 단어 분포로 주제를 추정한다."],
  19: ["품사가 같다는 사실만으로 Word2Vec 벡터가 유사해지지 않는다. 주변 문맥의 동시 출현이 핵심이다.", "반의 관계나 대조 학습이 아니라 ‘가격 대비’처럼 함께 쓰이는 주변 단어 관계를 학습한 결과다.", "벡터 차원이 같다는 것은 비교의 전제일 뿐, 두 단어의 값이 유사해지는 학습 근거가 아니다."],
  20: ["제로샷은 파인튜닝된 특수 지식이 아니라 예시 없이 모델의 기존 일반화 능력으로 과업을 수행한다.", "외부 검색 연동은 shot prompting의 정의가 아니며 원샷은 예시 하나로 형식을 전달한다.", "원샷은 최소 두 개가 아니라 정확히 하나의 입출력 예시를 제공하는 방식이다."],
  21: ["단일 백틱은 문장 안의 인라인 코드 표시에 쓰며 여러 줄 코드 블록을 만들지 못한다.", "별표 두 개는 굵은 글씨 Markdown 문법으로 코드 블록과 관계없다.", "별표 하나는 기울임 또는 목록 문법이며 언어 지정이 가능한 코드 블록 문법이 아니다."],
  22: ["역할 부여는 AI가 말할 전문 관점을 정하는 기법이다. 두 문장은 답변을 받는 청자의 수준을 정한 예시다.", "청자 지정은 용어와 설명 수준을 조정하는 기법이라는 설명이 맞다.", "구체적 전문가 역할을 주면 실무 중심 관점과 전문성을 유도할 수 있으므로 이 설명은 적절하다."],
  23: ["Pro 버전은 단일 모델만 쓰는 것이 아니라 여러 모델을 선택할 수 있으므로 ㄴ이 틀리다.", "단순 나열 후 이용자에게 선별을 맡기는 검색 방식이 아니라, 출처를 단 답변을 합성하므로 ㄹ이 틀리다.", "ㄴ의 단일 모델 주장과 ㄹ의 단순 나열 주장은 모두 Perplexity의 인용 기반 생성형 검색 특징에 맞지 않는다."],
  24: ["(가)는 Kaggle이지만 (나)와 (다)가 뒤바뀌었다. Hugging Face는 모델·데이터셋 연결을 보여 주는 허브다.", "Kaggle과 Hugging Face의 역할은 맞지만, 제시된 핵심 기능은 브라우저 필터링이 아니라 데이터셋–모델 간 참조다.", "두 플랫폼의 순서가 바뀌었고 Transformers 라이브러리 통합은 이 대화가 묻는 데이터셋–모델 양방향 참조 기능이 아니다."],
  25: ["지식 생성 프롬프팅은 답변 전에 관련 지식을 만들고 활용하는 절차이므로 암묵 지식 활성화 설명은 맞다.", "도식의 첫 단계가 지식 생성이므로 프롬프트에 그 단계를 넣는 설명은 맞다.", "생성된 지식을 마지막 답변에 연결하는 3단계가 명시되어 있으므로 이 설명은 맞다."],
  26: ["AI.FILL은 빈칸 채우기에 쓰며 정해진 범주 하나를 고르는 분류에는 AI.CHOICE가 적합하다. AI.TRANSLATE도 전화번호 형식 통일 기능이 아니다.", "AI.TABLE은 표 생성에 가깝고, 이메일 추출은 AI.EXTRACT·전화번호 표준화는 AI.FORMAT이 맡는다.", "AI.ASK는 자유 질의용이고 AI.CHOICE는 분류용이다. 제시된 네 기능의 쓰임과 맞지 않는다."],
  27: ["집단별 대상 수 차이만으로 43.1%와 21.9%의 오분류 비율 격차를 설명할 수는 없다.", "Y 집단이 더 높은 위험 판정을 받았다는 자료가 없으며, 제시된 수치는 X 집단의 고위험 오분류가 더 높음을 보인다.", "X의 저위험 오분류는 28.0%, Y는 47.7%이지만 이는 문제의 핵심인 비재범자 고위험 오분류 격차와 다른 지표다."],
  28: ["첫 번째 문제는 교재에서 다양성 존중으로 분류한 차별, 두 번째는 투명성 부족이다. ②는 이를 인권보장·프라이버시 보호로 바꾸어 문제 제시 순서와 맞지 않는다.", "첫 번째 문제인 성별·인종 차별을 프라이버시 보호로 볼 수 없고, 두 번째의 비공개도 다양성 존중 문제가 아니다. ③은 문제별 원칙이 뒤바뀌었다.", "첫 번째 차별 문제를 투명성으로, 두 번째 비공개를 책임성으로 바꿀 수 없다. 마지막 과도한 개인정보 수집도 데이터 관리가 아니라 프라이버시 보호에 해당한다."],
  29: ["국가별 법원과 저작권 기관의 기준은 통일되어 있지 않아 ㄱ이 틀리고, 등록 가능성도 국가 법제와 인간 기여를 함께 본다.", "ㄴ은 국가별 법제 차이를 무시하므로 틀리다. ㄹ은 맞지만 ㄴ과 함께 묶을 수 없다.", "ㄱ의 통일 기준 주장이 틀리며, 순수 AI 생성물 보호 곤란과 인간의 창의적 수정 가능성만 맞다."],
  30: ["개인의 현재 숙련도를 확인해 맞춤형 지원을 제안하므로 연령 고정관념을 피한 적절한 응답이다.", "단계별 문서화·실습 기회·질문 환경은 개인의 필요를 지원하는 방법이며 연령만으로 능력을 일반화하지 않는다.", "현재 기술 수준을 평가하고 부족 영역을 지원하는 것은 개인차를 기준으로 하므로 편향 없는 설계에 맞다."],
};
const practical = {
  36: { topic: "첨부 텍스트 번역 프롬프트", kind: "text", context: "### 36. 과일 소개 파일의 문장별 영어 번역\n\n첨부 파일 `실습_과일 소개.txt`의 각 과일 소개 문장 뒤에 자연스러운 영어 번역을 괄호로 붙이는 프롬프트를 작성하시오. 원문과 번역은 줄바꿈 없이 붙이고, 항목 사이에는 빈 줄 하나를 둔다. 결과에는 사과·바나나·오렌지·딸기·포도의 한국어 소개와 영어 번역이 각각 포함되어야 한다.\n\n답: ____________________", solution: "첨부파일 내 텍스트의 각 줄을 유지하되, 각 문장 바로 뒤에 영어 번역을 괄호 안에 추가해주세요. 형식은 ‘원문(English translation)’으로 작성하고 자연스럽고 문맥에 맞게 의역해주세요. 원문과 번역문 사이는 줄바꿈 없이 바로 이어서 작성하고 각 항목 사이에는 빈 줄을 하나 넣어주세요.", criteria: ["첨부 텍스트만 근거로 사용", "각 과일 문장 뒤 영어 번역", "자연스럽고 문맥에 맞는 의역", "원문과 번역을 줄바꿈 없이 연결", "항목 사이 빈 줄 하나"] },
  37: { topic: "참고 이미지 기반 프롬프트", kind: "image", asset: "q37-reference.jpg", alt: "모래 위의 꽃·자갈·고양이 발자국과 하트 그림이 있는 낮 장면", context: "### 37. 참고 이미지 장면 재현\n\n첨부 이미지를 참고해 모래 위의 한 송이 꽃, 자갈 몇 개, 고양이 발자국, 모래 위 하트 그림이 있는 낮 장면을 실제 사진 스타일의 16:9 이미지로 만들 프롬프트를 작성하시오.\n\n답: ____________________", solution: "모래 위에 피어있는 한 송이의 꽃, 자갈 몇 개, 고양이 발자국, 낮, 모래 위에 그려진 하트모양 그림, 16:9 비율, 실제 사진 스타일로 그려줘.", criteria: ["첨부 이미지 장면 참조", "꽃·자갈·고양이 발자국", "모래 위 하트 그림", "낮 장면", "16:9 실제 사진 스타일"] },
  38: { topic: "스프레드시트 결측치 처리 프롬프트", kind: "text", context: "### 38. 매출·주문표 결측치 처리\n\n첨부한 `실습_매출 및 주문표.xlsx`에서 결측치를 분석·처리한 완성 표를 출력하도록 하는 프롬프트를 작성하시오. 기존 패턴을 분석하고, 여러 빈칸은 앞뒤 달 수치의 평균으로 추정한다. 완료 후에는 `요청하신 첨부파일의 결측치 처리를 모두 마쳤습니다.`라는 안내문을 포함한다.\n\n답: ____________________", solution: "첨부한 `실습_매출 및 주문표.xlsx`에서 결측치를 분석한 뒤 처리해줘. 기존 데이터 패턴을 분석해 역산하고, 빈칸이 여러 개면 앞뒤 달 수치의 평균으로 추정해줘. 결측치 처리를 마친 완성 표를 출력한 뒤 `요청하신 첨부파일의 결측치 처리를 모두 마쳤습니다.`를 표시해줘.", criteria: ["첨부 엑셀 파일 사용", "결측치 분석과 처리", "기존 데이터 패턴·역산", "앞뒤 달 평균으로 추정", "완성 표와 완료 안내문 출력"] },
  39: { topic: "로고 슬로건 이미지 프롬프트", kind: "image", asset: "q39-reference.jpg", alt: "영진닷컴 로고가 담긴 참고 이미지", context: "### 39. 첨부 로고를 활용한 슬로건 이미지\n\n첨부 로고를 왼쪽에 배치하고 오른쪽에 `영진닷컴과 함께하는`, `AI-POT 시험 공부`를 두 줄로 배치한 흰 배경의 1:1 슬로건 이미지를 만들 프롬프트를 작성하시오.\n\n답: ____________________", solution: "첨부한 로고를 흰 배경의 맨 왼쪽에 배치하고, 오른쪽에 ‘영진닷컴과 함께하는 AI-POT 시험 공부’라는 문장이 두 줄로 작성된 1:1 슬로건 이미지를 제작해줘.", criteria: ["첨부 로고 사용", "로고를 왼쪽에 배치", "지정 슬로건 두 줄", "흰 배경", "1:1 비율"] },
  40: { topic: "조건형 학습 장면 이미지 프롬프트", kind: "image", asset: "q40-reference.jpg", alt: "흰 책상 위 시험 준비 장면 참고 이미지", context: "### 40. 대학 시험 준비 장면\n\n첨부 이미지를 참고해 흰 책상 위를 내려다본 대학 시험 준비 장면을 만드는 프롬프트를 작성하시오. 은색 노트북의 파란 로그인 화면, 왼쪽의 수식 스프링 노트와 검은 펜, 오른쪽의 대학생 신문과 카시오 공학용 계산기, 창문 자연광을 포함한 사실적 3:4 세로 구도여야 한다.\n\n답: ____________________", solution: "첨부 이미지를 참고해 깨끗한 흰색 책상 위의 대학 시험 준비 장면을 위에서 내려다본 사실적인 3:4 세로 사진으로 그려줘. 중앙에는 파란색 배경의 로그인 페이지가 표시된 은색 노트북을 두고, 왼쪽에는 수학 공식과 방정식이 손으로 적힌 스프링 노트와 검은색 펜, 오른쪽에는 대학생 신문종이와 카시오 공학용 계산기를 배치해줘. 자연광이 들어오는 창문 아래의 미니멀하고 정돈된 학습 환경으로 만들어줘.", criteria: ["첨부 이미지 참고", "흰 책상·은색 로그인 노트북", "수식 노트와 검은 펜", "신문과 카시오 공학용 계산기", "자연광의 사실적 3:4 세로 구도"] },
};

function sections(markdown) { const out = new Map(); for (const match of markdown.matchAll(/^## Q(\d{2})\s*\n([\s\S]*?)(?=^## Q\d{2}\s*\n|^## 부록:|(?![\s\S]))/gm)) out.set(Number(match[1]), match[2].replace(/^- Source:.*\n\n/m, "").replace("[판독불가: ‘구사의/구체적인’]", "구체적인").replace("[판독불가: 밥가/밥값]", "밥값").trim()); return out; }
function choices(text) {
  const start = text.lastIndexOf("\n1. ");
  if (start >= 0) {
    const values = [...text.slice(start + 1).matchAll(/(?:^|\n)[1-4]\.\s*([\s\S]*?)(?=\n[1-4]\.\s|$)/g)]
      .map((match) => match[1].trim().replace(/\n+/g, " "));
    if (values.length === 4) return { prompt: text.slice(0, start).trim(), values };
  }
  const rows = [...text.matchAll(/^\| ([1-4]) \| (.*) \|$/gm)].slice(-4);
  if (rows.length !== 4) throw new Error("Could not find final answer choices.");

  const promptLines = text.slice(0, rows[0].index).trim().split("\n");
  const header = promptLines.at(-2);
  const divider = promptLines.at(-1);
  if (header?.startsWith("|") && /^\|(?:\s*:?-{3,}:?\s*\|)+$/u.test(divider ?? "")) {
    const labels = header.split("|").slice(1, -1).map((label) => label.trim());
    promptLines.splice(-2, 2, "", `선택지 순서: ${labels.slice(1).join(" → ")}`);
  }
  return { prompt: promptLines.join("\n").trim(), values: rows.map((row) => row[2].trim()) };
}
function buildPractical(base) { const spec = practical[base.number]; return { id: `source-r04-q${String(base.number).padStart(2, "0")}`, number: base.number, type: "practical_prompt", chapter: `C${String(base.number).padStart(2, "0")}`, topic: spec.topic, prompt: spec.context, source_page: base.source_page, points: 5, answer: "", accepted_answers: [], explanation: "원본의 결과물 조건을 빠짐없이 반영한 프롬프트인지 확인하세요.", ...(spec.asset ? { asset: `../assets/source-round-04/${spec.asset}`, asset_alt: spec.alt } : {}), rubric: spec.criteria.map((criterion) => ({ criterion, points: 1, keywords: [] })), evaluation: { kind: spec.kind, availability: "available", input_assets: spec.asset ? [spec.asset] : [], context_markdown: spec.context, provider_solution: spec.solution, source_criteria: spec.criteria, reference_source: "AI-POT 실전 모의고사 04회 답안 예시 사진 (촬영 페이지 26)", ...(spec.kind === "image" ? { options: { quality: "low" } } : {}) } }; }
function build() { const corpus = JSON.parse(readFileSync(corpusPath, "utf8")); const source = sections(readFileSync(ocrPath, "utf8")); return { id: "source-round-04", title: "AI-POT 실전 모의고사 04회 (개인 학습용 원본)", source_kind: "private_photographed_book", known_limitations: [], questions: corpus.questions.map((base) => { const text = source.get(base.number); if (!text) throw new Error(`Missing reviewed OCR for Q${base.number}.`); if (base.number >= 36) return buildPractical(base); const common = { id: `source-r04-q${String(base.number).padStart(2, "0")}`, number: base.number, chapter: `C${String(base.number).padStart(2, "0")}`, topic: topics[base.number - 1], source_page: base.source_page }; if (base.number >= 31) { const accepted = { 31: ["model"], 32: ["import"], 33: ["주제에서 만들기"], 34: ["기술의 합목적성 원칙"], 35: ["글레이즈", "Glaze", "글레이즈(Glaze)"] }[base.number]; const answer = base.number === 35 ? "글레이즈(Glaze)" : String(base.answer); return { ...common, type: "short_answer", prompt: text, points: 3, answer, accepted_answers: accepted, explanation: `기대 정답은 ${answer}이다.` }; } const parsed = choices(text); if (base.number === 10) parsed.values[2] = "Attention Weight: Query와 Key 사이의 유사도 점수에 Softmax 함수를 거친 뒤, 각 입력 요소에 배분된 정규화된 중요도를 나타낸다."; const answer = answers[base.number - 1]; const answerIndex = Number(answer) - 1; return { ...common, type: "multiple_choice", prompt: parsed.prompt, points: 2, answer, accepted_answers: [answer], choices: parsed.values.map((value, index) => ({ id: String(index + 1), text: value, feedback: { explanation: index === answerIndex ? reasons[base.number - 1] : distractorReasons[base.number][index < answerIndex ? index : index - 1] } })) }; }) }; }
const next = `${JSON.stringify(build(), null, 2)}\n`;
if (checkOnly) { if (!existsSync(outputPath)) throw new Error("Set 4 learner manifest is missing. Run: node tools/build-aipot-source-round-04.mjs"); if (readFileSync(outputPath, "utf8") !== next) throw new Error("Set 4 learner manifest is stale. Run: node tools/build-aipot-source-round-04.mjs"); console.log("Validated image-based source-round-04 learner manifest."); } else { writeFileSync(outputPath, next, "utf8"); console.log(`Wrote ${outputPath}`); }
