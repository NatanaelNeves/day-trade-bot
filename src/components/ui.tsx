"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

export function cn(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}

/* ---------------- Spinner ---------------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]",
        className ?? "h-4 w-4"
      )}
      aria-hidden
    />
  );
}

/* ---------------- Button ---------------- */
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  outline: "btn-outline",
  ghost: "btn-ghost",
  danger: "border border-neg/30 text-neg hover:bg-neg/10",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn("btn", size === "sm" ? "btn-sm" : "btn-md", VARIANTS[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Spinner className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("card", className)}>{children}</div>;
}

/* ---------------- SectionHeader ---------------- */
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
        {subtitle && <p className="mt-1 text-xs leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ---------------- Field ---------------- */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="text-[11px] leading-snug text-faint">{hint}</span>}
    </label>
  );
}

/* ---------------- Stat ---------------- */
type Tone = "pos" | "neg" | "neutral" | "accent";
const TONE_TEXT: Record<Tone, string> = {
  pos: "text-pos",
  neg: "text-neg",
  accent: "text-accent-strong",
  neutral: "text-fg",
};

export function Stat({
  label,
  value,
  tone = "neutral",
  sub,
  size = "md",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  sub?: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <div className="card px-4 py-3.5 transition-colors duration-150 hover:border-faint/30">
      <div className="text-xs text-muted">{label}</div>
      <div
        className={cn(
          "tnum mt-1 font-semibold tracking-tight",
          size === "lg" ? "text-2xl" : "text-lg",
          TONE_TEXT[tone]
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-faint">{sub}</div>}
    </div>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "pos" | "neg" | "accent" | "warn" | "neutral";
  children: ReactNode;
}) {
  const cls = {
    pos: "badge-pos",
    neg: "badge-neg",
    accent: "badge-accent",
    warn: "badge-warn",
    neutral: "badge-neutral",
  }[tone];
  return <span className={cn("badge", cls)}>{children}</span>;
}

/* ---------------- Skeleton ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/* ---------------- EmptyState ---------------- */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-3xl opacity-70">{icon}</div>}
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Banner ---------------- */
export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "error" | "success";
  children: ReactNode;
}) {
  const map = {
    info: "border-line bg-elevated/50 text-muted",
    warn: "border-warn/25 bg-warn/10 text-warn",
    error: "border-neg/30 bg-neg/10 text-neg",
    success: "border-pos/30 bg-pos/10 text-pos",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", map[tone])}>
      {children}
    </div>
  );
}
