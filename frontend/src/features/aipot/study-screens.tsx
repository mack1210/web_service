"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/patterns/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorPanel, Skeleton } from "@/components/ui/state-panels";
import { useModalFocus } from "@/hooks/use-modal-focus";
import { clearDraft, pageForQuestion, questionsForPage, readDraft, unansweredQuestionNumbers, writeDraft } from "@/lib/aipot-draft";
import { getAipotApi, type AipotAttempt, type AipotExam, type AipotHistory } from "@/lib/api/aipot";
import { AipotPracticeSolver } from "./practice-solver";

const PAGE_SIZE = 5;

function studyDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

function clock(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function answerPreview(answer: string | undefined): string {
  if (!answer?.trim()) return "미응답";
  return answer.length > 18 ? "작성됨" : answer;
}

function submissionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `aipot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AipotDashboard() {
  const [history, setHistory] = useState<AipotHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const nextHistory = await getAipotApi().getHistory();
      setHistory(nextHistory);
      setDrafts(Object.fromEntries(nextHistory.exams.map((exam) => [exam.id, Object.keys(readDraft(exam.id)?.answers ?? {}).filter((key) => Boolean(readDraft(exam.id)?.answers[Number(key)]?.trim())).length])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "학습 현황을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI-POT PRIVATE STUDY"
        title="오늘의 약점을, 다음 정답으로"
        description="세트를 고르고 5문제씩 풉니다. 답안은 이 브라우저에 임시 저장되고, 제출 뒤에는 오답과 챕터별 약점을 바로 확인할 수 있습니다."
      />
      {error ? <ErrorPanel message={error} onRetry={() => void load()} /> : null}
      {!history && !error ? <DashboardSkeleton /> : null}
      {history ? <><WeaknessPanel history={history} /><section aria-labelledby="exam-list-heading"><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">{history.exams.length} sets · 40 questions each</p><h2 className="mt-1 text-xl font-extrabold tracking-tight" id="exam-list-heading">풀 세트 선택</h2></div><p className="text-sm text-muted">원본은 사진 기반 · 창작은 텍스트와 시각 자료 기반</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{history.exams.map((exam) => <ExamCard draftCount={drafts[exam.id] ?? 0} exam={exam} key={exam.id} />)}</div></section><p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-[rgb(var(--foreground))]">개인 학습용 화면입니다. 로그인 기능이 없으므로 민감한 개인정보나 실제 업무 자료를 답안에 입력하지 마세요.</p></> : null}
    </div>
  );
}

function DashboardSkeleton() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton className="h-56" key={index} />)}</div>;
}

function WeaknessPanel({ history }: { history: AipotHistory }) {
  if (!history.weaknesses.length) return <Card className="border-[rgb(var(--primary))/0.25] bg-[rgb(var(--primary-soft))/0.38]"><p className="text-sm font-bold text-[rgb(var(--primary))]">첫 제출을 준비하세요</p><h2 className="mt-1 text-xl font-extrabold">약점 지도는 제출 뒤부터 자랍니다.</h2><p className="mt-2 text-sm leading-6 text-muted">한 세트를 끝까지 풀면 챕터별 점수와 놓친 주제를 모아 다음 복습 순서를 제안합니다.</p></Card>;
  return <section aria-labelledby="weakness-heading" className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]"><Card className="border-amber-500/35 bg-[linear-gradient(135deg,rgb(var(--surface)),rgb(254_243_199/0.55))]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Study signal</p><h2 className="mt-2 text-xl font-extrabold" id="weakness-heading">다음 복습 우선순위</h2><p className="mt-2 text-sm leading-6 text-muted">누적 제출 결과를 기준으로 낮은 챕터부터 보여드립니다.</p></Card><div className="grid gap-3 sm:grid-cols-3">{history.weaknesses.map((weakness) => <Card className="p-4" key={weakness.chapter}><p className="text-xs font-bold text-[rgb(var(--primary))]">{weakness.chapter}</p><p className="mt-2 text-2xl font-extrabold">{weakness.percent.toFixed(0)}%</p><p className="mt-1 line-clamp-2 text-sm font-semibold">{weakness.chapter_title}</p><p className="mt-2 text-xs leading-5 text-muted">{weakness.recommendation}</p></Card>)}</div></section>;
}

function ExamCard({ exam, draftCount }: { exam: AipotHistory["exams"][number]; draftCount: number }) {
  const hasDraft = draftCount > 0;
  return <Card className="flex min-h-56 flex-col border-t-4 border-t-[rgb(var(--primary))] transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-[rgb(var(--surface-muted))] px-2.5 py-1 text-xs font-bold text-[rgb(var(--muted))]">{exam.image_first ? "원본 사진" : "창작 모의"}</span><span className="text-xs font-semibold text-muted">{exam.question_count}문제</span></div><h3 className="mt-4 text-lg font-extrabold leading-7">{exam.title}</h3><div className="mt-3 text-sm leading-6 text-muted">{hasDraft ? `임시 답안 ${draftCount}/40` : exam.last_attempt ? `최근 ${studyDate(exam.last_attempt.submitted_at)} · ${exam.last_attempt.score.toFixed(1)}점` : "아직 제출한 기록이 없습니다."}</div><div className="mt-auto pt-5"><Link className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))] shadow-sm transition hover:bg-[rgb(var(--primary-strong))]" href={`/aipot/solve/${exam.id}?page=1`}>{hasDraft ? "이어서 풀기" : "세트 시작"} <span aria-hidden="true">→</span></Link></div></Card>;
}

export function AipotSolver() {
  return <AipotPracticeSolver />;
}

export function LegacyAipotSolver() {
  const params = useParams<{ examId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = params.examId;
  const [exam, setExam] = useState<AipotExam | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState<"saved" | "failed" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answerBoardOpen, setAnswerBoardOpen] = useState(false);
  const [jumpTarget, setJumpTarget] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitId = useRef(submissionId());

  const totalPages = exam ? Math.ceil(exam.questions.length / PAGE_SIZE) : 8;
  const requestedPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const visibleQuestions = useMemo(() => exam ? questionsForPage(exam.questions, page) : [], [exam, page]);
  const missing = useMemo(() => exam ? unansweredQuestionNumbers(exam.questions, answers) : [], [answers, exam]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const nextExam = await getAipotApi().getExam(examId);
      const draft = readDraft(examId);
      setExam(nextExam);
      setAnswers(draft?.answers ?? {});
      setStartedAt(draft?.startedAt ?? Date.now());
      setHydrated(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "세트를 불러오지 못했습니다.");
    }
  }, [examId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    if (!jumpTarget || page !== pageForQuestion(jumpTarget)) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(questionScrollId(jumpTarget))?.scrollIntoView({ behavior: "smooth", block: "start" });
      setJumpTarget(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [jumpTarget, page]);

  const moveToPage = (nextPage: number) => {
    const target = Number(window.location.hash.replace("#question-", ""));
    if (Number.isInteger(target) && target >= 1 && target <= 40) setJumpTarget(target);
    router.replace(`${pathname}?page=${nextPage}`);
    if (!target) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateAnswer = (number: number, answer: string) => {
    const nextAnswers = { ...answers, [number]: answer };
    setAnswers(nextAnswers);
    if (hydrated) {
      setSaving(writeDraft(examId, { answers: nextAnswers, startedAt }) ? "saved" : "failed");
    }
  };

  const submit = async () => {
    if (!exam) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await getAipotApi().submit(exam.id, { clientSubmissionId: submitId.current, elapsedSeconds: elapsed, answers });
      clearDraft(exam.id);
      router.push(`/aipot/attempts/${result.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "제출에 실패했습니다. 임시 답안은 보존되어 있습니다.");
      setSubmitting(false);
      setConfirming(false);
    }
  };

  if (error && !exam) return <ErrorPanel message={error} onRetry={() => void load()} />;
  if (!exam) return <SolverSkeleton />;
  return <div className="space-y-5"><div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"><div><Link className="text-sm font-semibold text-[rgb(var(--primary))] hover:underline" href="/aipot">← 세트 선택</Link><p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">{exam.image_first ? "SOURCE ROUND" : "GENERATED MOCK"}</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{exam.title}</h1><p className="mt-2 text-sm text-muted">{page}/{totalPages} 페이지 · {visibleQuestions[0]?.number ?? 1}–{visibleQuestions.at(-1)?.number ?? 5}번</p></div><div className="flex items-center gap-3"><div className="rounded-xl border bg-[rgb(var(--surface))] px-3 py-2 text-right"><p className="text-[11px] font-bold uppercase tracking-wider text-muted">풀이 시간</p><p className="font-mono text-lg font-bold">{clock(elapsed)}</p></div><button aria-expanded={answerBoardOpen} className="grid min-h-11 min-w-11 place-items-center rounded-lg border bg-[rgb(var(--surface))] font-bold xl:hidden" onClick={() => setAnswerBoardOpen(true)}>답안</button></div></div>{error ? <ErrorPanel message={error} onRetry={() => setError(null)} /> : null}<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]"><section aria-label="문제 풀이" className="min-w-0 space-y-4"><div className="rounded-xl border border-[rgb(var(--primary))/0.25] bg-[rgb(var(--primary-soft))/0.35] px-4 py-3 text-sm"><span className="font-bold">{Object.values(answers).filter((answer) => answer.trim()).length}/40 응답</span><span className="ml-3 text-muted">{saving === "failed" ? "브라우저 저장소에 저장하지 못했습니다." : "답안은 이 브라우저에 임시 저장됩니다."}</span></div>{visibleQuestions.map((question) => <QuestionCard answer={answers[question.number] ?? ""} key={question.number} question={question} setAnswer={(answer) => updateAnswer(question.number, answer)} />)}<nav aria-label="문제 페이지 이동" className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between"><Button disabled={page === 1 || submitting} onClick={() => moveToPage(page - 1)} variant="secondary">← 이전 5문제</Button>{page < totalPages ? <Button onClick={() => moveToPage(page + 1)}>다음 5문제 →</Button> : <Button disabled={submitting} loading={submitting} onClick={() => setConfirming(true)}>제출하기</Button>}</nav></section><aside className="hidden xl:block"><div className="sticky top-20"><AnswerBoard answers={answers} exam={exam} onSelect={(number) => moveToPage(pageForQuestion(number))} /></div></aside></div><AnswerDrawer answers={answers} exam={exam} onClose={() => setAnswerBoardOpen(false)} onSelect={(number) => { setAnswerBoardOpen(false); moveToPage(pageForQuestion(number)); }} open={answerBoardOpen} /><ConfirmDialog cancelLabel="계속 풀기" confirmLabel={missing.length ? "미응답 포함 제출" : "제출하기"} description={missing.length ? `미응답 문항: ${missing.map((number) => `${number}번`).join(", ")}. 제출 후에는 이 시도를 수정할 수 없지만, 새로 다시 풀 수 있습니다.` : "제출하면 점수와 정답·해설, 챕터별 약점 분석을 바로 확인할 수 있습니다."} loading={submitting} onCancel={() => setConfirming(false)} onConfirm={() => void submit()} open={confirming} title={missing.length ? "미응답 문항이 있습니다" : "답안을 제출할까요?"} /></div>;
}

