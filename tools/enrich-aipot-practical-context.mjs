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
      solution: "냉방병 예방 팁 3가지를 알려줘.",
      rubric: ["지정한 세 가지 팁으로 범위 한정", "다른 팁 제외", "간결한 문장 출력", "냉방병 예방 주제 유지", "프롬프트 문장 완성"],
    },
    37: {
      topic: "참고 이미지 기반 이미지 프롬프트",
      kind: "image",
      prompt: prompt("37. 참고 이미지를 분석한 영어 이미지 프롬프트", `첨부된 참고 이미지를 분석하여 눈에 보이는 특징을 **5개 이상** 포함한 한 문장의 영어 이미지 생성 프롬프트를 작성하시오.\n\n이미지 생성 탭에는 영어 프롬프트만 입력한다고 가정한다. 참고 이미지의 핵심 피사체, 구도, 실내 요소, 흑백 사진 스타일을 반영하시오.`),
      solution: "Create a black and white, 1:1 square ratio image of a man wearing a hat sitting in a chair reading a book with a dog sitting next to him, and a picture labeled 'H' hanging on the wall behind them.",
      rubric: ["참고 이미지의 핵심 피사체 반영", "보이는 특징 5개 이상", "영어 한 문장", "이미지 생성 목적 명확", "흑백 사진 스타일 반영"],
      image: true,
    },
    38: {
      topic: "수치 변환 프롬프트",
      kind: "text",
      prompt: prompt("38. 수치 변환", `다음 자료를 사용하여 수치를 천 단위로 환산하고 소수 둘째 자리까지 표시하는 ㉠ 프롬프트를 작성하시오.\n\n| 과일 | 값 |\n| --- | ---: |\n| 수박 | 12,486 |\n| 포도 | 9,342 |\n| 사과 | 15,289 |\n| 복숭아 | 11,917 |\n\n출력 순서는 복숭아, 사과, 수박, 포도이며 각 줄에 과일명과 환산값만 표시한다.`),
      solution: "데이터셋의 각 과일의 값을 소수점 둘째 자리에서 반올림한 뒤, 과일명을 가나다순으로 정렬해서 ‘과일: 수치’ 형식으로 한 줄씩 출력해 줘.",
      rubric: ["제공된 수치 사용", "천 단위 환산", "소수 둘째 자리 반올림", "지정된 출력 순서", "간결한 줄 단위 출력"],
    },
    39: {
      topic: "파일 기반 JSON 프롬프트",
      kind: "text",
      prompt: prompt("39. 파일 자료를 JSON으로 구조화", `첨부한 \`제품.txt\`에는 다음 정보가 있다.\n\n- 제품명: NeoFit\n- 가격: 159,000원\n- 색상: 블랙\n- 주요기능: 심박수 측정\n- 할인 정보: 없음\n\n파일을 근거로 JSON만 출력하도록 ㉠ 프롬프트를 작성하시오. 키는 \`제품명\`, \`가격\`, \`색상\`, \`주요기능\`, \`할인율(%)\`을 사용한다. 가격은 숫자만, 할인 정보가 없으면 \`null\`을 사용한다.`),
      solution: "[39번_텍스트.txt] 첨부된 파일의 내용을 JSON 형식으로 출력하시오.\n- JSON의 key는 “제품명”, “가격”, “색상”, “주요기능”, “할인율(%)”로 구성할 것\n- 없는 항목의 값은 null로 표시할 것\n- 가격은 쉼표를 제거하고 숫자형으로만 표시할 것\n- JSON은 반드시 들여쓰기 된 형태로만 출력할 것",
      rubric: ["첨부 파일만 근거로 사용", "필수 JSON 키 5개", "가격 숫자형 변환", "할인율 null 처리", "JSON 외 설명 제외"],
    },
    40: {
      topic: "이미지 분석 키워드 추출",
      kind: "text",
      prompt: prompt("40. 업로드 이미지의 이중 언어 키워드", `첨부 이미지를 분석하여 이미지의 핵심 대상 키워드를 영어로, 대표 색상을 한국어로 출력하게 하는 ㉠ 프롬프트를 작성하시오.\n\n출력은 다음 두 범주만 사용한다.\n\n- English objects: \`law, book, gavel\`\n- Korean colors: \`갈색, 백색, 금\`\n\n설명문이나 다른 범주는 추가하지 않는다.`),
      solution: "영어 : {키워드1}, {키워드2}, {키워드3}\n한글 : {색상1}, {색상2}, {색상3}",
      rubric: ["첨부 이미지 분석 지시", "영어 대상 키워드", "한국어 색상 키워드", "지정된 두 범주", "불필요한 설명 제외"],
    },
  },
  "public-set-b": {
    36: {
      topic: "이미지 변환 프롬프트",
      kind: "image",
      visualEvidence: true,
      prompt: prompt("36. 참고 이미지의 장면 변환", `첨부된 전후 참고 이미지를 바탕으로 해변 일러스트를 목표 장면처럼 변환하는 프롬프트를 작성하시오.\n\n해변, 바다, 모래, 파라솔, 해변 인물, 야자수의 일러스트 분위기는 유지하고, 전경의 SUV/지프 차량은 제거한다. 목표 이미지의 구도와 요소를 반영하시오.`),
      solution: "Create an illustration of a sunny beach scene. The beach is filled with people enjoying the sun, some sitting on red lounge chairs under colorful umbrellas. Palm trees are scattered around, and the ocean is calm with gentle waves. The sky is blue with a few fluffy clouds. The overall mood is cheerful and relaxed.",
      rubric: ["전후 참고 이미지 반영", "SUV/지프 제거", "해변 핵심 요소 유지", "야자수와 목표 구도 반영", "일러스트 변환 목적 명확"],
      image: true,
    },
    37: {
      topic: "조건형 이미지 프롬프트",
      kind: "image",
      prompt: prompt("37. 지구의 날 포스터", `다음 조건을 모두 포함한 한국어 이미지 생성 프롬프트를 작성하시오.\n\n- 지구의 날 캠페인 포스터 일러스트\n- 지구본을 안고 있는 아이\n- 숲과 맑은 파란 하늘\n- \`Earth Day\` 텍스트\n- 1:1 비율`),
      solution: "지구의 날 캠페인 포스터를 위한 일러스트를 만들어 주세요. 아이가 지구를 껴안고 있고, 숲과 맑은 하늘 함께 어우러져 있는 모습을 보여주세요. 이미지의 사이즈는 1:1로 만들고 “Earth Day”라는 캠페인 문구도 넣어주세요.",
      rubric: ["지구의 날 포스터 목적", "지구본을 안은 아이", "숲과 맑은 파란 하늘", "Earth Day 텍스트", "1:1 비율"],
      image: true,
    },
    38: {
      topic: "영어 이미지 프롬프트 변환",
      kind: "text",
      prompt: prompt("38. 영어 프롬프트 변환", `제공 페이지의 한국어 이미지 생성 문장을 의미 손실 없이 한 문장의 영어 이미지 프롬프트로 변환하시오.\n\n원문 문장이 현재 학습 자료에서 판독되지 않으므로, 페이지에 보이는 원문을 그대로 근거로 사용하고 추측으로 새 요소를 추가하지 않는 프롬프트를 작성하시오.`),
      solution: "Please create an illustration for the Earth Day campaign poster. Show a child hugging the earth, with the forest and clear sky blending together. Make the image size 1:1 and include the campaign text “Earth Day”",
      rubric: ["제공 원문 근거 사용", "영어로 변환", "한 문장 이미지 프롬프트", "의미 손실 방지", "새 요소 추측 금지"],
    },
    39: {
      topic: "파일 기반 요약·수치 추출",
      kind: "text",
      prompt: prompt("39. 파일을 근거로 두 줄 요약", `첨부한 \`추출.txt\`의 내용만 사용하여 다음 두 줄을 만드는 ㉠과 ㉡ 프롬프트를 작성하시오.\n\n자료 핵심: 한국은 2025년 AI 산업을 국가 전략 산업으로 선정하고 10조 원을 투자한다. 교육으로 AI 전문 인력을 양성하고, 2030년까지 세계 AI 시장 점유율 10% 이상을 목표로 한다.\n\n1. 한국어로 2025년 AI 산업 전략과 10조 원 투자를 요약한다.\n2. 파일에서 수치 \`2025\`, \`10조 원\`, \`2030\`, \`10%\`를 추출한다.`),
      solution: "첨부한 파일을 기반으로 아래 작업을 수행해 줘\n㉠. 파일의 핵심 내용을 짧게 요약해 줘\n㉡. 파일에 등장하는 숫자정보를 모두 추출해 줘",
      rubric: ["첨부 파일만 근거로 사용", "2025년 전략 요약", "10조 원 투자 포함", "지정 수치 4개 추출", "두 줄 번호 형식"],
    },
    40: {
      topic: "여행 일정 Markdown 프롬프트",
      kind: "text",
      prompt: prompt("40. 가족 경주 여행 일정", `가족을 위한 경주 2박 3일 여행 일정을 Markdown으로 출력하게 하는 프롬프트를 작성하시오.\n\n- 1일차부터 3일차까지 구분\n- 매일 아침, 점심, 오후, 저녁을 모두 포함\n- 경주의 관광지를 활용\n- 가족 여행에 맞는 이동·식사·휴식 흐름\n- 제목과 목록을 이용한 Markdown 형식`),
      solution: "가족들과 경주 여행을 가려고 한다. 아래 필수조건을 고려해서 일정을 만들어줘\n필수조건 : 오전, 점심, 오후, 저녁, 경주, 관광지, 가족, 2박 3일",
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
    "첨부파일 내 텍스트의 각 줄을 유지하되, 각 문장 바로 뒤에 영어 번역을 괄호 안에 추가해주세요. 형식은 ‘원문(English translation)’ 형태로 작성하고, 번역은 자연스럽고 문맥에 맞게 의역해주세요. 각 과일의 특성과 말투의 뉘앙스를 영어로도 잘 전달되도록 번역해주세요. 원문과 번역문 사이는 줄바꿈 없이 바로 이어서 작성하고 각 항목 사이에는 빈 줄을 하나 넣어주세요.",
    "모래 위에 피어있는 한 송이의 꽃, 자갈 몇 개, 고양이 발자국, 낮, 모래 위에 그려진 하트모양 그림, 16:9비율, 실제 사진 스타일",
    "이 엑셀 표에서 결측치를 분석한 뒤, 결측치 처리를 진행해줘. 기존 데이터의 패턴을 분석하여, 역산한 뒤 결측치를 처리해야 해. 빈칸이 여러 개면 앞뒤 달의 숫자를 평균을 내서 추정해줘. 결측치 처리를 마친 뒤, 완성된 표를 출력해줘.",
    "첨부한 로고를 맨 왼쪽에 배치하고, 뒤이어서 ‘영진닷컴과 함께하는 AI-POT 시험 공부’라는 문장이 두 줄로 작성된 슬로건 이미지를 1:1 비율로 제작해줘.",
    "깨끗한 흰색 책상 위에 대학 시험 준비 장면을 위에서 내려다본 구도로 촬영한 3:4 세로 비율의 사진을 그려줘. 중앙에는 은색 노트북이 열려있고 화면에는 파란색 배경의 로그인 페이지가 표시되어 있다. 노트북 왼쪽 옆에는 수학 공식과 방정식이 손으로 적힌 스프링 노트와 검은색 펜이 놓여있고, 오른편에는 대학생 신문종이와 카시오 공학용 계산기가 배치되어 있다. 자연광이 들어오는 창문 아래의 미니멀하고 정돈된 학습 환경, 사실적인 스타일로 해줘.",
  ],
  "source-round-05": [
    "잔디밭, 달리는 남자 축구선수, 달리는 여자 축구선수, 굴러가는 축구공, 낮, 초록색 유니폼, 보라색 유니폼, 실제사진 스타일, 1:1 비율",
    "파이썬 코드를 이용해서 입력된 숫자가 짝수인지 홀수인지 판별해주는 간단한 코드를 제작해줘. 각 코드에는 주석을 달아서 어떤 역할을 하는지도 표시해줘. 한 짝수가 입력된 것이 확인되면 ‘짝수 입니다!’라고 출력되어야 해. 홀수가 입력된 것이 확인되면 ‘홀수 입니다!’라고 출력되어야 해. 판별할 수 없는 것이 입력되면 ‘다시 입력해주세요!’라고 출력되어야 해. 제작 완료 후 정상 작동되는지 테스트도 진행해줘.",
    "낮잠을 자는 아기, 실내, 인형, 화분, 소파, 창문, 하얀색 벽, 주황색 햇빛, 나무 바닥, 이불, 동화책, 따뜻한 분위기, 하얀색 커튼, 실제 사진 스타일, 16:9 비율",
    "대한민국 17개 광역자치단체를 아래 예시처럼 순번 형식으로 소개해줘.\n1. 서울특별시 : 대한민국의 수도이자 최대 도시로, 약 천만 명의 인구가 거주합니다. 정치, 경제, 문화의 중심지이며 한강을 중심으로 25개 자치구로 구성되어 있습니다.\n나머지 16개(부산, 대구, 인천, 광주, 대전, 울산, 세종, 경기, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주도)도 동일한 형식과 분량으로 작성해줘.",
    "첨부한 웹사이트 URL을 분석해줘. 해당 사이트가 어떤 기관 또는 조직의 웹사이트인지, 주요 목적과 기능은 무엇인지, 어떤 서비스를 제공하는지 등을 상세히 분석해줘. 분석 결과는 명사구형 개조식으로 구조화하여 제시해주세요.",
  ],
};

