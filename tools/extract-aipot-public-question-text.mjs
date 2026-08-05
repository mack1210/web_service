#!/usr/bin/env node
/**
 * Lossless text extraction for the book's Public A/B question pages.
 *
 * A public-set crop is retained only where the PDF text cannot carry the
 * question's information (for example, a workflow diagram or before/after
 * image). Everything else is rendered from the source PDF as safe text.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import process from "node:process";

const checkOnly = process.argv.includes("--check");
const contentRoot = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const book = process.env.AIPOT_REFERENCE_PDF
  ? resolve(process.env.AIPOT_REFERENCE_PDF)
  : resolve(contentRoot, "..", "AI-POT AI프롬프트활용능력 1급 기본서_구매인증자료.pdf");
const examRoot = resolve(contentRoot, "data/web-exams");

// These have source information that is genuinely visual and cannot be
// recreated without loss from the PDF text alone.
const visualQuestions = {
  "public-set-a": new Set([17, 20, 30, 31, 32, 33, 34, 35, 37]),
  "public-set-b": new Set([14, 17, 31, 32, 33, 34, 35, 36]),
};

const practicalOverrides = {
  "public-set-a": {
    36: `### 36. 범위 한정 프롬프트

최종 응답결과와 같은 출력을 얻기 위해 범위 한정 기법을 활용한 ㉠의 프롬프트를 작성하시오.

| 구분 | 내용 |
| --- | --- |
| 최초 프롬프트 | 요즘 냉방병이 너무 심한데, 간단하게 조심할 수 있는 팁을 알려줘. |
| 최초 응답 | 1. 옷 겹치기<br>2. 적절한 냉방 온도 설정<br>3. 규칙적인 환기<br>4. 수분 섭취<br>5. 몸을 따뜻하게 유지 |
| 프롬프트 | ㉠ |
| 최종 응답 | 1. 적절한 온도 조절<br>2. 규칙적인 환기<br>3. 적절한 복장 |

답: ____________________`,
    38: `### 38. 데이터셋 변환 프롬프트

다음 응답결과를 도출하기 위해 주어진 데이터셋을 활용한 ㉠ 프롬프트를 작성하시오.

| 데이터셋 | 값 |
| --- | ---: |
| 수박 | 12.486 |
| 포도 | 9.342 |
| 사과 | 15.289 |
| 복숭아 | 11.917 |

| 구분 | 내용 |
| --- | --- |
| 프롬프트 | ㉠ |
| 응답결과 | 복숭아: 11.92<br>사과: 15.29<br>수박: 12.49<br>포도: 9.34 |

답: ____________________`,
    39: `### 39. 파일 기반 JSON 프롬프트

다음 응답결과를 생성하기 위한 프롬프트를 작성하시오. 채팅 탭에서 \`제품.txt\` 파일을 첨부한 뒤 한글 프롬프트를 작성한다.

| 제품.txt 항목 | 값 |
| --- | --- |
| 제품명 | NeoFit |
| 가격 | 159,000원 |
| 색상 | 블랙 |
| 주요기능 | 심박수 측정 |
| 할인율 | 정보 없음 |

생성 조건:

- JSON key는 \`제품명\`, \`가격\`, \`색상\`, \`주요기능\`, \`할인율(%)\`이다.
- 파일에 할인율 정보가 없으면 값은 반드시 \`null\`이다.
- 가격은 쉼표 없이 숫자형으로 출력한다.
- 제품명·색상·주요기능은 문자열로 처리하고, 모든 조건을 충족하는 JSON만 출력하도록 지시한다.

기대 출력 형식:

\`\`\`json
{
  "제품명": "NeoFit",
  "가격": 159000,
  "색상": "블랙",
  "주요기능": "심박수 측정",
  "할인율(%)": null
}
\`\`\`

답: ____________________`,
    40: `### 40. 이미지 분석 키워드 프롬프트

생성 AI로 제작한 이미지를 업로드하고 분석한 결과를 참고하여 ㉠에 들어갈 프롬프트를 작성하시오.

생성 이미지 설명: 나무 테이블 위에 큰 열린 책과 나무 망치가 있고, 책에는 많은 페이지와 펜이 놓여 있다. 배경에는 책이 많은 책장이 있으며, 부드러운 조명이 책과 망치를 비추고 책장은 흐리게 보인다.

다음 포맷으로 출력하도록 ㉠을 작성한다.

\`\`\`text
영어 : law, book, gavel
한글 : 갈색, 백색, 금
\`\`\`

답: ____________________`,
  },
  "public-set-b": {
    37: `### 37. 지구의 날 이미지 프롬프트

다음 이미지를 생성하기 위한 필수 조건을 포함한 한글 프롬프트를 작성하시오.

| 필수 조건 | 값 |
| --- | --- |
| 주제 | 지구의 날 캠페인 포스터 |
| 스타일 | 일러스트 |
| 피사체 | 아이가 지구를 껴안고 있음 |
| 배경 | 숲, 맑은 하늘 |
| 텍스트 | Earth Day |
| 이미지 비율 | 1:1 |

답: ____________________`,
    38: `### 38. 영어 이미지 프롬프트

37번에서 한글로 작성한 지구의 날 캠페인 포스터 프롬프트를 영어로 작성하시오. 생성형 AI 채팅창의 영어 번역 기능을 사용한 뒤 이미지 생성 탭에서 결과와 비교한다.

반드시 포함할 내용: 지구의 날 캠페인 포스터, 일러스트, 지구를 껴안은 아이, 숲, 맑은 하늘, \`Earth Day\`, 1:1 비율.

답: ____________________`,
    39: `### 39. 파일 요약·수치 추출 프롬프트

업로드한 \`추출.txt\` 파일을 분석하여 다음 응답결과를 얻기 위한 ㉠, ㉡ 프롬프트를 작성하시오.

\`추출.txt\` 내용:

- 한국은 2025년에 인공지능 산업을 국가 전략 산업으로 선정했습니다.
- 정부는 총 10조 원 규모의 투자를 계획하고 있습니다.
- 국내 주요 IT 기업들과 협력하여 연구개발을 강화할 예정입니다.
- 교육 분야에서 AI 전문 인력 양성 프로그램을 도입합니다.
- 2030년까지 세계 AI 시장 점유율을 10% 이상으로 확대하는 것이 목표입니다.

| 구분 | 기대 응답결과 |
| --- | --- |
| ㉠ | 한국, 2025년 인공지능 산업 전략화, 10조 원 투자 계획 |
| ㉡ | 파일에서 추출한 숫자 정보: 2025, 10조 원, 2030, 10% |

답: ____________________`,
    40: `### 40. 가족 경주 여행 일정 프롬프트

다음과 같은 ChatGPT 응답을 유도하기 위한 프롬프트를 작성하시오.

필수 조건: 오전, 점심, 오후, 저녁, 경주, 관광지, 가족, 2박 3일.

기대 출력 구조:

- 1일차, 2일차, 3일차를 Markdown 제목으로 구분한다.
- 각 날짜에 오전·점심·오후·저녁을 모두 포함한다.
- 경주 도착·호텔 체크인, 월정교, 경주 국립공원, 양동마을, 불국사, 첨성대 등 관광·식사·휴식 흐름을 포함한다.
- 가족 여행에 맞추고, 선호도와 일정에 따라 조정할 수 있음을 안내한다.

답: ____________________`,
  },
};

function pdfText(first, last) {
  return execFileSync("pdftotext", ["-f", String(first), "-l", String(last), "-layout", book, "-"], {
    encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
  }).replaceAll("\f", "\n");
}

function clean(block) {
  const lines = block.split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .filter((line) => !/AI-POT AI 프롬프트활용능력 1급\s+1급 공개문제 [AB]형\s+\d+\s*$/u.test(line))
    .filter((line) => !/^\s*또기적 합격자료집\s*$/u.test(line))
    .map((line) => line.replace(/^\s{3,}/u, "").replace(/ {2,}/gu, " "));
  return lines.join("\n")
    .replace(/\n\s*\[\d{2}~\d{2}\][\s\S]*$/u, "")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function sections(text) {
  const result = new Map();
  for (let number = 1; number <= 40; number += 1) {
    const label = String(number).padStart(2, "0");
    const next = String(number + 1).padStart(2, "0");
    const pattern = number < 40
      ? new RegExp(`^\\s{3}${label} (?!번~)([\\s\\S]*?)(?=^\\s{3}${next} (?!번~))`, "m")
      : new RegExp(`^\\s{3}${label} (?!번~)([\\s\\S]*)$`, "m");
    const match = text.match(pattern);
    if (!match) throw new Error(`Could not extract public question ${number}`);
    result.set(number, clean(match[1]));
  }
  return result;
}

let stale = false;
for (const [id, first, last] of [["public-set-a", 23, 38], ["public-set-b", 39, 54]]) {
  const filename = resolve(examRoot, `${id}.json`);
  const original = readFileSync(filename, "utf8");
  const exam = JSON.parse(original);
  const textByQuestion = sections(pdfText(first, last));
  for (const question of exam.questions) {
    const extracted = textByQuestion.get(question.number);
    if (!extracted) continue;
    question.prompt = practicalOverrides[id]?.[question.number]
      ?? (question.type === "multiple_choice" || question.type === "multiple_select"
        ? extracted.replace(/\n[①][\s\S]*$/u, "").trim()
        : extracted);
    if (!visualQuestions[id].has(question.number)) {
      delete question.asset;
      delete question.asset_alt;
      if (question.evaluation && Array.isArray(question.evaluation.input_assets)) {
        question.evaluation.input_assets = [];
      }
    }
  }
  const next = `${JSON.stringify(exam, null, 2)}\n`;
  if (next !== original) {
    stale = true;
    if (!checkOnly) writeFileSync(filename, next, "utf8");
  }
}

if (checkOnly && stale) {
  console.error("Public question text is out of date. Run: node tools/extract-aipot-public-question-text.mjs");
  process.exit(1);
}
console.log(checkOnly ? "Public A/B text extraction is current." : "Public A/B text extraction updated.");
