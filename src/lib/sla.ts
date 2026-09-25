import type { Criticality, ImpactScope, Priority, SystemDomain, TicketStatus } from "@/db/schema";
import { findIssue, type IssueType } from "./domains";

export const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];

export interface SlaPolicy {
  label: string;
  responseMinutes: number;
  resolutionMinutes: number;
  summary: string;
  examples: string[];
  badge: string;
  dot: string;
  text: string;
}

/**
 * SLA policy matrix — the single source of truth for response / resolution targets.
 * Response = time to first technician engagement (IN_PROGRESS or PENDING_PARTS).
 * Resolution = time to RESOLVED, excluding time spent in PENDING_PARTS (clock paused).
 */
export const SLA_POLICY: Record<Priority, SlaPolicy> = {
  P1: {
    label: "Urgent",
    responseMinutes: 30,
    resolutionMinutes: 240,
    summary: "Life-safety, perimeter security or building-wide loss of service",
    examples: ["Total power / water outage", "Main entrance biometric lock failure", "Primary PBX host down"],
    badge: "bg-red-600 text-white ring-red-600",
    dot: "bg-red-500",
    text: "text-red-600",
  },
  P2: {
    label: "High",
    responseMinutes: 120,
    resolutionMinutes: 480,
    summary: "Commercial trading impact or localized fault affecting a unit",
    examples: ["Commercial POS / thermal printer failure", "Localized plumbing leak", "Unit door lock / reader fault"],
    badge: "bg-orange-500 text-white ring-orange-500",
    dot: "bg-orange-500",
    text: "text-orange-600",
  },
  P3: {
    label: "Normal",
    responseMinutes: 480,
    resolutionMinutes: 4320,
    summary: "Degraded but workable — standard service request",
    examples: ["Standard workstation tweak", "Sub-meter check", "Single camera offline"],
    badge: "bg-sky-100 text-sky-800 ring-sky-600/25",
    dot: "bg-sky-500",
    text: "text-sky-700",
  },
  P4: {
    label: "Low",
    responseMinutes: 1440,
    resolutionMinutes: 7200,
    summary: "Routine inquiry, enrolment or consumables",
    examples: ["Routine inquiry", "Fingerprint enrolment", "Paper rolls / consumables"],
    badge: "bg-slate-100 text-slate-700 ring-slate-500/25",
    dot: "bg-slate-400",
    text: "text-slate-600",
  },
};

const LEVEL: Record<Priority, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
const fromLevel = (n: number): Priority => `P${Math.min(4, Math.max(1, n))}` as Priority;

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (PRIORITIES as string[]).includes(value);
}

export interface ClassifyInput {
  domain: SystemDomain;
  issueCode: string;
  impactScope: ImpactScope;
  safetyHazard?: boolean;
  assetCriticality?: Criticality | null;
}

export interface ClassifyResult {
  priority: Priority;
  basePriority: Priority;
  issue: IssueType | undefined;
  responseMinutes: number;
  resolutionMinutes: number;
  trace: string[];
}

/**
 * Deterministic SLA engine. Same input => same output, always.
 * Rule order: (1) catalog base priority, (2) building-wide scope escalation,
 * (3) critical-asset escalation for service-affecting faults, (4) safety override.
 */
export function classifyTicket(input: ClassifyInput): ClassifyResult {
  const issue = findIssue(input.domain, input.issueCode);
  const trace: string[] = [];
  const basePriority: Priority = issue?.basePriority ?? "P3";
  let level = LEVEL[basePriority];

  if (issue) {
    trace.push(`R1 base rule: ${issue.code} (${issue.label}) = ${basePriority}`);
  } else {
    trace.push(`R1 base rule: unknown issue code "${input.issueCode}", defaulted to P3`);
  }

  if (input.impactScope === "BUILDING" && level > 1) {
    const before = fromLevel(level);
    level -= 1;
    trace.push(`R2 scope BUILDING: escalated ${before} to ${fromLevel(level)}`);
  } else {
    trace.push(`R2 scope ${input.impactScope}: no change`);
  }

  if (input.assetCriticality === "CRITICAL" && issue?.serviceAffecting && level > 1) {
    const before = fromLevel(level);
    level -= 1;
    trace.push(`R3 critical asset + service-affecting fault: escalated ${before} to ${fromLevel(level)}`);
  } else if (input.assetCriticality) {
    trace.push(`R3 asset criticality ${input.assetCriticality}: no change`);
  }

  if (input.safetyHazard && level > 1) {
    trace.push(`R4 safety hazard flagged: forced ${fromLevel(level)} to P1`);
    level = 1;
  }

  const priority = fromLevel(level);
  const policy = SLA_POLICY[priority];
  trace.push(
    `Result ${priority} ${policy.label}: respond within ${formatMinutes(policy.responseMinutes)}, resolve within ${formatMinutes(policy.resolutionMinutes)}`,
  );

  return {
    priority,
    basePriority,
    issue,
    responseMinutes: policy.responseMinutes,
    resolutionMinutes: policy.resolutionMinutes,
    trace,
  };
}

