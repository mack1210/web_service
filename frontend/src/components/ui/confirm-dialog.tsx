"use client";

import { useRef } from "react";

import { useModalFocus } from "@/hooks/use-modal-focus";

import { Button } from "./button";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  loading = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useModalFocus({
    active: open,
    containerRef: dialogRef,
    initialFocusRef: confirmRef,
    onEscape: loading ? undefined : onCancel,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="presentation">
      <button aria-label="Close dialog" className="absolute inset-0 z-0 bg-slate-950/50" disabled={loading} onClick={onCancel} />
      <section aria-describedby="confirm-dialog-description" aria-labelledby="confirm-dialog-title" aria-modal="true" className="relative z-10 w-full max-w-md rounded-xl border bg-[rgb(var(--surface))] p-6 shadow-2xl" ref={dialogRef} role="dialog" tabIndex={-1}>
        <h2 className="text-lg font-bold" id="confirm-dialog-title">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted" id="confirm-dialog-description">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button disabled={loading} onClick={onCancel} variant="secondary">Cancel</Button>
          <Button loading={loading} onClick={onConfirm} ref={confirmRef}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}
