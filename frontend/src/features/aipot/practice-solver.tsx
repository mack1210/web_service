"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorPanel, Skeleton } from "@/components/ui/state-panels";
import { clearDraft, readDraft, writeDraft } from "@/lib/aipot-draft";
import { getAipotApi, type AipotExam, type AipotImmediateFeedback } from "@/lib/api/aipot";

const PAGE_SIZE = 5;
const THEORY_SECONDS = 40 * 60;
const PRACTICAL_SECONDS = 20 * 60;

type Phase = "not_started" | "theory" | "practical" | "results";

export function canEnterPracticalPhase(phase: Phase, hasUnansweredTheoryQuestion: boolean) {
  return phase === "theory" && !hasUnansweredTheoryQuestion;
}

export function canFinishAndSubmit(phase: Phase, allQuestionsLocked: boolean) {
  return phase === "results" || (phase === "practical" && allQuestionsLocked);
}

export function canRetryPracticalAnswer(questionNumber: number, locked: boolean) {
  return questionNumber >= 36 && locked;
}

export function createClientSubmissionId(randomUuid: (() => string) | null = globalThis.crypto?.randomUUID?.bind(globalThis.crypto) ?? null) {
  return randomUuid?.() ?? `aipot-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
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
          return [questionNumber, await getAipotApi().feedback(examId, questionNumber, answer)] as const;
        }));
        setFeedback(Object.fromEntries(refreshed));
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
          if (!next) { setPhase("practical"); setPage(1); }
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
    if (!proposed.trim() || locks[question.number]) return;
    setChecking(question.number); setError(null);
    try {
      const result = await getAipotApi().feedback(examId, question.number, proposed, confirmMedia);
      setAnswers((current) => ({ ...current, [question.number]: proposed }));
      setFeedback((current) => ({ ...current, [question.number]: result }));
      setLocks((current) => ({ ...current, [question.number]: true }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "즉시 피드백을 확인하지 못했습니다. 다시 시도하세요.");
    } finally { setChecking(null); }
  };

  const retryPracticalAnswer = (questionNumber: number) => {
    if (!canRetryPracticalAnswer(questionNumber, Boolean(locks[questionNumber]))) return;
    setAnswers((current) => { const next = { ...current }; delete next[questionNumber]; return next; });
    setLocks((current) => { const next = { ...current }; delete next[questionNumber]; return next; });
    setFeedback((current) => { const next = { ...current }; delete next[questionNumber]; return next; });
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
  const activeQuestions = phase === "theory" || phase === "not_started" ? exam.questions.filter((question) => question.number <= 35) : phase === "practical" ? exam.questions.filter((question) => question.number >= 36) : exam.questions;
  const pageCount = Math.max(1, Math.ceil(activeQuestions.length / PAGE_SIZE));
  const shown = phase === "results" ? activeQuestions : activeQuestions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = bands.theory + bands.applied + bands.practical;
  const locked = Object.keys(locks).length;
  const correct = Object.values(feedback).filter((item) => item.correct).length;
  const incorrect = Object.values(feedback).filter((item) => !item.correct).length;
  const allQuestionsLocked = exam.questions.every((question) => Boolean(locks[question.number]));
  const readyToSubmit = canFinishAndSubmit(phase, allQuestionsLocked);
  const navigateToQuestion = (number: number) => {
    if (number === 36 && canEnterPracticalPhase(phase, activeQuestions.some((question) => !locks[question.number]))) {
      setPhase("practical");
      setPage(1);
      setJumpTarget(36);
      return;
    }
    if (phase !== "results") {
      const index = activeQuestions.findIndex((question) => question.number === number);
      if (index < 0) return;
      setPage(Math.floor(index / PAGE_SIZE) + 1);
    }
    setJumpTarget(number);
  };
  const nextUnanswered = activeQuestions.find((question) => !locks[question.number]);
  const finishAndSave = async () => {
    setSavingResult(true);
    try {
      const attempt = await getAipotApi().submit(exam.id, { clientSubmissionId: createClientSubmissionId(), elapsedSeconds: (THEORY_SECONDS - remainingTheory) + (PRACTICAL_SECONDS - remainingPractical), answers });
      clearDraft(exam.id); router.push(`/aipot/attempts/${attempt.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "결과 저장에 실패했습니다."); setSavingResult(false); }
  };
  const restart = () => {
    clearDraft(exam.id); setAnswers({}); setLocks({}); setFeedback({}); setPhase("not_started"); setRemainingTheory(THEORY_SECONDS); setRemainingPractical(PRACTICAL_SECONDS); setPage(1);
  };

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"><div><Link className="text-sm font-semibold text-[rgb(var(--primary))] hover:underline" href="/aipot">← 세트 선택</Link><p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">AI-POT PRIVATE PRACTICE</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{exam.title}</h1><p className="mt-2 text-sm text-muted">{phase === "not_started" ? "시작 전" : phase === "theory" ? "이론 시험 · 모든 이론 문항 확정 후 실습으로 이동" : phase === "practical" ? "실습 시험 · 5문항" : "상세 결과 검토"}</p></div><Card className="min-w-44 p-3 text-right"><p className="text-[11px] font-bold uppercase tracking-wider text-muted">{phase === "theory" ? "이론 남은 시간" : phase === "practical" ? "실습 남은 시간" : "현재 점수"}</p><p className="font-mono text-2xl font-extrabold">{phase === "results" ? `${total}/100` : clock(phase === "practical" ? remainingPractical : remainingTheory)}</p></Card></header>
    {error ? <ErrorPanel message={error} onRetry={() => setError(null)} /> : null}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <section className="space-y-4">
        <Card className="border-[rgb(var(--primary))/0.3] bg-[rgb(var(--primary-soft))/0.35] text-sm leading-6"><strong>학습용 즉시 피드백 모드.</strong> 답안을 확정하면 바꿀 수 없으며, 정답은 녹색·선택한 오답은 빨간색으로 표시됩니다. 탭을 숨기면 타이머는 일시정지됩니다.</Card>
        {phase === "not_started" ? <Button className="w-full" onClick={() => setPhase("theory")}>이론 시험 시작 · 40분</Button> : shown.map((question) => <PracticeQuestion answer={answers[question.number] ?? ""} checking={checking === question.number} feedback={feedback[question.number]} key={question.number} locked={Boolean(locks[question.number])} onChange={(answer) => setAnswers((current) => ({ ...current, [question.number]: answer }))} onLock={(answer) => { if (question.evaluation_kind === "image") setMediaConfirmation({ question, answer }); else void lockAnswer(question, answer); }} onRetry={() => retryPracticalAnswer(question.number)} question={question} />)}
        {phase === "practical" && readyToSubmit ? <Card className="border-2 border-emerald-600 bg-emerald-500/10"><h2 className="text-xl font-extrabold">40문항을 모두 확정했습니다</h2><p className="mt-2 text-sm text-muted">남은 실습 시간과 관계없이 지금 답안을 제출하고 최종 결과를 확인할 수 있습니다.</p><Button className="mt-4" loading={savingResult} onClick={() => void finishAndSave()}>시험 종료 및 답안 제출</Button></Card> : null}
        {phase !== "not_started" && phase !== "results" ? <nav aria-label="문제 페이지 이동" className="flex justify-between border-t pt-5"><Button disabled={page === 1} onClick={() => setPage((current) => current - 1)} variant="secondary">← 이전 5문제</Button><Button disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>다음 5문제 →</Button></nav> : null}
        {phase === "results" ? <Card className="border-2 border-[rgb(var(--primary))] bg-[rgb(var(--primary-soft))/0.4]"><h2 className="text-xl font-extrabold">최종 결과 {total}/100점</h2><p className="mt-2 text-sm text-muted">정답 {correct} · 오답/보완 {incorrect} · 미응답 {40 - locked}</p><div className="mt-4 flex flex-wrap gap-3"><Button loading={savingResult} onClick={() => void finishAndSave()}>시험 종료 및 답안 제출</Button><Button onClick={restart} variant="secondary">이 세트 다시 시작</Button></div></Card> : null}
      </section>
      <aside><AnswerNavigator activeQuestions={activeQuestions} canFinish={phase === "practical" && readyToSubmit} currentPage={page} feedback={feedback} locks={locks} nextUnanswered={nextUnanswered?.number} onFinish={() => void finishAndSave()} onNavigate={navigateToQuestion} onRestart={() => { if (window.confirm("이 세트의 현재 답안, 피드백, 타이머를 모두 초기화할까요?")) restart(); }} savingResult={savingResult} score={{ total, theory: bands.theory, applied: bands.applied, practical: bands.practical, correct, incorrect }} /></aside>
    </div>
    <ConfirmDialog cancelLabel="수정하기" confirmLabel="이미지 생성·평가" description="이 답안은 실제 이미지 생성 모델을 호출합니다. 생성 결과가 점수 근거로 저장되며, 완료 후 답안을 바꿀 수 없습니다." loading={Boolean(mediaConfirmation && checking === mediaConfirmation.question.number)} onCancel={() => setMediaConfirmation(null)} onConfirm={() => { if (mediaConfirmation) { void lockAnswer(mediaConfirmation.question, mediaConfirmation.answer, true); setMediaConfirmation(null); } }} open={Boolean(mediaConfirmation)} title="유료 이미지 생성을 진행할까요?" />
  </div>;
}

