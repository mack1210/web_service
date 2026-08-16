import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { AipotDashboard, belongsInWrongAnswerNotes, OcrQuestionText, parseOcrBlocks, previousAttemptLabel, questionNumberLabel, questionScrollId, reviewChoiceState, ReviewQuestion, reviewTone } from "./study-screens";
import { answerNavigatorTone, canEnterPracticalPhase, canFinishAndSubmit, canOfferSkipPracticalSubmission, canRestartPractice, canRetryPracticalAnswer, canSubmitWithoutPracticalEvaluation, clearOnePracticalAnswer, createClientSubmissionId, hasUnevaluatedPracticalAnswer, learnerFacingPrompt, practicalEvaluationIds, practicalLoadingLabel, PracticeQuestion, questionPage, questionTypeLabel, requiresMediaConfirmation, scoreTone, shouldPersistPracticeDraft, shouldRefreshLockedFeedback, skipPracticalSubmissionLabel, scrollToPageTop } from "./practice-solver";
import { clearDraft, writeDraft } from "@/lib/aipot-draft";
import { mockExams, mockSubmit } from "@/mocks/aipot";

it("uses only the question number in the solve header", () => {
  expect(questionNumberLabel(15)).toBe("Q15");
  expect(questionScrollId(21)).toBe("question-21");
});

it("removes the first-question cover and duplicated final choice list", () => {
  const source = "`AI-POT 실전 모의고사 01회` / `1급`\n\n소요 시간: 총 60분\n\n### 객관식\n\n다음 중 AI 학습의 올바른 순서를 고르시오.\n\n1. 적용\n2. 추론\n3. 학습\n4. 최적화";

  expect(learnerFacingPrompt(source, 1, ["적용", "추론", "학습", "최적화"])).toBe("다음 중 AI 학습의 올바른 순서를 고르시오.");
});

it("removes a duplicated circled choice list without changing the stem", () => {
  const source = "다음 중 적절한 용도를 고르시오.\n\n① 적용\n② 추론\n③ 학습\n④ 최적화";

  expect(learnerFacingPrompt(source, 8, ["적용", "추론", "학습", "최적화"])).toBe("다음 중 적절한 용도를 고르시오.");
});

