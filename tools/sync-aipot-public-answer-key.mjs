#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { publicAcceptedAnswers, publicAnswerKeys } from "./aipot-public-answer-key.mjs";

const contentRoot = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const checkOnly = process.argv.includes("--check");
let stale = false;

for (const [id, answers] of Object.entries(publicAnswerKeys)) {
  const manifestPath = resolve(contentRoot, "data/web-exams", `${id}.json`);
  const current = readFileSync(manifestPath, "utf8");
  const exam = JSON.parse(current);
  for (const question of exam.questions.filter((item) => item.number <= 35)) {
    const answer = answers[question.number - 1];
    question.answer = answer;
    question.accepted_answers = publicAcceptedAnswers[id]?.[question.number] ?? [answer];
    if (id === "public-set-a" && question.number === 13) question.type = "multiple_select";
  }
  const next = `${JSON.stringify(exam, null, 2)}\n`;
  if (next !== current) {
    stale = true;
    if (!checkOnly) writeFileSync(manifestPath, next, "utf8");
  }
}

if (checkOnly && stale) {
  console.error("Public A/B answer keys are out of date. Run: node tools/sync-aipot-public-answer-key.mjs");
  process.exit(1);
}
console.log(checkOnly ? "Public A/B answer keys are current." : "Public A/B answer keys synchronized.");
