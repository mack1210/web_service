import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { OcrQuestionText, parseOcrBlocks, questionNumberLabel, questionScrollId, reviewTone } from "./study-screens";
import { canEnterPracticalPhase, canFinishAndSubmit, canRetryPracticalAnswer, createClientSubmissionId, explanationChoiceMarker } from "./practice-solver";

it("uses only the question number in the solve header", () => {
  expect(questionNumberLabel(15)).toBe("Q15");
  expect(questionScrollId(21)).toBe("question-21");
});

it("renders OCR quote markers as compact normal text", () => {
  const { container } = render(<OcrQuestionText text={"> [보기]\n>\n>이 문장은 일반 본문으로 읽습니다."} />);

  expect(screen.getByText("[보기]")).toBeInTheDocument();
  expect(screen.getByText("이 문장은 일반 본문으로 읽습니다.")).toBeInTheDocument();
  expect(screen.queryByText(">")).toBeNull();
  expect(container.querySelector("blockquote")).toBeNull();
});

it("renders OCR markdown tables safely instead of exposing markdown or links", () => {
  const text = "| 구분 | 전사 |\n\n| --- | --- |\n\n| 프롬프트 구조 | `입력을 분석`<br>[판독불가 예시](javascript:alert(1)) |\n\n| 설명 | • 근거를 확인 |";
  const { container } = render(<OcrQuestionText text={text} />);

  expect(parseOcrBlocks(text)[0]).toMatchObject({ type: "table", headers: ["구분", "전사"] });
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.getByText("판독불가 예시")).toBeInTheDocument();
  expect(container.querySelector("a")).toBeNull();
  expect(container.textContent).not.toContain("<br>");
});

it("replaces a visual OCR placeholder with the reviewed source crop", () => {
  render(<OcrQuestionText text="[그래프: 비용 함수 설명]" visualAssets={[{ marker: "[그래프:", asset_url: "/api/visual.jpg", alt: "경사하강법 그래프" }]} />);

  expect(screen.getByRole("img", { name: "경사하강법 그래프" })).toHaveAttribute("src", "/api/visual.jpg");
  expect(screen.queryByText("[그래프: 비용 함수 설명]")).toBeNull();
});

it("replaces a declared diagram segment without exposing quote syntax or its duplicate table", () => {
  const text = "[개념도]\n\n| 입력 | 결과 |\n| --- | --- |\n| 예시 | 출력 |\n\n> [설명] 하나의 예시로 입력과 출력 관계를 보여 줍니다.";
  const { container } = render(<OcrQuestionText text={text} visualAssets={[{ marker: "[개념도]", asset_url: "/api/one-shot.jpg", alt: "원샷 프롬프팅 개념도", replace_following_block: true }]} />);

  expect(screen.getByRole("img", { name: "원샷 프롬프팅 개념도" })).toHaveAttribute("src", "/api/one-shot.jpg");
  expect(screen.getByText("[설명] 하나의 예시로 입력과 출력 관계를 보여 줍니다.")).toBeInTheDocument();
  expect(screen.queryByRole("table")).toBeNull();
  expect(container.textContent).not.toContain(">");
});

it("replaces ordinary-text OCR visual markers used by later source rounds", () => {
  render(<OcrQuestionText text="그래프는 ReLU 함수로, 양수 구간에서 증가한다." visualAssets={[{ marker: "그래프는 ReLU 함수로", asset_url: "/api/relu.jpg", alt: "ReLU 그래프" }]} />);

  expect(screen.getByRole("img", { name: "ReLU 그래프" })).toHaveAttribute("src", "/api/relu.jpg");
  expect(screen.queryByText("그래프는 ReLU 함수로, 양수 구간에서 증가한다.")).toBeNull();
});

it("keeps the question sentence when its visual reference is inserted", () => {
  const question = "Q34의 Google Flow 동영상 옵션 설정을 봤을 때, 출력 개수를 고르시오.";
  render(<OcrQuestionText text={question} visualAssets={[{ marker: "Q34의 Google Flow", asset_url: "/api/flow.jpg", alt: "Google Flow 설정", keep_marker_text: true }]} />);

  expect(screen.getByRole("img", { name: "Google Flow 설정" })).toBeInTheDocument();
  expect(screen.getByText(question)).toBeInTheDocument();
});

it("renders fenced Python as a readable code block", () => {
  const source = "코드 결과를 확인하세요.\n\n```python\nheight = float(input(\"키(m): \"))\nprint(height)\n```";
  const { container } = render(<OcrQuestionText text={source} />);

  expect(container.querySelector("pre code[data-language='python']")).toHaveTextContent("height = float");
  expect(screen.queryByText("```python")).toBeNull();
});

it("supports every fenced language used across the source rounds", () => {
  const blocks = parseOcrBlocks("```python\nprint('ok')\n```\n\n```text\ninput -> output\n```");

  expect(blocks).toEqual([
    { type: "code", language: "python", code: "print('ok')" },
    { type: "code", language: "text", code: "input -> output" },
  ]);
});

it("uses bright correct and incorrect review tones", () => {
  expect(reviewTone(10, 10)).toBe("correct");
  expect(reviewTone(0, 10)).toBe("incorrect");
});

it("uses O and × markers in the explanation headers", () => {
  expect(explanationChoiceMarker(true)).toMatchObject({ symbol: "O", label: "정답", className: "text-emerald-600" });
  expect(explanationChoiceMarker(false)).toMatchObject({ symbol: "×", label: "오답", className: "text-red-600" });
});

it("allows the practice section after every theory question is locked", () => {
  expect(canEnterPracticalPhase("theory", false)).toBe(true);
  expect(canEnterPracticalPhase("theory", true)).toBe(false);
  expect(canEnterPracticalPhase("practical", false)).toBe(false);
});

it("offers final submission immediately after every question is locked", () => {
  expect(canFinishAndSubmit("practical", true)).toBe(true);
  expect(canFinishAndSubmit("practical", false)).toBe(false);
  expect(canFinishAndSubmit("results", false)).toBe(true);
  expect(canFinishAndSubmit("theory", true)).toBe(false);
});

it("allows retries only for locked practical-answer questions", () => {
  expect(canRetryPracticalAnswer(36, true)).toBe(true);
  expect(canRetryPracticalAnswer(40, true)).toBe(true);
  expect(canRetryPracticalAnswer(35, true)).toBe(false);
  expect(canRetryPracticalAnswer(36, false)).toBe(false);
});

it("uses a compatible client submission ID when randomUUID is unavailable", () => {
  expect(createClientSubmissionId(() => "server-compatible-id")).toBe("server-compatible-id");
  expect(createClientSubmissionId(null)).toMatch(/^aipot-\d+-[a-z0-9]+$/);
});
