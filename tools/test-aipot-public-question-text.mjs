import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.env.AIPOT_CONTENT_ROOT
  ? resolve(process.env.AIPOT_CONTENT_ROOT)
  : resolve(process.cwd(), "../../cgma_git/study/aipot/실전모의고사");
const load = (id) => JSON.parse(readFileSync(resolve(root, "data/web-exams", `${id}.json`), "utf8"));
const find = (exam, number) => exam.questions.find((question) => question.number === number);

const a = load("public-set-a");
const a13 = find(a, 13);
const a38 = find(a, 38);
const a37 = find(a, 37);
assert.equal(a13.asset, undefined, "A Q13 is fully textual and must not retain a crop");
assert.match(a13.prompt, /어텐션.*트랜스포머/u);
assert.doesNotMatch(a13.prompt, /①/u, "rendered choices belong only in answer controls");
assert.equal(a38.asset, undefined, "A Q38 is fully textual and must not retain a crop");
assert.match(a38.prompt, /\| 수박 \| 12\.486 \|/u);
assert.match(a38.prompt, /\| 프롬프트 \| ㉠ \|/u);
assert.match(a38.prompt, /복숭아: 11\.92/u);
assert.ok(a37.asset, "A Q37 retains its genuinely visual reference image");

const b = load("public-set-b");
const b36 = find(b, 36);
const b39 = find(b, 39);
assert.ok(b36.asset, "B Q36 retains before/after image evidence");
assert.doesNotMatch(b36.prompt, /\[37~38\]/u);
assert.equal(b39.asset, undefined, "B Q39 is fully textual and must not retain a crop");
assert.match(b39.prompt, /2025년/u);
assert.match(b39.prompt, /10조 원/u);

console.log("Public A/B text-extraction assertions passed.");
