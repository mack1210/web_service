#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const contentRoot = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const manifest = JSON.parse(readFileSync(resolve(contentRoot, "data/web-exams/source-round-02.json"), "utf8"));
const corpus = JSON.parse(readFileSync(resolve(contentRoot, "corpus/source-round-02.json"), "utf8"));
const imageRoot = resolve(contentRoot, "2회/images");
const assetRoot = resolve(contentRoot, "assets/source-round-02");
const answers = ["3", "4", "1", "1|3", "2", "4", "2", "2", "1", "1", "3", "2", "4", "3", "1", "4", "4", "3", "2", "1", "2", "3", "1", "2", "3", "4", "1", "2", "3", "1", "1", "7", "12", "17", "23"];

function fail(message) {
  throw new Error(`Set 2 source validation failed: ${message}`);
}

if (manifest.id !== "source-round-02" || manifest.source_kind !== "private_photographed_book") fail("manifest identity or source type");
if (manifest.questions.length !== 40) fail(`expected 40 questions, received ${manifest.questions.length}`);
if (readdirSync(imageRoot).filter((name) => /\.jpe?g$/i.test(name)).length !== 24) fail("expected all 24 photographed source pages");
if (manifest.questions.reduce((sum, question) => sum + question.points, 0) !== 100) fail("total points must be 100");

manifest.questions.forEach((question, index) => {
  const number = index + 1;
  if (question.number !== number || !question.prompt?.trim()) fail(`Q${number} order or prompt`);
  if (/원본 2회 문항|판독불가|\(\s*\)\s*$/.test(question.prompt)) fail(`Q${number} unresolved learner prompt`);
  if (number <= 30) {
    const expectedType = number === 4 ? "multiple_select" : "multiple_choice";
    if (question.type !== expectedType || question.points !== 2 || question.choices?.length !== 4) fail(`Q${number} choice structure`);
    if (question.answer !== answers[index]) fail(`Q${number} answer mapping`);
  } else if (number <= 35) {
    if (question.type !== "choice_bank" || question.points !== 3 || question.choices?.length !== 25 || question.answer !== answers[index]) fail(`Q${number} choice-bank structure`);
  } else if (question.type !== "practical_prompt" || question.points !== 5 || question.rubric?.length !== 5 || question.evaluation?.availability !== "available") {
    fail(`Q${number} practical structure`);
  }
  if (question.choices) {
    const feedback = question.choices.map((choice) => choice.feedback?.explanation ?? "");
    if (feedback.some((item) => !item.trim())) fail(`Q${number} missing choice explanation`);
    if (new Set(feedback).size !== feedback.length) fail(`Q${number} repeats choice explanations`);
    if (feedback.some((item) => /핵심 조건과 일치하지 않는다|방법 또는 운영 주장|관련해 구분해야|화면의 설정과 일치하는|다른 피사체|다른 스텝 수|다른 시드 제어 방식|다른 이미지 크기 값|다른 배치 크기/u.test(item))) fail(`Q${number} generic choice explanation`);
  }
});

for (const question of corpus.questions) {
  for (const visual of question.visuals ?? []) if (!existsSync(resolve(assetRoot, visual.file))) fail(`missing visual asset ${visual.file}`);
  if (question.primary_visual && !existsSync(resolve(assetRoot, question.primary_visual.file))) fail(`missing practical asset ${question.primary_visual.file}`);
}
for (const number of [37, 39, 40]) {
  const question = manifest.questions[number - 1];
  if (!question.asset || !existsSync(resolve(assetRoot, question.asset.split("/").at(-1)))) fail(`Q${number} visible reference asset`);
}
if (manifest.questions[3].choices.map((choice) => choice.text).join("|") !== "PCA|K-means|t-SNE|DBSCAN") fail("Q04 must expose its four table algorithms as selectable answers");
if (!/서포트 벡터|마진/u.test(manifest.questions[5].choices[3].feedback.explanation)) fail("Q06 needs SVM-specific feedback");
if (!/인간의 창작적 기여/u.test(manifest.questions[29].choices[0].feedback.explanation)) fail("Q30 needs copyright-specific feedback");
console.log("Validated all 40 image-based Set 2 questions, answer mappings, assets, practical rubrics, and choice explanations.");
