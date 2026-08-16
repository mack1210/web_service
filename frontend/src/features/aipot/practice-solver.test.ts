import { describe, expect, it } from "vitest";

import {
  questionPage,
  wrongNoteNavigationAriaLabel,
  wrongNoteNavigationLabel,
  wrongNotePageCount,
} from "./practice-solver";

describe("wrong-note pagination", () => {
  it("keeps the 50-question review set in ten five-question pages", () => {
    expect(wrongNotePageCount(50)).toBe(10);
    expect(questionPage(50)).toBe(10);
  });

  it("uses a plain question number while preserving an accessible status label", () => {
    expect(wrongNoteNavigationLabel(12)).toBe("12");
    expect(wrongNoteNavigationAriaLabel(12, "오답")).toBe("문항 12 오답");
  });
});
