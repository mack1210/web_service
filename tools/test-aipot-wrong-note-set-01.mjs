import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const contentRoot = process.env.AIPOT_CONTENT_ROOT ?? "/home/cgma/cgma_git/study/aipot/실전모의고사";
const path = resolve(contentRoot, "data/web-exams/sample-set-01.json");
const allowAbsent = process.argv.includes("--allow-absent");

function fail(message) { throw new Error(`Wrong-note Set 1 validation failed: ${message}`); }
if (!existsSync(path)) {
  if (allowAbsent) {
    console.log("Wrong-note Set 1 is intentionally absent from the active catalog.");
    process.exit(0);
  }
  fail(`missing generated manifest: ${path}`);
}
const manifest = JSON.parse(readFileSync(path, "utf8"));

if (manifest.id !== "sample-set-01" || manifest.study_mode !== "wrong_note") fail("expected the review-mode sample-set-01 manifest");
if (manifest.questions.length !== 50) fail(`expected 50 questions, got ${manifest.questions.length}`);
if (manifest.questions.reduce((sum, question) => sum + question.points, 0) !== 100) fail("50 questions must total 100 points");
const targets = new Set(["public-set-a", "public-set-b", "source-round-01", "source-round-02", "source-round-03", "source-round-04"]);
if (JSON.stringify(manifest.provenance?.targets) !== JSON.stringify([...targets])) fail("target-set provenance must remain exact");
if (!manifest.provenance?.latest_attempts?.["public-set-b"]) fail("the latest submitted public-set-b attempt must be retained");
if (!manifest.provenance?.latest_attempts?.["source-round-01"]) fail("latest attempted source rounds must be retained in provenance");
const numbers = manifest.questions.map((question) => question.number);
if (numbers.some((number, index) => number !== index + 1)) fail("questions must be numbered continuously 1..50");
const selectedSources = new Set((manifest.provenance?.selected_source_reviews ?? []).map((source) => `${source.exam_id}:${source.number}`));
const questionFingerprints = new Set();
const sourceQuestion = (reference) => {
  const sourcePath = resolve(contentRoot, "data/web-exams", `${reference.exam_id}.json`);
  if (!existsSync(sourcePath)) fail(`source manifest is missing for ${reference.exam_id}`);
  const source = JSON.parse(readFileSync(sourcePath, "utf8"));
  const question = source.questions.find((item) => item.number === reference.number);
  if (!question) fail(`source question is missing for ${reference.exam_id} Q${reference.number}`);
  return question;
};

for (const question of manifest.questions) {
  if (!targets.has(question.source_reference?.exam_id)) fail(`Q${question.number} is not traced to a target set`);
  if (!selectedSources.has(`${question.source_reference?.exam_id}:${question.source_reference?.number}`)) fail(`Q${question.number} is not traced to a selected latest review`);
  if (!Number.isInteger(question.source_reference?.number)) fail(`Q${question.number} lacks a source question number`);
  if (!["multiple_choice", "choice_bank"].includes(sourceQuestion(question.source_reference).type)) fail(`Q${question.number} was generated from a descriptive or practical source question`);
  if (!["multiple_choice", "short_answer"].includes(question.type)) fail(`Q${question.number} has an unsupported type`);
  if (!question.prompt?.trim() || !question.answer?.trim() || question.points !== 2) fail(`Q${question.number} lacks a valid two-point prompt or answer`);
  const fingerprint = `${question.type}|${question.prompt.replace(/\s+/g, " ").trim()}|${(question.choices ?? []).map((choice) => choice.text.replace(/\s+/g, " ").trim()).sort().join("|")}`;
  if (questionFingerprints.has(fingerprint)) fail(`Q${question.number} duplicates an earlier rendered question`);
  questionFingerprints.add(fingerprint);
  if (question.type === "multiple_choice") {
    if (question.choices?.length !== 4) fail(`Q${question.number} must have exactly four choices`);
    if (question.choices.some((choice, index) => choice.id !== String(index + 1) || !choice.text?.trim() || choice.text.length > 48)) fail(`Q${question.number} has an invalid short choice`);
    if (!question.choices.some((choice) => choice.id === question.answer)) fail(`Q${question.number} answer is not a choice id`);
    const explanations = question.choices.map((choice) => choice.feedback?.explanation);
    if (new Set(explanations).size !== 4 || explanations.some((value) => !value?.trim())) fail(`Q${question.number} needs four unique choice explanations`);
  } else if (!Array.isArray(question.accepted_answers) || !question.accepted_answers.length || question.choices) {
    fail(`Q${question.number} needs reviewed finite short-answer aliases only`);
  }
}

console.log("Validated AI-POT wrong-note Set 1: 50 reviewed short-answer/four-choice questions.");
