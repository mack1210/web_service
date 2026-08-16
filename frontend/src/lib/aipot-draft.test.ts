import { afterEach, describe, expect, it } from "vitest";

import {
  AIPOT_PAGE_SIZE,
  clearDraft,
  pageForQuestion,
  questionsForPage,
  readDraft,
  unansweredQuestionNumbers,
  writeDraft,
} from "./aipot-draft";

const questions = Array.from({ length: 40 }, (_, index) => ({ number: index + 1 }));

afterEach(() => window.localStorage.clear());

describe("AI-POT study draft helpers", () => {
  it("splits every 40-question set into eight groups of five", () => {
    expect(AIPOT_PAGE_SIZE).toBe(5);
    expect(questionsForPage(questions, 1)).toHaveLength(5);
    expect(questionsForPage(questions, 8).map((question) => question.number)).toEqual([36, 37, 38, 39, 40]);
    expect(pageForQuestion(40)).toBe(8);
  });

  it("preserves learner answers, locks, feedback, and paused-timer state", () => {
    expect(writeDraft("generated-mock-01", { answers: { 1: "2", 2: "" }, locks: { 1: true }, feedback: { 1: { correct: false } }, startedAt: 1234, phase: "theory", remainingTheory: 2381, remainingPractical: 1200, page: 2 })).toBe(true);
    expect(readDraft("generated-mock-01")).toEqual({ answers: { 1: "2", 2: "" }, locks: { 1: true }, feedback: { 1: { correct: false } }, startedAt: 1234, phase: "theory", remainingTheory: 2381, remainingPractical: 1200, page: 2 });
    expect(unansweredQuestionNumbers(questions.slice(0, 3), { 1: "2", 2: "", 3: "답" })).toEqual([2]);
    clearDraft("generated-mock-01");
    expect(readDraft("generated-mock-01")).toBeNull();
  });
});