function AnswerNavigator({ activeQuestions, canFinish, currentPage, locks, feedback, nextUnanswered, onFinish, onNavigate, onRestart, savingResult, score }: { activeQuestions: AipotExam["questions"]; canFinish: boolean; currentPage: number; locks: Record<number, boolean>; feedback: Record<number, AipotImmediateFeedback>; nextUnanswered?: number; onFinish: () => void; onNavigate: (number: number) => void; onRestart: () => void; savingResult: boolean; score: { total: number; theory: number; applied: number; practical: number; correct: number; incorrect: number } }) {
  const theoryComplete = activeQuestions.length === 35 && !nextUnanswered;
  return <Card className="sticky top-20 p-4"><strong>현재 점수 {score.total}/100</strong><dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 text-sm"><dt>Q01–30</dt><dd className="font-bold">{score.theory}/60</dd><dt>Q31–35</dt><dd className="font-bold">{score.applied}/15</dd><dt>Q36–40</dt><dd className="font-bold">{score.practical}/25</dd></dl><p className="mt-4 border-t pt-3 text-sm leading-6 text-muted">정답 <span className="font-bold text-emerald-700 dark:text-emerald-300">{score.correct}</span> · 오답/보완 <span className="font-bold text-red-700 dark:text-red-300">{score.incorrect}</span><br />미응답 {activeQuestions.filter((question) => !locks[question.number]).length}</p>{canFinish ? <Button className="mt-4 w-full" loading={savingResult} onClick={onFinish}>시험 종료 및 답안 제출</Button> : theoryComplete ? <Button className="mt-4 w-full" onClick={() => onNavigate(36)}>실습 문제 Q36–40으로 이동</Button> : <Button className="mt-4 w-full" disabled={!nextUnanswered} onClick={() => nextUnanswered && onNavigate(nextUnanswered)}>{nextUnanswered ? `미응답 Q${String(nextUnanswered).padStart(2, "0")}로 이동` : "현재 단계의 미응답 없음"}</Button>}<Button className="mt-2 w-full" onClick={onRestart} variant="secondary">다시 풀기</Button><div className="mt-4 border-t pt-3"><p className="mb-2 text-xs font-bold text-muted">문항 바로가기</p><ol className="grid grid-cols-5 gap-1.5">{activeQuestions.map((question) => { const targetPage = Math.floor(activeQuestions.findIndex((item) => item.number === question.number) / PAGE_SIZE) + 1; const current = targetPage === currentPage; const result = feedback[question.number]; const status = result ? result.correct ? "정답" : "오답" : "미응답"; const tone = result ? result.correct ? "border-emerald-600 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200" : "border-red-600 bg-red-500/15 text-red-800 dark:text-red-200" : "bg-[rgb(var(--surface-muted))] hover:border-[rgb(var(--primary))/0.7]"; return <li key={question.number}><button aria-current={current ? "page" : undefined} aria-label={`Q${String(question.number).padStart(2, "0")} ${status}`} className={`grid min-h-10 w-full place-items-center rounded-md border text-xs font-bold transition ${current ? "ring-2 ring-[rgb(var(--primary))/0.35]" : ""} ${tone}`} onClick={() => onNavigate(question.number)}>{question.number}</button></li>; })}</ol></div></Card>;
}

