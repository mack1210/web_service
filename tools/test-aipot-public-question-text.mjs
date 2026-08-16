import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const load = (id) => JSON.parse(readFileSync(resolve(root, "data/web-exams", `${id}.json`), "utf8"));
const find = (exam, number) => exam.questions.find((question) => question.number === number);

const a = load("public-set-a");
const a13 = find(a, 13);
const a23 = find(a, 23);
const a30 = find(a, 30);
const a01 = find(a, 1);
const a02 = find(a, 2);
const a08 = find(a, 8);
const a14 = find(a, 14);
const a18 = find(a, 18);
const a26 = find(a, 26);
const a27 = find(a, 27);
const a28 = find(a, 28);
const a29 = find(a, 29);
const a38 = find(a, 38);
const a37 = find(a, 37);
const a40 = find(a, 40);
assert.equal(a13.asset, undefined, "A Q13 is fully textual and must not retain a crop");
assert.match(a13.prompt, /어텐션.*트랜스포머/u);
assert.doesNotMatch(a13.prompt, /①/u, "rendered choices belong only in answer controls");
assert.ok(a01.asset, "A Q01 retains its required concept diagram containing ㉠");
assert.match(a02.prompt, /\| 비교 항목 \| 에이전트형 AI \| 기존 AI/u, "A Q02 comparison must be a readable table");
assert.match(a08.prompt, /사전 학습[\s\S]*미세 조정/u, "A Q08 must name both classification columns");
assert.equal(a08.choices[0].text, "사전 학습: ㉠, ㉤ | 미세 조정: ㉡, ㉢, ㉣");
assert.equal(a14.choices[0].text, "㉠ 큰따옴표 (“”) · ㉡ 중괄호 ({}) · ㉢ 삼중 백틱 (```)");
assert.match(a18.prompt, /\| 원격근무 비율\(`remote_ratio`\) \| 0: 5,075건/u, "A Q18 must retain its dataset rows as a readable table");
assert.match(a26.prompt, /\| 기능의 역할 \| 설명 \|/u, "A Q26 must retain its two distinct archive capabilities");
assert.match(a27.prompt, /\| 열 이름 \| 데이터 타입 \| 설명 \|/u, "A Q27 dataset structure must be a readable table");
assert.match(a27.prompt, /응시연령의 분포.*파이 차트/u, "A Q27 must retain the requested visualization relationship");
assert.match(a28.prompt, /\| 구분 \| 내용 \|/u, "A Q28 must distinguish prompt from response");
assert.match(a29.prompt, /\| ㉠ \| 수집된 원시/u, "A Q29 must retain the blank and its definition together");
assert.doesNotMatch(a23.prompt, /24번~30번/u, "A Q23 must not absorb the next section heading");
assert.doesNotMatch(a30.prompt, /31번~35번/u, "A Q30 must not absorb the next section heading");
assert.equal(a38.asset, undefined, "A Q38 is fully textual and must not retain a crop");
assert.match(a38.prompt, /\| 데이터셋 \| 수박: 12\.486<br>포도: 9\.342<br>사과: 15\.289<br>복숭아: 11\.917 \|/u);
assert.match(a38.prompt, /\| 프롬프트 \| ㉠ \|/u);
assert.match(a38.prompt, /복숭아: 11\.92/u);
assert.ok(a37.asset, "A Q37 retains its genuinely visual reference image");
assert.ok(a40.asset, "A Q40 retains its uploaded-image evidence");