function SolverSkeleton() {
  return <div className="space-y-5"><Skeleton className="h-24" /><div className="grid gap-6 xl:grid-cols-[1fr_19rem]"><div className="space-y-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div><Skeleton className="hidden h-96 xl:block" /></div></div>;
}

export function questionNumberLabel(number: number): string {
  return `Q${String(number).padStart(2, "0")}`;
}

export function questionScrollId(number: number): string {
  return `question-${number}`;
}

function QuestionCard({ question, answer, setAnswer }: { question: AipotExam["questions"][number]; answer: string; setAnswer: (answer: string) => void }) {
  const choices = question.choices?.length ? question.choices : ["1", "2", "3", "4"];
  const selectedValues = answer.split("|").filter(Boolean);
  const toggleChoice = (value: string) => {
    if (!question.multiple_selection) {
      setAnswer(value);
      return;
    }
    const next = new Set(selectedValues);
    if (next.has(value)) next.delete(value); else next.add(value);
    setAnswer([...next].sort((left, right) => Number(left) - Number(right)).join("|"));
  };
  return <Card aria-labelledby={`question-heading-${question.number}`} className="overflow-hidden p-0" id={questionScrollId(question.number)}><div className="border-b bg-[rgb(var(--surface-muted))/0.55] px-5 py-3"><h2 className="text-xs font-bold text-[rgb(var(--primary))]" id={`question-heading-${question.number}`}>{questionNumberLabel(question.number)}</h2></div><div className="space-y-4 p-5">{question.ocr_text ? <OcrQuestionText text={question.ocr_text} visualAssets={question.visual_assets} /> : null}{question.asset_url ? <figure className="overflow-hidden rounded-xl border bg-slate-950/5"><img alt={`${question.number}번 원본 문제 자료`} className="max-h-[38rem] w-full object-contain" loading="lazy" src={question.asset_url} /><figcaption className="border-t px-3 py-2 text-xs text-muted">원본 문제 자료 · 표, 그래프, 이미지 등 시각 정보를 그대로 확인하세요.</figcaption></figure> : null}{!question.ocr_text ? <p className="text-base leading-7">{question.prompt}</p> : null}{question.type === "multiple_choice" ? <fieldset className="grid gap-2"><legend className="sr-only">{question.number}번 답안{question.multiple_selection ? " (복수 선택 가능)" : ""}</legend>{question.multiple_selection ? <p className="text-sm font-semibold text-[rgb(var(--primary))]">복수 선택 가능</p> : null}{choices.map((choice, index) => { const value = String(index + 1); const checked = question.multiple_selection ? selectedValues.includes(value) : answer === value; return <label className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${checked ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-soft))/0.55]" : "hover:border-[rgb(var(--primary))/0.65]"}`} key={value}><input checked={checked} className="h-4 w-4 accent-[rgb(var(--primary))]" name={`q-${question.number}`} onChange={() => toggleChoice(value)} type={question.multiple_selection ? "checkbox" : "radio"} value={value} /><span><b className="mr-2">{value}.</b>{choice}</span></label>;})}</fieldset> : question.type === "short_answer" ? <label className="block"><span className="sr-only">{question.number}번 짧은 답</span><input className="control w-full" onChange={(event) => setAnswer(event.target.value)} placeholder="짧은 답을 입력하세요" value={answer} /></label> : <label className="block"><span className="sr-only">{question.number}번 실습 답안</span><textarea className="control min-h-48 w-full py-3 leading-6" onChange={(event) => setAnswer(event.target.value)} placeholder="답안을 작성하세요. 목표, 조건, 출력 형식과 검증 방법을 구체적으로 적어보세요." value={answer} /></label>}</div></Card>;
}

type OcrBlock =
  | { type: "line"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; language: string; code: string };

function tableCells(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
}

function isTableSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replaceAll(" ", "")));
}

