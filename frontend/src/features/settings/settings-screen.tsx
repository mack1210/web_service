"use client";

import { useState } from "react";

import { PageHeader } from "@/components/patterns/page-header";
import { ThemeControl } from "@/components/layout/theme-control";
import { useTheme } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function SettingsScreen() {
  const { setTheme } = useTheme();
  const [notice, setNotice] = useState<string | null>(null);

  const reset = () => {
    window.localStorage.removeItem("overnight-web-theme");
    setTheme("system");
    setNotice("Theme preference reset to your system setting.");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Choose a comfortable workspace"
        description="This frame intentionally keeps preferences small: theme and presentation choices belong here, while search context stays in the URL."
      />
      <div className="grid max-w-3xl gap-6">
        <Card aria-labelledby="theme-heading">
          <h2 className="text-lg font-bold" id="theme-heading">Theme</h2>
          <p className="mt-1 text-sm text-muted">Light, dark, and system choices persist locally and respect reduced-motion preferences.</p>
          <div className="mt-4"><ThemeControl /></div>
          <Button className="mt-4" onClick={reset} variant="secondary">Reset to system default</Button>
          {notice ? <p aria-live="polite" className="mt-3 text-sm text-green-700 dark:text-green-300">{notice}</p> : null}
        </Card>
        <Card aria-labelledby="data-heading">
          <h2 className="text-lg font-bold" id="data-heading">Data adapter</h2>
          <p className="mt-2 text-sm leading-6 text-muted">The UI uses a shared TypeScript contract. Local development uses fixtures by default; production Compose builds with `NEXT_PUBLIC_DATA_SOURCE=http` so the same screens call FastAPI at `/api/v1/*`.</p>
        </Card>
      </div>
    </div>
  );
}
