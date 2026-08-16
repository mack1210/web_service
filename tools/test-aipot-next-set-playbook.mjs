#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const playbookPath = resolve(root, "docs/aipot-next-set-playbook.md");
const playbook = readFileSync(playbookPath, "utf8");

function fail(message) {
  throw new Error(`AI-POT playbook validation failed: ${message}`);
}

const requiredSections = [
  "## 1. 현재 확정 상태",
  "## 2. 요청·해결 이력",
  "## 3. 다음 세트 제작 절차",
  "## 4. 학습 화면과 제출 UX 계약",
  "## 5. 세트 출고 검증 게이트",
  "## 6. 새 세트 기록 템플릿",
  "## 7. 알려진 한계와 금지 사항",
];

for (const section of requiredSections) {
  if (!playbook.includes(section)) fail(`missing section: ${section}`);
}

for (const requestId of Array.from({ length: 48 }, (_, index) => `R${String(index + 1).padStart(2, "0")}`)) {
  if (!playbook.includes(`| ${requestId} |`)) fail(`missing request history entry: ${requestId}`);
}

const requiredReferences = [
  "source-round-01",
  "source-round-02",
  "source-round-03",
  "public-set-a",
  "public-set-b",
  "generated-mock-01",
  "tools/build-aipot-source-round-01.mjs",
  "tools/build-aipot-source-round-02.mjs",
  "tools/test-aipot-source-round-02.mjs",
  "tools/build-aipot-source-round-03.mjs",
  "tools/test-aipot-source-round-03.mjs",
  "pnpm aipot:content:check",
  "pnpm aipot:playbook:check",
  "Haiku",
  "evaluation ID",
  "Playwright Chromium",
  "choice_bank",
  "backpropagation",
  "역전파 알고리즘",
  "서술형 건너뛰고 종료",
  "시작 전·이론·실습·결과",
  "오답노트",
  "챕터별 정오답 집계",
  "밑줄·굵은 글씨",
  "Set 4 Q08",
  "Public B Q17",
  "Public B Q18",
];

for (const reference of requiredReferences) {
  if (!playbook.includes(reference)) fail(`missing reusable reference: ${reference}`);
}

for (const path of [
  "tools/build-aipot-source-round-01.mjs",
  "tools/test-aipot-source-round-01.mjs",
  "tools/build-aipot-source-round-02.mjs",
  "tools/test-aipot-source-round-02.mjs",
  "tools/build-aipot-source-round-03.mjs",
  "tools/test-aipot-source-round-03.mjs",
  "tools/test-aipot-public-question-text.mjs",
  "tools/test-aipot-public-answer-mapping.mjs",
]) {
  if (!existsSync(resolve(root, path))) fail(`referenced tool is absent: ${path}`);
}

console.log("Validated AI-POT next-set playbook sections, request history, and referenced tools.");