it("keeps Q28-style numbered scenarios that differ from the answer choices", () => {
  const source = "글로벌 IT 기업 A사의 외부 감사 결과, 다음과 같은 문제점들이 발견되었다.\n\n1. 여성 지원자에게 낮은 점수를 부여했다.\n2. 평가 기준을 공개하지 않았다.\n3. 책임을 회피했다.\n4. 과도한 개인정보를 수집했다.";

  expect(learnerFacingPrompt(source, 28, ["다양성 존중", "투명성", "책임성", "프라이버시 보호"])).toBe(source);
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

it("renders reviewed underline markers without exposing their Markdown delimiters", () => {
  render(<OcrQuestionText text="__㉠__은 __Scikit-learn이 적합하겠어.__" />);

  expect(screen.getByText("㉠").tagName).toBe("U");
  const underlined = screen.getByText("Scikit-learn이 적합하겠어.");
  expect(underlined.tagName).toBe("U");
  expect(underlined).toHaveClass("decoration-2", "underline-offset-2");
  expect(screen.queryByText(/__/)).toBeNull();
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
  expect(reviewTone(3, 10)).toBe("partial");
  expect(reviewTone(0, 10)).toBe("incorrect");
});

it("keeps unanswered questions out of wrong-answer notes", () => {
  expect(belongsInWrongAnswerNotes({ is_unanswered: true, score: 0, possible_score: 2 })).toBe(false);
  expect(belongsInWrongAnswerNotes({ is_unanswered: false, score: 0, possible_score: 2 })).toBe(true);
  expect(belongsInWrongAnswerNotes({ is_unanswered: false, score: 2, possible_score: 2 })).toBe(false);
});

it("distinguishes full, partial, and missing scores", () => {
  expect(scoreTone(1, 1)).toBe("complete");
  expect(scoreTone(0.5, 1)).toBe("partial");
  expect(scoreTone(0, 1)).toBe("missed");
});

it("uses an amber answer-navigator state for a partial score", () => {
  expect(answerNavigatorTone({ earned: 5, possible: 5 })).toBe("complete");
  expect(answerNavigatorTone({ earned: 3, possible: 5 })).toBe("partial");
  expect(answerNavigatorTone({ earned: 0, possible: 5 })).toBe("missed");
  expect(answerNavigatorTone(undefined)).toBe("unanswered");
});

it("announces a spinner-backed practical evaluation while it is running", () => {
  render(<PracticeQuestion
    answer="냉방병 예방 팁 3가지를 알려줘."
    checking
    locked={false}
    onChange={() => undefined}
    onLock={() => undefined}
    onRetry={() => undefined}
    question={{ number: 36, type: "practical_prompt", chapter: "C11", topic: "범위 한정", prompt: "프롬프트를 작성하시오.", points: 5, choices: [], choice_ids: [], multiple_selection: false, single_concept_explanation: false, ocr_text: null, visual_assets: [], source_page: null, asset_url: null, evaluation_kind: "text", evaluation_available: true }}
  />);

  expect(practicalLoadingLabel("text")).toBe("실행 결과를 만들고 평가하는 중입니다…");
  expect(screen.getByRole("status")).toHaveTextContent("실행 결과를 만들고 평가하는 중입니다…");
  expect(screen.getByRole("button", { name: /실행 결과를 만들고 평가하는 중입니다/ })).toHaveAttribute("aria-busy", "true");
});

it("shows Set B Q30 as a short-answer question", () => {
  render(<PracticeQuestion
    answer=""
    checking={false}
    locked={false}
    onChange={() => undefined}
    onLock={() => undefined}
    onRetry={() => undefined}
    question={{ number: 30, type: "short_answer", chapter: "C14", topic: "AI.CHOICE", prompt: "함수를 작성하시오.", points: 2, choices: [], choice_ids: [], multiple_selection: false, single_concept_explanation: false, ocr_text: null, visual_assets: [], source_page: null, asset_url: null, evaluation_kind: null, evaluation_available: true }}
  />);

  expect(questionTypeLabel("short_answer")).toBe("단답형");
  expect(screen.getByText("Q30")).toBeInTheDocument();
  expect(screen.getByText("단답형")).toBeInTheDocument();
});

it("requires confirmation before an image evaluation and never refreshes locked practical work", () => {
  expect(requiresMediaConfirmation("image", false)).toBe(true);
  expect(requiresMediaConfirmation("image", true)).toBe(false);
  expect(requiresMediaConfirmation("text", false)).toBe(false);
  expect(shouldRefreshLockedFeedback({ type: "practical_prompt" } as never)).toBe(false);
  expect(shouldRefreshLockedFeedback({ type: "multiple_choice" } as never)).toBe(true);
});

it("submits the practical evidence created at lock time and uses skip-evaluation only as a fallback", () => {
  const exam = { questions: [
    { number: 1, type: "multiple_choice" },
    { number: 37, type: "practical_prompt" },
  ] } as never;
  const answers = { 37: "Create the confirmed image." };
  const feedback = {
    37: { evaluation: { id: "saved-image-evidence", submitted_prompt: "Create the confirmed image." } },
  } as never;

  expect(practicalEvaluationIds(exam, answers, feedback)).toEqual({ 37: "saved-image-evidence" });
  expect(practicalEvaluationIds(exam, {}, {})).toEqual({});
  expect(hasUnevaluatedPracticalAnswer(exam, answers, feedback)).toBe(false);
  expect(hasUnevaluatedPracticalAnswer(exam, answers, {})).toBe(true);
});

it("keeps my selected and the correct choice on their original review choices", () => {
  expect(reviewChoiceState("1", "1", "2")).toEqual({ selected: true, correct: false });
  expect(reviewChoiceState("2", "1", "2")).toEqual({ selected: false, correct: true });
  render(<ReviewQuestion
    question={{ number: 1, type: "multiple_choice", chapter: "C01", topic: "개념", prompt: "원래 문제 본문", points: 2, choices: ["내가 고른 선지", "정답 선지"], choice_ids: ["1", "2"], multiple_selection: false, single_concept_explanation: false, ocr_text: null, visual_assets: [], source_page: null, asset_url: null, evaluation_kind: null, evaluation_available: true }}
    review={{ number: 1, chapter: "C01", topic: "개념", submitted_answer: "1", correct_answer: "2", explanation: null, score: 0, possible_score: 2, result: "오답", is_unanswered: false, missing: [], evaluation: null }}
  />);

  expect(screen.getByText("원래 문제 본문")).toBeInTheDocument();
  expect(screen.getByText("내가 고른 선지")).toBeInTheDocument();
  expect(screen.getByText("정답 선지")).toBeInTheDocument();
  expect(screen.getByText("내 선택")).toBeInTheDocument();
  expect(screen.getByText("정답")).toBeInTheDocument();
});

it("labels saved responses by their completed attempt number", () => {
  expect(previousAttemptLabel(1, 0)).toBe("1회차 기존 응답 보기");
  expect(previousAttemptLabel(3, 0)).toBe("3회차 기존 응답 보기");
  expect(previousAttemptLabel(3, 2)).toBe("1회차 기존 응답 보기");
});

it("links each completed attempt from the set card", async () => {
  const exam = mockExams.find((item) => item.id === "source-round-01");
  if (!exam) throw new Error("Expected generated mock exam.");
  const attempt = mockSubmit(exam, {}, 60);

  render(<AipotDashboard />);

  expect(await screen.findByRole("link", { name: "1회차 기존 응답 보기" })).toHaveAttribute("href", `/aipot/attempts/${attempt.id}`);
});

it("removes a restarted draft from the dashboard without hiding saved responses", async () => {
  const exam = mockExams.find((item) => item.id === "source-round-01");
  if (!exam) throw new Error("Expected generated mock exam.");
  const attempt = mockSubmit(exam, {}, 60);
  writeDraft(exam.id, { answers: { 1: "1" }, locks: { 1: true }, feedback: {}, startedAt: 1, phase: "theory", remainingTheory: 2399, remainingPractical: 1200, page: 1 });

  const firstView = render(<AipotDashboard />);
  expect(await screen.findByText("임시 답안 1/40")).toBeInTheDocument();
  expect((await screen.findAllByRole("link", { name: /기존 응답 보기/ })).some((link) => link.getAttribute("href") === `/aipot/attempts/${attempt.id}`)).toBe(true);

  firstView.unmount();
  clearDraft(exam.id);
  render(<AipotDashboard />);

  await screen.findAllByRole("link", { name: /기존 응답 보기/ });
  expect(screen.queryByText("임시 답안 1/40")).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /기존 응답 보기/ }).some((link) => link.getAttribute("href") === `/aipot/attempts/${attempt.id}`)).toBe(true);
});

