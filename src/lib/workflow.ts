import type { Role, TicketStatus } from "@/db/schema";

export const TICKET_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "PENDING_PARTS", "RESOLVED", "CLOSED"];
export const ACTIVE_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "PENDING_PARTS"];

export const STATUS_META: Record<TicketStatus, { label: string; badge: string; dot: string; description: string }> = {
  OPEN: {
    label: "Open",
    badge: "bg-sky-50 text-sky-700 ring-sky-600/20",
    dot: "bg-sky-500",
    description: "Logged and awaiting a technician",
  },
  IN_PROGRESS: {
    label: "In progress",
    badge: "bg-violet-50 text-violet-700 ring-violet-600/20",
    dot: "bg-violet-500",
    description: "Technician actively working",
  },
  PENDING_PARTS: {
    label: "Pending parts",
    badge: "bg-amber-50 text-amber-800 ring-amber-600/25",
    dot: "bg-amber-500",
    description: "Waiting on parts / vendor — resolution clock paused",
  },
  RESOLVED: {
    label: "Resolved",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
    description: "Fix applied, awaiting closure",
  },
  CLOSED: {
    label: "Closed",
    badge: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-400",
    description: "Archived",
  },
};

export type TransitionIntent = "primary" | "warning" | "success" | "danger" | "secondary";
export type NoteRequirement = "resolution" | "parts" | "reason";

export interface Transition {
  to: TicketStatus;
  label: string;
  intent: TransitionIntent;
  requiresNote?: NoteRequirement;
  roles?: Role[];
}

/** Ticket lifecycle state machine: OPEN → IN_PROGRESS → PENDING_PARTS → RESOLVED → CLOSED */
export const TRANSITIONS: Record<TicketStatus, Transition[]> = {
  OPEN: [
    { to: "IN_PROGRESS", label: "Start work", intent: "primary" },
    { to: "CLOSED", label: "Cancel ticket", intent: "danger", requiresNote: "reason", roles: ["ADMIN", "MANAGER"] },
  ],
  IN_PROGRESS: [
    { to: "PENDING_PARTS", label: "Awaiting parts", intent: "warning", requiresNote: "parts" },
    { to: "RESOLVED", label: "Mark resolved", intent: "success", requiresNote: "resolution" },
    { to: "OPEN", label: "Release to queue", intent: "secondary" },
  ],
  PENDING_PARTS: [
    { to: "IN_PROGRESS", label: "Parts received — resume", intent: "primary" },
    { to: "RESOLVED", label: "Mark resolved", intent: "success", requiresNote: "resolution" },
  ],
  RESOLVED: [
    { to: "CLOSED", label: "Close ticket", intent: "secondary" },
    { to: "IN_PROGRESS", label: "Reopen", intent: "warning", requiresNote: "reason" },
  ],
  CLOSED: [{ to: "OPEN", label: "Reopen ticket", intent: "warning", requiresNote: "reason", roles: ["ADMIN", "MANAGER"] }],
};

export const NOTE_PROMPTS: Record<NoteRequirement, { title: string; placeholder: string }> = {
  resolution: {
    title: "Resolution summary",
    placeholder: "Root cause, fix applied, parts used and verification performed…",
  },
  parts: { title: "Parts / vendor details", placeholder: "Part number, supplier, PO reference and ETA…" },
  reason: { title: "Reason", placeholder: "Why is this ticket being cancelled / reopened?" },
};

export function isStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && (TICKET_STATUSES as string[]).includes(value);
}

export function getAllowedTransitions(from: TicketStatus, role: Role): Transition[] {
  if (role === "TENANT") return [];
  return TRANSITIONS[from].filter((t) => !t.roles || t.roles.includes(role));
}

export function findTransition(from: TicketStatus, to: TicketStatus, role: Role): Transition | undefined {
  return getAllowedTransitions(from, role).find((t) => t.to === to);
}

/** Linear stepper used on public tracking + workbench header. */
export const STATUS_STEPS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "PENDING_PARTS", "RESOLVED", "CLOSED"];