function PracticeQuestion({ question, answer, locked, checking, feedback, onChange, onLock, onRetry }: { question: AipotExam["questions"][number]; answer: string; locked: boolean; checking: boolean; feedback?: AipotImmediateFeedback; onChange: (answer: string) => void; onLock: (answer: string) => void; onRetry: () => void }) {
  const selected = answer.split("|").filter(Boolean);
  const multiple = question.type === "multiple_select" || question.multiple_selection;
  const choices = question.choices ?? [];
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
    <div className="flex items-center justify-between border-b pb-3"><h2 className="text-sm font-extrabold text-[rgb(var(--primary))]">Q{String(question.number).padStart(2, "0")}</h2><span className="text-sm font-bold text-muted">{question.points}점</span></div>
    <p className="whitespace-pre-wrap text-[15px] leading-7">{question.prompt}</p>
    {question.asset_url ? <figure className="overflow-hidden rounded-xl border bg-slate-950/5"><img alt={`${question.number}번 참고 자료`} className="max-h-[38rem] w-full object-contain" src={question.asset_url} /></figure> : null}
    {["multiple_choice", "multiple_select", "choice_bank"].includes(question.type) ? <fieldset className="grid gap-2"><legend className="sr-only">{question.number}번 답안</legend>{choices.map((text, index) => { const id = choiceIds[index] ?? String(index + 1); const detail = choiceFeedback.get(id); const isSelected = selected.includes(id); const tone = detail?.correct ? "border-emerald-600 bg-emerald-500/10" : locked && isSelected ? "border-red-600 bg-red-500/10" : "hover:border-[rgb(var(--primary))/0.65]"; return <label className={`flex min-h-11 items-center gap-3 rounded-lg border p-3 text-sm ${tone} ${locked ? "cursor-not-allowed" : "cursor-pointer"}`} key={id}><input checked={isSelected} disabled={locked || checking} name={`q-${question.number}`} onChange={() => select(id)} type={multiple ? "checkbox" : "radio"} value={id} /><span><b className="mr-2">{id}.</b>{text}</span></label>; })}</fieldset> : question.type === "short_answer" ? <div className="flex flex-col gap-2 sm:flex-row"><input className="control flex-1" disabled={locked || checking} onChange={(event) => onChange(event.target.value)} placeholder="답을 입력하세요" value={answer} /><Button disabled={!answer.trim() || locked} loading={checking} onClick={() => onLock(answer)}>정답 확인 및 확정</Button></div> : <div className="space-y-2"><p className="rounded-lg bg-amber-500/10 p-3 text-sm">제한 사항과 참고 자료를 확인한 뒤 제출하세요. 실제 시험 중 프로그램 오류가 나면 감독관에게 알리세요.</p>{question.evaluation_available === false ? <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">이 문항에 필요한 원본 실습 파일이 현재 학습 자료에 없습니다. 결과를 만들거나 점수를 확정할 수 없습니다.</p> : null}<textarea className="control min-h-48 w-full" disabled={locked || checking} onChange={(event) => onChange(event.target.value)} placeholder="목표, 입력, 제약, 출력 형식, 검증 기준을 포함해 작성하세요." value={answer} /><Button disabled={!answer.trim() || locked || question.evaluation_available === false} loading={checking} onClick={() => onLock(answer)}>{question.evaluation_kind === "image" ? "이미지 생성·평가 후 확정" : "실행·평가 후 확정"}</Button></div>}
    {multiple && !locked ? <Button disabled={!answer.trim()} loading={checking} onClick={() => onLock(answer)} variant="secondary">선택 확정</Button> : null}
    {feedback ? <FeedbackPanel feedback={feedback} selected={selected} singleConcept={question.single_concept_explanation} /> : null}
    {canRetryPracticalAnswer(question.number, locked) ? <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"><p className="text-sm leading-6">답안과 실행 결과를 지우고 이 서술형 문항만 다시 작성할 수 있습니다. 다시 확정할 때 새 결과로 채점됩니다.</p><Button className="mt-3" onClick={onRetry} variant="secondary">서술형 다시풀기</Button></div> : null}
  </Card>;
}

export function explanationChoiceMarker(correct: boolean) {
  return correct
    ? { symbol: "O", label: "정답", className: "text-emerald-600" }
    : { symbol: "×", label: "오답", className: "text-red-600" };
}

function FeedbackPanel({ feedback, selected, singleConcept }: { feedback: AipotImmediateFeedback; selected: string[]; singleConcept: boolean }) {
  const choices = singleConcept ? feedback.choice_feedback?.filter((choice) => choice.correct) : feedback.choice_feedback;
  return <section aria-live="polite" className={`rounded-xl border p-4 ${feedback.correct ? "border-emerald-600 bg-emerald-500/10" : "border-red-600 bg-red-500/10"}`}><p className="font-extrabold">{feedback.correct ? "정답" : "오답·보완 필요"} · {feedback.earned}/{feedback.possible}점</p>{feedback.missing?.length ? <p className="mt-2 text-sm">보완: {feedback.missing.join(" · ")}</p> : null}{feedback.explanation ? <p className="mt-2 text-sm leading-6">{feedback.explanation}</p> : null}{feedback.evaluation ? <EvaluationEvidence evaluation={feedback.evaluation} /> : null}{choices?.length ? <div className="mt-4 space-y-2"><h3 className="font-bold">{singleConcept ? "핵심 개념 해설" : "모든 보기의 상세 해설"}</h3>{choices.map((choice) => { const marker = explanationChoiceMarker(choice.correct); return <details className={`rounded-lg border p-3 ${choice.correct ? "border-emerald-600/70" : "border-red-600/70"}`} key={choice.id}><summary className="cursor-pointer list-none"><span className="flex items-center gap-2 font-semibold"><span>{singleConcept ? choice.text : `${choice.id}. ${choice.text}${selected.includes(choice.id) ? " · 선택" : ""}`}</span><span aria-label={marker.label} className={`ml-auto text-xl font-black ${marker.className}`}>{marker.symbol}</span></span></summary><dl className="mt-3 grid gap-2 text-sm leading-6"><div><dt className="font-bold">의미</dt><dd>{choice.definition}</dd></div><div><dt className="font-bold">용도</dt><dd>{choice.purpose}</dd></div><div><dt className="font-bold">판단</dt><dd>{choice.reason}</dd></div>{!singleConcept ? <><div><dt className="font-bold">정답과의 유사점</dt><dd>{choice.similarities}</dd></div><div><dt className="font-bold">정답과의 차이</dt><dd>{choice.differences}</dd></div></> : null}</dl></details>; })}</div> : null}</section>;
}

function EvaluationEvidence({ evaluation }: { evaluation: NonNullable<AipotImmediateFeedback["evaluation"]> }) {
  const artifact = evaluation.artifact;
  return <section className="mt-4 rounded-lg border border-[rgb(var(--primary))/0.35] bg-[rgb(var(--surface))/0.7] p-3 text-sm"><h3 className="font-extrabold">실제 실행 결과 · 채점 근거</h3><p className="mt-1 text-xs text-muted">입력 자료: {evaluation.input_summary} · 실행 모델: {evaluation.executor_model}</p>{artifact.asset_url ? <img alt="프롬프트로 생성된 실제 결과" className="mt-3 max-h-[32rem] w-full rounded-md border object-contain" src={artifact.asset_url} /> : null}{artifact.text ? <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-50"><code>{artifact.text}</code></pre> : null}{artifact.stdout ? <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-50"><code>{artifact.stdout}</code></pre> : null}{artifact.stderr ? <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-50"><code>{artifact.stderr}</code></pre> : null}<ul className="mt-3 space-y-2">{evaluation.criteria.map((criterion) => <li className="rounded border p-2" key={criterion.criterion}><p className="font-bold">{criterion.met ? "O" : "×"} {criterion.criterion} · {criterion.earned}/{criterion.possible}</p><p className="mt-1 leading-5">{criterion.rationale}</p><p className="mt-1 text-xs text-muted">근거: {criterion.evidence}</p></li>)}</ul></section>;
}
