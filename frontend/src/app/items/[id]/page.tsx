import { notFound } from "next/navigation";

import { DetailScreen } from "@/features/items/detail-screen";

export const dynamic = "force-dynamic";

async function ensureItemExists(itemId: string) {
  const apiOrigin = process.env.INTERNAL_API_ORIGIN ?? process.env.NEXT_API_ORIGIN;
  if (!apiOrigin) return;

  let response: Response;
  try {
    response = await fetch(`${apiOrigin}/api/v1/samples/${encodeURIComponent(itemId)}`, {
      cache: "no-store",
    });
  } catch {
    // The client adapter keeps its existing retryable error treatment if the API is unavailable.
    return;
  }

  if (response.status === 404) notFound();
}

export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ensureItemExists(id);
  return <DetailScreen />;
}
