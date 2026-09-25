"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Check,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Lock,
  MessageSquare,
  Pencil,
  Send,
  Sparkles,
  Trash2,
  UserCog,
} from "lucide-react";
import type { NoteType, Priority, Role, SystemDomain, TicketStatus } from "@/db/schema";
import {
  addAuditCaptureAction,
  addNoteAction,
  assignTicketAction,
  deleteTicketAction,
  overridePriorityAction,
  transitionTicketAction,
  updateTicketAction,
} from "@/app/actions/tickets";
import { CAPTURE_TYPES, maskSecret } from "@/lib/audit-captures";
import { PRIORITIES, SLA_POLICY } from "@/lib/sla";
import { getAllowedTransitions, NOTE_PROMPTS, STATUS_META, STATUS_STEPS, type Transition } from "@/lib/workflow";
import { ROLE_META } from "@/lib/domains";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { Avatar, Card, CardHeader, buttonClass, inputClass, Field } from "@/components/ui";
import { Modal, Spinner } from "@/components/form-controls";
import { PriorityBadge, StatusBadge } from "@/components/badges";

export type NoteView = {
  id: string;
  type: NoteType;
  body: string;
  authorName: string;
  authorRole: Role | null;
  isPublic: boolean;
  createdAt: string;
  pending?: boolean;
  metadata: {
    from?: string;
    to?: string;
    captureType?: string;
    fields?: Record<string, string>;
    sensitiveKeys?: string[];
    masked?: boolean;
    trace?: string[];
    pausedMinutes?: number;
    slaRestarted?: boolean;
  };
};

/* ------------------------------ Lifecycle panel ----------------------------- */

export function LifecyclePanel({
  ticketId,
  status,
  role,
  pausedMinutes,
}: {
  ticketId: string;
  status: TicketStatus;
  role: Role;
  pausedMinutes: number;
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<Transition | null>(null);
  const [note, setNote] = useState("");
  const transitions = getAllowedTransitions(optimisticStatus, role);
  const currentIdx = STATUS_STEPS.indexOf(optimisticStatus);

  const run = (t: Transition, noteText?: string) => {
    setModal(null);
    startTransition(async () => {
      setOptimisticStatus(t.to);
      const res = await transitionTicketAction({ ticketId, to: t.to, note: noteText });
      if (res.ok) toast.success(res.message ?? "Status updated");
      else toast.error(res.error);
    });
  };

  const intentVariant = (i: Transition["intent"]) =>
    i === "primary" ? "primary" : i === "success" ? "success" : i === "warning" ? "warning" : i === "danger" ? "danger" : "secondary";

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolution workbench</p>
          <div className="mt-1.5 flex items-center gap-2">
            <StatusBadge status={optimisticStatus} />
            {pending ? <Spinner className="text-slate-400" /> : null}
            <span className="text-xs text-slate-500">{STATUS_META[optimisticStatus].description}</span>
          </div>
        </div>
        {transitions.length ? (
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <button
                key={t.to}
                type="button"
                disabled={pending}
                onClick={() => {
                  if (t.requiresNote) {
                    setNote("");
                    setModal(t);
                  } else run(t);
                }}
                className={buttonClass(intentVariant(t.intent), "md")}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : role === "TENANT" ? null : (
          <p className="text-xs text-slate-400">No transitions available for your role.</p>
        )}
      </div>
      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <ol className="flex items-center gap-1 overflow-x-auto">
          {STATUS_STEPS.map((s, i) => {
            const done = i < currentIdx;
            const current = i === currentIdx;
            return (
              <li key={s} className="flex flex-1 items-center gap-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                      done ? "bg-emerald-500 text-white" : current ? cn(STATUS_META[s].dot, "text-white ring-4 ring-white") : "bg-slate-200 text-slate-500",
                    )}
                  >
                    {done ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span className={cn("whitespace-nowrap text-[11px] font-medium", current ? "text-slate-900" : "text-slate-500")}>
                    {STATUS_META[s].label}
                  </span>
                </div>
                {i < STATUS_STEPS.length - 1 ? <span className={cn("mx-1 h-px min-w-3 flex-1", done ? "bg-emerald-400" : "bg-slate-200")} /> : null}
              </li>
            );
          })}
        </ol>
        {pausedMinutes > 0 ? <p className="mt-2 text-[11px] text-amber-700">Resolution clock paused {pausedMinutes} min in total while pending parts.</p> : null}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.label ?? ""} description={modal?.requiresNote ? NOTE_PROMPTS[modal.requiresNote].title : undefined}>
        {modal ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return toast.error(`${NOTE_PROMPTS[modal.requiresNote!].title} is required`);
              run(modal, note);
            }}
            className="space-y-4"
          >
            <textarea
              autoFocus
              rows={5}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
              placeholder={NOTE_PROMPTS[modal.requiresNote!].placeholder}
            />
            {modal.to === "PENDING_PARTS" ? (
              <p className="text-xs text-amber-700">The resolution SLA clock pauses until parts are received.</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className={buttonClass("secondary")}>
                Cancel
              </button>
              <button type="submit" className={buttonClass(intentVariant(modal.intent))}>
                {modal.label}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </Card>
  );
}

