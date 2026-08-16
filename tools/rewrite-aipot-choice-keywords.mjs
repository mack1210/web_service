#!/usr/bin/env node

/** Verify that the retained image-based set has a useful explanation per choice. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const contentRoot = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const manifest = JSON.parse(readFileSync(resolve(contentRoot, "data/web-exams/source-round-01.json"), "utf8"));

for (const question of manifest.questions.filter((item) => ["multiple_choice", "choice_bank"].includes(item.type))) {
  for (const choice of question.choices ?? []) {
    if (!choice?.feedback?.explanation?.trim()) throw new Error(`Set 1 Q${question.number} choice ${choice?.id ?? "?"} has no explanation.`);
  }
}
console.log("Set 1 choice explanations are present.");
