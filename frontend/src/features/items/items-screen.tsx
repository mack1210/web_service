"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorPanel, Skeleton } from "@/components/ui/state-panels";
import { useModalFocus } from "@/hooks/use-modal-focus";
import { getSampleApi } from "@/lib/api/adapter";
import type { ListSamplesInput, SampleListResponse, SampleStatus, SortOption } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

const statuses: Array<{ value: "" | SampleStatus; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "ready", label: "Ready" },
  { value: "processing", label: "Processing" },
  { value: "attention", label: "Needs attention" },
  { value: "archived", label: "Archived" },
];

function inputFromParams(params: URLSearchParams): ListSamplesInput {
  const status = params.get("status") as SampleStatus | null;
  const sort = params.get("sort") as SortOption | null;
  return {
    q: params.get("q") || undefined,
    status: status ?? undefined,
    sort: sort ?? "updated",
  };
}

export function ItemsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => inputFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [data, setData] = useState<SampleListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await getSampleApi().listSamples(filters));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The collection could not be loaded.");
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const update = useCallback((next: Partial<ListSamplesInput>) => {
    const combined = { ...filters, ...next };
    const params = new URLSearchParams();
    if (combined.q) params.set("q", combined.q);
    if (combined.status) params.set("status", combined.status);
    if (combined.sort && combined.sort !== "updated") params.set("sort", combined.sort);
    const suffix = params.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  const controls = (
    <fieldset className="grid gap-3 sm:grid-cols-3">
      <legend className="sr-only">Collection filters</legend>
      <label className="grid gap-1.5 text-sm font-semibold">
        Search
        <SearchControl initialQuery={filters.q ?? ""} key={filters.q ?? ""} onQueryChange={(q) => update({ q: q || undefined })} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Status
        <select aria-label="Filter by status" className="control w-full font-normal" onChange={(event) => update({ status: (event.target.value || undefined) as SampleStatus | undefined })} value={filters.status ?? ""}>
          {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Sort
        <select aria-label="Sort samples" className="control w-full font-normal" onChange={(event) => update({ sort: event.target.value as SortOption })} value={filters.sort ?? "updated"}>
          <option value="updated">Recently updated</option>
          <option value="score">Quality score</option>
          <option value="title">Title A–Z</option>
        </select>
      </label>
    </fieldset>
  );

  return (
    <div aria-busy={!data && !error}>
      <PageHeader
        eyebrow="Collection"
        title="Find an item without losing your place"
        description="Search, status filters, and sorting live in the URL so the context survives a detail visit and browser back navigation."
        actions={<Button variant="secondary" onClick={() => setMobileFiltersOpen(true)} className="sm:hidden">Filters</Button>}
      />
      <div className="mb-5 hidden rounded-xl border bg-[rgb(var(--surface-muted))] p-4 sm:block">{controls}</div>
      {mobileFiltersOpen ? <MobileFilters onClose={() => setMobileFiltersOpen(false)}>{controls}</MobileFilters> : null}
      {data?.partial ? <p role="status" className="mb-5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">Partial data: {(data.missing_sources ?? []).join(", ")} is currently unavailable. Remaining samples are still usable.</p> : null}
      {data ? <p aria-live="polite" className="sr-only">{data.total} result{data.total === 1 ? "" : "s"} available.</p> : null}
      {error ? <ErrorPanel message={error} onRetry={() => void load()} /> : null}
      {!data && !error ? <ListSkeleton /> : null}
      {data && data.total === 0 ? <NoResults filters={filters} onClear={() => update({ q: undefined, status: undefined, sort: "updated" })} /> : null}
      {data && data.total > 0 ? <ItemList items={data.items} /> : null}
    </div>
  );
}

function SearchControl({ initialQuery, onQueryChange }: { initialQuery: string; onQueryChange: (query: string) => void }) {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    if (query === initialQuery) return;
    const timer = window.setTimeout(() => onQueryChange(query), 250);
    return () => window.clearTimeout(timer);
  }, [initialQuery, onQueryChange, query]);

  return <input aria-label="Search samples" className="control w-full font-normal" onChange={(event) => setQuery(event.target.value)} placeholder="Title, tag, or identifier" value={query} />;
}

function ItemList({ items }: Pick<SampleListResponse, "items">) {
  return (
    <section aria-label="Sample results" className="grid gap-3">
      {items.map((item) => (
        <Card className="p-0" key={item.id}>
          <Link className="block rounded-xl p-5 transition hover:bg-[rgb(var(--surface-muted))]" href={`/items/${item.id}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={item.status} />{item.missing_fields?.length ? <Badge>Partial metadata</Badge> : null}</div>
                <h2 className="break-words text-lg font-bold">{item.title}</h2>
                {item.subtitle ? <p className="break-all font-mono text-xs text-muted">{item.subtitle}</p> : null}
                <p className="text-sm text-muted">{item.owner} · Updated {formatDate(item.updated_at)}</p>
              </div>
              <div className="flex max-w-full flex-wrap gap-1.5 lg:max-w-64 lg:justify-end">{item.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
            </div>
          </Link>
        </Card>
      ))}
    </section>
  );
}

function NoResults({ filters, onClear }: { filters: ListSamplesInput; onClear: () => void }) {
  return <EmptyState title="No matching samples" description={`No result matches “${filters.q ?? "your current filters"}”. Clear filters to see the full collection.`} action={<Button onClick={onClear}>Clear filters</Button>} />;
}

function ListSkeleton() {
  return <div className="space-y-3">{[0, 1, 2].map((item) => <Skeleton className="h-44" key={item} />)}</div>;
}

function MobileFilters({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);

  useModalFocus({
    active: true,
    containerRef: dialogRef,
    initialFocusRef: doneRef,
    onEscape: onClose,
  });

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <button aria-label="Close filters" className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <section aria-labelledby="mobile-filters-heading" aria-modal="true" className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-[rgb(var(--surface))] p-5 shadow-2xl" ref={dialogRef} role="dialog" tabIndex={-1}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold" id="mobile-filters-heading">Filters</h2><Button ref={doneRef} variant="ghost" onClick={onClose}>Done</Button></div>
        {children}
      </section>
    </div>
  );
}
