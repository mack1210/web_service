import { Skeleton } from "@/components/ui/state-panels";

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" aria-label="Loading page" className="space-y-6" role="status">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-full max-w-2xl" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => <Skeleton className="h-36" key={item} />)}
      </div>
    </div>
  );
}
