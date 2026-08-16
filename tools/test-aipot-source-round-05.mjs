#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const contentRoot = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const manifest = JSON.parse(readFileSync(resolve(contentRoot, "data/web-exams/source-round-05.json"), "utf8"));
const corpus = JSON.parse(readFileSync(resolve(contentRoot, "corpus/source-round-05.json"), "utf8"));
const imageRoot = resolve(contentRoot, "5회/images");
const assetRoot = resolve(contentRoot, "assets/source-round-05");
const answers = ["1", "3", "1", "3", "2", "4", "3", "4", "4", "2", "1", "2", "1", "1", "4", "3", "2", "3", "1", "3", "1", "4", "4", "1", "4", "2", "3", "1", "2", "4"];
const shortAnswerPolicies = {
  31: { answer: "Leave-One-Out 교차검증", aliases: ["leave-one-out cross-validation", "leave one out cross validation", "LOOCV", "LOO 교차검증", "Leave-One-Out 교차검증"] },
  32: { answer: "과소적합", aliases: ["과소적합", "underfitting"] },
  33: { answer: "GAN", aliases: ["GAN", "generative adversarial network", "생성적 적대 신경망", "생성적 적대 신경망(GAN, Generative Adversarial Network)"] },
  34: { answer: "대화스타터", aliases: ["대화스타터", "대화 스타터", "conversation starter"] },
  35: { answer: "ChatGPT Images 2.0", aliases: ["ChatGPT Images 2.0", "ChatGPT Images 2", "챗GPT 이미지 2.0", "챗지피티 이미지 2.0", "gpt-image-2", "GPT-Image-2"] },
};

function fail(message) {
  throw new Error(`Set 5 source validation failed: ${message}`);
}

function hasEmptyMarkdownTable(prompt) {
  const lines = prompt.split("\n");
  for (let index = 0; index + 1 < lines.length; index += 1) {
    if (!/^\|(?:[^|\n]+\|)+\s*$/u.test(lines[index]) || !/^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/u.test(lines[index + 1])) continue;
    const next = lines.slice(index + 2).find((line) => Boolean(line.trim()));
    if (!next || !/^\|(?:[^|\n]*\|)+\s*$/u.test(next)) return true;
  }
  return false;
}

if (manifest.id !== "source-round-05" || manifest.source_kind !== "private_photographed_book") fail("manifest identity or source type");
if (manifest.questions.length !== 40) fail(`expected 40 questions, received ${manifest.questions.length}`);
if (manifest.questions.reduce((sum, question) => sum + question.points, 0) !== 100) fail("total points must be 100");
if (readdirSync(imageRoot).filter((name) => /\.jpe?g$/i.test(name)).length !== 28) fail("expected all 28 photographed source pages");

manifest.questions.forEach((question, index) => {
  const number = index + 1;
  if (question.number !== number || !question.prompt?.trim()) fail(`Q${number} order or prompt`);
  if (/원본 5회 문항|판독불가|\(\s*\)\s*$/.test(question.prompt)) fail(`Q${number} unresolved learner prompt`);
  if (hasEmptyMarkdownTable(question.prompt)) fail(`Q${number} leaves an empty Markdown table in the learner prompt`);
  if (number <= 30) {
    if (question.type !== "multiple_choice" || question.points !== 2 || question.choices?.length !== 4) fail(`Q${number} choice structure`);
    if (question.answer !== answers[index] || question.accepted_answers?.join("|") !== answers[index]) fail(`Q${number} answer mapping`);
  } else if (number <= 35) {
    if (question.type !== "short_answer" || question.points !== 3 || !question.accepted_answers?.length) fail(`Q${number} short-answer policy`);
    const policy = shortAnswerPolicies[number];
    if (question.answer !== policy.answer || question.accepted_answers.join("|") !== policy.aliases.join("|")) fail(`Q${number} reviewed short-answer mapping`);
  } else if (question.type !== "practical_prompt" || question.points !== 5 || question.rubric?.length !== 5 || question.evaluation?.availability !== "available") {
    fail(`Q${number} practical structure`);
  }
  if (question.choices) {
    const explanations = question.choices.map((choice) => choice.feedback?.explanation ?? "");
    if (explanations.some((item) => !item.trim())) fail(`Q${number} missing choice explanation`);
    if (new Set(explanations).size !== explanations.length) fail(`Q${number} repeats choice explanations`);
    if (explanations.some((item) => /이 문항의 정답 선택지|이 문항의 정답이 아닙니다/u.test(item))) fail(`Q${number} has a non-specific choice explanation`);
  }
});

