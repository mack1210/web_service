"use client";

import { useTheme, type Theme } from "./theme-provider";

const choices: Array<{ value: Theme; label: string; symbol: string }> = [
  { value: "light", label: "Light theme", symbol: "☀" },
  { value: "dark", label: "Dark theme", symbol: "◐" },
  { value: "system", label: "Use system theme", symbol: "◌" },
];

export function ThemeControl({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div aria-label="Theme preference" className="flex items-center gap-1 rounded-lg border bg-[rgb(var(--surface-muted))] p-1" role="group">
      {choices.map((choice) => (
        <button
          aria-label={choice.label}
          aria-pressed={theme === choice.value}
          className={`grid min-h-11 min-w-11 place-items-center rounded-md text-sm transition ${
            theme === choice.value
              ? "bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] shadow-sm"
              : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
          }`}
          key={choice.value}
          onClick={() => setTheme(choice.value)}
          title={choice.label}
          type="button"
        >
          <span aria-hidden="true">{choice.symbol}</span>
          {!compact ? <span className="sr-only">{choice.label}</span> : null}
        </button>
      ))}
    </div>
  );
}
