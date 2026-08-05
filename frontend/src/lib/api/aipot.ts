import { mockAttempt, mockExams, mockHistory, mockSubmit } from "@/mocks/aipot";

import type { ApiSchemas } from "./types";

export type AipotExam = ApiSchemas["AipotExamDetail"];
export type AipotExamSummary = ApiSchemas["AipotExamSummary"];
export type AipotAttempt = ApiSchemas["AipotAttemptDetail"];
export type AipotHistory = ApiSchemas["AipotHistoryResponse"];
export type AipotImmediateFeedback = ApiSchemas["AipotImmediateFeedback"];

class AipotRequestError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new AipotRequestError(body?.message ?? "학습 자료를 불러오지 못했습니다.", response.status);
  }
  return (await response.json()) as T;
}

export interface AipotApi {
  getHistory(): Promise<AipotHistory>;
  getExam(examId: string): Promise<AipotExam>;
  submit(examId: string, input: { clientSubmissionId: string; elapsedSeconds: number; answers: Record<number, string> }): Promise<AipotAttempt>;
  getAttempt(attemptId: string): Promise<AipotAttempt>;
  feedback(examId: string, number: number, answer: string, confirmMedia?: boolean): Promise<AipotImmediateFeedback>;
}

const httpApi: AipotApi = {
  getHistory: () => request<AipotHistory>("/api/v1/aipot/history"),
  getExam: (examId) => request<AipotExam>(`/api/v1/aipot/exams/${encodeURIComponent(examId)}`),
  submit: (examId, input) => request<AipotAttempt>(`/api/v1/aipot/exams/${encodeURIComponent(examId)}/submissions`, {
    method: "POST",
    body: JSON.stringify({
      client_submission_id: input.clientSubmissionId,
      elapsed_seconds: input.elapsedSeconds,
      answers: input.answers,
    }),
  }),
  getAttempt: (attemptId) => request<AipotAttempt>(`/api/v1/aipot/attempts/${encodeURIComponent(attemptId)}`),
  feedback: (examId, number, answer, confirmMedia = false) => request<AipotImmediateFeedback>(`/api/v1/aipot/exams/${encodeURIComponent(examId)}/questions/${number}/feedback`, {
    // Existing API deployments accept the original answer-only contract. Send
    // the evaluator-specific confirmation flag only when an image run needs it.
    method: "POST", body: JSON.stringify(confirmMedia ? { answer, confirm_media: true } : { answer }),
  }),
};

const mockApi: AipotApi = {
  async getHistory() {
    return mockHistory();
  },
  async getExam(examId) {
    const exam = mockExams.find((item) => item.id === examId);
    if (!exam) throw new AipotRequestError("선택한 세트를 찾을 수 없습니다.", 404);
    return exam;
  },
  async submit(examId, input) {
    const exam = mockExams.find((item) => item.id === examId);
    if (!exam) throw new AipotRequestError("선택한 세트를 찾을 수 없습니다.", 404);
    return mockSubmit(exam, input.answers, input.elapsedSeconds);
  },
  async getAttempt(attemptId) {
    const attempt = mockAttempt(attemptId);
    if (!attempt) throw new AipotRequestError("제출 결과를 찾을 수 없습니다.", 404);
    return attempt;
  },
  async feedback(examId, number, answer) {
    const exam = mockExams.find((item) => item.id === examId);
    if (!exam) throw new AipotRequestError("선택한 세트를 찾을 수 없습니다.", 404);
    const question = exam.questions.find((item) => item.number === number);
    if (!question) throw new AipotRequestError("문항을 찾을 수 없습니다.", 404);
    const possible = question.points;
    const correct = question.type === "practical_prompt" ? Boolean(answer.trim()) : answer === "1";
    return { number, earned: correct ? possible : 0, possible, correct, correct_answer: question.type === "practical_prompt" ? null : "1", explanation: "개발용 즉시 피드백입니다.", missing: correct ? [] : [question.topic], choice_feedback: (question.choices ?? []).map((text, index) => ({ id: String(index + 1), text, correct: index === 0, definition: "개발용 개념", purpose: "개발용 확인", reason: index === 0 ? "정답입니다." : "오답입니다.", similarities: "관련 개념입니다.", differences: "정답 조건이 다릅니다." })) };
  },
};

export function getAipotApi(): AipotApi {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "http" ? httpApi : mockApi;
}

export { AipotRequestError };