const b = load("public-set-b");
const b36 = find(b, 36);
const b37 = find(b, 37);
const b38 = find(b, 38);
const b39 = find(b, 39);
const b23 = find(b, 23);
const b05 = find(b, 5);
const b11 = find(b, 11);
const b12 = find(b, 12);
const b29 = find(b, 29);
const b13 = find(b, 13);
const b15 = find(b, 15);
const b16 = find(b, 16);
const b17 = find(b, 17);
const b18 = find(b, 18);
const b19 = find(b, 19);
const b20 = find(b, 20);
const b31 = find(b, 31);
const b32 = find(b, 32);
const b33 = find(b, 33);
const b34 = find(b, 34);
const b35 = find(b, 35);
assert.ok(b36.asset, "B Q36 retains before/after image evidence");
assert.ok(b37.asset, "B Q37 retains the Earth Day poster reference image");
assert.doesNotMatch(b36.prompt, /\[37~38\]/u);
assert.equal(b39.asset, undefined, "B Q39 is fully textual and must not retain a crop");
assert.match(b38.prompt, /지구의 날 캠페인 포스터[\s\S]*일러스트/u, "B Q38 must provide the Korean source prompt to translate");
assert.match(b38.prompt, /Earth Day/u, "B Q38 must retain the required campaign text");
assert.doesNotMatch(b38.prompt, /판독되지 않으므로/u, "B Q38 must not claim its source text is unavailable");
assert.match(b39.prompt, /2025년/u);
assert.match(b39.prompt, /10조 원/u);
assert.doesNotMatch(b23.prompt, /24번~30번/u, "B Q23 must not absorb the next section heading");
assert.match(b05.prompt, /\| 코어 포인트 탐색 \|/u, "B Q05 DBSCAN steps must be a readable table");
assert.match(b11.prompt, /\| 추가 요청 \| 이와 관련해서 교육 시스템/u, "B Q11 must distinguish the additional request from its response");
assert.match(b12.prompt, /\| 프롬프트 \| 통신사 데이터 사용 요금 분석/u, "B Q12 must keep prompt and response in their own rows");
assert.match(b29.prompt, /\| 프롬프트의 지시 \| 문제를 단계별로 분석/u, "B Q29 must retain its reasoning instruction as a readable table");
assert.match(b13.prompt, /\| 역할 부여 프롬프트 \| 출산율 문제/u, "B Q13 must separate each prompt stage into a readable table row");
assert.match(b13.prompt, /단계 1: ㉠<br>단계 2:/u, "B Q13 must preserve the blank and its two-stage request");
assert.match(b15.prompt, /\| A \| \(  \) = 1 \|/u, "B Q15 must present each parameter value in a readable table");
assert.match(b16.prompt, /### 요약할 텍스트 본문[\s\S]*### 프롬프트에 포함된 본문[\s\S]*### 응답 결과/u, "B Q16 must separate source text, prompt, and response");
assert.match(b17.prompt, /\| 데이터셋 \| 자료명: Top song of the world<br>자료 수: 4,851개/u, "B Q17 must present all dataset metadata in its original two-row table structure");
assert.equal(b17.asset, undefined, "B Q17 data table replaces the duplicated source image");
assert.match(b18.prompt, /```text\n㉠\n```[\s\S]*### 응답 결과/u, "B Q18 must separate its required output format from the response");
assert.match(b18.prompt, /### ㉠에 들어갈 출력 형식[\s\S]*### 응답 결과/u, "B Q18 must label the required format separately from the response");
assert.equal(b18.asset, "../assets/public-sets/crops/b/q18.png", "B Q18 must retain the uploaded palace image required to interpret the response");
assert.equal(b18.choices[1].text, "한글 : {풍경1}, {풍경2}, {풍경3}, {풍경4}\n영어 : {풍경1}, {풍경2}, {풍경3}, {풍경4}", "B Q18 answer choices must preserve their Korean and English lines");
assert.match(b19.prompt, /\| 회의 내용 요약 \| 자연어 처리\(NLP\)/u, "B Q19 must structure the meeting-summary process as a readable table");
assert.match(b19.prompt, /\| 요약 스타일 맞춤화 \| 초록, 액션 아이템/u, "B Q19 must retain the output-style requirement");
assert.match(b20.prompt, /### 입력 파일[\s\S]*### 생성된 슬라이드 개요[\s\S]*### 활용 예시/u, "B Q20 must separate input, output, and use cases");
assert.match(b23.prompt, /\| 잘못된 프롬프트 \| 디즈니/u, "B Q23 must separate the original and revised prompts into table rows");
for (const question of [b31, b32, b33, b34, b35]) {
  assert.match(question.prompt, /\[31~35\].*ComfyUI.*파이프라인/u, `B Q${question.number} must retain the shared ComfyUI question context`);
  assert.match(question.prompt, /선택지 번호로 답한다/u, `B Q${question.number} must explain how to answer the choice-bank question`);
}
assert.doesNotMatch(b31.prompt, /512×512/u, "B Q31 must not disclose its answer in the text prompt");
assert.doesNotMatch(b32.prompt, /20/u, "B Q32 must not disclose its answer in the text prompt");
assert.doesNotMatch(b33.prompt, /WaterMark/u, "B Q33 must not disclose its answer in the text prompt");
assert.doesNotMatch(b34.prompt, /ComfyUI라는 문자열/u, "B Q34 must not disclose its answer in the text prompt");
assert.doesNotMatch(b35.prompt, /Seed/u, "B Q35 must not disclose its answer in the text prompt");

for (const exam of [a, b]) {
  for (const question of exam.questions) {
    assert.equal(typeof question.prompt, "string", `${exam.id} Q${question.number}: prompt must be text`);
    assert.ok(question.prompt.trim(), `${exam.id} Q${question.number}: prompt must not be empty`);
    assert.doesNotMatch(question.prompt, /[\u0007\u200b\u200c\ufeff]/u, `${exam.id} Q${question.number}: invisible PDF control characters are forbidden`);
    assert.doesNotMatch(question.prompt, /\(\s*\)\s*$/u, `${exam.id} Q${question.number}: trailing empty answer brackets belong to the UI, not the prompt`);
    assert.doesNotMatch(question.prompt, /답\s*:\s*_{3,}\s*$/u, `${exam.id} Q${question.number}: trailing answer placeholders belong to the UI, not the prompt`);
    assert.doesNotMatch(question.prompt, /(?:24번~30번|31번~35번|36번~40번)/u, `${exam.id} Q${question.number}: section heading must not leak into the prompt`);
  }
}

assert.doesNotMatch(find(a, 4).prompt, /알고\s+리즘|업\s+데이트/u, "A Q04 must not retain PDF-split technical terms");
assert.doesNotMatch(find(a, 37).prompt, /\[이미지\s*\n|동\s*\n작/u, "A Q37 must not split the image-generation tab or operation text");

console.log("Public A/B text-extraction assertions passed.");
