import type { Metadata } from "next";

import { UiStatesScreen } from "@/features/items/ui-states-screen";

export const metadata: Metadata = {
  title: "UI state gallery",
  robots: { index: false, follow: false },
};

export default function UiStatesPage() {
  return <UiStatesScreen />;
}