it("opens every locked choice keyword explanation inside its own choice", () => {
  render(<PracticeQuestion
    answer="1"
    checking={false}
    feedback={{ number: 1, earned: 0, possible: 2, correct: false, correct_answer: "2", explanation: null, missing: ["핵심 개념"], choice_feedback: [
      { id: "1", text: "선택한 보기", correct: false, explanation: "선택한 키워드의 의미입니다." },
      { id: "2", text: "정답 보기", correct: true, explanation: "정답 키워드의 의미입니다." },
    ], evaluation: null }}
    locked
    onChange={() => undefined}
    onLock={() => undefined}
    onRetry={() => undefined}
    question={{ number: 1, type: "multiple_choice", chapter: "C01", topic: "핵심 개념", prompt: "알맞은 보기를 고르세요.", points: 2, choices: ["선택한 보기", "정답 보기"], choice_ids: ["1", "2"], multiple_selection: false, single_concept_explanation: false, ocr_text: null, visual_assets: [], source_page: null, asset_url: null, evaluation_kind: null, evaluation_available: true }}
  />);

  expect(screen.getByText("선택한 키워드의 의미입니다.")).toBeInTheDocument();
  expect(screen.getByText("정답 키워드의 의미입니다.")).toBeInTheDocument();
});

it("keeps choice-bank answers and keyword feedback hidden before the learner selects an answer", () => {
  render(<PracticeQuestion
    answer=""
    checking={false}
    locked={false}
    onChange={() => undefined}
    onLock={() => undefined}
    onRetry={() => undefined}
    question={{ number: 31, type: "choice_bank", chapter: "C11", topic: "이미지 해상도 설정", prompt: "[31~35] ComfyUI 파이프라인을 참고하세요.\n\n이미지의 생성 크기는 가로 세로 ㉠이다.", points: 3, choices: ["256×256", "512×512"], choice_ids: ["1", "7"], multiple_selection: false, single_concept_explanation: false, ocr_text: null, visual_assets: [], source_page: null, asset_url: null, evaluation_kind: null, evaluation_available: true }}
  />);

  expect(screen.getByText("이미지의 생성 크기는 가로 세로 ㉠이다.")).toBeInTheDocument();
  expect(screen.queryByText("정답 키워드")).toBeNull();
  expect(screen.queryByText("기대 정답")).toBeNull();
});

