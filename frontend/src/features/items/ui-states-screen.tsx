"use client";

import { useState } from "react";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorPanel, OfflineBanner, Skeleton } from "@/components/ui/state-panels";
import { sampleDetails } from "@/mocks/samples";

const scenarios = ["normal", "loading", "slow", "empty", "no-results", "partial", "error", "offline", "unauthorized", "rate-limited"] as const;
type Scenario = (typeof scenarios)[number];

export function UiStatesScreen() {
  const [scenario, setScenario] = useState<Scenario>("normal");
  return (
    <div>
      <PageHeader eyebrow="Development gallery" title="Inspect every important UI state" description="This route is intentionally available in development builds for fast visual and accessibility review before data sources are complete." />
      <Card className="mb-6">
        <label className="grid max-w-sm gap-2 text-sm font-semibold">Scenario
          <select aria-label="Choose UI scenario" className="min-h-11 rounded-lg border bg-[rgb(var(--surface))] px-3 font-normal" onChange={(event) => setScenario(event.target.value as Scenario)} value={scenario}>
            {scenarios.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <div className="mt-4 flex flex-wrap gap-2">{scenarios.map((option) => <Button key={option} onClick={() => setScenario(option)} variant={scenario === option ? "primary" : "secondary"}>{option}</Button>)}</div>
      </Card>
      <StatePreview onSelect={setScenario} scenario={scenario} />
    </div>
  );
}

function StatePreview({ scenario, onSelect }: { scenario: Scenario; onSelect: (scenario: Scenario) => void }) {
  if (scenario === "loading" || scenario === "slow") return <div aria-live="polite" className="space-y-3"><p className="text-sm text-muted">{scenario === "slow" ? "Keeping prior layout stable while a slow request is in progress." : "Loading the final content shape."}</p>{[0, 1, 2].map((item) => <Skeleton className="h-36" key={item} />)}</div>;
  if (scenario === "empty") return <EmptyState title="No samples yet" description="Start by adding a sample source. This empty state explains the first useful action instead of showing a blank page." action={<Button onClick={() => onSelect("normal")}>Preview sample contract</Button>} />;
  if (scenario === "no-results") return <EmptyState title="No matching samples" description="The exact search term and active filters remain visible in a real collection view." action={<Button onClick={() => onSelect("normal")}>Clear filters</Button>} />;
  if (scenario === "error") return <ErrorPanel message="The collection request failed. Retry is available in context." onRetry={() => onSelect("loading")} />;
  if (scenario === "offline") return <div className="space-y-4"><OfflineBanner /><NormalPreview /></div>;
  if (scenario === "unauthorized") return <ErrorPanel message="Your session does not have access to this sample. Sign in with an authorized account, then return to this URL." />;
  if (scenario === "rate-limited") return <ErrorPanel message="Too many requests were made. Wait 30 seconds, then retry; your filters and search term remain preserved." onRetry={() => onSelect("loading")} />;
  if (scenario === "partial") return <div className="space-y-4"><p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">Partial data: optional image metadata is unavailable. The accessible data remains visible.</p><NormalPreview /></div>;
  return <NormalPreview />;
}

function NormalPreview() {
  const item = sampleDetails[0];
  return <Card><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="space-y-2"><StatusBadge status={item.status} /><h2 className="break-words text-lg font-bold">{item.title}</h2><p className="text-sm text-muted">{item.description}</p></div><div className="flex flex-wrap gap-1.5">{item.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div></div></Card>;
}
