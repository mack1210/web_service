#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const readmePath = resolve(root, "readme.creat_set.md");
const readme = readFileSync(readmePath, "utf8");

function fail(message) {
  throw new Error(`AI-POT create-set README validation failed: ${message}`);
}

for (const section of [
  "## 시작 전",
  "## 로컬 준비",
  "## 1. 원본 종류를 선택한다",
  "## 2. 학습자용 문항을 작성한다",
  "## 3. 정답과 단답형을 검수한다",
  "## 4. 실기 Q36–Q40을 준비한다",
  "## 5. 생성·검증·미리보기",
  "## Docker: 전체 학습 모듈 실행",
  "## 출고 전 기록",
]) {
  if (!readme.includes(section)) fail(`missing section: ${section}`);
}

for (const reference of [
  "docs/aipot-next-set-playbook.md",
  "tools/build-aipot-source-round-01.mjs",
  "tools/test-aipot-source-round-01.mjs",
  "AIPOT_CONTENT_ROOT",
  "pnpm aipot:content:check",
  "accepted_answers",
  "feedback.explanation",
  "backpropagation",
  "서술형을 미응답·0점으로 남기고 종료",
  "시작 전·이론·실습·결과",
  "오답노트",
  "챕터별 정오답 집계",
  "docker compose -f compose.yaml -f compose.prod.yaml --profile production up --build -d --wait",
]) {
  if (!readme.includes(reference)) fail(`missing reusable instruction: ${reference}`);
}

for (const path of [
  "docs/aipot-next-set-playbook.md",
  "tools/build-aipot-source-round-01.mjs",
  "tools/test-aipot-source-round-01.mjs",
  "tools/enrich-aipot-practical-context.mjs",
]) {
  if (!existsSync(resolve(root, path))) fail(`referenced path is absent: ${path}`);
}

console.log("Validated AI-POT create-set README sections and reusable commands.");