it("preserves deliberate line breaks in a bilingual choice", () => {
  render(<PracticeQuestion
    answer=""
    checking={false}
    locked={false}
    onChange={() => undefined}
    onLock={() => undefined}
    onRetry={() => undefined}
    question={{ number: 18, type: "multiple_choice", chapter: "C11", topic: "이미지 분석 프롬프트", prompt: "형식을 고르세요.", points: 2, choices: ["한글 : {풍경1}\n영어 : {풍경1}"], choice_ids: ["1"], multiple_selection: false, single_concept_explanation: false, ocr_text: null, visual_assets: [], source_page: null, asset_url: "/api/q18-palace.png", evaluation_kind: null, evaluation_available: true }}
  />);

  expect(screen.getByRole("img", { name: "18번 참고 자료" })).toHaveAttribute("src", "/api/q18-palace.png");
  expect(screen.getByText(/한글 : \{풍경1\}/).closest(".whitespace-pre-line")).not.toBeNull();
  expect(screen.getByText(/영어 : \{풍경1\}/)).toBeInTheDocument();
});

it("shows the exact expected answer after a short answer is locked", () => {
  render(<PracticeQuestion
    answer="K-fold validataion"
    checking={false}
    feedback={{ number: 25, earned: 3, possible: 3, correct: true, correct_answer: "k-fold cross validation", explanation: null, missing: [], choice_feedback: [], evaluation: null }}
    locked
    onChange={() => undefined}
    onLock={() => undefined}
    onRetry={() => undefined}
    question={{ number: 25, type: "short_answer", chapter: "C09", topic: "교차검증", prompt: "교차검증 기법을 작성하시오.", points: 3, choices: [], choice_ids: [], multiple_selection: false, single_concept_explanation: false, ocr_text: null, visual_assets: [], source_page: null, asset_url: null, evaluation_kind: null, evaluation_available: true }}
  />);

  expect(screen.getByText("기대 정답")).toBeInTheDocument();
  expect(screen.getByText("k-fold cross validation")).toBeInTheDocument();
});

it("shows PDF criteria before compact one-point practical scoring", () => {
  render(<PracticeQuestion
    answer="최초 응답에서 3가지만 남겨줘."
    checking={false}
    feedback={{ number: 36, earned: 3, possible: 5, correct: false, correct_answer: null, explanation: null, missing: ["다른 팁 제외"], choice_feedback: [], evaluation: {
      id: "evaluation-36", kind: "text", submitted_prompt: "최초 응답에서 3가지만 남겨줘.", input_summary: "Question text only", executor_model: "haiku", judge_model: "haiku",
      source_criteria: ["방법의 개수를 제한한다.", "3가지 조건을 반드시 포함한다."], reference_solution: "냉방병 예방 팁 3가지를 알려줘.", reference_source: "기본서 p.58",
      context_alignment: { aligned: true, rationale: "제공된 최초 응답을 좁히는 요청입니다.", evidence: "3가지 제한" },
      artifact: { kind: "text", text: "1. 적절한 온도 조절", media_type: null, asset_url: null, stdout: null, stderr: null, exit_code: null },
      criteria: [{ criterion: "지정한 세 가지 팁으로 범위 한정", possible: 1, earned: 1, met: true, rationale: "범위를 제한했습니다.", evidence: "3가지" }], cost_usd: null,
    } }}
    locked
    onChange={() => undefined}
    onLock={() => undefined}
    onRetry={() => undefined}
    question={{ number: 36, type: "practical_prompt", chapter: "C11", topic: "범위 한정", prompt: "프롬프트를 작성하시오.", points: 5, choices: [], choice_ids: [], multiple_selection: false, single_concept_explanation: false, ocr_text: null, visual_assets: [], source_page: null, asset_url: null, evaluation_kind: "text", evaluation_available: true }}
  />);

  expect(screen.getByText("PDF 원문 채점 기준")).toBeInTheDocument();
  expect(screen.getByText("채점 항목 · 각 1점")).toBeInTheDocument();
  expect(screen.getByText(/부분 정답·보완 필요/)).toBeInTheDocument();
  expect(screen.getByText(/지정한 세 가지 팁으로 범위 한정/).closest("li")).toHaveClass("border-emerald-600");
  expect(screen.queryByText("근거: 3가지")).toBeNull();
});

