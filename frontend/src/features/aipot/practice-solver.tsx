"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorPanel, Skeleton } from "@/components/ui/state-panels";
import { OcrQuestionText } from "@/features/aipot/study-screens";
import { clearDraft, readDraft, writeDraft } from "@/lib/aipot-draft";
import { getAipotApi, type AipotExam, type AipotImmediateFeedback } from "@/lib/api/aipot";

const PAGE_SIZE = 5;
const THEORY_SECONDS = 40 * 60;
const PRACTICAL_SECONDS = 20 * 60;

type Phase = "not_started" | "theory" | "practical" | "results";

export function canEnterPracticalPhase(phase: Phase, hasUnansweredTheoryQuestion: boolean) {
  return phase === "theory" && !hasUnansweredTheoryQuestion;
}

export function canFinishAndSubmit() {
  return true;
}

export function canRestartPractice(phase: Phase) {
  return phase !== "not_started";
}

export function shouldPersistPracticeDraft(
  phase: Phase,
  answers: Record<number, string>,
  locks: Record<number, boolean>,
  feedback: Record<number, unknown>,
) {
  // A restart resets every in-progress value to this phase. Keeping an empty
  // record would make the dashboard treat the set as resumable again. Retain
  // older, pre-phase drafts when they still contain learner work.
  return phase !== "not_started"
    || Object.values(answers).some((answer) => Boolean(answer.trim()))
    || Object.keys(locks).length > 0
    || Object.keys(feedback).length > 0;
}

export function canSubmitWithoutPracticalEvaluation(
  phase: Phase, theoryQuestionsLocked: boolean,
) {
  // Learners who have locked Q01–Q35 should not have to wait for the theory
  // timer to enter the practical phase just to submit five intentional blanks.
  return phase !== "not_started" && theoryQuestionsLocked;
}

export function canOfferSkipPracticalSubmission(
  phase: Phase, theoryQuestionsLocked: boolean, practicalQuestionsLocked: boolean,
) {
  return canSubmitWithoutPracticalEvaluation(phase, theoryQuestionsLocked) && !practicalQuestionsLocked;
}

export function skipPracticalSubmissionLabel(hasWrittenPracticalAnswer: boolean) {
  return hasWrittenPracticalAnswer ? "생성 없이 답안 제출" : "서술형 안 풀고 제출";
}

export function canRetryPracticalAnswer(questionNumber: number, locked: boolean) {
  return questionNumber >= 36 && locked;
}

export function scoreTone(earned: number, possible: number): "complete" | "partial" | "missed" {
  if (possible > 0 && earned >= possible) return "complete";
  return earned > 0 ? "partial" : "missed";
}

export function answerNavigatorTone(result: Pick<AipotImmediateFeedback, "earned" | "possible"> | undefined): "complete" | "partial" | "missed" | "unanswered" {
  return result ? scoreTone(result.earned, result.possible) : "unanswered";
}

export function practicalLoadingLabel(kind: AipotExam["questions"][number]["evaluation_kind"]) {
  return kind === "image" ? "이미지를 생성하고 평가하는 중입니다…" : "실행 결과를 만들고 평가하는 중입니다…";
}

export function questionTypeLabel(type: AipotExam["questions"][number]["type"]) {
  switch (type) {
    case "multiple_choice": return "객관식";
    case "multiple_select": return "복수 선택";
    case "choice_bank": return "선택형";
    case "short_answer": return "단답형";
    case "practical_prompt": return "실습 서술형";
  }
}

export function requiresMediaConfirmation(kind: AipotExam["questions"][number]["evaluation_kind"], confirmMedia: boolean) {
  return kind === "image" && !confirmMedia;
}

export function shouldRefreshLockedFeedback(question: AipotExam["questions"][number]) {
  return question.type !== "practical_prompt";
}

export function practicalEvaluationIds(
  exam: AipotExam, answers: Record<number, string>, feedback: Record<number, AipotImmediateFeedback>,
) {
  return Object.fromEntries(exam.questions.flatMap((question) => {
    const evaluation = feedback[question.number]?.evaluation;
    const answer = answers[question.number]?.trim();
    return question.type === "practical_prompt" && answer && evaluation && answer === evaluation.submitted_prompt.trim()
      ? [[question.number, evaluation.id] as const]
      : [];
  }));
}

export function hasUnevaluatedPracticalAnswer(
  exam: AipotExam, answers: Record<number, string>, feedback: Record<number, AipotImmediateFeedback>,
) {
  return exam.questions.some((question) => question.type === "practical_prompt"
    && Boolean(answers[question.number]?.trim()) && !feedback[question.number]?.evaluation);
}

export function clearOnePracticalAnswer<T>(values: Record<number, T>, questionNumber: number) {
  const next = { ...values };
  delete next[questionNumber];
  return next;
}

export function questionPage(questionNumber: number) {
  return Math.max(1, Math.ceil(questionNumber / PAGE_SIZE));
}

export function wrongNotePageCount(questionCount: number) {
  return Math.max(1, Math.ceil(questionCount / PAGE_SIZE));
}

export function wrongNoteNavigationLabel(questionNumber: number) {
  return String(questionNumber);
}

export function wrongNoteNavigationAriaLabel(questionNumber: number, status: string) {
  return `문항 ${questionNumber} ${status}`;
}

export function scrollToPageTop(scrollTo: (options: ScrollToOptions) => void = (options) => window.scrollTo(options)) {
  scrollTo({ top: 0, left: 0, behavior: "auto" });
}

