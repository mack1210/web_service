import { Suspense } from "react";

import { ItemsScreen } from "@/features/items/items-screen";
import { Skeleton } from "@/components/ui/state-panels";

export default function ItemsPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><ItemsScreen /></Suspense>;
}