export function computeDueDates(priority: Priority, from: Date = new Date()) {
  const policy = SLA_POLICY[priority];
  return {
    responseDueAt: new Date(from.getTime() + policy.responseMinutes * 60_000),
    resolutionDueAt: new Date(from.getTime() + policy.resolutionMinutes * 60_000),
  };
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  if (mins < 1440) return `${+(mins / 60).toFixed(1)} h`;
  return `${+(mins / 1440).toFixed(1)} d`;
}

export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const s = Math.floor(abs / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

export type TimerStatus = "ON_TRACK" | "AT_RISK" | "BREACHED" | "MET" | "MISSED" | "PAUSED" | "CANCELLED";

export interface TimerEval {
  status: TimerStatus;
  dueAt: Date;
  remainingMs: number;
  progress: number;
  completedAt: Date | null;
}

export const TIMER_META: Record<TimerStatus, { label: string; badge: string; bar: string }> = {
  ON_TRACK: { label: "On track", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", bar: "bg-emerald-500" },
  AT_RISK: { label: "At risk", badge: "bg-amber-50 text-amber-700 ring-amber-600/25", bar: "bg-amber-500" },
  BREACHED: { label: "Breached", badge: "bg-red-50 text-red-700 ring-red-600/25", bar: "bg-red-500" },
  MET: { label: "Met", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", bar: "bg-emerald-500" },
  MISSED: { label: "Missed", badge: "bg-red-50 text-red-700 ring-red-600/25", bar: "bg-red-400" },
  PAUSED: { label: "Paused", badge: "bg-amber-50 text-amber-800 ring-amber-600/25", bar: "bg-amber-400" },
  CANCELLED: { label: "N/A", badge: "bg-slate-100 text-slate-500 ring-slate-500/20", bar: "bg-slate-300" },
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function evaluateTimer(
  startedAt: Date,
  dueAt: Date,
  completedAt: Date | null,
  now: Date,
  pausedAt?: Date | null,
): TimerEval {
  const total = Math.max(1, dueAt.getTime() - startedAt.getTime());
  if (completedAt) {
    return {
      status: completedAt.getTime() <= dueAt.getTime() ? "MET" : "MISSED",
      dueAt,
      remainingMs: dueAt.getTime() - completedAt.getTime(),
      progress: clamp01((completedAt.getTime() - startedAt.getTime()) / total),
      completedAt,
    };
  }
  const ref = pausedAt ?? now;
  const remainingMs = dueAt.getTime() - ref.getTime();
  const progress = clamp01((ref.getTime() - startedAt.getTime()) / total);
  let status: TimerStatus = "ON_TRACK";
  if (remainingMs < 0) status = "BREACHED";
  else if (pausedAt) status = "PAUSED";
  else if (remainingMs < total * 0.25) status = "AT_RISK";
  return { status, dueAt, remainingMs, progress, completedAt: null };
}

export interface SlaFields {
  status: TicketStatus;
  createdAt: Date | string;
  responseDueAt: Date | string;
  resolutionDueAt: Date | string;
  firstResponseAt: Date | string | null;
  resolvedAt: Date | string | null;
  closedAt?: Date | string | null;
  slaPausedAt: Date | string | null;
}

const toDate = (v: Date | string | null | undefined) => (v ? new Date(v) : null);

export function evaluateTicketSla(t: SlaFields, now: Date = new Date()) {
  const created = new Date(t.createdAt);
  const cancelled = t.status === "CLOSED" && !t.resolvedAt;
  const closedAt = toDate(t.closedAt);
  const response = evaluateTimer(
    created,
    new Date(t.responseDueAt),
    toDate(t.firstResponseAt) ?? (cancelled ? closedAt ?? now : null),
    now,
  );
  const resolution = evaluateTimer(
    created,
    new Date(t.resolutionDueAt),
    toDate(t.resolvedAt) ?? (cancelled ? closedAt ?? now : null),
    now,
    toDate(t.slaPausedAt),
  );
  if (cancelled) {
    response.status = "CANCELLED";
    resolution.status = "CANCELLED";
  }
  let overall: TimerStatus;
  if (cancelled) overall = "CANCELLED";
  else if (response.status === "BREACHED" || resolution.status === "BREACHED") overall = "BREACHED";
  else if (resolution.status === "PAUSED") overall = "PAUSED";
  else if (response.status === "AT_RISK" || resolution.status === "AT_RISK") overall = "AT_RISK";
  else if (resolution.status === "MET" || resolution.status === "MISSED") overall = resolution.status;
  else overall = "ON_TRACK";
  return { response, resolution, overall };
}
