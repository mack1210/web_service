export const AIPOT_PAGE_SIZE = 5;

export interface StudyDraft {
  answers: Record<number, string>;
  startedAt: number;
  locks?: Record<number, boolean>;
  feedback?: Record<number, unknown>;
  phase?: "not_started" | "theory" | "practical" | "results";
  remainingTheory?: number;
  remainingPractical?: number;
  page?: number;
}

export function draftKey(examId: string): string {
  return `aipot-study:${examId}`;
}

export function pageForQuestion(questionNumber: number): number {
  return Math.ceil(questionNumber / AIPOT_PAGE_SIZE);
}

export function questionsForPage<T extends { number: number }>(questions: T[], page: number): T[] {
  const start = (page - 1) * AIPOT_PAGE_SIZE;
  return questions.slice(start, start + AIPOT_PAGE_SIZE);
}

export function unansweredQuestionNumbers<T extends { number: number }>(
  questions: T[],
  answers: Record<number, string>,
): number[] {
  return questions.filter((question) => !answers[question.number]?.trim()).map((question) => question.number);
}

export function readDraft(examId: string): StudyDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(examId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudyDraft>;
    if (!parsed.answers || typeof parsed.startedAt !== "number") return null;
    return {
      answers: parsed.answers, startedAt: parsed.startedAt,
      locks: parsed.locks ?? {}, feedback: parsed.feedback ?? {}, phase: parsed.phase ?? "not_started",
      remainingTheory: parsed.remainingTheory ?? 40 * 60, remainingPractical: parsed.remainingPractical ?? 20 * 60,
      page: parsed.page ?? 1,
    };
  } catch {
    return null;
  }
}

export function writeDraft(examId: string, draft: StudyDraft): boolean {
  try {
    window.localStorage.setItem(draftKey(examId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(examId: string): void {
  try {
    window.localStorage.removeItem(draftKey(examId));
  } catch {
    // Browser privacy settings can block local storage; submitting remains available.
  }
}