/* -------------------------------- Dispatch -------------------------------- */

export function DispatchCard({
  ticketId,
  assigneeId,
  assigneeName,
  staff,
  domain,
  priority,
  canOverride,
  meId,
}: {
  ticketId: string;
  assigneeId: string | null;
  assigneeName: string | null;
  staff: { id: string; name: string; skills: string[]; role: Role }[];
  domain: SystemDomain;
  priority: Priority;
  canOverride: boolean;
  meId: string;
}) {
  const [optimisticAssignee, setOptimisticAssignee] = useOptimistic(assigneeId ?? "");
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [newPriority, setNewPriority] = useState<Priority>(priority);
  const [reason, setReason] = useState("");

  const assign = (id: string) =>
    startTransition(async () => {
      setOptimisticAssignee(id);
      const res = await assignTicketAction({ ticketId, assigneeId: id || null });
      if (res.ok) {
        if (res.message) toast.success(res.message);
      } else toast.error(res.error);
    });

  const current = staff.find((s) => s.id === optimisticAssignee);

  return (
    <Card>
      <CardHeader title="Dispatch" description="Assignment & SLA override" icon={<UserCog className="size-4" />} />
      <div className="space-y-4 px-5 py-4">
        <div className="flex items-center gap-3">
          {current || assigneeName ? (
            <Avatar name={current?.name ?? assigneeName ?? "?"} size="md" />
          ) : (
            <span className="grid size-9 place-items-center rounded-full border border-dashed border-slate-300 text-slate-400">?</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{current?.name ?? (optimisticAssignee ? assigneeName : "Unassigned")}</p>
            <p className="text-xs text-slate-500">{current ? ROLE_META[current.role].label : "Awaiting dispatch"}</p>
          </div>
          {pending ? <Spinner className="text-slate-400" /> : null}
        </div>
        <select value={optimisticAssignee} onChange={(e) => assign(e.target.value)} disabled={pending} className={inputClass}>
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.skills.includes(domain) ? " ★ skilled" : ""}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {optimisticAssignee !== meId ? (
            <button type="button" onClick={() => assign(meId)} disabled={pending} className={buttonClass("secondary", "sm")}>
              Assign to me
            </button>
          ) : null}
          {canOverride ? (
            <button
              type="button"
              onClick={() => {
                setNewPriority(priority === "P1" ? "P2" : "P1");
                setReason("");
                setOpen(true);
              }}
              className={buttonClass("ghost", "sm")}
            >
              <ArrowRightLeft className="size-3.5" /> Override priority
            </button>
          ) : null}
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Override SLA priority" description="Overrides are logged in the audit trail and the decision trace.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await overridePriorityAction({ ticketId, priority: newPriority, reason });
              if (res.ok) {
                toast.success(res.message ?? "Priority updated");
                setOpen(false);
              } else toast.error(res.error);
            });
          }}
        >
          <div className="grid grid-cols-4 gap-2">
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setNewPriority(p)}
                className={cn("rounded-xl border p-2 text-center", newPriority === p ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200")}
              >
                <PriorityBadge priority={p} showLabel={false} />
                <p className="mt-1 text-[11px] text-slate-500">{SLA_POLICY[p].label}</p>
              </button>
            ))}
          </div>
          <Field label="Reason" required>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="e.g. Tenant trading event tonight — escalate." />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary")}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={buttonClass("primary")}>
              {pending ? <Spinner /> : null} Apply override
            </button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

