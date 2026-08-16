#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const exam = JSON.parse(readFileSync(resolve(root, "data/web-exams/sample-set-01.json"), "utf8"));
const dictionary = JSON.parse(readFileSync(resolve(root, "data/aipot-keyword-dictionary.json"), "utf8"));

assert.equal(exam.questions.length, 40);
assert.deepEqual(exam.questions.map((question) => question.number), Array.from({ length: 40 }, (_, index) => index + 1));
assert.equal(exam.questions.filter((question) => question.type === "multiple_choice").length, 30);
assert.equal(exam.questions.filter((question) => question.type === "short_answer").length, 5);
assert.equal(exam.questions.filter((question) => question.type === "practical_prompt").length, 5);
assert.equal(exam.questions.reduce((sum, question) => sum + question.points, 0), 100);
assert.ok(exam.questions.slice(0, 30).every((question) => question.choices.length === 4));
assert.ok(exam.questions.slice(0, 30).every((question) => question.choices.every((choice) => (
  choice.feedback.definition && choice.feedback.purpose && choice.feedback.reason && choice.feedback.similarities && choice.feedback.differences
))));
assert.ok(exam.questions.slice(0, 30).every((question) => new Set(question.choices.map((choice) => choice.feedback.definition)).size === 4));
assert.equal(exam.questions[34].answer, "PEST 분석");
assert.ok(exam.questions.slice(35).every((question) => question.evaluation.provider_solution && question.evaluation.reference_source));
assert.ok(exam.questions.every((question) => !question.asset));
assert.ok(exam.questions.every((question) => !/^>/m.test(question.prompt)));
assert.ok(dictionary.entries.some((entry) => entry.korean_term === "PEST 분석" && entry.relevant_questions_or_categories.includes("sample-set-01 Q35")));

console.log("Provided sample-set assertions passed.");
