import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { cn, initials } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "success" | "warning" | "dark";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent-600 text-white shadow-sm hover:bg-accent-500 focus-visible:outline-accent-600",
  secondary: "bg-white text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-500 focus-visible:outline-red-600",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-slate-400",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 focus-visible:outline-emerald-600",
  warning: "bg-amber-500 text-white shadow-sm hover:bg-amber-400 focus-visible:outline-amber-500",
  dark: "bg-slate-900 text-white shadow-sm hover:bg-slate-800 focus-visible:outline-slate-900",
};
const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-3.5 text-sm",
  lg: "h-11 px-5 text-sm",
};

/**
 * Every interactive control shares the same motion contract: 150ms for
 * colour, and a 150ms press-scale that confirms the click registered. Both are
 * state feedback, not decoration, and both collapse under reduced-motion.
 */
const MOTION = "transition-colors duration-150 ease-[var(--ease-standard)] active:scale-[0.98]";

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return cn(
    `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold ${MOTION} focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100`,
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  target,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  target?: string;
}) {
  return (
    <Link href={href} target={target} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-sm", className)}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <div className="mt-0.5 shrink-0 text-slate-400">{icon}</div> : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  backHref,
  backLabel,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="size-3.5" /> {backLabel ?? "Back"}
          </Link>
        ) : null}
        {eyebrow ? <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent-600">{eyebrow}</div> : null}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.7rem]">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon ? (
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 ring-8 ring-slate-50">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200/70", className)} />;
}

/**
 * Error counterpart to EmptyState. Errors are the one place a second hue is
 * justified - red carries urgency that the accent cannot - but everything else
 * stays neutral so the message, not the colour, is the focal point.
 */
export function ErrorState({
  title = "Something went wrong",
  description,
  detail,
  action,
  className,
}: {
  title?: string;
  description?: string;
  detail?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}
    >
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-red-50 text-red-600 ring-8 ring-red-50/60">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {detail ? (
        <p className="mt-3 max-w-md break-words rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-500">
          {detail}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Loading skeletons
 *
 * One set of shapes shared by every route's loading.tsx, so a page never
 * reshuffles when it resolves: the placeholder mirrors the real layout
 * (header, toolbar, table, detail, form) instead of a generic spinner.
 * ------------------------------------------------------------------ */

export function SkeletonHeader() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-2xl" />
      ))}
    </div>
  );
}

export function SkeletonToolbar({ width = "w-full max-w-2xl" }: { width?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Skeleton className={`h-10 ${width}`} />
      <Skeleton className="h-10 w-40" />
    </div>
  );
}

export function SkeletonTable({ rows = 8, cells = 5 }: { rows?: number; cells?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-24" />
          </div>
          {Array.from({ length: Math.max(0, cells - 3) }).map((_, c) => (
            <Skeleton key={c} className="hidden h-6 w-20 md:block" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

export function SkeletonForm({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2 sm:col-span-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

const TONES = {
  indigo: "bg-accent-50 text-accent-600",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-50 text-violet-600",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "slate",
  href,
  alert,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof TONES;
  href?: string;
  alert?: boolean;
}) {
  const body = (
    <Card
      className={cn(
        "relative h-full overflow-hidden p-4 transition duration-150",
        href && "hover:border-slate-300 hover:shadow-md",
        alert && "border-red-200 ring-1 ring-red-100",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-xs font-medium", alert ? "text-red-700" : "text-slate-500")}>{label}</p>
          {/* The one number on the page allowed to dominate. Everything else
              in the grid stays at the quiet uniform size so the breach count is
              the first thing read. */}
          <p
            className={cn(
              "mt-1.5 font-bold tracking-tight tabular-nums",
              alert ? "text-4xl text-red-700" : "text-2xl text-slate-900",
            )}
          >
            {value}
          </p>
        </div>
        {icon ? (
          <div className={cn("grid shrink-0 place-items-center rounded-xl", alert ? "size-11" : "size-9", TONES[tone])}>
            {alert ? <span className="[&>svg]:size-5">{icon}</span> : icon}
          </div>
        ) : null}
      </div>
      {hint ? <p className={cn("mt-2 text-xs", alert ? "text-red-600/80" : "text-slate-500")}>{hint}</p> : null}
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export const inputClass =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-accent-600 disabled:bg-slate-50 disabled:text-slate-500";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function DetailGrid({
  items,
  className,
}: {
  items: { label: string; value: ReactNode; mono?: boolean; full?: boolean }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-3.5", className)}>
      {items.map((item) => (
        <div key={item.label} className={cn("min-w-0", item.full && "col-span-2")}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{item.label}</dt>
          <dd className={cn("mt-0.5 break-words text-sm text-slate-800", item.mono && "font-mono text-[13px]")}>
            {item.value === null || item.value === undefined || item.value === "" ? (
              <span className="text-slate-300">—</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const AVATAR_COLORS = [
  "bg-accent-100 text-accent-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

export function Avatar({ name, size = "sm" }: { name: string; size?: "xs" | "sm" | "md" }) {
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const sz = size === "xs" ? "size-5 text-[9px]" : size === "md" ? "size-9 text-xs" : "size-7 text-[10px]";
  return (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-full font-bold", sz, AVATAR_COLORS[idx])}>
      {initials(name)}
    </span>
  );
}

export function KeyValueChips({ data, className }: { data: Record<string, string>; className?: string }) {
  const entries = Object.entries(data ?? {}).filter(([, v]) => v);
  if (!entries.length) return <p className="text-sm text-slate-400">None recorded</p>;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {entries.map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-xs ring-1 ring-inset ring-slate-200">
          <span className="text-slate-500">{k}:</span>
          <span className="font-medium text-slate-800">{v}</span>
        </span>
      ))}
    </div>
  );
}