/* -------------------------------- Timeline -------------------------------- */

function CaptureCard({ note }: { note: NoteView }) {
  const [reveal, setReveal] = useState(false);
  const type = note.metadata.captureType ? CAPTURE_TYPES[note.metadata.captureType] : undefined;
  const fields = note.metadata.fields ?? {};
  const sensitive = note.metadata.sensitiveKeys ?? [];
  return (
    <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800">
          <ClipboardCheck className="size-3.5" /> {type?.label ?? note.metadata.captureType}
        </p>
        {sensitive.length ? (
          <button type="button" onClick={() => setReveal((r) => !r)} className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800">
            {reveal ? <EyeOff className="size-3" /> : <Eye className="size-3" />} {reveal ? "Hide" : "Reveal"} secrets
          </button>
        ) : note.metadata.masked ? (
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <Lock className="size-3" /> Masked for your role
          </span>
        ) : null}
      </div>
      <dl className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {Object.entries(fields).map(([k, v]) => {
          const label = type?.fields.find((f) => f.key === k)?.label ?? k;
          const isSecret = sensitive.includes(k);
          return (
            <div key={k} className="min-w-0">
              <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="break-all font-mono text-xs text-slate-800">{isSecret && !reveal ? maskSecret(v) : v}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function NoteItem({ note }: { note: NoteView }) {
  const time = (
    <span className="text-[11px] text-slate-400" title={formatDateTime(note.createdAt)} suppressHydrationWarning>
      {note.pending ? "sending…" : timeAgo(note.createdAt)}
    </span>
  );
  if (note.type === "STATUS_CHANGE") {
    const to = note.metadata.to as TicketStatus | undefined;
    return (
      <li className="relative flex gap-3 pb-5">
        <span className={cn("relative z-10 mt-1.5 grid size-5 shrink-0 place-items-center rounded-full ring-4 ring-white", to ? STATUS_META[to].dot : "bg-slate-300")}>
          <ArrowRightLeft className="size-2.5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-slate-900">{note.authorName}</span> moved{" "}
            {note.metadata.from ? <StatusBadge status={note.metadata.from as TicketStatus} /> : null} →{" "}
            {to ? <StatusBadge status={to} /> : null} {time}
          </p>
          {note.metadata.pausedMinutes ? <p className="mt-1 text-[11px] text-amber-700">SLA clock resumed after {note.metadata.pausedMinutes} min pause.</p> : null}
          {note.metadata.slaRestarted ? <p className="mt-1 text-[11px] text-amber-700">Resolution SLA restarted on reopen.</p> : null}
          {note.body ? <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-inset ring-slate-100">{note.body}</p> : null}
        </div>
      </li>
    );
  }
  if (note.type === "SYSTEM" || note.type === "ASSIGNMENT") {
    return (
      <li className="relative flex gap-3 pb-5">
        <span className="relative z-10 mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 ring-4 ring-white">
          {note.type === "SYSTEM" ? <Sparkles className="size-3" /> : <UserCog className="size-3" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{note.authorName}</span> · {note.body} {time}
          </p>
          {note.metadata.trace?.length ? (
            <details className="mt-1.5 text-xs text-slate-500">
              <summary className="cursor-pointer font-medium text-indigo-600">Decision trace ({note.metadata.trace.length} rules)</summary>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                {note.metadata.trace.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ol>
            </details>
          ) : null}
        </div>
      </li>
    );
  }
  return (
    <li className={cn("relative flex gap-3 pb-5", note.pending && "opacity-60")}>
      <span className="relative z-10 ring-4 ring-white rounded-full">
        <Avatar name={note.authorName} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-slate-900">{note.authorName}</span>
          {note.authorRole ? <span className="text-[11px] text-slate-400">{ROLE_META[note.authorRole].label}</span> : null}
          {note.type === "AUDIT_CAPTURE" ? (
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">Audit capture</span>
          ) : note.isPublic ? (
            <span className="flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
              <Globe className="size-2.5" /> Public
            </span>
          ) : (
            <span className="flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
              <Lock className="size-2.5" /> Internal
            </span>
          )}
          {time}
        </div>
        {note.body ? <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{note.body}</p> : null}
        {note.type === "AUDIT_CAPTURE" ? <CaptureCard note={note} /> : null}
      </div>
    </li>
  );
}

export function Timeline({
  ticketId,
  notes,
  canCapture,
  isTenant,
  me,
}: {
  ticketId: string;
  notes: NoteView[];
  canCapture: boolean;
  isTenant: boolean;
  me: string;
}) {
  const [optimisticNotes, addOptimistic] = useOptimistic(notes, (state: NoteView[], n: NoteView) => [...state, n]);
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"comment" | "capture">("comment");
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(isTenant);
  const [captureType, setCaptureType] = useState(Object.keys(CAPTURE_TYPES)[0]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState("");
  const type = CAPTURE_TYPES[captureType];

  const submitComment = () => {
    const text = body.trim();
    if (!text) return;
    setBody("");
    startTransition(async () => {
      addOptimistic({
        id: `temp-${Date.now()}`,
        type: "COMMENT",
        body: text,
        authorName: me,
        authorRole: null,
        isPublic,
        createdAt: new Date().toISOString(),
        pending: true,
        metadata: {},
      });
      const res = await addNoteAction({ ticketId, body: text, isPublic });
      if (!res.ok) {
        toast.error(res.error);
        setBody(text);
      }
    });
  };

  const submitCapture = () => {
    const missing = type.fields.find((f) => f.required && !fields[f.key]?.trim());
    if (missing) return toast.error(`${missing.label} is required`);
    const snapshot = { ...fields };
    const text = summary.trim();
    setFields({});
    setSummary("");
    startTransition(async () => {
      addOptimistic({
        id: `temp-${Date.now()}`,
        type: "AUDIT_CAPTURE",
        body: text || `${type.label} recorded.`,
        authorName: me,
        authorRole: null,
        isPublic: false,
        createdAt: new Date().toISOString(),
        pending: true,
        metadata: {
          captureType,
          fields: Object.fromEntries(
            Object.entries(snapshot).map(([k, v]) => [k, type.fields.find((f) => f.key === k)?.sensitive ? maskSecret(v) : v]),
          ),
        },
      });
      const res = await addAuditCaptureAction({ ticketId, captureType, fields: snapshot, body: text });
      if (res.ok) toast.success(res.message ?? "Captured");
      else {
        toast.error(res.error);
        setFields(snapshot);
        setSummary(text);
      }
    });
  };

  return (
    <Card>
      <CardHeader
        title="Activity & technical audit log"
        description={isTenant ? "Updates from the maintenance team" : "Comments, state transitions and license / encoder registration captures"}
        icon={<MessageSquare className="size-4" />}
      />
      <div className="px-5 pt-5">
        {optimisticNotes.length ? (
          <ol className="relative before:absolute before:bottom-6 before:left-[13px] before:top-2 before:w-px before:bg-slate-200">
            {optimisticNotes.map((n) => (
              <NoteItem key={n.id} note={n} />
            ))}
          </ol>
        ) : (
          <p className="pb-5 text-sm text-slate-500">No activity yet.</p>
        )}
      </div>
      <div className="border-t border-slate-100 p-5">
        {canCapture ? (
          <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-0.5">
            {(["comment", "capture"] as const).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setTab(k)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold",
                  tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                )}
              >
                {k === "comment" ? <MessageSquare className="size-3.5" /> : <ClipboardCheck className="size-3.5" />}
                {k === "comment" ? "Comment" : "Technical capture"}
              </button>
            ))}
          </div>
        ) : null}

        {tab === "comment" || !canCapture ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitComment();
            }}
            className="space-y-3"
          >
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComment();
              }}
              className={inputClass}
              placeholder={isTenant ? "Add information for the technician…" : "Add a note — findings, next steps, ETA… (Ctrl+Enter to send)"}
            />
            <div className="flex items-center justify-between gap-3">
              {!isTenant ? (
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="size-4 rounded border-slate-300 text-indigo-600" />
                  Visible to reporter on tracking page
                </label>
              ) : (
                <span />
              )}
              <button type="submit" disabled={pending || !body.trim()} className={buttonClass("primary")}>
                {pending ? <Spinner /> : <Send className="size-4" />} Post
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitCapture();
            }}
            className="space-y-3"
          >
            <select
              value={captureType}
              onChange={(e) => {
                setCaptureType(e.target.value);
                setFields({});
              }}
              className={inputClass}
            >
              {Object.entries(CAPTURE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">{type.description}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {type.fields.map((f) => (
                <Field key={f.key} label={f.label} required={f.required} hint={f.sensitive ? "Sensitive — masked for non-managers" : undefined}>
                  <input
                    type={f.sensitive ? "password" : "text"}
                    autoComplete="off"
                    value={fields[f.key] ?? ""}
                    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={cn(inputClass, "font-mono text-[13px]")}
                  />
                </Field>
              ))}
            </div>
            <input value={summary} onChange={(e) => setSummary(e.target.value)} className={inputClass} placeholder="Optional summary (e.g. Re-registered after DB repair)" />
            <div className="flex justify-end">
              <button type="submit" disabled={pending} className={buttonClass("dark")}>
                {pending ? <Spinner /> : <ClipboardCheck className="size-4" />} Record capture
              </button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------ Misc controls ----------------------------- */

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          toast.success("Copied to clipboard");
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Clipboard unavailable");
        }
      }}
      className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
      aria-label="Copy"
    >
      {done ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
    </button>
  );
}

