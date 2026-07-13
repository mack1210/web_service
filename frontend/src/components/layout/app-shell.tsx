"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

import { useModalFocus } from "@/hooks/use-modal-focus";
import { cn } from "@/lib/utils";

import { ThemeControl } from "./theme-control";

const navigation = [
  { href: "/", label: "Overview", symbol: "◫" },
  { href: "/items", label: "Collection", symbol: "≡" },
  { href: "/settings", label: "Settings", symbol: "⚙" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary navigation" className="space-y-1">
      {navigation.map((item) => {
        const current = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
              current
                ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                : "text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]",
            )}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            <span aria-hidden="true" className="grid h-6 w-6 place-items-center text-base">{item.symbol}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  useModalFocus({
    active: drawerOpen,
    containerRef: drawerRef,
    initialFocusRef: drawerCloseRef,
    onEscape: () => setDrawerOpen(false),
  });

  return (
    <div className="min-h-dvh bg-[rgb(var(--background))] lg:pl-64">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-[rgb(var(--surface))] p-4 lg:block">
        <Brand />
        <NavLinks />
        <div className="absolute bottom-5 left-4 right-4">
          <ThemeControl />
        </div>
      </aside>

      <header aria-hidden={drawerOpen || undefined} className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b bg-[rgb(var(--background))/0.94] px-4 backdrop-blur lg:px-8">
        <button
          aria-controls="mobile-navigation"
          aria-expanded={drawerOpen}
          aria-label="Open navigation menu"
          className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-[rgb(var(--surface-muted))] lg:hidden"
          onClick={() => setDrawerOpen(true)}
        >
          <span aria-hidden="true" className="text-xl">☰</span>
        </button>
        <p className="text-sm font-semibold text-[rgb(var(--muted))]">Typed workflow frame</p>
        <div className="lg:hidden"><ThemeControl compact /></div>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            aria-label="Mobile navigation"
            className="relative h-full w-[min(86vw,20rem)] bg-[rgb(var(--surface))] p-4 shadow-2xl"
            id="mobile-navigation"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button
                aria-label="Close navigation menu"
                className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-[rgb(var(--surface-muted))]"
                onClick={() => setDrawerOpen(false)}
                ref={drawerCloseRef}
              >
                <span aria-hidden="true" className="text-xl">×</span>
              </button>
            </div>
            <NavLinks onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <main aria-hidden={drawerOpen || undefined} className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8" id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

function Brand() {
  return (
    <Link className="mb-8 flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-none" href="/">
      <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-[rgb(var(--primary))] text-lg font-black text-[rgb(var(--primary-foreground))]">O</span>
      <span>
        <span className="block text-sm font-extrabold tracking-tight">Orbit Frame</span>
        <span className="block text-xs text-muted">Operational workspace</span>
      </span>
    </Link>
  );
}