function nextNonEmptyLine(lines: string[], index: number): number {
  let cursor = index;
  while (cursor < lines.length && !lines[cursor].trim()) cursor += 1;
  return cursor;
}

export function parseOcrBlocks(text: string): OcrBlock[] {
  // Source transcription can use Markdown blockquotes for callouts. Quote
  // markers are presentation syntax, never learner-facing content.
  const lines = text.split("\n").map((line) => line.replace(/^\s*(?:>\s*)+/, ""));
  const blocks: OcrBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const fence = lines[index].trim().match(/^```([a-z0-9_+-]*)\s*$/i);
    if (fence) {
      const codeLines: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length && !lines[cursor].trim().startsWith("```")) {
        codeLines.push(lines[cursor]);
        cursor += 1;
      }
      blocks.push({ type: "code", language: fence[1] || "text", code: codeLines.join("\n") });
      index = cursor < lines.length ? cursor + 1 : cursor;
      continue;
    }
    const header = tableCells(lines[index]);
    const separatorIndex = nextNonEmptyLine(lines, index + 1);
    const separator = header ? tableCells(lines[separatorIndex] ?? "") : null;
    if (header && separator && isTableSeparator(separator)) {
      const rows: string[][] = [];
      let cursor = separatorIndex + 1;
      while (cursor < lines.length) {
        const rowIndex = nextNonEmptyLine(lines, cursor);
        const row = tableCells(lines[rowIndex] ?? "");
        if (!row) break;
        rows.push(row);
        cursor = rowIndex + 1;
      }
      if (rows.length) {
        blocks.push({ type: "table", headers: header, rows });
        index = cursor;
        continue;
      }
    }
    if (lines[index].trim()) blocks.push({ type: "line", text: lines[index].trim() });
    index += 1;
  }
  return blocks;
}