export function TicketAdminActions({
  ticketId,
  title,
  description,
  canDelete,
}: {
  ticketId: string;
  title: string;
  description: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [t, setT] = useState(title);
  const [d, setD] = useState(description);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button type="button" onClick={() => { setT(title); setD(description); setOpen(true); }} className={buttonClass("secondary")}>
        <Pencil className="size-4" /> Edit
      </button>
      {canDelete ? (
        <button type="button" onClick={() => setConfirm(true)} className={buttonClass("ghost", "md", "text-red-600 hover:bg-red-50 hover:text-red-700")}>
          <Trash2 className="size-4" />
        </button>
      ) : null}
      <Modal open={open} onClose={() => setOpen(false)} title="Edit ticket details">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await updateTicketAction({ ticketId, title: t, description: d });
              if (res.ok) {
                toast.success(res.message ?? "Saved");
                setOpen(false);
              } else toast.error(res.error);
            });
          }}
        >
          <Field label="Title" required>
            <input value={t} onChange={(e) => setT(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea rows={6} value={d} onChange={(e) => setD(e.target.value)} className={inputClass} />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary")}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={buttonClass("primary")}>
              {pending ? <Spinner /> : null} Save changes
            </button>
          </div>
        </form>
      </Modal>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Delete this ticket?" description="This permanently removes the ticket, its notes and audit captures.">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirm(false)} className={buttonClass("secondary")}>
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteTicketAction(ticketId);
                if (res.ok) {
                  toast.success(res.message ?? "Deleted");
                  router.push("/tickets");
                } else toast.error(res.error);
              })
            }
            className={buttonClass("danger")}
          >
            {pending ? <Spinner /> : <Trash2 className="size-4" />} Delete permanently
          </button>
        </div>
      </Modal>
    </>
  );
}
