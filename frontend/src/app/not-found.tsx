import Link from "next/link";

import { EmptyState } from "@/components/ui/state-panels";

export default function NotFound() {
  return (
    <EmptyState
      description="This item may have been moved, archived, or removed from the current sample set."
      title="We could not find that item"
      action={<Link className="inline-flex min-h-11 items-center rounded-lg bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))]" href="/items">Return to collection</Link>}
    />
  );
}
