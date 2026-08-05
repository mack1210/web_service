#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const checkOnly = process.argv.includes("--check");
const contentRoot = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const webExamRoot = resolve(contentRoot, "data/web-exams");
const ocrRoot = resolve(contentRoot, "corpus/ocr");
const choicePattern = /^\s*(?:([1-5])[.)]|([①②③④⑤]))\s+(.+?)\s*$/;
const circledNumbers = { "①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5 };
const placeholder = "원본 페이지 참조";
const sourceIndication = /^\s*(?:[-•]\s*)?(?:Related visual source|보기 계속|Source)\s*:\s*(?:\.\.\/)+assets\/source-round-[^\r\n]*\r?\n*/gim;

function sectionMap(markdown) {
  const parts = markdown.split(/^## Q(\d{2})\s*$/m);
  const sections = new Map();
  for (let index = 1; index < parts.length; index += 2) sections.set(Number(parts[index]), parts[index + 1].trim());
  return sections;
}

function choiceNumber(value) {
  return Number(value) || circledNumbers[value] || 0;
}

function numberedChoices(section, count) {
  const lines = section.split("\n");
  for (let start = 0; start < lines.length; start += 1) {
    const values = [];
    let cursor = start;
    for (let expected = 1; expected <= count; expected += 1) {
      while (cursor < lines.length && !lines[cursor].trim()) cursor += 1;
      const match = lines[cursor]?.match(choicePattern);
      if (!match || choiceNumber(match[1] ?? match[2]) !== expected) break;
      values.push(match[3]);
      cursor += 1;
    }
    if (values.length === count && !lines.slice(cursor).some((line) => line.trim())) return values;
  }
  return null;
}

function tableChoices(section, count) {
  const lines = section.split("\n");
  for (let start = 0; start < lines.length; start += 1) {
    if (!lines[start].trim().startsWith("|")) continue;
    let end = start;
    while (end < lines.length && lines[end].trim().startsWith("|")) end += 1;
    if (lines.slice(end).some((line) => line.trim())) continue;
    const rows = lines.slice(start, end).map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
    const dataRows = rows.slice(2);
    if (dataRows.length !== count) continue;
    const values = [];
    for (let expected = 1; expected <= count; expected += 1) {
      const row = dataRows[expected - 1];
      if (!row || choiceNumber(row[0]) !== expected) break;
      values.push(row.slice(1).filter(Boolean).join(" · "));
    }
    if (values.length === count && values.every(Boolean)) return values;
  }
  return null;
}

function sourceChoices(section, count) {
  return numberedChoices(section, count) ?? tableChoices(section, count);
}

function choiceFeedback(topic, text, correctText, correct) {
  return {
    definition: `‘${text}’은(는) ${topic} 문항에서 제시된 개념, 설명 또는 조합입니다.`,
    purpose: `${topic}의 정의·작동 원리·적용 조건을 문항의 상황과 대조하는 데 사용합니다.`,
    reason: correct
      ? `문항의 조건을 직접 충족하므로 정답입니다. 이 보기의 내용이 문제에서 요구한 ${topic}의 판단 기준과 일치합니다.`
      : `문항의 조건을 직접 충족하지 않으므로 오답입니다. ${topic}와 관련은 있지만, 문제에서 요구한 판단 기준과 일치하지 않습니다.`,
    similarities: correct
      ? "정답 자체이므로 문항의 핵심 조건을 가장 직접적으로 충족합니다."
      : `정답 ‘${correctText}’와 마찬가지로 ${topic}와 관련된 개념 또는 설명을 다룹니다.`,
    differences: correct
      ? "다른 보기는 일부 표현이 유사해도 문항의 조건, 순서, 범위 또는 정의가 다릅니다."
      : `정답 ‘${correctText}’는 문항의 조건을 충족하지만, 이 보기는 조건·순서·범위 또는 정의가 다릅니다.`,
  };
}

let repairedQuestions = 0;
let sanitizedPrompts = 0;
const unresolved = [];
for (const filename of readdirSync(webExamRoot).filter((name) => /^source-round-\d{2}\.json$/.test(name)).sort()) {
  const manifestPath = resolve(webExamRoot, filename);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const sourceId = filename.slice(0, -".json".length);
  const ocr = sectionMap(readFileSync(resolve(ocrRoot, `${sourceId}.md`), "utf8"));
  let changed = false;

  for (const question of manifest.questions ?? []) {
    if (typeof question.prompt === "string") {
      const prompt = question.prompt.replace(sourceIndication, "").trimStart();
      if (prompt !== question.prompt) {
        question.prompt = prompt;
        sanitizedPrompts += 1;
        changed = true;
      }
    }
    const choices = question.choices;
    if (!Array.isArray(choices) || !choices.some((choice) => choice?.text?.includes(placeholder))) continue;
    const values = sourceChoices(ocr.get(question.number) ?? "", choices.length);
    if (!values) {
      unresolved.push(`${sourceId} Q${String(question.number).padStart(2, "0")}`);
      continue;
    }
    const answerIds = new Set(String(question.answer ?? "").split("|").filter(Boolean));
    const correctText = values.find((_, index) => answerIds.has(String(index + 1))) ?? values[0];
    choices.forEach((choice, index) => {
      choice.text = values[index];
      choice.feedback = choiceFeedback(question.topic, values[index], correctText, answerIds.has(String(index + 1)));
    });
    repairedQuestions += 1;
    changed = true;
  }
  if (changed && !checkOnly) writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

if (unresolved.length) throw new Error(`Could not recover source choices: ${unresolved.join(", ")}`);
if (checkOnly) {
  const remaining = [];
  for (const filename of readdirSync(webExamRoot).filter((name) => name.endsWith(".json"))) {
    const manifest = JSON.parse(readFileSync(resolve(webExamRoot, filename), "utf8"));
    const hasPlaceholder = JSON.stringify(manifest).includes(placeholder);
    const hasSourceIndication = (manifest.questions ?? []).some((question) => typeof question.prompt === "string" && sourceIndication.test(question.prompt));
    sourceIndication.lastIndex = 0;
    if (hasPlaceholder || hasSourceIndication) remaining.push(filename);
  }
  if (remaining.length) throw new Error(`Placeholder choices remain in: ${remaining.join(", ")}`);
}
console.log(checkOnly
  ? "Validated source learner content: no placeholder choices or source-path prompt notes remain."
  : `Repaired ${repairedQuestions} source choice group(s) and removed ${sanitizedPrompts} source-path prompt note(s).`);
