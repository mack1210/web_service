import type { ApiSchemas } from "@/lib/api/types";

type Exam = ApiSchemas["AipotExamDetail"];
type Attempt = ApiSchemas["AipotAttemptDetail"];
type History = ApiSchemas["AipotHistoryResponse"];

const CHAPTERS = ["C01", "C03", "C05", "C07", "C12", "C16"];

function questions(id: string, imageFirst: boolean): Exam["questions"] {
  return Array.from({ length: 40 }, (_, index) => {
    const number = index + 1;
    const type = number <= 30 ? "multiple_choice" : number <= 35 ? "short_answer" : "practical_prompt";
    return {
      number,
      type,
      chapter: CHAPTERS[index % CHAPTERS.length],
      topic: `학습 주제 ${number}`,
      prompt: imageFirst ? `원본 ${number}번 문항을 이미지에서 확인한 뒤 답하세요.` : `AI-POT 연습 문항 ${number}의 답을 고르거나 작성하세요.`,
      points: number <= 30 ? 2 : number <= 35 ? 3 : 5,
      choices: type === "multiple_choice" && !imageFirst ? ["첫 번째 선택지", "두 번째 선택지", "세 번째 선택지", "네 번째 선택지"] : [],
      choice_ids: type === "multiple_choice" ? ["1", "2", "3", "4"] : [],
      multiple_selection: false,
      single_concept_explanation: number === 1,
      source_page: imageFirst ? Math.ceil(number / 2) : null,
      asset_url: null,
      evaluation_kind: type === "practical_prompt" ? number === 37 ? "image" : "text" : null,
      evaluation_available: true,
    };
  });
}

export const mockExams: Exam[] = [
  {
    id: "source-round-01",
    title: "AI-POT 실전 모의고사 01회 (개인 학습용 원본)",
    kind: "source" as const,
    image_first: true,
    question_count: 40,
    study_mode: "exam",
    known_limitations: ["개발용 미리보기에서는 원본 사진을 표시하지 않습니다."],
    questions: questions("source-1", true),
  },
];

const attempts = new Map<string, Attempt>();

export function mockHistory(): History {
  const orderedAttempts = [...attempts.values()].sort((left, right) => right.submitted_at.localeCompare(left.submitted_at));
  return {
    exams: mockExams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      kind: exam.kind,
      image_first: exam.image_first,
      question_count: exam.question_count,
      study_mode: exam.study_mode,
      attempts: orderedAttempts.filter((attempt) => attempt.exam_id === exam.id).length,
      last_attempt: orderedAttempts.find((attempt) => attempt.exam_id === exam.id) ?? null,
      previous_attempts: orderedAttempts.filter((attempt) => attempt.exam_id === exam.id).map((attempt) => ({
        id: attempt.id,
        exam_id: attempt.exam_id,
        exam_title: attempt.exam_title,
        submitted_at: attempt.submitted_at,
        score: attempt.score,
        answered_count: attempt.answered_count,
      })),
    })),
    recent_attempts: orderedAttempts.map((attempt) => ({
      id: attempt.id,
      exam_id: attempt.exam_id,
      exam_title: attempt.exam_title,
      submitted_at: attempt.submitted_at,
      score: attempt.score,
      answered_count: attempt.answered_count,
    })),
    weaknesses: [],
  };
}

export function mockSubmit(exam: Exam, answers: Record<number, string>, elapsedSeconds: number): Attempt {
  const id = `mock-${Date.now()}`;
  const reviews = exam.questions.map((question) => {
    const answer = answers[question.number]?.trim() ?? "";
    const correct = question.type === "multiple_choice" ? "1" : null;
    const score = question.type === "multiple_choice" ? (answer === "1" ? 50 / 35 : 0) : answer ? 1 : 0;
    return {
      number: question.number,
      chapter: question.chapter,
      topic: question.topic,
      submitted_answer: answer,
      correct_answer: correct,
      explanation: correct ? "개발용 미리보기의 예시 해설입니다." : null,
      score,
      possible_score: question.type === "multiple_choice" ? 50 / 35 : question.type === "short_answer" ? 50 / 35 : 10,
      result: score > 0 ? "정답" : answer ? "오답" : "미응답",
      is_unanswered: !answer,
      missing: score > 0 || !answer ? [] : [question.topic],
    };
  });
  const attempt: Attempt = {
    id,
    exam_id: exam.id,
    exam_title: exam.title,
    submitted_at: new Date().toISOString(),
    elapsed_seconds: elapsedSeconds,
    answered_count: Object.values(answers).filter((answer) => answer.trim()).length,
    score: Math.round(reviews.reduce((total, review) => total + review.score, 0) * 10) / 10,
    reviews,
    chapters: [],
  };
  attempts.set(id, attempt);
  return attempt;
}

export function mockAttempt(id: string): Attempt | undefined {
  return attempts.get(id);
}