const referenceSources = {
  "public-set-a": "AI-POT AI프롬프트활용능력 1급 기본서 구매인증자료 p.58–59",
  "public-set-b": "AI-POT AI프롬프트활용능력 1급 기본서 구매인증자료 p.59",
  "source-round-01": "AI-POT 실전 모의고사 01회 답안 예시 사진",
  "source-round-02": "AI-POT 실전 모의고사 02회 답안 예시 사진",
  "source-round-03": "AI-POT 실전 모의고사 03회 답안 예시 사진",
  "source-round-04": "AI-POT 실전 모의고사 04회 답안 예시 사진 p.26",
  "source-round-05": "AI-POT 실전 모의고사 05회 답안 예시 사진 p.28",
};

function applyPublic(id, exam) {
  for (const question of exam.questions.filter((item) => item.number >= 36 && item.number <= 40)) {
    const context = publicContexts[id][question.number];
    question.topic = context.topic;
    question.rubric = rubric(context.rubric);
    question.evaluation = {
      kind: context.kind,
      availability: "available",
      input_assets: context.visualEvidence && question.asset ? [path.basename(question.asset)] : [],
      context_markdown: context.prompt,
      provider_solution: context.solution,
      reference_source: referenceSources[id],
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
    question.evaluation.reference_source = referenceSources[id];
  }
}

function removePracticalImageDescriptions(exam) {
  for (const question of exam.questions.filter((item) => item.type === "practical_prompt" && item.asset)) {
    const strip = (value) => String(value)
      .replace(/^\| (?:원본 이미지|결과물) \| \[(?:이미지|원본과 같은)[^\n]*\] \|\n?/gm, "")
      .replace(/^\*\*결과물 이미지:\*\*[^\n]*\n?/gm, "")
      .replace(/^\[이미지:[^\n]*\]\n?/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    question.prompt = strip(question.prompt);
    if (question.evaluation?.context_markdown) question.evaluation.context_markdown = strip(question.evaluation.context_markdown);
  }
}

let changed = false;
const validationErrors = [];
for (const id of ["public-set-a", "public-set-b", "source-round-01", "source-round-02", "source-round-03", "source-round-04", "source-round-05"]) {
  const filename = path.join(examRoot, `${id}.json`);
  const original = fs.readFileSync(filename, "utf8");
  const exam = JSON.parse(original);
  if (id.startsWith("public-set-")) applyPublic(id, exam);
  else applySources(id, exam);
  removePracticalImageDescriptions(exam);
  for (const question of exam.questions.filter((item) => item.type === "practical_prompt")) {
    const evaluation = question.evaluation;
    if (evaluation?.availability === "available" && (!evaluation.provider_solution || !evaluation.reference_source)) {
      validationErrors.push(`${id} Q${question.number}: missing source answer or answer source`);
    }
    if (question.asset && /\[이미지:|\*\*결과물 이미지:\*\*/.test(question.prompt)) {
      validationErrors.push(`${id} Q${question.number}: duplicate visual description remains in learner prompt`);
    }
  }
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
if (validationErrors.length) {
  console.error(validationErrors.join("\n"));
  process.exit(1);
}
console.log(checkOnly ? "AI-POT practical context is current." : "AI-POT practical context updated.");
