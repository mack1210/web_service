#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { publicAcceptedAnswers, publicAnswerKeys } from "./aipot-public-answer-key.mjs";

const contentRoot = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const load = (id) => JSON.parse(readFileSync(resolve(contentRoot, "data/web-exams", `${id}.json`), "utf8"));
const choiceTypes = new Set(["multiple_choice", "multiple_select", "choice_bank"]);

for (const [id, answerKey] of Object.entries(publicAnswerKeys)) {
  const exam = load(id);
  assert.equal(exam.questions.length, 40, `${id}: 40 questions required`);
  assert.equal(exam.questions.reduce((total, question) => total + question.points, 0), 100, `${id}: 100 points required`);
  for (const question of exam.questions) {
    if (question.number <= 35) {
      const expected = answerKey[question.number - 1];
      assert.equal(question.answer, expected, `${id} Q${question.number}: answer-key mismatch`);
      assert.deepEqual(question.accepted_answers, publicAcceptedAnswers[id]?.[question.number] ?? [expected], `${id} Q${question.number}: accepted-answer mismatch`);
    } else {
      assert.equal(question.answer, "", `${id} Q${question.number}: practical question must not expose a fixed answer`);
      assert.ok(question.evaluation?.provider_solution, `${id} Q${question.number}: reviewed practical reference required`);
      assert.ok(question.evaluation?.source_criteria?.length, `${id} Q${question.number}: PDF source criteria required`);
    }
    if (!choiceTypes.has(question.type)) continue;
    const ids = new Set((question.choices ?? []).map((choice) => choice.id.toLowerCase()));
    for (const answerId of question.answer.split("|")) {
      assert.ok(ids.has(answerId.toLowerCase()), `${id} Q${question.number}: answer must be an available choice`);
    }
    for (const choice of question.choices ?? []) {
      assert.deepEqual(Object.keys(choice.feedback ?? {}).sort(), ["explanation"], `${id} Q${question.number} ${choice.id}: current feedback contract required`);
      assert.ok(choice.feedback.explanation.trim(), `${id} Q${question.number} ${choice.id}: keyword explanation required`);
      assert.doesNotMatch(choice.feedback.explanation, /관련해 구분해야|방법 또는 운영 주장|AI-POT AI 프롬프트활용능력/u, `${id} Q${question.number} ${choice.id}: generic or source-page feedback is forbidden`);
    }
  }
  if (id === "public-set-a") assert.equal(exam.questions[12].type, "multiple_select", "public-set-a Q13 must allow both official answers");
}

const publicA = load("public-set-a");
assert.deepEqual(
  publicAcceptedAnswers["public-set-a"][25],
  [
    "k-fold cross validation",
    "k-fold cross-validation",
    "k-fold validataion",
    "k fold cross validation",
    "k-fold 교차검증",
    "k-폴드 교차검증",
    "k fold 교차검증",
  ],
  "Public A Q25 must accept only the reviewed exact aliases, including the printed spelling variant",
);
assert.deepEqual(
  publicAcceptedAnswers["public-set-a"][24],
  ["sigmoid", "sigmoid function", "sigmoi", "시그모이드", "시그모이드 함수", "로지스틱", "로지스틱 함수"],
  "Public A Q24 must accept the reviewed sigmoid and logistic-function labels, including the printed spelling variant",
);
const langChainChoices = publicA.questions.find((question) => question.number === 6)?.choices ?? [];
assert.match(langChainChoices.find((choice) => choice.id === "1")?.feedback?.explanation ?? "", /㉠.*㉢.*㉣/u, "Public A Q06 correct combination must explain each matching statement");
assert.match(langChainChoices.find((choice) => choice.id === "2")?.feedback?.explanation ?? "", /딥페이크/u, "Public A Q06 wrong combination must explain why ㉤ fails");
for (const [id, number] of [["public-set-a", 8], ["public-set-a", 14], ["public-set-b", 1], ["public-set-b", 9]]) {
  const exam = id === "public-set-a" ? publicA : load(id);
  for (const choice of exam.questions.find((question) => question.number === number)?.choices ?? []) {
    assert.doesNotMatch(choice.feedback?.explanation ?? "", /따라서 이 선택지는 문항의 기준/u, `${id} Q${number}: combination choices need statement-level explanations`);
  }
}

for (const [id, number] of [
  ["public-set-a", 31], ["public-set-a", 32], ["public-set-a", 33], ["public-set-a", 34], ["public-set-a", 35],
  ["public-set-b", 31], ["public-set-b", 32], ["public-set-b", 33], ["public-set-b", 34], ["public-set-b", 35],
]) {
  const exam = id === "public-set-a" ? publicA : load(id);
  const explanations = exam.questions.find((question) => question.number === number)?.choices
    ?.map((choice) => choice.feedback.explanation) ?? [];
  assert.equal(new Set(explanations).size, explanations.length, `${id} Q${number}: every choice-bank item needs its own explanation`);
}

