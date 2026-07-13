import { Button } from "@/components/ui/button";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-[rgb(var(--surface-muted))] ${className}`} />;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <section className="surface grid min-h-64 place-items-center p-8 text-center">
      <div className="max-w-md space-y-3">
        <span aria-hidden="true" className="text-3xl">◌</span>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
        {action}
      </div>
    </section>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <section aria-live="assertive" className="rounded-xl border border-red-500/40 bg-red-500/10 p-5">
      <h2 className="font-bold text-red-800 dark:text-red-200">We could not load this content</h2>
      <p className="mt-1 text-sm text-red-800/90 dark:text-red-100">{message}</p>
      {onRetry ? <Button className="mt-4" variant="secondary" onClick={onRetry}>Try again</Button> : null}
    </section>
  );
}

export function OfflineBanner() {
  return (
    <p role="status" className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
      You are offline. Previously loaded content remains available.
    </p>
  );
}
