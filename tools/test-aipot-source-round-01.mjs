#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const contentRoot = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const imageRoot = resolve(contentRoot, "1회/images");
const assetRoot = resolve(contentRoot, "assets/source-round-01");
const manifest = JSON.parse(readFileSync(resolve(contentRoot, "data/web-exams/source-round-01.json"), "utf8"));
const corpus = JSON.parse(readFileSync(resolve(contentRoot, "corpus/source-round-01.json"), "utf8"));
const directAnswers = ["1", "4", "3", "1", "3", "2", "1", "3", "4", "1", "3", "1", "2", "3", "2", "1", "4", "3", "1", "2", "3", "1", "4", "4", "1", "3", "2", "3", "4", "4"];

function fail(message) {
  throw new Error(`Set 1 source validation failed: ${message}`);
}

if (manifest.id !== "source-round-01" || manifest.source_kind !== "private_photographed_book") fail("manifest identity or image-source type");
if (manifest.questions.length !== 40) fail(`expected 40 questions, received ${manifest.questions.length}`);
if (readdirSync(imageRoot).filter((name) => /\.jpe?g$/i.test(name)).length !== 25) fail("expected all 25 photographed source pages");

manifest.questions.forEach((question, index) => {
  const number = index + 1;
  if (question.number !== number) fail(`question order at index ${index}`);
  if (!question.prompt?.trim() || /원본 1회 문항|판독불가|\(\s*\)\s*$/.test(question.prompt)) fail(`Q${number} has an unresolved learner prompt`);
  if (number <= 30) {
    if (question.type !== "multiple_choice" || question.points !== 2 || question.choices?.length !== 4) fail(`Q${number} choice structure`);
    if (question.answer !== directAnswers[index]) fail(`Q${number} direct-solve answer mapping`);
    if (question.choices.some((choice) => !choice.feedback?.explanation?.trim())) fail(`Q${number} missing in-place choice explanation`);
    const explanations = question.choices.map((choice) => choice.feedback.explanation);
    if (new Set(explanations).size !== question.choices.length) fail(`Q${number} repeats choice explanations`);
    if (explanations.some((explanation) => /핵심 조건과 일치하지 않는다|따라서 ‘/u.test(explanation))) fail(`Q${number} retains generic choice feedback`);
  } else if (number <= 33) {
    if (question.type !== "short_answer" || question.points !== 3 || !question.accepted_answers?.length) fail(`Q${number} short-answer policy`);
  } else if (number <= 35) {
    if (question.type !== "choice_bank" || question.points !== 3 || question.choices?.length !== 25) fail(`Q${number} source choice-bank structure`);
  } else {
    if (question.type !== "practical_prompt" || question.points !== 5 || question.rubric?.length !== 5 || question.evaluation?.availability !== "available") fail(`Q${number} practical structure`);
    if (question.rubric.some((criterion) => criterion.points !== 1)) fail(`Q${number} practical one-point rubric`);
  }
});

for (const question of corpus.questions) {
  for (const visual of question.visuals ?? []) {
    if (!existsSync(resolve(assetRoot, visual.file))) fail(`missing visual asset ${visual.file}`);
  }
  if (question.primary_visual && !existsSync(resolve(assetRoot, question.primary_visual.file))) fail(`missing practical asset ${question.primary_visual.file}`);
}

for (const number of [37, 38, 39, 40]) {
  const question = manifest.questions[number - 1];
  if (!question.asset || !existsSync(resolve(assetRoot, question.asset.split("/").at(-1)))) fail(`Q${number} visible reference asset`);
}

if (manifest.questions[0].choices[0].text !== "적응") fail("Q01 photographed choice correction");
if (!manifest.questions[13].prompt.includes("백틱") && manifest.questions[13].answer !== "3") fail("Q14 photographed delimiter correction");
if (manifest.questions[22].choices[3].text !== "인포그래픽") fail("Q23 photographed answer correction");

const ganChoices = manifest.questions[5].choices;
if (!/어텐션/u.test(ganChoices[0].feedback.explanation) || !/가짜 데이터를 만드는 생성자/u.test(ganChoices[1].feedback.explanation) || !/순서가 있는 데이터/u.test(ganChoices[2].feedback.explanation) || !/잔차 연결/u.test(ganChoices[3].feedback.explanation)) fail("Q06 needs option-specific GAN explanations");

for (const number of [34, 35]) {
  const question = manifest.questions[number - 1];
  const explanations = question.choices.map((choice) => choice.feedback?.explanation ?? "");
  if (new Set(explanations).size !== question.choices.length) fail(`Q${number} repeats choice-bank explanations`);
  if (explanations.some((explanation) => !explanation.trim() || /화면의 설정과 일치하는/u.test(explanation))) fail(`Q${number} has generic choice-bank feedback`);
  if (!question.prompt.includes("[Google Flow 화면 자료]")) fail(`Q${number} must retain its visual-reference marker`);
  if (question.prompt.indexOf("[Google Flow 화면 자료]") < question.prompt.indexOf("보기 번호를 고르시오.")) fail(`Q${number} must show its question before the source visual`);
}
console.log("Validated all 40 image-based Set 1 questions, source images, answers, and required assets.");