type OcrVisualAsset = { marker: string; asset_url: string; alt: string; keep_marker_text?: boolean; replace_following_block?: boolean };

export function OcrQuestionText({ text, visualAssets = [] }: { text: string; visualAssets?: OcrVisualAsset[] }) {
  const blocks = parseOcrBlocks(text);
  return <div className="space-y-2 text-[15px] leading-7">{blocks.map((block, index) => {
    const previous = blocks[index - 1];
    const previousVisual = previous?.type === "line" ? visualAssets.find((asset) => previous.text.includes(asset.marker)) : undefined;
    if (previousVisual?.replace_following_block) return null;
    if (block.type === "code") return <pre className="overflow-x-auto rounded-lg border bg-slate-950 px-4 py-3 text-sm leading-6 text-slate-100" key={index}><code data-language={block.language}>{block.code}</code></pre>;
    if (block.type === "table") return <OcrTable headers={block.headers} key={index} rows={block.rows} />;
    const line = block.text;
    const visual = visualAssets.find((asset) => line.includes(asset.marker));
    if (visual) return <div className="space-y-2" key={index}><figure className="overflow-hidden rounded-lg border bg-slate-950/5"><img alt={visual.alt} className="max-h-[32rem] w-full object-contain" loading="lazy" src={visual.asset_url} /></figure>{visual.keep_marker_text ? <p><InlineOcrText text={line} /></p> : null}</div>;
    if (line.startsWith("### ")) return <h3 className="pt-1 text-base font-extrabold" key={index}>{line.slice(4)}</h3>;
    if (line.startsWith("- ")) return <p className="pl-4" key={index}>• <InlineOcrText text={line.slice(2)} /></p>;
    return <p className={/^\d+\. /.test(line) ? "pl-4" : ""} key={index}><InlineOcrText text={line} /></p>;
  })}</div>;
}

function OcrTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[32rem] border-collapse text-left text-sm leading-6"><thead className="bg-[rgb(var(--surface-muted))/0.65]"><tr>{headers.map((header, index) => <th className="border-b px-3 py-2 font-bold align-top" key={index}><InlineOcrText text={header} /></th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr className="border-b last:border-b-0" key={rowIndex}>{headers.map((_, cellIndex) => <td className="px-3 py-2 align-top" key={cellIndex}><InlineOcrText text={row[cellIndex] ?? ""} /></td>)}</tr>)}</tbody></table></div>;
}

function InlineOcrText({ text }: { text: string }) {
  const pieces = text.split(/(`[^`]*`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|<br\s*\/?>)/gi);
  return <>{pieces.map((piece, index) => {
    if (/^<br\s*\/?>$/i.test(piece)) return <br key={index} />;
    if (piece.startsWith("`") && piece.endsWith("`")) return <code className="rounded bg-[rgb(var(--surface-muted))] px-1 py-0.5 text-[0.92em]" key={index}>{piece.slice(1, -1)}</code>;
    if (piece.startsWith("**") && piece.endsWith("**")) return <strong key={index}>{piece.slice(2, -2)}</strong>;
    const link = piece.match(/^\[([^\]]+)\]\([^)]+\)$/);
    // OCR is untrusted content: retain the readable label, never create or
    // follow a URL, and never inject raw HTML into the page.
    if (link) return <span key={index}>{link[1]}</span>;
    return <span key={index}>{piece}</span>;
  })}</>;
}

function AnswerBoard({ exam, answers, onSelect }: { exam: AipotExam; answers: Record<number, string>; onSelect: (number: number) => void }) {
  const select = (number: number) => {
    window.history.replaceState(null, "", `#${questionScrollId(number)}`);
    document.getElementById(questionScrollId(number))?.scrollIntoView({ behavior: "smooth", block: "start" });
    onSelect(number);
  };

  return <details className="rounded-xl border bg-[rgb(var(--surface))] shadow-panel" open><summary className="cursor-pointer list-none px-4 py-4 font-bold"><span>답안 보드</span><span className="ml-2 text-sm font-normal text-muted">{Object.values(answers).filter((answer) => answer.trim()).length}/40</span></summary><div className="border-t p-3"><p className="mb-3 text-xs leading-5 text-muted">번호를 누르면 해당 문항 위치로 바로 이동합니다. 미응답은 비어 있습니다.</p><ol className="grid grid-cols-2 gap-2">{exam.questions.map((question) => { const answered = Boolean(answers[question.number]?.trim()); return <li key={question.number}><button className={`flex min-h-11 w-full items-center gap-2 rounded-lg border px-2 text-left text-xs transition ${answered ? "border-[rgb(var(--primary))/0.35] bg-[rgb(var(--primary-soft))/0.45]" : "hover:border-[rgb(var(--primary))/0.65]"}`} onClick={() => select(question.number)}><span className="font-bold">{question.number}</span><span className="truncate text-muted">{answerPreview(answers[question.number])}</span></button></li>; })}</ol></div></details>;
}

