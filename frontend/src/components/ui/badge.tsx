import { cn } from "@/lib/utils";
import type { SampleStatus } from "@/lib/api/types";

const colors: Record<SampleStatus, string> = {
  ready: "bg-green-500/15 text-green-700 dark:text-green-300",
  processing: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  attention: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  archived: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

export function StatusBadge({ status }: { status: SampleStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", colors[status])}>
      <span aria-hidden="true">●</span>
      {status}
    </span>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center rounded-full bg-[rgb(var(--surface-muted))] px-2.5 py-1 text-xs font-medium text-[rgb(var(--muted))]", className)}>
      <span className="truncate">{children}</span>
    </span>
  );
}
