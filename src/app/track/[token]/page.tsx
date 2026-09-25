import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { AlertCircle, ArrowRightLeft, Check, CheckCircle2, MapPin, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { db } from "@/db";
import { assets, ticketNotes, tickets, units, users } from "@/db/schema";
import { formatMinutes, SLA_POLICY } from "@/lib/sla";
import { STATUS_META, STATUS_STEPS } from "@/lib/workflow";
import { BUILDING_NAME, cn, firstName, formatDateTime, locationLabel, requestNow, ticketRef, timeAgo } from "@/lib/utils";
import { DomainIcon, PriorityBadge, StatusBadge } from "@/components/badges";
import { SlaTimerCard } from "@/components/sla-timer";
import { AutoRefresh } from "./auto-refresh";

export const metadata: Metadata = { title: "Track your request", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TrackPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> }) {
  const { token } = await params;
  const { new: isNew } = await searchParams;
  const tech = alias(users, "tech");
  const [row] =
    token.length <= 32
      ? await db
          .select({ t: tickets, asset: assets, unit: units, techName: tech.name })
          .from(tickets)
          .leftJoin(assets, eq(tickets.assetId, assets.id))
          .leftJoin(units, eq(tickets.unitId, units.id))
          .leftJoin(tech, eq(tickets.assigneeId, tech.id))
          .where(eq(tickets.publicToken, token))
          .limit(1)
      : [];

  if (!row) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4">
        <div className="max-w-sm rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <AlertCircle className="mx-auto size-10 text-amber-500" />
          <h1 className="mt-4 text-lg font-bold">Request not found</h1>
          <p className="mt-2 text-sm text-slate-500">Check the link you received, or contact reception on +971 4 555 0100.</p>
        </div>
      </div>
    );
  }
  const { t, asset, unit } = row;
  const notes = await db
    .select()
    .from(ticketNotes)
    .where(and(eq(ticketNotes.ticketId, t.id), eq(ticketNotes.isPublic, true)))
    .orderBy(asc(ticketNotes.createdAt));
  const idx = STATUS_STEPS.indexOf(t.status);
  const serverNow = requestNow();
  const policy = SLA_POLICY[t.priority];
  const sla = {
    status: t.status,
    createdAt: t.createdAt,
    responseDueAt: t.responseDueAt,
    resolutionDueAt: t.resolutionDueAt,
    firstResponseAt: t.firstResponseAt,
    resolvedAt: t.resolvedAt,
    closedAt: t.closedAt,
    slaPausedAt: t.slaPausedAt,
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <AutoRefresh seconds={30} />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
            <ShieldCheck className="size-4 text-white" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">{BUILDING_NAME}</p>
            <p className="text-[11px] text-slate-500">Request tracking · updates automatically</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {isNew ? (
          <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Report received — reference {ticketRef(t.seq)}</p>
              <p className="text-xs text-emerald-800">Bookmark this page to follow progress. A technician has been notified.</p>
            </div>
          </div>
        ) : null}

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{ticketRef(t.seq)}</span>
            <PriorityBadge priority={t.priority} />
            <StatusBadge status={t.status} />
          </div>
          <h1 className="mt-2 text-lg font-bold leading-snug text-slate-900">{t.title}</h1>
          <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
            {asset ? <DomainIcon domain={asset.domain} className="mt-0.5 size-4 shrink-0 text-slate-400" /> : <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />}
            <span>{locationLabel(unit, asset?.locationDetail)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Reported {formatDateTime(t.createdAt)} · {row.techName ? `Technician: ${firstName(row.techName)}` : "Awaiting technician"}
          </p>

          <ol className="mt-5 grid grid-cols-5 gap-1">
            {STATUS_STEPS.map((s, i) => (
              <li key={s} className="text-center">
                <div className={cn("mx-auto h-1.5 rounded-full", i <= idx ? STATUS_META[t.status].dot : "bg-slate-200")} />
                <span className={cn("mt-1.5 flex items-center justify-center gap-0.5 text-[10px] font-medium", i <= idx ? "text-slate-800" : "text-slate-400")}>
                  {i < idx ? <Check className="size-3" /> : null}
                  {STATUS_META[s].label}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <SlaTimerCard kind="response" sla={sla} serverNow={serverNow} targetLabel={formatMinutes(policy.responseMinutes)} />
          <SlaTimerCard kind="resolution" sla={sla} serverNow={serverNow} targetLabel={formatMinutes(policy.resolutionMinutes)} />
        </div>

        {t.resolutionSummary ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">How it was fixed</p>
            <p className="mt-1 text-sm text-emerald-900">{t.resolutionSummary}</p>
          </section>
        ) : null}

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <MessageSquare className="size-4 text-slate-400" /> Updates
          </h2>
          <ol className="mt-4 space-y-4">
            {notes.map((n) => (
              <li key={n.id} className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                  {n.type === "STATUS_CHANGE" ? <ArrowRightLeft className="size-3" /> : n.type === "SYSTEM" ? <Sparkles className="size-3" /> : <MessageSquare className="size-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{n.type === "SYSTEM" ? "Service desk" : firstName(n.authorName) || "Team"}</span> · {timeAgo(n.createdAt)}
                  </p>
                  {n.type === "STATUS_CHANGE" && typeof n.metadata.to === "string" ? (
                    <p className="text-sm text-slate-700">Status changed to <strong>{STATUS_META[n.metadata.to as keyof typeof STATUS_META]?.label}</strong></p>
                  ) : null}
                  {n.body ? <p className="whitespace-pre-wrap text-sm text-slate-700">{n.body}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