it("allows the practice section after every theory question is locked", () => {
  expect(canEnterPracticalPhase("theory", false)).toBe(true);
  expect(canEnterPracticalPhase("theory", true)).toBe(false);
  expect(canEnterPracticalPhase("practical", false)).toBe(false);
});

it("allows submission before any question is locked", () => {
  expect(canFinishAndSubmit()).toBe(true);
});

it("offers a full restart for every in-progress phase", () => {
  expect(canRestartPractice("not_started")).toBe(false);
  expect(canRestartPractice("theory")).toBe(true);
  expect(canRestartPractice("practical")).toBe(true);
  expect(canRestartPractice("results")).toBe(true);
  expect(shouldPersistPracticeDraft("not_started", {}, {}, {})).toBe(false);
  expect(shouldPersistPracticeDraft("theory", {}, {}, {})).toBe(true);
  expect(shouldPersistPracticeDraft("not_started", { 1: "1" }, {}, {})).toBe(true);
});

it("allows ending without attempting practical questions once theory is locked", () => {
  expect(canSubmitWithoutPracticalEvaluation("practical", true)).toBe(true);
  expect(canSubmitWithoutPracticalEvaluation("results", true)).toBe(true);
  expect(canSubmitWithoutPracticalEvaluation("theory", true)).toBe(true);
  expect(canSubmitWithoutPracticalEvaluation("practical", false)).toBe(false);
  expect(canSubmitWithoutPracticalEvaluation("not_started", true)).toBe(false);
  expect(skipPracticalSubmissionLabel(false)).toBe("서술형 안 풀고 제출");
  expect(skipPracticalSubmissionLabel(true)).toBe("생성 없이 답안 제출");
  expect(canOfferSkipPracticalSubmission("theory", true, false)).toBe(true);
  expect(canOfferSkipPracticalSubmission("practical", true, false)).toBe(true);
  expect(canOfferSkipPracticalSubmission("practical", true, true)).toBe(false);
  expect(canOfferSkipPracticalSubmission("theory", false, false)).toBe(false);
});

it("uses the shared eight-page map through the practical questions", () => {
  expect(questionPage(35)).toBe(7);
  expect(questionPage(36)).toBe(8);
  expect(questionPage(40)).toBe(8);
});

it("returns to the document top when moving between five-question pages", () => {
  let options: ScrollToOptions | undefined;
  scrollToPageTop((next) => { options = next; });

  expect(options).toEqual({ top: 0, left: 0, behavior: "auto" });
});

it("allows retries only for locked practical-answer questions", () => {
  expect(canRetryPracticalAnswer(36, true)).toBe(true);
  expect(canRetryPracticalAnswer(40, true)).toBe(true);
  expect(canRetryPracticalAnswer(35, true)).toBe(false);
  expect(canRetryPracticalAnswer(36, false)).toBe(false);
});

it("clears only the selected practical answer when retrying", () => {
  expect(clearOnePracticalAnswer({ 35: "theory", 36: "first answer", 37: "other practical answer" }, 36)).toEqual({
    35: "theory",
    37: "other practical answer",
  });
});

it("uses a compatible client submission ID when randomUUID is unavailable", () => {
  expect(createClientSubmissionId(() => "server-compatible-id")).toBe("server-compatible-id");
  expect(createClientSubmissionId(null)).toMatch(/^aipot-\d+-[a-z0-9]+$/);
});