function AnswerDrawer({ open, exam, answers, onSelect, onClose }: { open: boolean; exam: AipotExam; answers: Record<number, string>; onSelect: (number: number) => void; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useModalFocus({ active: open, containerRef: panelRef, initialFocusRef: closeRef, onEscape: onClose });
  if (!open) return null;
  return <div className="fixed inset-0 z-50 xl:hidden"><button aria-label="답안 보드 닫기" className="absolute inset-0 bg-slate-950/50" onClick={onClose} /><aside aria-label="답안 보드" aria-modal="true" className="absolute inset-y-0 right-0 w-[min(90vw,24rem)] overflow-y-auto bg-[rgb(var(--surface))] p-4 shadow-2xl" ref={panelRef} role="dialog" tabIndex={-1}><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold">답안 보드</h2><Button onClick={onClose} ref={closeRef} variant="secondary">닫기</Button></div><AnswerBoard answers={answers} exam={exam} onSelect={onSelect} /></aside></div>;
}

export function reviewTone(score: number, possibleScore: number): "correct" | "incorrect" {
  return score >= possibleScore ? "correct" : "incorrect";
}

function ReviewItem({ review }: { review: AipotAttempt["reviews"][number] }) {
  const tone = reviewTone(review.score, review.possible_score);
  const correct = tone === "correct";
  const classes = correct
    ? "border-blue-500 bg-blue-500/10 text-blue-950 dark:text-blue-100"
    : "border-red-500 bg-red-500/10 text-red-950 dark:text-red-100";

  return <details className={`rounded-xl border-2 p-4 ${classes}`} key={review.number}>
    <summary className="cursor-pointer font-bold"><span className={correct ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}>Q{String(review.number).padStart(2, "0")} · {correct ? "정답" : "오답/보완 필요"}</span><span className="ml-2 text-sm font-normal opacity-80">{review.score.toFixed(1)}/{review.possible_score.toFixed(1)} · {review.topic}</span></summary>
    <dl className="mt-4 grid gap-3 text-sm"><div><dt className="font-bold opacity-75">내 답안</dt><dd className="mt-1 whitespace-pre-wrap font-semibold">{review.submitted_answer || "미응답"}</dd></div>{review.correct_answer ? <div><dt className="font-bold opacity-75">정답</dt><dd className="mt-1 font-bold text-blue-700 dark:text-blue-300">{review.correct_answer}</dd></div> : null}{review.explanation ? <div><dt className="font-bold opacity-75">해설</dt><dd className="mt-1 leading-6">{review.explanation}</dd></div> : null}{review.missing?.length ? <div><dt className="font-bold opacity-75">보완할 요소</dt><dd className="mt-1">{review.missing.join(" · ")}</dd></div> : null}</dl>{review.evaluation ? <ReviewEvidence evaluation={review.evaluation} /> : null}
  </details>;
}

function ReviewEvidence({ evaluation }: { evaluation: NonNullable<AipotAttempt["reviews"][number]["evaluation"]> }) {
  const artifact = evaluation.artifact;
  return <section className="mt-4 rounded-lg border p-3 text-sm"><h3 className="font-extrabold">실제 실행 결과와 채점 근거</h3><p className="mt-1 text-xs text-muted">{evaluation.input_summary} · {evaluation.executor_model}</p>{artifact.asset_url ? <img alt="프롬프트 실행 결과" className="mt-3 max-h-[32rem] w-full rounded border object-contain" src={artifact.asset_url} /> : null}{artifact.text ? <pre className="mt-3 max-h-64 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-50"><code>{artifact.text}</code></pre> : null}{artifact.stdout ? <pre className="mt-3 max-h-48 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-50"><code>{artifact.stdout}</code></pre> : null}<ul className="mt-3 space-y-2">{evaluation.criteria.map((criterion) => <li className="rounded border p-2" key={criterion.criterion}><strong>{criterion.met ? "O" : "×"} {criterion.criterion} · {criterion.earned}/{criterion.possible}</strong><p className="mt-1">{criterion.rationale}</p><p className="mt-1 text-xs text-muted">근거: {criterion.evidence}</p></li>)}</ul></section>;
}

export function AipotAttemptReview() {
  const params = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<AipotAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyMissed, setOnlyMissed] = useState(false);
  const load = useCallback(async () => {
    setError(null);
    try { setAttempt(await getAipotApi().getAttempt(params.attemptId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "제출 결과를 불러오지 못했습니다."); }
  }, [params.attemptId]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  if (error) return <ErrorPanel message={error} onRetry={() => void load()} />;
  if (!attempt) return <SolverSkeleton />;
  const reviews = onlyMissed ? attempt.reviews.filter((review) => review.score < review.possible_score) : attempt.reviews;
  return <div className="space-y-6"><PageHeader eyebrow="SUBMISSION REVIEW" title="채점 결과" description={`${attempt.answered_count}/40 응답 · ${Math.max(1, Math.round(attempt.elapsed_seconds / 60))}분 풀이`} actions={<Link className="inline-flex min-h-11 items-center rounded-lg bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))]" href={`/aipot/solve/${attempt.exam_id}?page=1`}>새로 다시 풀기</Link>} /><Card className="border-2 border-[rgb(var(--primary))] bg-[rgb(var(--primary-soft))/0.45] text-center"><p className="text-sm font-bold text-[rgb(var(--primary))]">총점</p><p className="mt-1 text-5xl font-extrabold tracking-tight">{attempt.score.toFixed(1)}<span className="ml-1 text-2xl">/ 100점</span></p><p className="mt-2 text-sm text-muted">이 제출과 답안은 프로젝트 학습 기록에 저장되었습니다.</p></Card><section aria-label="챕터별 분석" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{attempt.chapters.map((chapter) => <Card className={chapter.percent < 80 ? "border-amber-500/40" : ""} key={chapter.chapter}><p className="text-xs font-bold text-[rgb(var(--primary))]">{chapter.chapter}</p><p className="mt-2 text-3xl font-extrabold">{chapter.percent.toFixed(0)}%</p><p className="mt-2 text-sm font-semibold">{chapter.chapter_title}</p><p className="mt-2 text-xs leading-5 text-muted">{chapter.recommendation}</p></Card>)}</section><section aria-labelledby="review-heading"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Answer review</p><h2 className="mt-1 text-xl font-extrabold" id="review-heading">내 답안과 정답</h2></div><Button onClick={() => setOnlyMissed((value) => !value)} variant="secondary">{onlyMissed ? "전체 보기" : "오답만 보기"}</Button></div><div className="space-y-3">{reviews.map((review) => <ReviewItem key={review.number} review={review} />)}</div>{!reviews.length ? <EmptyState title="표시할 오답이 없습니다" description="전체 문항을 다시 보거나 다음 세트에 도전해 보세요." /> : null}</section></div>;
}