for (const question of corpus.questions) {
  for (const visual of question.visuals ?? []) if (!existsSync(resolve(assetRoot, visual.file))) fail(`missing visual asset ${visual.file}`);
  if (question.primary_visual && !existsSync(resolve(assetRoot, question.primary_visual.file))) fail(`missing practical asset ${question.primary_visual.file}`);
}
for (const number of [36, 38]) {
  const question = manifest.questions[number - 1];
  if (!question.asset || !existsSync(resolve(assetRoot, question.asset.split("/").at(-1)))) fail(`Q${number} visible reference asset`);
}
if (!/위치 임베딩|위치 인코딩/u.test(manifest.questions[3].choices[2].feedback.explanation)) fail("Q04 needs the Transformer positional-information rationale");
if (!/__㉠__은/u.test(manifest.questions[3].prompt)) fail("Q04 must preserve the underlined Transformer marker from the source photo");
if (!/가중치|과적합/u.test(manifest.questions[0].choices[0].feedback.explanation)) fail("Q01 option 1 needs its own overfitting rationale");
if (!/두 번째·세 번째는 \(다\), \(나\)/u.test(manifest.questions[5].choices[3].feedback.explanation) || !/이미 첫 단계/u.test(manifest.questions[5].choices[2].feedback.explanation)) fail("Q06 needs answer-aligned sequence rationales");
if (!/최빈 쌍|빈도/u.test(manifest.questions[15].choices[2].feedback.explanation)) fail("Q16 option 3 needs its BPE ordering rationale");
if (!/연속 3개 이상/u.test(manifest.questions[18].choices[0].feedback.explanation)) fail("Q19 must explain why the correct hyphen-block and parenthesis pairing is correct");
if (!/K개의 성능 지표/u.test(manifest.questions[20].choices[3].text)) fail("Q21 must not confuse K-fold results with N");
if (!/음성 인증을 강화하는 것이 아니라/u.test(manifest.questions[25].choices[1].feedback.explanation)) fail("Q26 option 2 needs its voice-cloning risk rationale");
if (!/구조화된 메타데이터/u.test(manifest.questions[23].choices[2].feedback.explanation) || /유료 버전의 데이터셋이 검색되는 경우가 빈번/u.test(manifest.questions[23].choices[3].text)) fail("Q24 distractors must leave one unambiguously incorrect option");
if (manifest.questions[24].topic !== "단계적 추론(Chain-of-Thought) 프롬프팅" || !/질문의 복잡도에 맞추어 필요한 논리 단계/u.test(manifest.questions[24].choices[3].text)) fail("Q25 must match the illustrated complexity-adjusted reasoning concept");
const q35 = manifest.questions[34];
if (q35.answer !== "ChatGPT Images 2.0" || q35.topic !== "ChatGPT Images 2.0" || q35.accepted_answers.some((answer) => /nano\s*banana|나노\s*바나나/u.test(answer))) fail("Q35 must use the April 2026 ChatGPT Images 2.0 answer, not Nano Banana");
if (corpus.questions[34].answer !== "나노바나나") fail("Q35 source-key conflict must remain explicit for the learner-answer override");
for (const number of [39, 40]) if (/^\s*-\s*$/m.test(manifest.questions[number - 1].prompt)) fail(`Q${number} must not retain an empty OCR bullet`);
if (!/17개 광역자치단체/u.test(manifest.questions[38].evaluation.provider_solution)) fail("Q39 requires the reviewed provider solution");
if (!/명사구형 개조식/u.test(manifest.questions[39].evaluation.provider_solution)) fail("Q40 requires the reviewed provider solution");
console.log("Validated all 40 image-based Set 5 questions, answer mappings, assets, practical rubrics, and choice explanations.");