export function createClientSubmissionId(randomUuid: (() => string) | null = globalThis.crypto?.randomUUID?.bind(globalThis.crypto) ?? null) {
  return randomUuid?.() ?? `aipot-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function questionVisualAssets(question: AipotExam["questions"][number]) {
  const declaredVisualAssets = question.visual_assets ?? [];
  if (declaredVisualAssets.length) return declaredVisualAssets;
  const marker = question.prompt.match(/^\s*(\[[^\]\r\n]+\])\s*$/m)?.[1];
  const assetUrl = question.asset_url;
  if (!assetUrl || !marker) return [];
  // Old cached API deployments only expose `asset_url`. Preserve the same
  // safe segmented rendering until their matching API container is recreated.
  return [{ marker, asset_url: assetUrl, alt: `${question.number}번 문제의 시각 자료`, replace_following_block: true }];
}

const RENDERED_CHOICE = /^\s*(?:([1-5])[.)]|[①②③④⑤])\s+.+?\s*$/;

/**
 * The source files are also used for archival OCR.  Learners should receive
 * only the question stem here: cover instructions and a final, duplicated
 * numbered-choice block belong in neither the prompt nor the answer controls.
 */
export function learnerFacingPrompt(prompt: string, questionNumber: number, choices: string[]) {
  let text = prompt;
  if (questionNumber === 1) {
    const objectiveHeading = /^###\s*(?:객관식|이론\s*시험)\s*$/m.exec(text);
    if (objectiveHeading?.index !== undefined) text = text.slice(objectiveHeading.index + objectiveHeading[0].length).trimStart();
  }
  if (choices.length < 2) return text;

  const lines = text.split("\n");
  for (let start = 0; start < lines.length; start += 1) {
    let cursor = start;
    let completeRun = true;
    const renderedChoices: string[] = [];
    for (let expected = 1; expected <= choices.length; expected += 1) {
      while (cursor < lines.length && !lines[cursor].trim()) cursor += 1;
      const match = lines[cursor]?.match(RENDERED_CHOICE);
      if (!match || Number(match[1] ?? ({ "①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5" }[lines[cursor].trim().charAt(0)] ?? "0")) !== expected) {
        completeRun = false;
        break;
      }
      renderedChoices.push(match[0].replace(/^\s*(?:[1-5][.)]|[①②③④⑤])\s+/u, "").trim());
      cursor += 1;
    }
    if (
      completeRun
      && !lines.slice(cursor).some((line) => line.trim())
      && renderedChoices.every((choice, index) => choice === choices[index]?.trim())
    ) return lines.slice(0, start).join("\n").trimEnd();
  }
  return text;
}

function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function scoreBands(exam: AipotExam, feedback: Record<number, AipotImmediateFeedback>) {
  return exam.questions.reduce((bands, question) => {
    const earned = feedback[question.number]?.earned ?? 0;
    if (question.number <= 30) bands.theory += earned;
    else if (question.number <= 35) bands.applied += earned;
    else bands.practical += earned;
    return bands;
  }, { theory: 0, applied: 0, practical: 0 });
}

export function AipotPracticeSolver() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<AipotExam | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [locks, setLocks] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<Record<number, AipotImmediateFeedback>>({});
  const [phase, setPhase] = useState<Phase>("not_started");
  const [remainingTheory, setRemainingTheory] = useState(THEORY_SECONDS);
  const [remainingPractical, setRemainingPractical] = useState(PRACTICAL_SECONDS);
  const [page, setPage] = useState(1);
  const [jumpTarget, setJumpTarget] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState<number | null>(null);
  const [savingResult, setSavingResult] = useState(false);
  const [mediaConfirmation, setMediaConfirmation] = useState<{ question: AipotExam["questions"][number]; answer: string } | null>(null);
  const [skipEvaluationConfirmation, setSkipEvaluationConfirmation] = useState(false);
  const [restartConfirmation, setRestartConfirmation] = useState(false);

  const load = useCallback(async () => {
    try {
      const nextExam = await getAipotApi().getExam(examId);
      const draft = readDraft(examId);
      setExam(nextExam);
      setAnswers(draft?.answers ?? {});
      setLocks(draft?.locks ?? {});
      setFeedback((draft?.feedback ?? {}) as Record<number, AipotImmediateFeedback>);
      setPhase(draft?.phase ?? "not_started");
      setRemainingTheory(draft?.remainingTheory ?? THEORY_SECONDS);
      setRemainingPractical(draft?.remainingPractical ?? PRACTICAL_SECONDS);
      setPage(draft?.page ?? 1);
      setHydrated(true);
      if (draft?.locks && Object.keys(draft.locks).length) {
        const refreshed = await Promise.all(Object.entries(draft.locks).filter(([, locked]) => locked).map(async ([number]) => {
          const questionNumber = Number(number);
          const answer = draft.answers[questionNumber] ?? "";
          const question = nextExam.questions.find((item) => item.number === questionNumber);
          if (!question || !shouldRefreshLockedFeedback(question)) return null;
          return [questionNumber, await getAipotApi().feedback(examId, questionNumber, answer)] as const;
        }));
        const updated = refreshed.filter((item): item is readonly [number, AipotImmediateFeedback] => item !== null);
        if (updated.length) setFeedback((current) => ({ ...current, ...Object.fromEntries(updated) }));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "학습 세트를 불러오지 못했습니다.");
    }
  }, [examId]);

  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, [load]);
  useEffect(() => {
    if (!hydrated) return;
    if (!shouldPersistPracticeDraft(phase, answers, locks, feedback)) {
      clearDraft(examId);
      return;
    }
    writeDraft(examId, { answers, locks, feedback, startedAt: Date.now(), phase, remainingTheory, remainingPractical, page });
  }, [answers, examId, feedback, hydrated, locks, page, phase, remainingPractical, remainingTheory]);

  useEffect(() => {
    if (phase !== "theory" && phase !== "practical") return;
    let lastTick = Date.now();
    const resetTick = () => { lastTick = Date.now(); };
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - lastTick) / 1000));
      lastTick = now;
      if (!elapsed) return;
      if (phase === "theory") {
        setRemainingTheory((current) => {
          const next = Math.max(0, current - elapsed);
          if (!next) { setPhase("practical"); setPage(questionPage(36)); }
          return next;
        });
      } else {
        setRemainingPractical((current) => {
          const next = Math.max(0, current - elapsed);
          if (!next) setPhase("results");
          return next;
        });
      }
    }, 1000);
    document.addEventListener("visibilitychange", resetTick);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", resetTick); };
  }, [phase]);

  const lockAnswer = async (question: AipotExam["questions"][number], proposed = answers[question.number] ?? "", confirmMedia = false) => {
    if (!proposed.trim() || locks[question.number]) return false;
    if (requiresMediaConfirmation(question.evaluation_kind, confirmMedia)) {
      setMediaConfirmation({ question, answer: proposed });
      return false;
    }
    setChecking(question.number); setError(null);
    try {
      const result = await getAipotApi().feedback(examId, question.number, proposed, confirmMedia);
      setAnswers((current) => ({ ...current, [question.number]: proposed }));
      setFeedback((current) => ({ ...current, [question.number]: result }));
      setLocks((current) => ({ ...current, [question.number]: true }));
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "즉시 피드백을 확인하지 못했습니다. 다시 시도하세요.");
      return false;
    } finally { setChecking(null); }
  };

  const confirmMediaAnswer = async () => {
    if (!mediaConfirmation) return;
    const completed = await lockAnswer(mediaConfirmation.question, mediaConfirmation.answer, true);
    if (completed) setMediaConfirmation(null);
  };

  const retryPracticalAnswer = (questionNumber: number) => {
    if (!canRetryPracticalAnswer(questionNumber, Boolean(locks[questionNumber]))) return;
    setAnswers((current) => clearOnePracticalAnswer(current, questionNumber));
    setLocks((current) => clearOnePracticalAnswer(current, questionNumber));
    setFeedback((current) => clearOnePracticalAnswer(current, questionNumber));
    setChecking((current) => current === questionNumber ? null : current);
    setMediaConfirmation(null);
    setError(null);
  };

  const bands = useMemo(() => exam ? scoreBands(exam, feedback) : { theory: 0, applied: 0, practical: 0 }, [exam, feedback]);
  useEffect(() => {
    if (!jumpTarget) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`question-${jumpTarget}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setJumpTarget(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [jumpTarget, page, phase]);
  if (error && !exam) return <ErrorPanel message={error} onRetry={() => void load()} />;
  if (!exam) return <Skeleton className="h-96" />;
  if (exam.study_mode === "wrong_note") return <WrongNotePracticeSolver exam={exam} />;
  const activeQuestions = exam.questions;
  const pageCount = Math.max(1, Math.ceil(activeQuestions.length / PAGE_SIZE));
  const shown = phase === "results" ? activeQuestions : activeQuestions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = bands.theory + bands.applied + bands.practical;
  const locked = Object.keys(locks).length;
  const correct = Object.values(feedback).filter((item) => item.correct).length;
  const incorrect = Object.values(feedback).filter((item) => !item.correct).length;
  const allQuestionsLocked = exam.questions.every((question) => Boolean(locks[question.number]));
  const theoryQuestionsLocked = exam.questions.filter((question) => question.number <= 35).every((question) => Boolean(locks[question.number]));
  const practicalQuestionsLocked = exam.questions.filter((question) => question.number >= 36).every((question) => Boolean(locks[question.number]));
  const hasWrittenPracticalAnswer = exam.questions.some((question) => question.number >= 36 && Boolean(answers[question.number]?.trim()));
  const readyToSubmit = canFinishAndSubmit();
  const readyToSubmitWithoutEvaluation = canOfferSkipPracticalSubmission(phase, theoryQuestionsLocked, practicalQuestionsLocked);
  const hasUnevaluatedPractical = hasUnevaluatedPracticalAnswer(exam, answers, feedback);
  const navigateToQuestion = (number: number) => {
    if (phase !== "results") {
      const index = activeQuestions.findIndex((question) => question.number === number);
      if (index < 0) return;
      setPage(questionPage(number));
    }
    setJumpTarget(number);
  };
  const nextUnanswered = activeQuestions.find((question) => !locks[question.number]);
  const finishAndSave = async (skipPracticalEvaluation = false) => {
    setSavingResult(true);
    try {
      const attempt = await getAipotApi().submit(exam.id, {
        clientSubmissionId: createClientSubmissionId(),
        elapsedSeconds: (THEORY_SECONDS - remainingTheory) + (PRACTICAL_SECONDS - remainingPractical),
        answers,
        practicalEvaluationIds: practicalEvaluationIds(exam, answers, feedback),
        skipPracticalEvaluation,
      });
      clearDraft(exam.id); router.push(`/aipot/attempts/${attempt.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "결과 저장에 실패했습니다."); setSavingResult(false); }
  };
  const requestFinish = () => {
    if (hasUnevaluatedPractical) { setSkipEvaluationConfirmation(true); return; }
    void finishAndSave();
  };
  const restart = () => {
    clearDraft(exam.id);
    setAnswers({});
    setLocks({});
    setFeedback({});
    setPhase("not_started");
    setRemainingTheory(THEORY_SECONDS);
    setRemainingPractical(PRACTICAL_SECONDS);
    setPage(1);
    setJumpTarget(null);
    setChecking(null);
    setMediaConfirmation(null);
    setError(null);
  };
  const movePage = (nextPage: number) => {
    setPage(nextPage);
    scrollToPageTop();
  };

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"><div><Link className="text-sm font-semibold text-[rgb(var(--primary))] hover:underline" href="/aipot">← 세트 선택</Link><p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">AI-POT PRIVATE PRACTICE</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{exam.title}</h1><p className="mt-2 text-sm text-muted">{phase === "not_started" ? "시작 전" : phase === "theory" ? "이론 40분 · Q01–40은 문항 바로가기에서 모두 확인 가능" : phase === "practical" ? "실습 20분 · Q36–40" : "상세 결과 검토"}</p></div><div className="flex flex-wrap items-end justify-between gap-3 sm:justify-end"><Button loading={savingResult} onClick={requestFinish}>시험 종료 및 답안 제출</Button>{canRestartPractice(phase) ? <Button onClick={() => setRestartConfirmation(true)} variant="secondary">처음부터 다시 풀기</Button> : null}<Card className="min-w-44 p-3 text-right"><p className="text-[11px] font-bold uppercase tracking-wider text-muted">{phase === "theory" ? "이론 남은 시간" : phase === "practical" ? "실습 남은 시간" : "현재 점수"}</p><p className="font-mono text-2xl font-extrabold">{phase === "results" ? `${total}/100` : clock(phase === "practical" ? remainingPractical : remainingTheory)}</p></Card></div></header>
    {error ? <ErrorPanel message={error} onRetry={() => setError(null)} /> : null}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <section className="space-y-4">
        <Card className="border-[rgb(var(--primary))/0.3] bg-[rgb(var(--primary-soft))/0.35] text-sm leading-6"><strong>학습용 즉시 피드백 모드.</strong> 답안을 확정하면 바꿀 수 없으며, 정답은 녹색·선택한 오답은 빨간색으로 표시됩니다. 탭을 숨기면 타이머는 일시정지됩니다.</Card>
        <Card className="flex flex-col gap-3 border-[rgb(var(--primary))/0.35] bg-[rgb(var(--surface))] sm:flex-row sm:items-center sm:justify-between"><p className="text-sm leading-6 text-muted">문항을 덜 풀었어도 현재 답안으로 바로 제출할 수 있습니다. 미응답은 오답노트에 포함되지 않습니다.</p><Button className="shrink-0" loading={savingResult} onClick={requestFinish}>현재 답안 제출</Button></Card>
        {phase === "not_started" ? <Button className="w-full" onClick={() => setPhase("theory")}>이론 시험 시작 · 40분</Button> : shown.map((question) => <PracticeQuestion answer={answers[question.number] ?? ""} checking={checking === question.number} feedback={feedback[question.number]} key={question.number} locked={Boolean(locks[question.number])} onChange={(answer) => setAnswers((current) => ({ ...current, [question.number]: answer }))} onLock={(answer) => void lockAnswer(question, answer)} onRetry={() => retryPracticalAnswer(question.number)} question={question} />)}
        {readyToSubmitWithoutEvaluation ? <Card className="border-2 border-sky-600 bg-sky-500/10"><h2 className="text-xl font-extrabold">{hasWrittenPracticalAnswer ? "실습 답안만 제출할 수 있습니다" : "서술형을 풀지 않고 제출할 수 있습니다"}</h2><p className="mt-2 text-sm leading-6 text-muted">{hasWrittenPracticalAnswer ? "Q36–Q40의 작성 답안을 이미지·도표 생성, 코드 실행, 자동 평가 없이 저장합니다." : "Q36–Q40을 미응답으로 남기고 바로 결과를 확인합니다."} 이 다섯 문항은 결과에서 <strong>{hasWrittenPracticalAnswer ? "미평가" : "미응답"}</strong>로 표시되고 자동 채점 점수는 0점입니다.</p><Button className="mt-4" loading={savingResult} onClick={() => setSkipEvaluationConfirmation(true)} variant="secondary">{skipPracticalSubmissionLabel(hasWrittenPracticalAnswer)}</Button></Card> : null}
        {phase !== "results" && allQuestionsLocked ? <Card className="border-2 border-emerald-600 bg-emerald-500/10"><h2 className="text-xl font-extrabold">40문항을 모두 확정했습니다</h2><p className="mt-2 text-sm text-muted">남은 시간과 관계없이 지금 답안을 제출하고 최종 결과를 확인할 수 있습니다.</p><Button className="mt-4" loading={savingResult} onClick={requestFinish}>시험 종료 및 답안 제출</Button></Card> : null}
        {phase !== "not_started" && phase !== "results" ? <nav aria-label="문제 페이지 이동" className="flex justify-between border-t pt-5"><Button disabled={page === 1} onClick={() => movePage(page - 1)} variant="secondary">← 이전 5문제</Button><Button disabled={page >= pageCount} onClick={() => movePage(page + 1)}>다음 5문제 →</Button></nav> : null}
        {phase === "results" ? <Card className="border-2 border-[rgb(var(--primary))] bg-[rgb(var(--primary-soft))/0.4]"><h2 className="text-xl font-extrabold">최종 결과 {total}/100점</h2><p className="mt-2 text-sm text-muted">정답 {correct} · 오답/보완 {incorrect} · 미응답 {40 - locked}</p><Button className="mt-4" loading={savingResult} onClick={requestFinish}>시험 종료 및 답안 제출</Button></Card> : null}
      </section>
      <aside><AnswerNavigator activeQuestions={activeQuestions} canFinish={readyToSubmit} currentPage={page} feedback={feedback} locks={locks} nextUnanswered={nextUnanswered?.number} onFinish={requestFinish} onNavigate={navigateToQuestion} savingResult={savingResult} score={{ total, theory: bands.theory, applied: bands.applied, practical: bands.practical, correct, incorrect }} /></aside>
    </div>
    <ConfirmDialog cancelLabel="계속 작성" confirmLabel={skipPracticalSubmissionLabel(hasWrittenPracticalAnswer)} description={hasWrittenPracticalAnswer ? "Q36–Q40 답안을 저장하지만 이미지·도표 생성, 코드 실행, 자동 평가는 하지 않습니다. 이 문항은 결과에서 미평가로 표시되고 자동 채점 점수는 0점입니다." : "Q36–Q40을 미응답으로 남기고 결과를 저장합니다. 이 다섯 문항의 점수는 0점입니다."} loading={savingResult} onCancel={() => setSkipEvaluationConfirmation(false)} onConfirm={() => { setSkipEvaluationConfirmation(false); void finishAndSave(true); }} open={skipEvaluationConfirmation} title={hasWrittenPracticalAnswer ? "실습 답안만 제출할까요?" : "서술형을 안 풀고 제출할까요?"} />
    <ConfirmDialog cancelLabel="계속 풀기" confirmLabel="처음부터 다시 풀기" description="현재 세트의 임시 답안, 확정 결과, 타이머를 모두 지우고 처음부터 시작합니다. 제출한 기존 기록은 유지됩니다." onCancel={() => setRestartConfirmation(false)} onConfirm={() => { setRestartConfirmation(false); restart(); }} open={restartConfirmation} title="이 세트를 처음부터 다시 풀까요?" />
    <ConfirmDialog cancelLabel="수정하기" confirmLabel="이미지 생성·평가" description="이 답안은 실제 이미지 생성 모델을 호출합니다. 생성 결과가 점수 근거로 저장되며, 완료 후 답안을 바꿀 수 없습니다." loading={Boolean(mediaConfirmation && checking === mediaConfirmation.question.number)} onCancel={() => setMediaConfirmation(null)} onConfirm={() => void confirmMediaAnswer()} open={Boolean(mediaConfirmation)} title="유료 이미지 생성을 진행할까요?" />
  </div>;
}

function WrongNotePracticeSolver({ exam }: { exam: AipotExam }) {
  const router = useRouter();
  const savedDraft = useMemo(() => readDraft(exam.id), [exam.id]);
  const [answers, setAnswers] = useState<Record<number, string>>(savedDraft?.answers ?? {});
  const [locks, setLocks] = useState<Record<number, boolean>>(savedDraft?.locks ?? {});
  const [feedback, setFeedback] = useState<Record<number, AipotImmediateFeedback>>((savedDraft?.feedback ?? {}) as Record<number, AipotImmediateFeedback>);
  const [page, setPage] = useState(savedDraft?.page ?? 1);
  const [checking, setChecking] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageCount = wrongNotePageCount(exam.questions.length);
  const shown = exam.questions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const locked = exam.questions.filter((question) => locks[question.number]).length;
  const total = exam.questions.reduce((sum, question) => sum + (feedback[question.number]?.earned ?? 0), 0);

  useEffect(() => {
    writeDraft(exam.id, {
      answers, locks, feedback, startedAt: savedDraft?.startedAt ?? Date.now(), phase: "not_started",
      remainingTheory: THEORY_SECONDS, remainingPractical: PRACTICAL_SECONDS, page,
    });
  }, [answers, exam.id, feedback, locks, page, savedDraft?.startedAt]);

  const lockAnswer = async (question: AipotExam["questions"][number], answer: string) => {
    if (!answer.trim() || locks[question.number]) return;
    setChecking(question.number);
    setError(null);
    try {
      const result = await getAipotApi().feedback(exam.id, question.number, answer);
      setAnswers((current) => ({ ...current, [question.number]: answer }));
      setFeedback((current) => ({ ...current, [question.number]: result }));
      setLocks((current) => ({ ...current, [question.number]: true }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "정답을 확인하지 못했습니다. 다시 시도하세요.");
    } finally { setChecking(null); }
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const attempt = await getAipotApi().submit(exam.id, {
        clientSubmissionId: createClientSubmissionId(),
        elapsedSeconds: Math.max(0, Math.round((Date.now() - (savedDraft?.startedAt ?? Date.now())) / 1000)),
        answers,
      });
      clearDraft(exam.id);
      router.push(`/aipot/attempts/${attempt.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "결과 저장에 실패했습니다.");
      setSaving(false);
    }
  };

  const goTo = (number: number) => {
    setPage(Math.ceil(number / PAGE_SIZE));
    window.setTimeout(() => document.getElementById(`question-${number}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const pageChanged = (next: number) => { setPage(next); scrollToPageTop(); };

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"><div><Link className="text-sm font-semibold text-[rgb(var(--primary))] hover:underline" href="/aipot">← 세트 선택</Link><p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">WRONG-ANSWER NOTE · SET 1</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{exam.title}</h1><p className="mt-2 text-sm text-muted">회차별 묶음이 아닌 최신 제출의 개인 오답 유형을 종합한 {exam.questions.length}문제입니다.</p></div><Button loading={saving} onClick={() => void submit()}>현재 답안 제출</Button></header>
    {error ? <ErrorPanel message={error} onRetry={() => setError(null)} /> : null}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]"><section className="space-y-4"><Card className="border-[rgb(var(--primary))/0.3] bg-[rgb(var(--primary-soft))/0.35] text-sm leading-6"><strong>빠른 오답 점검 모드.</strong> 답안을 확정하면 선택지별 해설을 바로 확인합니다. 타이머와 실습형 문항은 없습니다.</Card><Card className="flex flex-wrap items-center justify-between gap-3"><span className="font-bold">확정 {locked}/{exam.questions.length} · 현재 {total}/{exam.questions.reduce((sum, question) => sum + question.points, 0)}점</span><span className="text-sm text-muted">페이지 {page}/{pageCount}</span></Card>{shown.map((question) => <PracticeQuestion answer={answers[question.number] ?? ""} checking={checking === question.number} feedback={feedback[question.number]} key={question.number} locked={Boolean(locks[question.number])} onChange={(answer) => setAnswers((current) => ({ ...current, [question.number]: answer }))} onLock={(answer) => void lockAnswer(question, answer)} onRetry={() => undefined} question={question} />)}<nav aria-label="문제 페이지 이동" className="flex justify-between border-t pt-5"><Button disabled={page === 1} onClick={() => pageChanged(page - 1)} variant="secondary">← 이전 5문제</Button>{page < pageCount ? <Button onClick={() => pageChanged(page + 1)}>다음 5문제 →</Button> : <Button loading={saving} onClick={() => void submit()}>현재 답안 제출</Button>}</nav></section><aside><Card className="sticky top-20 p-4"><strong>문항 바로가기</strong><p className="mt-2 text-sm text-muted">{locked}/{exam.questions.length} 확정 · {total}/100점</p><details className="mt-4" open><summary className="cursor-pointer text-sm font-bold">1–{exam.questions.length}번 펼치기</summary><ol className="mt-3 grid grid-cols-5 gap-2">{exam.questions.map((question) => { const state = answerNavigatorTone(feedback[question.number]); const status = state === "unanswered" ? "미응답" : state === "complete" ? "정답" : "오답"; const tone = state === "complete" ? "border-emerald-600 bg-emerald-500/15" : state === "missed" ? "border-red-600 bg-red-500/15" : "hover:border-[rgb(var(--primary))/0.7]"; return <li key={question.number}><button aria-label={wrongNoteNavigationAriaLabel(question.number, status)} className={`min-h-11 w-full rounded-md border text-xs font-bold ${tone}`} onClick={() => goTo(question.number)}>{wrongNoteNavigationLabel(question.number)}</button></li>; })}</ol></details></Card></aside></div>
  </div>;
}

function AnswerNavigator({ activeQuestions, canFinish, currentPage, locks, feedback, nextUnanswered, onFinish, onNavigate, savingResult, score }: { activeQuestions: AipotExam["questions"]; canFinish: boolean; currentPage: number; locks: Record<number, boolean>; feedback: Record<number, AipotImmediateFeedback>; nextUnanswered?: number; onFinish: () => void; onNavigate: (number: number) => void; savingResult: boolean; score: { total: number; theory: number; applied: number; practical: number; correct: number; incorrect: number } }) {
  return <Card className="sticky top-20 p-4"><strong>현재 점수 {score.total}/100</strong><dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 text-sm"><dt>Q01–30</dt><dd className="font-bold">{score.theory}/60</dd><dt>Q31–35</dt><dd className="font-bold">{score.applied}/15</dd><dt>Q36–40</dt><dd className="font-bold">{score.practical}/25</dd></dl><p className="mt-4 border-t pt-3 text-sm leading-6 text-muted">정답 <span className="font-bold text-emerald-700 dark:text-emerald-300">{score.correct}</span> · 오답/보완 <span className="font-bold text-red-700 dark:text-red-300">{score.incorrect}</span><br />미응답 {activeQuestions.filter((question) => !locks[question.number]).length}</p>{canFinish ? <Button className="mt-4 w-full" loading={savingResult} onClick={onFinish}>시험 종료 및 답안 제출</Button> : <Button className="mt-4 w-full" disabled={!nextUnanswered} onClick={() => nextUnanswered && onNavigate(nextUnanswered)}>{nextUnanswered ? `미응답 Q${String(nextUnanswered).padStart(2, "0")}로 이동` : "현재 단계의 미응답 없음"}</Button>}<div className="mt-4 border-t pt-3"><p className="mb-2 text-xs font-bold text-muted">문항 바로가기</p><ol className="grid grid-cols-5 gap-1.5">{activeQuestions.map((question) => { const targetPage = Math.floor(activeQuestions.findIndex((item) => item.number === question.number) / PAGE_SIZE) + 1; const current = targetPage === currentPage; const result = feedback[question.number]; const state = answerNavigatorTone(result); const status = state === "complete" ? "정답" : state === "partial" ? "부분 정답" : state === "missed" ? "오답" : "미응답"; const tone = state === "complete" ? "border-emerald-600 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200" : state === "partial" ? "border-amber-600 bg-amber-500/15 text-amber-800 dark:text-amber-200" : state === "missed" ? "border-red-600 bg-red-500/15 text-red-800 dark:text-red-200" : "bg-[rgb(var(--surface-muted))] hover:border-[rgb(var(--primary))/0.7]"; return <li key={question.number}><button aria-current={current ? "page" : undefined} aria-label={`Q${String(question.number).padStart(2, "0")} ${status}`} className={`grid min-h-10 w-full place-items-center rounded-md border text-xs font-bold transition ${current ? "ring-2 ring-[rgb(var(--primary))/0.35]" : ""} ${tone}`} onClick={() => onNavigate(question.number)}>{question.number}</button></li>; })}</ol></div></Card>;
}

export function PracticeQuestion({ question, answer, locked, checking, feedback, onChange, onLock, onRetry }: { question: AipotExam["questions"][number]; answer: string; locked: boolean; checking: boolean; feedback?: AipotImmediateFeedback; onChange: (answer: string) => void; onLock: (answer: string) => void; onRetry: () => void }) {
  const visualAssets = questionVisualAssets(question);
  const standaloneAssetUrl = question.asset_url && !visualAssets.some((asset) => asset.asset_url === question.asset_url) ? question.asset_url : null;
  const selected = answer.split("|").filter(Boolean);
  const multiple = question.type === "multiple_select" || question.multiple_selection;
  const choices = question.choices ?? [];
  const prompt = learnerFacingPrompt(question.prompt, question.number, choices);
  const choiceIds = question.choice_ids ?? [];
  const choiceFeedback = new Map((feedback?.choice_feedback ?? []).map((item) => [item.id, item]));
  const select = (id: string) => {
    if (locked) return;
    if (!multiple) { onChange(id); onLock(id); return; }
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange([...next].sort().join("|"));
  };
  return <Card className="space-y-4" id={`question-${question.number}`}>
    <div className="flex items-center justify-between border-b pb-3"><div className="flex items-center gap-2"><h2 className="text-sm font-extrabold text-[rgb(var(--primary))]">Q{String(question.number).padStart(2, "0")}</h2><span className="rounded-full bg-[rgb(var(--surface-muted))] px-2 py-0.5 text-xs font-bold text-muted">{questionTypeLabel(question.type)}</span></div><span className="text-sm font-bold text-muted">{question.points}점</span></div>
    <OcrQuestionText text={prompt} visualAssets={visualAssets} />
    {standaloneAssetUrl ? <figure className="overflow-hidden rounded-xl border bg-slate-950/5"><img alt={`${question.number}번 참고 자료`} className="max-h-[38rem] w-full object-contain" src={standaloneAssetUrl} /></figure> : null}
    {["multiple_choice", "multiple_select", "choice_bank"].includes(question.type) ? <fieldset className="grid gap-2"><legend className="sr-only">{question.number}번 답안</legend>{choices.map((text, index) => { const id = choiceIds[index] ?? String(index + 1); const detail = choiceFeedback.get(id); const isSelected = selected.includes(id); const tone = detail?.correct ? "border-emerald-600 bg-emerald-500/10" : locked && isSelected ? "border-red-600 bg-red-500/10" : "hover:border-[rgb(var(--primary))/0.65]"; return <label className={`flex min-h-11 items-start gap-3 rounded-lg border p-3 text-sm ${tone} ${locked ? "cursor-not-allowed" : "cursor-pointer"}`} key={id}><input checked={isSelected} className="mt-0.5" disabled={locked || checking} name={`q-${question.number}`} onChange={() => select(id)} type={multiple ? "checkbox" : "radio"} value={id} /><span className="min-w-0 flex-1"><span className="whitespace-pre-line"><b className="mr-2">{id}.</b>{text}</span>{locked && detail ? <span aria-live="polite" className={`mt-2 block rounded-md border px-3 py-2 leading-6 ${detail.correct ? "border-emerald-600/50 bg-emerald-500/10" : "border-red-600/50 bg-red-500/10"}`}><b>{detail.correct ? "정답 해설" : "선택지 해설"}</b><span aria-hidden="true" className="mx-1">·</span>{detail.explanation}</span> : null}</span></label>; })}</fieldset> : question.type === "short_answer" ? <div className="flex flex-col gap-2 sm:flex-row"><input className="control flex-1" disabled={locked || checking} onChange={(event) => onChange(event.target.value)} placeholder="답을 입력하세요" value={answer} /><Button disabled={!answer.trim() || locked} loading={checking} onClick={() => onLock(answer)}>정답 확인 및 확정</Button></div> : <div className="space-y-2"><p className="rounded-lg bg-amber-500/10 p-3 text-sm">제한 사항과 참고 자료를 확인한 뒤 제출하세요. 실제 시험 중 프로그램 오류가 나면 감독관에게 알리세요.</p>{question.evaluation_available === false ? <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">이 문항에 필요한 원본 실습 파일이 현재 학습 자료에 없습니다. 결과를 만들거나 점수를 확정할 수 없습니다.</p> : null}<textarea className="control min-h-48 w-full" disabled={locked || checking} onChange={(event) => onChange(event.target.value)} placeholder="목표, 입력, 제약, 출력 형식, 검증 기준을 포함해 작성하세요." value={answer} /><Button disabled={!answer.trim() || locked || question.evaluation_available === false} loading={checking} onClick={() => onLock(answer)}>{checking ? practicalLoadingLabel(question.evaluation_kind) : question.evaluation_kind === "image" ? "이미지 생성·평가 후 확정" : "실행·평가 후 확정"}</Button>{checking ? <p className="flex items-center gap-2 text-sm text-muted" role="status"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-[rgb(var(--primary))] border-r-transparent" />{practicalLoadingLabel(question.evaluation_kind)}</p> : null}</div>}
    {multiple && !locked ? <Button disabled={!answer.trim()} loading={checking} onClick={() => onLock(answer)} variant="secondary">선택 확정</Button> : null}
    {feedback ? <FeedbackPanel feedback={feedback} /> : null}
    {canRetryPracticalAnswer(question.number, locked) ? <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"><p className="text-sm leading-6">답안과 실행 결과를 지우고 이 서술형 문항만 다시 작성할 수 있습니다. 다시 확정할 때 새 결과로 채점됩니다.</p><Button className="mt-3" onClick={onRetry} variant="secondary">서술형 다시풀기</Button></div> : null}
  </Card>;
}

function FeedbackPanel({ feedback }: { feedback: AipotImmediateFeedback }) {
  const tone = scoreTone(feedback.earned, feedback.possible);
  const classes = tone === "complete" ? "border-emerald-600 bg-emerald-500/10" : tone === "partial" ? "border-amber-600 bg-amber-500/10" : "border-red-600 bg-red-500/10";
  const label = tone === "complete" ? "정답" : tone === "partial" ? "부분 정답·보완 필요" : "오답·보완 필요";
  return <section aria-live="polite" className={`rounded-xl border p-4 ${classes}`}><p className="font-extrabold">{label} · {feedback.earned}/{feedback.possible}점</p>{feedback.correct_answer ? <p className="mt-2 text-sm"><b>기대 정답</b><span aria-hidden="true" className="mx-1">·</span>{feedback.correct_answer}</p> : null}{feedback.missing?.length ? <p className="mt-2 text-sm">보완: {feedback.missing.join(" · ")}</p> : null}{feedback.explanation ? <p className="mt-2 text-sm leading-6">{feedback.explanation}</p> : null}{feedback.evaluation ? <EvaluationEvidence evaluation={feedback.evaluation} /> : null}</section>;
}

function EvaluationEvidence({ evaluation }: { evaluation: NonNullable<AipotImmediateFeedback["evaluation"]> }) {
  const artifact = evaluation.artifact;
  return <section className="mt-4 rounded-lg border border-[rgb(var(--primary))/0.35] bg-[rgb(var(--surface))/0.7] p-3 text-sm">
    {evaluation.source_criteria?.length ? <section><h3 className="font-extrabold">PDF 원문 채점 기준</h3>{evaluation.reference_source ? <p className="mt-1 text-xs text-muted">출처: {evaluation.reference_source}</p> : null}<ul className="mt-2 list-disc space-y-1 pl-5 leading-5">{evaluation.source_criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></section> : null}
    <section className="mt-4"><h3 className="font-extrabold">채점 항목 · 각 1점</h3><ul className="mt-2 space-y-1">{evaluation.criteria.map((criterion) => { const tone = scoreTone(criterion.earned, criterion.possible); const classes = tone === "complete" ? "border-emerald-600 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100" : tone === "partial" ? "border-amber-600 bg-amber-500/10 text-amber-950 dark:text-amber-100" : "border-red-600 bg-red-500/10 text-red-950 dark:text-red-100"; const symbol = tone === "complete" ? "O" : tone === "partial" ? "△" : "×"; return <li className={`rounded border px-3 py-2 ${classes}`} key={criterion.criterion}><strong>{symbol} {criterion.criterion} · {criterion.earned}/{criterion.possible}점</strong></li>; })}</ul></section>
    <section className="mt-4"><h3 className="font-extrabold">실행 결과</h3><p className="mt-1 text-xs text-muted">입력 자료: {evaluation.input_summary} · 실행 모델: {evaluation.executor_model}</p>{evaluation.context_alignment ? <p className={`mt-2 rounded p-2 text-xs ${evaluation.context_alignment.aligned ? "bg-emerald-500/10" : "bg-red-500/10"}`}>문항 맥락 {evaluation.context_alignment.aligned ? "일치" : "불일치"}: {evaluation.context_alignment.rationale}</p> : null}{artifact.asset_url ? <img alt="프롬프트로 생성된 실제 결과" className="mt-3 max-h-[32rem] w-full rounded-md border object-contain" src={artifact.asset_url} /> : null}{artifact.text ? <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-50"><code>{artifact.text}</code></pre> : null}{artifact.stdout ? <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-50"><code>{artifact.stdout}</code></pre> : null}{artifact.stderr ? <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-50"><code>{artifact.stderr}</code></pre> : null}</section>
    {evaluation.reference_solution ? <details className="mt-3 rounded border p-2"><summary className="cursor-pointer font-bold">PDF 원문 답안 예시</summary><pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-5"><code>{evaluation.reference_solution}</code></pre></details> : null}
  </section>;
}
