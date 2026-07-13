import { forwardRef } from "react";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  variant?: Variant;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-sm hover:bg-[rgb(var(--primary-strong))] disabled:bg-[rgb(var(--muted))]",
  secondary:
    "border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] hover:border-[rgb(var(--primary))] hover:bg-[rgb(var(--surface-muted))]",
  ghost: "text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-muted))]",
  danger: "bg-[rgb(var(--danger))] text-white hover:brightness-110",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = "primary",
    loading = false,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-65",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      ref={ref}
      type={type}
      {...props}
    >
      {loading ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : null}
      {children}
    </button>
  );
});
