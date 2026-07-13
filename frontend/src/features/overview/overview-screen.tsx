"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorPanel, Skeleton } from "@/components/ui/state-panels";
import { getSampleApi } from "@/lib/api/adapter";
import type { AppMeta, SampleListResponse } from "@/lib/api/types";
import { formatDate, formatPercent } from "@/lib/utils";

export function OverviewScreen() {
  const [data, setData] = useState<SampleListResponse | null>(null);
  const [meta, setMeta] = useState<AppMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    setError(null);
    setRefreshing(isRefresh);
    try {
      const api = getSampleApi();
      const [nextData, nextMeta] = await Promise.all([api.listSamples(), api.getMeta()]);
      setData(nextData);
      setMeta(nextMeta);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The overview could not be loaded.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <PageHeader
        eyebrow="Workspace pulse"
        title="Know what needs attention next"
        description="A responsive operational frame with one complete path: inspect, find, understand, and safely act."
        actions={<Link className="inline-flex min-h-11 items-center rounded-lg bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))]" href="/items">Browse collection <span aria-hidden="true">→</span></Link>}
      />

      {error ? <ErrorPanel message={error} onRetry={() => void load()} /> : null}
      {!data && !error ? <OverviewSkeleton /> : null}
      {data ? (
        <div className="space-y-6">
          <section aria-label="Overview metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Available samples" value={String(data.total)} detail="Typed, searchable fixtures" />
            <Metric label="Needs attention" value={String(data.items.filter((item) => item.status === "attention").length)} detail="Partial data is surfaced" tone="warning" />
            <Metric label="Highest quality" value={formatPercent(Math.max(...data.items.map((item) => item.score)) / 100)} detail="Representative score" tone="success" />
            <Metric label="Contract version" value={meta?.version ?? "…"} detail={meta ? `Updated ${formatDate(meta.generated_at)}` : "Loading metadata"} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card aria-labelledby="recent-heading">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold" id="recent-heading">Recent items</h2>
                  <p className="mt-1 text-sm text-muted">Continue from a sample or open the full collection.</p>
                </div>
                <button className="min-h-11 rounded-lg px-3 text-sm font-semibold text-[rgb(var(--primary))] hover:bg-[rgb(var(--surface-muted))]" disabled={refreshing} onClick={() => void load(true)}>{refreshing ? "Refreshing…" : "Refresh"}</button>
              </div>
              <ul className="divide-y">
                {data.items.slice(0, 3).map((item) => (
                  <li className="py-4 first:pt-0 last:pb-0" key={item.id}>
                    <Link className="group flex flex-col gap-3 rounded-lg sm:flex-row sm:items-center sm:justify-between" href={`/items/${item.id}`}>
                      <span className="min-w-0">
                        <span className="block break-words font-semibold group-hover:text-[rgb(var(--primary))]">{item.title}</span>
                        <span className="mt-1 block text-sm text-muted">{item.owner} · {formatDate(item.updated_at)}</span>
                      </span>
                      <StatusBadge status={item.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card aria-labelledby="frame-heading">
              <h2 className="text-lg font-bold" id="frame-heading">Frame checklist</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  "URL-preserved search and filters",
                  "Mock and HTTP adapters share one contract",
                  "Keyboard, dark mode, and mobile drawer ready",
                ].map((item) => <li className="flex gap-3" key={item}><span aria-hidden="true" className="text-green-600">✓</span><span>{item}</span></li>)}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2"><Badge>320px+</Badge><Badge>FastAPI</Badge><Badge>OpenAPI</Badge></div>
            </Card>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "warning" | "success" }) {
  const toneClass = tone === "warning" ? "border-amber-500/40" : tone === "success" ? "border-green-500/40" : "";
  return <Card className={`min-h-36 ${toneClass}`}><p className="text-sm font-semibold text-muted">{label}</p><p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p><p className="mt-2 text-xs text-muted">{detail}</p></Card>;
}

function OverviewSkeleton() {
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton className="h-36" key={item} />)}</div><Skeleton className="h-80" /></div>;
}
