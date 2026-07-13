"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorPanel, Skeleton } from "@/components/ui/state-panels";
import { getSampleApi, RequestError } from "@/lib/api/adapter";
import type { ActionResponse, SampleDetail } from "@/lib/api/types";
import { formatDate, formatPercent } from "@/lib/utils";

export function DetailScreen() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<SampleDetail | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDetail(await getSampleApi().getSample(params.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason : new Error("The detail could not be loaded."));
    }
  }, [params.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (error instanceof RequestError && error.status === 404) return <MissingItemState />;
  if (error) return <ErrorPanel message={error.message} onRetry={() => void load()} />;
  if (!detail) return <DetailSkeleton />;

  return (
    <div aria-busy={!detail}>
      <PageHeader
        eyebrow="Sample detail"
        title={detail.title}
        description={detail.description}
        actions={<Link className="inline-flex min-h-11 items-center rounded-lg border bg-[rgb(var(--surface))] px-4 py-2 text-sm font-semibold hover:bg-[rgb(var(--surface-muted))]" href="/items">← Back to collection</Link>}
      />
      <div className="mb-5 flex flex-wrap gap-2"><StatusBadge status={detail.status} />{detail.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <Card aria-labelledby="code-heading">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h2 className="font-bold" id="code-heading">Python preview</h2><p className="mt-1 text-sm text-muted">Long lines scroll inside the code block, not across the page.</p></div><CopyCode code={detail.code} /></div>
            <pre className="max-h-[34rem] overflow-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100"><code>{detail.code}</code></pre>
          </Card>
          {detail.traceback ? <Card aria-labelledby="traceback-heading"><details><summary className="cursor-pointer font-bold" id="traceback-heading">Show safe traceback context</summary><pre className="mt-4 overflow-auto rounded-lg bg-red-950/30 p-4 text-xs leading-5 text-red-100">{detail.traceback}</pre></details></Card> : null}
          <Card aria-labelledby="attributes-heading"><h2 className="font-bold" id="attributes-heading">Input attributes</h2><dl className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(detail.attributes).map(([key, value]) => <div className="rounded-lg bg-[rgb(var(--surface-muted))] p-3" key={key}><dt className="text-xs font-semibold uppercase tracking-wide text-muted">{key.replaceAll("_", " ")}</dt><dd className="mt-1 break-words text-sm">{value === null ? "Not provided" : String(value)}</dd></div>)}</dl></Card>
        </div>
        <aside aria-label="Sample actions and execution signals" className="min-w-0 space-y-6">
          <ActionPanel itemId={detail.id} />
          <Card aria-labelledby="metrics-heading"><h2 className="font-bold" id="metrics-heading">Execution signals</h2><dl className="mt-4 space-y-4"><Metric label="Executions" value={detail.metrics.executions.toLocaleString()} /><Metric label="Success rate" value={formatPercent(detail.metrics.success_rate)} /><Metric label="Median duration" value={`${detail.metrics.median_duration_ms.toLocaleString()} ms`} /><Metric label="Quality score" value={detail.score.toFixed(4)} /><Metric label="Updated" value={formatDate(detail.updated_at)} /></dl></Card>
        </aside>
      </div>
    </div>
  );
}

function ActionPanel({ itemId }: { itemId: string }) {
  const [confirming, setConfirming] = useState<"success" | "failure" | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const run = async () => {
    if (!confirming || runningRef.current) return;
    runningRef.current = true;
    setPending(true);
    setError(null);
    try {
      setResult(await getSampleApi().runAction(itemId, { action: "validate", force_failure: confirming === "failure" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The action did not complete.");
    } finally {
      runningRef.current = false;
      setPending(false);
      setConfirming(null);
    }
  };

  return (
    <Card aria-labelledby="action-heading">
      <h2 className="font-bold" id="action-heading">Representative action</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Run a safe validation to see pending, success, failure, and recovery states without executing arbitrary user code.</p>
      <div className="mt-4 grid gap-2"><Button loading={pending} onClick={() => setConfirming("success")}>Validate input</Button><Button disabled={pending} variant="secondary" onClick={() => setConfirming("failure")}>Simulate recoverable failure</Button></div>
      {pending ? <p aria-live="polite" className="mt-4 text-sm text-muted">Validation is running…</p> : null}
      {error ? <p aria-live="assertive" className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-100">{error}</p> : null}
      {result ? <ActionResult result={result} /> : null}
      <ConfirmDialog
        confirmLabel={confirming === "failure" ? "Simulate failure" : "Run validation"}
        description={confirming === "failure" ? "This uses the API's explicit safe-failure path and preserves your detail context." : "This checks the representative input contract and returns a structured result."}
        onCancel={() => setConfirming(null)}
        onConfirm={() => void run()}
        open={Boolean(confirming)}
        loading={pending}
        title={confirming === "failure" ? "Simulate a recoverable failure?" : "Run validation?"}
      />
    </Card>
  );
}

function ActionResult({ result }: { result: ActionResponse }) {
  const ok = result.status === "succeeded";
  return <div aria-live="polite" className={`mt-4 rounded-lg border p-4 ${ok ? "border-green-500/40 bg-green-500/10" : "border-red-500/40 bg-red-500/10"}`}><p className="font-bold">{ok ? "Validation succeeded" : "Action needs attention"}</p><p className="mt-1 text-sm">{result.message}</p><dl className="mt-3 grid gap-2 text-xs">{Object.entries(result.result).map(([key, value]) => <div className="flex justify-between gap-3" key={key}><dt className="text-muted">{key.replaceAll("_", " ")}</dt><dd className="font-semibold">{String(value)}</dd></div>)}</dl></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="flex items-baseline justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"><dt className="text-sm text-muted">{label}</dt><dd className="max-w-[60%] break-words text-right text-sm font-bold">{value}</dd></div>;
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError(true);
    }
  };
  return <div className="grid justify-items-start gap-1 sm:justify-items-end"><Button aria-live="polite" onClick={() => void copy()} variant="secondary">{copied ? "Copied" : "Copy code"}</Button>{copyError ? <p aria-live="assertive" className="text-xs text-red-700 dark:text-red-200">Copy failed. Select the code and copy it manually.</p> : null}</div>;
}

function DetailSkeleton() {
  return <div className="space-y-6"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-72" /><Skeleton className="h-44" /></div>;
}

function MissingItemState() {
  return <EmptyState title="This item is unavailable" description="It may have been removed or the link may be incomplete. Return to the collection to choose another sample." action={<Link className="inline-flex min-h-11 items-center rounded-lg bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))]" href="/items">Back to collection</Link>} />;
}
