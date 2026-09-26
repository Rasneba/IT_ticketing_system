"use client";

import { useEffect, useState } from "react";
import { Clock, PauseCircle } from "lucide-react";
import { evaluateTicketSla, formatDuration, TIMER_META, type SlaFields, type TimerEval } from "@/lib/sla";
import { cn, formatDateTime } from "@/lib/utils";

export function useNow(initial: number, interval = 1000) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

function timerText(t: TimerEval) {
  switch (t.status) {
    case "BREACHED":
      return `${formatDuration(-t.remainingMs)} over`;
    case "PAUSED":
      return `Paused · ${formatDuration(t.remainingMs)} left`;
    case "MET":
      return `Met · ${formatDuration(t.remainingMs)} spare`;
    case "MISSED":
      return `Missed by ${formatDuration(-t.remainingMs)}`;
    case "CANCELLED":
      return "Not applicable";
    default:
      return `${formatDuration(t.remainingMs)} left`;
  }
}

/** Compact SLA indicator used in tables & watchlists. */
export function SlaPill({ sla, serverNow }: { sla: SlaFields; serverNow: number }) {
  const now = useNow(serverNow, 10_000);
  const { response, resolution } = evaluateTicketSla(sla, new Date(now));
  const useResponse = !sla.firstResponseAt && response.status !== "CANCELLED";
  const t = useResponse ? response : resolution;
  const meta = TIMER_META[t.status];
  const short =
    t.status === "BREACHED"
      ? `-${formatDuration(-t.remainingMs)}`
      : t.status === "PAUSED"
        ? "Paused"
        : t.status === "MET" || t.status === "MISSED" || t.status === "CANCELLED"
          ? meta.label
          : formatDuration(t.remainingMs);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset",
        meta.badge,
      )}
      title={`${useResponse ? "Response" : "Resolution"} SLA · ${meta.label}`}
    >
      {t.status === "PAUSED" ? <PauseCircle className="size-3" /> : <Clock className="size-3" />}
      <span className="opacity-70">{useResponse ? "Resp" : "Fix"}</span>
      {short}
    </span>
  );
}

/** Large live SLA timer card used on the Resolution Workbench. */
export function SlaTimerCard({
  kind,
  sla,
  serverNow,
  targetLabel,
}: {
  kind: "response" | "resolution";
  sla: SlaFields;
  serverNow: number;
  targetLabel: string;
}) {
  const now = useNow(serverNow, 1000);
  const evals = evaluateTicketSla(sla, new Date(now));
  const t = evals[kind];
  const meta = TIMER_META[t.status];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {kind === "response" ? "Response SLA" : "Resolution SLA"}
          </p>
          <p className="text-[11px] text-slate-400">Target {targetLabel}</p>
        </div>
        <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", meta.badge)}>{meta.label}</span>
      </div>
      <p
        className={cn(
          "mt-3 text-xl font-bold tabular-nums tracking-tight",
          t.status === "BREACHED" || t.status === "MISSED"
            ? "text-red-600"
            : t.status === "AT_RISK" || t.status === "PAUSED"
              ? "text-amber-600"
              : "text-slate-900",
        )}
        suppressHydrationWarning
      >
        {timerText(t)}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-[width] duration-300 ease-[var(--ease-standard)]", meta.bar)} style={{ width: `${Math.round(t.progress * 100)}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-slate-500" suppressHydrationWarning>
        {t.completedAt ? `Completed ${formatDateTime(t.completedAt)}` : `Due ${formatDateTime(t.dueAt)}`}
      </p>
    </div>
  );
}