assert.match(publicA.questions.find((question) => question.number === 31)?.choices.find((choice) => choice.id === "img2vid")?.feedback.explanation ?? "", /이미지를 입력/u);
assert.match(publicA.questions.find((question) => question.number === 31)?.choices.find((choice) => choice.id === "word2vec")?.feedback.explanation ?? "", /단어를 수치 벡터/u);
const publicB = load("public-set-b");
assert.deepEqual(
  publicB.questions.find((question) => question.number === 24)?.accepted_answers,
  ["backpropagation", "back propagation", "back-propagation", "backpropagation algorithm", "오류 역전파", "오류역전파", "역전파", "역전파 알고리즘"],
  "Public B Q24 must accept reviewed Korean and English backpropagation aliases",
);
for (const [number, expected] of Object.entries({
  25: ["pruning", "가지치기"],
  26: ["vae", "variational autoencoder", "변이형 자동 인코더", "변이형 자동인코더"],
  27: ["eda", "exploratory data analysis", "탐색적 데이터 분석", "탐색적 데이터분석"],
  28: ["missing value", "결측치 처리", "결측값"],
  29: ["cot", "chain of thought", "chain-of-thought", "chain of thought learning", "생각의 사슬", "생각의 사슬 러닝", "생각의 사슬 학습"],
  30: ["ai.choice", "ai.choice()", "ai.choice 함수"],
})) {
  assert.deepEqual(
    publicB.questions.find((question) => question.number === Number(number))?.accepted_answers,
    expected,
    `Public B Q${number} must accept only its reviewed exact aliases`,
  );
}
const publicBMetadata = {
  1: ["C01", "AI 기초"], 2: ["C03", "퍼셉트론"], 3: ["C03", "과소적합"], 4: ["C12", "검색증강생성(RAG)"], 5: ["C02", "DBSCAN"],
  6: ["C15", "AI 편향"], 7: ["C04", "생성적 적대 신경망(GAN)"], 8: ["C05", "ChatGPT 작동 원리"], 9: ["C07", "GPTs 구성"], 10: ["C01", "범용 인공지능(AGI)"],
  11: ["C07", "이슈 추가 요청"], 12: ["C07", "시맨틱 필터 패턴"], 13: ["C08", "개요 작성 프롬프트"], 14: ["C07", "제로샷 프롬프팅"], 15: ["C13", "Beam Width"],
  16: ["C07", "출력 형식 제약"], 17: ["C14", "PCA 데이터 분석"], 18: ["C11", "이미지 분석 프롬프트"], 19: ["C11", "멀티모달 AI 기반 요약"], 20: ["C14", "Create from File"],
  21: ["C16", "데이터 익명화"], 22: ["C16", "인간의 존엄성"], 23: ["C16", "저작권 준수"], 24: ["C03", "오류 역전파"], 25: ["C02", "의사결정트리 가지치기"],
  26: ["C04", "변이형 오토인코더(VAE)"], 27: ["C14", "탐색적 데이터 분석(EDA)"], 28: ["C14", "결측치 처리"], 29: ["C08", "생각의 사슬(Chain of Thought)"], 30: ["C14", "AI.CHOICE"],
  31: ["C11", "이미지 해상도 설정"], 32: ["C11", "KSampler Steps"], 33: ["C11", "네거티브 프롬프트"], 34: ["C11", "이미지 파일명 접두사"], 35: ["C11", "Seed"],
};
for (const question of publicB.questions.filter((question) => question.number <= 35)) {
  assert.deepEqual(
    [question.chapter, question.topic],
    publicBMetadata[question.number],
    `public-set-b Q${question.number}: chapter and topic must match the question for review recommendations`,
  );
}
for (const question of publicB.questions.filter((question) => question.type === "multiple_choice")) {
  const explanations = (question.choices ?? []).map((choice) => choice.feedback?.explanation ?? "");
  assert.equal(
    new Set(explanations).size,
    explanations.length,
    `public-set-b Q${question.number}: every ordinary choice needs its own explanation`,
  );
}
for (const question of publicB.questions.filter((question) => question.type !== "choice_bank")) {
  for (const choice of question.choices ?? []) {
    assert.doesNotMatch(
      choice.feedback.explanation,
      /256×256은 이미지의 너비|ComfyUI는 노드 기반|KSampler가 반복하는 샘플링|SWOT은 강점/u,
      `public-set-b Q${question.number} ${choice.id}: choice-bank feedback must not leak into ordinary questions`,
    );
  }
}
for (const choice of publicB.questions.find((question) => question.number === 2)?.choices ?? []) {
  assert.match(
    choice.feedback.explanation,
    /퍼셉트론/u,
    `public-set-b Q2 ${choice.id}: feedback must explain the perceptron question`,
  );
}
const ganChoices = publicB.questions.find((question) => question.number === 7)?.choices ?? [];
assert.match(ganChoices.find((choice) => choice.id === "2")?.feedback?.explanation ?? "", /인코더.*GAN의 핵심 구성요소/u, "public-set-b Q7: the incorrect encoder statement needs its own GAN-specific rationale");
assert.match(ganChoices.find((choice) => choice.id === "3")?.feedback?.explanation ?? "", /생성자는.*가짜 데이터를/u, "public-set-b Q7: the generator statement needs its own rationale");
assert.match(publicB.questions.find((question) => question.number === 32)?.choices.find((choice) => choice.id === "3")?.feedback.explanation ?? "", /샘플링 단계/u);
assert.match(publicB.questions.find((question) => question.number === 35)?.choices.find((choice) => choice.id === "17")?.feedback.explanation ?? "", /guidance/u);

console.log("Public A/B answer mappings and current choice feedback contract passed.");
