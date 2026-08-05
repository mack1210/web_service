#!/usr/bin/env node
/**
 * One source of truth for practical-question evaluation context.
 *
 * The learner sees `prompt`; `evaluation.context_markdown` is additionally
 * passed to the evaluator; `provider_solution` is kept out of the question
 * payload and is returned only after the learner locks an answer.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const contentRoot = "/home/cgma/cgma_git/study/aipot/실전모의고사";
const examRoot = path.join(contentRoot, "data", "web-exams");
const checkOnly = process.argv.includes("--check");

const rubric = (criteria) => criteria.map((criterion) => ({ criterion, points: 1, keywords: [] }));
const prompt = (title, body) => `### ${title}\n\n${body}\n\n답: ____________________`;

const publicContexts = {
  "public-set-a": {
    36: {
      topic: "범위 한정 프롬프팅",
      kind: "text",
      prompt: prompt("36. 범위 한정", `다음 최초 질문에 대한 결과를 **지정한 세 가지 팁만** 포함하도록 만드는 ㉠ 프롬프트를 작성하시오.\n\n최초 질문: \`요즘 냉방병이 너무 심한데, 간단하게 조심할 수 있는 팁을 알려줘.\`\n\n최종 결과에 남겨야 할 항목:\n\n1. 적절한 온도 조절\n2. 규칙적인 환기\n3. 적절한 복장\n\n다른 팁을 추가하지 말고, 간단한 문장으로 출력되도록 범위를 한정하시오.`),
      solution: "냉방병 예방 팁 중 ‘적절한 온도 조절’, ‘규칙적인 환기’, ‘적절한 복장’만 간단한 문장으로 제시하고 다른 팁은 포함하지 않도록 요청한다.",
      rubric: ["지정한 세 가지 팁으로 범위 한정", "다른 팁 제외", "간결한 문장 출력", "냉방병 예방 주제 유지", "프롬프트 문장 완성"],
    },
    37: {
      topic: "참고 이미지 기반 이미지 프롬프트",
      kind: "image",
      prompt: prompt("37. 참고 이미지를 분석한 영어 이미지 프롬프트", `첨부된 참고 이미지를 분석하여 눈에 보이는 특징을 **5개 이상** 포함한 한 문장의 영어 이미지 생성 프롬프트를 작성하시오.\n\n이미지 생성 탭에는 영어 프롬프트만 입력한다고 가정한다. 참고 이미지의 핵심 피사체, 구도, 실내 요소, 흑백 사진 스타일을 반영하시오.`),
      solution: "Analyze the attached reference image and create a one-sentence English image prompt containing at least five visible features, including the seated man, hat, open book, dog, framed wall art, armchair/interior, and monochrome photographic style.",
      rubric: ["참고 이미지의 핵심 피사체 반영", "보이는 특징 5개 이상", "영어 한 문장", "이미지 생성 목적 명확", "흑백 사진 스타일 반영"],
      image: true,
    },
    38: {
      topic: "수치 변환 프롬프트",
      kind: "text",
      prompt: prompt("38. 수치 변환", `다음 자료를 사용하여 수치를 천 단위로 환산하고 소수 둘째 자리까지 표시하는 ㉠ 프롬프트를 작성하시오.\n\n| 과일 | 값 |\n| --- | ---: |\n| 수박 | 12,486 |\n| 포도 | 9,342 |\n| 사과 | 15,289 |\n| 복숭아 | 11,917 |\n\n출력 순서는 복숭아, 사과, 수박, 포도이며 각 줄에 과일명과 환산값만 표시한다.`),
      solution: "주어진 수치를 1,000으로 나누어 소수 둘째 자리로 반올림하고, 복숭아 11.92, 사과 15.29, 수박 12.49, 포도 9.34 순서로 출력하도록 요청한다.",
      rubric: ["제공된 수치 사용", "천 단위 환산", "소수 둘째 자리 반올림", "지정된 출력 순서", "간결한 줄 단위 출력"],
    },
    39: {
      topic: "파일 기반 JSON 프롬프트",
      kind: "text",
      prompt: prompt("39. 파일 자료를 JSON으로 구조화", `첨부한 \`제품.txt\`에는 다음 정보가 있다.\n\n- 제품명: NeoFit\n- 가격: 159,000원\n- 색상: 블랙\n- 주요기능: 심박수 측정\n- 할인 정보: 없음\n\n파일을 근거로 JSON만 출력하도록 ㉠ 프롬프트를 작성하시오. 키는 \`제품명\`, \`가격\`, \`색상\`, \`주요기능\`, \`할인율(%)\`을 사용한다. 가격은 숫자만, 할인 정보가 없으면 \`null\`을 사용한다.`),
      solution: "첨부 파일만 근거로 지정한 다섯 키를 가진 JSON을 출력하게 한다. 가격은 159000의 숫자, 할인율(%)은 null이며 다른 설명은 출력하지 않는다.",
      rubric: ["첨부 파일만 근거로 사용", "필수 JSON 키 5개", "가격 숫자형 변환", "할인율 null 처리", "JSON 외 설명 제외"],
    },
    40: {
      topic: "이미지 분석 키워드 추출",
      kind: "text",
      prompt: prompt("40. 업로드 이미지의 이중 언어 키워드", `첨부 이미지를 분석하여 이미지의 핵심 대상 키워드를 영어로, 대표 색상을 한국어로 출력하게 하는 ㉠ 프롬프트를 작성하시오.\n\n출력은 다음 두 범주만 사용한다.\n\n- English objects: \`law, book, gavel\`\n- Korean colors: \`갈색, 백색, 금\`\n\n설명문이나 다른 범주는 추가하지 않는다.`),
      solution: "첨부 이미지를 분석해 English objects에는 law, book, gavel을, Korean colors에는 갈색, 백색, 금을 출력하고 다른 설명은 제외하도록 요청한다.",
      rubric: ["첨부 이미지 분석 지시", "영어 대상 키워드", "한국어 색상 키워드", "지정된 두 범주", "불필요한 설명 제외"],
    },
  },
  "public-set-b": {
    36: {
      topic: "이미지 변환 프롬프트",
      kind: "image",
      prompt: prompt("36. 참고 이미지의 장면 변환", `첨부된 전후 참고 이미지를 바탕으로 해변 일러스트를 목표 장면처럼 변환하는 프롬프트를 작성하시오.\n\n해변, 바다, 모래, 파라솔, 해변 인물, 야자수의 일러스트 분위기는 유지하고, 전경의 SUV/지프 차량은 제거한다. 목표 이미지의 구도와 요소를 반영하시오.`),
      solution: "참고 해변 일러스트에서 전경의 SUV/지프를 제거하고, 야자수·바다·모래·파라솔·해변 인물을 유지한 목표 구도의 일러스트로 변환하도록 요청한다.",
      rubric: ["전후 참고 이미지 반영", "SUV/지프 제거", "해변 핵심 요소 유지", "야자수와 목표 구도 반영", "일러스트 변환 목적 명확"],
      image: true,
    },
    37: {
      topic: "조건형 이미지 프롬프트",
      kind: "image",
      prompt: prompt("37. 지구의 날 포스터", `다음 조건을 모두 포함한 한국어 이미지 생성 프롬프트를 작성하시오.\n\n- 지구의 날 캠페인 포스터 일러스트\n- 지구본을 안고 있는 아이\n- 숲과 맑은 파란 하늘\n- \`Earth Day\` 텍스트\n- 1:1 비율`),
      solution: "지구의 날 캠페인 포스터 일러스트를 1:1 비율로 생성하고, 지구본을 안고 있는 아이, 숲, 맑은 파란 하늘, ‘Earth Day’ 텍스트를 모두 포함하도록 요청한다.",
      rubric: ["지구의 날 포스터 목적", "지구본을 안은 아이", "숲과 맑은 파란 하늘", "Earth Day 텍스트", "1:1 비율"],
      image: true,
    },
    38: {
      topic: "영어 이미지 프롬프트 변환",
      kind: "text",
      prompt: prompt("38. 영어 프롬프트 변환", `제공 페이지의 한국어 이미지 생성 문장을 의미 손실 없이 한 문장의 영어 이미지 프롬프트로 변환하시오.\n\n원문 문장이 현재 학습 자료에서 판독되지 않으므로, 페이지에 보이는 원문을 그대로 근거로 사용하고 추측으로 새 요소를 추가하지 않는 프롬프트를 작성하시오.`),
      solution: "제공된 한국어 원문을 빠짐없이 자연스러운 한 문장의 영어 이미지 프롬프트로 번역하도록 요청하며, 원문에 없는 요소는 추가하지 않는다.",
      rubric: ["제공 원문 근거 사용", "영어로 변환", "한 문장 이미지 프롬프트", "의미 손실 방지", "새 요소 추측 금지"],
    },
    39: {
      topic: "파일 기반 요약·수치 추출",
      kind: "text",
      prompt: prompt("39. 파일을 근거로 두 줄 요약", `첨부한 \`추출.txt\`의 내용만 사용하여 다음 두 줄을 만드는 ㉠과 ㉡ 프롬프트를 작성하시오.\n\n자료 핵심: 한국은 2025년 AI 산업을 국가 전략 산업으로 선정하고 10조 원을 투자한다. 교육으로 AI 전문 인력을 양성하고, 2030년까지 세계 AI 시장 점유율 10% 이상을 목표로 한다.\n\n1. 한국어로 2025년 AI 산업 전략과 10조 원 투자를 요약한다.\n2. 파일에서 수치 \`2025\`, \`10조 원\`, \`2030\`, \`10%\`를 추출한다.`),
      solution: "첫 프롬프트는 파일 근거로 2025년 AI 산업 전략과 10조 원 투자를 한국어로 요약하게 하고, 둘째 프롬프트는 2025, 10조 원, 2030, 10%를 파일에서 추출하게 한다.",
      rubric: ["첨부 파일만 근거로 사용", "2025년 전략 요약", "10조 원 투자 포함", "지정 수치 4개 추출", "두 줄 번호 형식"],
    },
    40: {
      topic: "여행 일정 Markdown 프롬프트",
      kind: "text",
      prompt: prompt("40. 가족 경주 여행 일정", `가족을 위한 경주 2박 3일 여행 일정을 Markdown으로 출력하게 하는 프롬프트를 작성하시오.\n\n- 1일차부터 3일차까지 구분\n- 매일 아침, 점심, 오후, 저녁을 모두 포함\n- 경주의 관광지를 활용\n- 가족 여행에 맞는 이동·식사·휴식 흐름\n- 제목과 목록을 이용한 Markdown 형식`),
      solution: "가족 대상 경주 2박 3일 일정을 Markdown으로 작성하고, 1~3일차 각각에 아침·점심·오후·저녁을 모두 두며 경주 관광지, 식사, 휴식, 이동을 포함하도록 요청한다.",
      rubric: ["경주 가족 2박 3일", "1~3일차 구분", "매일 네 시간대", "관광·식사·휴식 흐름", "Markdown 제목과 목록"],
    },
  },
};

const sourceSolutions = {
  "source-round-01": [
    "키와 몸무게를 입력받아 BMI를 계산하는 파이썬 코드를 작성해줘. 숫자가 아닌 값이 입력되면 오류 메시지를 출력해줘.",
    "양쪽 벽면에 사물함이 줄지어 설치된 밝고 깨끗한 학교 복도입니다. 광택이 나는 바닥은 복도를 따라 있는 큰 창문을 통해 들어오는 햇빛을 반사하고 있습니다. 눈높이는 현대적인 실내 디자인과 정돈된 공간, 그리고 환영하는 교육 환경을 조성하는 훌륭한 조명을 특징으로 합니다. 이 장면을 16:9 비율의 실제사진 스타일로 그려주세요.",
    "첨부한 파일 속 매출 데이터를 선 그래프로 시각화하여 그려줘. 세로축은 매출액, 가로축은 월별 시간 흐름을 표현해야 해. 글자색은 검은색으로 하고, 선은 파란색으로 해줘.",
    "공원 산책로, 나무가 늘어선 길, 푸른 잔디, 벤치, 평화로운 분위기, 자연 풍경, 화창한 날, 실제사진 스타일, 16:9 비율",
    "첨부한 이미지에 ‘영진닷컴’이라는 글자를 워터마크를 적용한 것, 화면 정중앙에서 대각선 방향으로 표현하고, 이미지의 50% 수준의 크기로 그릴 것",
  ],
  "source-round-02": [
    "첨부한 파일에 포함된 각 국가의 관광예절 내용을 Q&A 형식으로 변환해 주세요. 국가별로 가장 중요한 질문 2개씩을 선정하여 작성하되, 각 국가 이름을 명확히 표시해 구분이 쉽게 해주세요. 각 질문에 대한 답변은 핵심 내용만을 담은 1문장으로 간결하게 작성하고, 전체 문서는 마크다운 형식으로 가독성 높게 구조화해 주세요.",
    "모던 욕실 인테리어, 화이트 타일, 워크인 샤워 부스, 독립형 욕조, 큰 거울, 깔끔한 디자인, 스파 같은 분위기, 부드러운 수건, 미니멀 장식, 은은한 조명, 크롬 수전, 우아한 심플함, 밝은 공간, 편안한 안식처, 현대적 스타일, 럭셔리한 느낌, 고급스러운 욕실, 16:9비율, 실제 사진 스타일로 그려줘.",
    "섭씨를 화씨로 변환하는 파이썬 코드를 작성하세요. 코드는 python으로 시작해서 코드 블록 형식으로 작성하세요. 오류가 발생했을 때에는 오류 메시지가 출력될 수 있게 예외처리를 함께 생성할 것. 코드가 잘 작동하는지 확인할 수 있게 주석도 함께 달아 놓을 것.",
    "첨부한 자료를 트리맵(Treemap) 방식으로 시각화시켜서 그려줘. 트리맵 그래프 밑에 색깔별 범례도 함께 그려줘.",
    "밝은 교실, 책상 줄, 칠판, 햇빛 들어오는 창문, 학생 의자, 깨끗한 실내, 교육 공간, 따뜻한 분위기, 실제사진 스타일, 16:9 비율로 그려줘.",
  ],
  "source-round-03": [
    "밝은 낮의 아늑한 카페, 큰 창문 햇살, 나무 테이블의 김 나는 라떼와 노트북, 안경 쓴 20대 여성·회색 니트·긴 생머리, 책장·녹색 화분·액자 두 개, 부드러운 자연광, 사실적인 일러스트 스타일",
    "찌개의 종류 5가지를 순번형으로 나열하고 각각에 대한 설명을 1개 문장으로 부연설명",
    "숫자를 입력받아 홀짝 여부를 판단하는 파이썬 코드, 잘못된 값이면 ‘오류: 올바른 정수를 입력해주세요.’를 출력하는 예외처리, 생성 뒤 정상 작동 확인",
    "모던 거실, 미니멀리스트 디자인, 큰 통창·자연광·화이트 소파·우드 커피 테이블·실내 식물, 중성 색상·북유럽 스타일·16:9 등의 키워드",
    "대한대학교 축제 준비 계획서 초안, 상세 일정은 표로 정리, Markdown 강조, 명사구형 개조식 문체",
  ],
  "source-round-04": [
    "첨부 과일 소개 파일의 각 한국어 문장 뒤에 자연스러운 영어 번역을 괄호로 붙이고, 원문·번역은 붙여 쓰며 항목 사이에는 빈 줄을 둔다.",
    "모래, 한 송이 꽃, 자갈, 고양이 발자국, 모래의 하트, 낮, 16:9, 실제 사진 스타일을 포함한다.",
    "결측치를 분석하고 기존 패턴 또는 앞뒤 달 평균을 근거로 보정한 뒤 완성 표를 출력한다.",
    "첨부 로고를 왼쪽에 배치하고 지정 슬로건을 두 줄로 구성한 1:1 비율 이미지를 만든다.",
    "흰색 책상, 은색 로그인 노트북, 수식 노트, 검은 펜, 신문, 카시오 공학용 계산기, 자연광, 3:4 세로 구도를 포함한다.",
  ],
};

function applyPublic(id, exam) {
  for (const question of exam.questions.filter((item) => item.number >= 36 && item.number <= 40)) {
    const context = publicContexts[id][question.number];
    question.topic = context.topic;
    question.prompt = context.prompt;
    question.rubric = rubric(context.rubric);
    question.evaluation = {
      kind: context.kind,
      availability: "available",
      input_assets: [path.basename(question.asset)],
      context_markdown: context.prompt,
      provider_solution: context.solution,
      ...(context.image ? { options: { quality: "low" } } : {}),
    };
  }
}

function applySources(id, exam) {
  const solutions = sourceSolutions[id];
  if (!solutions) return;
  for (const question of exam.questions.filter((item) => item.number >= 36 && item.number <= 40)) {
    if (!question.evaluation || question.evaluation.availability === "unavailable") continue;
    question.evaluation.context_markdown = question.prompt;
    question.evaluation.provider_solution = solutions[question.number - 36];
  }
}

let changed = false;
for (const id of ["public-set-a", "public-set-b", "source-round-01", "source-round-02", "source-round-03", "source-round-04", "source-round-05"]) {
  const filename = path.join(examRoot, `${id}.json`);
  const original = fs.readFileSync(filename, "utf8");
  const exam = JSON.parse(original);
  if (id.startsWith("public-set-")) applyPublic(id, exam);
  else applySources(id, exam);
  const next = `${JSON.stringify(exam, null, 2)}\n`;
  if (next !== original) {
    changed = true;
    if (!checkOnly) fs.writeFileSync(filename, next);
  }
}

if (checkOnly && changed) {
  console.error("AI-POT practical context is out of date. Run: node tools/enrich-aipot-practical-context.mjs");
  process.exit(1);
}
console.log(checkOnly ? "AI-POT practical context is current." : "AI-POT practical context updated.");
