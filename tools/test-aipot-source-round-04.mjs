#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.env.AIPOT_CONTENT_ROOT ? resolve(process.env.AIPOT_CONTENT_ROOT) : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const manifest = JSON.parse(readFileSync(resolve(root, "data/web-exams/source-round-04.json"), "utf8"));
const assetRoot = resolve(root, "assets/source-round-04");
const directAnswers = ["4", "3", "1", "3", "2", "2", "1", "3", "4", "4", "3", "1", "2", "1", "3", "4", "2", "1", "3", "4", "4", "2", "2", "1", "3", "3", "4", "1", "4", "2"];
const fail = (message) => { throw new Error(`Set 4 source validation failed: ${message}`); };
const hasEmptyMarkdownTable = (prompt) => {
  const lines = prompt.split("\n");
  for (let index = 0; index + 1 < lines.length; index += 1) {
    if (!/^\|(?:[^|\n]+\|)+\s*$/u.test(lines[index]) || !/^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/u.test(lines[index + 1])) continue;
    const next = lines.slice(index + 2).find((line) => Boolean(line.trim()));
    if (!next || !/^\|(?:[^|\n]*\|)+\s*$/u.test(next)) return true;
  }
  return false;
};

if (manifest.id !== "source-round-04" || manifest.source_kind !== "private_photographed_book") fail("manifest identity");
if (manifest.questions.length !== 40) fail("expected 40 questions");
if (readdirSync(resolve(root, "4회/images")).filter((name) => /\.jpe?g$/i.test(name)).length !== 26) fail("expected 26 source photographs");
for (const [index, question] of manifest.questions.entries()) {
  const number = index + 1;
  if (question.number !== number || !question.prompt?.trim() || /원본 4회 문항|판독불가|^\s*- Source:/m.test(question.prompt)) fail(`Q${number} learner text`);
  if (hasEmptyMarkdownTable(question.prompt)) fail(`Q${number} leaves an empty Markdown table in the learner prompt`);
  if (number <= 30) {
    if (question.type !== "multiple_choice" || question.points !== 2 || question.choices?.length !== 4 || question.answer !== directAnswers[index]) fail(`Q${number} choice structure or answer mapping`);
    const feedback = question.choices.map((choice) => choice.feedback?.explanation?.trim());
    if (feedback.some((item) => !item || item.length < 30 || /제시문의 .*판단 기준과 맞지 않는다/.test(item)) || new Set(feedback).size !== 4) fail(`Q${number} option feedback`);
  } else if (number <= 35) {
    if (question.type !== "short_answer" || question.points !== 3 || !question.accepted_answers?.length) fail(`Q${number} short-answer policy`);
  } else if (question.type !== "practical_prompt" || question.points !== 5 || question.rubric?.length !== 5 || question.rubric.some((item) => item.points !== 1) || question.evaluation?.availability !== "available" || question.evaluation.source_criteria?.length !== 5 || !question.evaluation.provider_solution || !question.evaluation.reference_source) {
    fail(`Q${number} practical evidence`);
  }
}
for (const number of [37, 39, 40]) {
  const question = manifest.questions[number - 1];
  const name = question.asset?.split("/").at(-1);
  if (!name || !existsSync(resolve(assetRoot, name)) || !question.evaluation.input_assets.includes(name)) fail(`Q${number} visual input`);
}
for (const number of [36, 38]) if (manifest.questions[number - 1].asset) fail(`Q${number} must remain text-only`);
if (/page-(?:22|23|24|25|26)\.jpg/.test(JSON.stringify(manifest))) fail("answer-page asset leak");
if (!manifest.questions[8].prompt.includes("TP = 800") || !manifest.questions[24].prompt.includes("1단계: 지식 생성") || !manifest.questions[30].prompt.includes('㉠="gpt-5"')) fail("structured learner text regression");

const question = (number) => manifest.questions[number - 1];
if (!question(3).choices[0].feedback.explanation.includes("지속적인 성능 개선") || !question(3).choices[0].feedback.explanation.includes("다양한 분야로의 적용 가능") || !question(3).choices[0].feedback.explanation.includes("효과적인 학습 가능")) fail("Q03 direct-solve rationale must match answer ①");
if (!["㉠", "㉡", "㉢", "㉣"].every((marker) => new RegExp(`${marker}\\s+__[^_]+__`, "u").test(question(8).prompt))) fail("Q08 must preserve every underlined statement from the source photo");
for (const number of [5, 9, 24]) {
  const promptLines = question(number).prompt.trimEnd().split("\n");
  if (!question(number).prompt.includes("선택지 순서:") || /^\|.*\|\n\|\s*:?-{3,}/.test(promptLines.slice(-2).join("\n"))) fail(`Q${String(number).padStart(2, "0")} must not leave an empty answer-choice table in the prompt`);
}
if (!question(10).choices[2].text.includes("Softmax 함수를 거친 뒤") || !question(10).choices[2].feedback.explanation.includes("정규화된 값") || !question(10).choices[3].feedback.explanation.includes("Value")) fail("Q10 must have one technically incorrect choice");
if (!question(18).choices[1].feedback.explanation.includes("여러 주제") || !question(18).choices[2].feedback.explanation.includes("감성 분석") || !question(18).choices[3].feedback.explanation.includes("문맥 임베딩")) fail("Q18 distractor feedback must describe its own option");
if (!question(28).choices[0].feedback.explanation.includes("다양성 존중") || !question(28).choices[0].feedback.explanation.includes("문제에 제시된 순서") || !question(28).choices[1].feedback.explanation.includes("②")) fail("Q28 rationale must match answer ① and its distractors");

if (question(31).answer !== "model" || question(32).answer !== "import" || question(33).answer !== "주제에서 만들기" || question(34).answer !== "기술의 합목적성 원칙" || question(35).answer !== "글레이즈(Glaze)") fail("Q31–Q35 canonical answers");
if (question(33).accepted_answers.includes("주제로 만들기") || !question(35).accepted_answers.includes("글레이즈") || !question(35).accepted_answers.includes("Glaze")) fail("Q33/Q35 finite answer aliases");

if (!question(38).evaluation.provider_solution.includes("실습_매출 및 주문표.xlsx") || !question(38).evaluation.provider_solution.includes("요청하신 첨부파일의 결측치 처리를 모두 마쳤습니다.")) fail("Q38 model prompt must satisfy attachment and completion-message criteria");
if (!question(39).evaluation.provider_solution.includes("흰 배경") || !question(39).evaluation.provider_solution.includes("두 줄")) fail("Q39 model prompt must satisfy white-background and two-line criteria");
if (!question(40).evaluation.provider_solution.includes("첨부 이미지") || !question(40).evaluation.provider_solution.includes("3:4 세로")) fail("Q40 model prompt must satisfy image-reference and composition criteria");
console.log("Validated all 40 image-based Set 4 questions, answers, rubrics, and learner-safe assets.");
