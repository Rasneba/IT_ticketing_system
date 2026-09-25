import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { BookOpen, Cpu, ExternalLink, History, MapPin, ShieldAlert, User2 } from "lucide-react";
import { db } from "@/db";
import { assets, ticketNotes, tickets, units, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { assigneeUser, listStaff, tenantScope } from "@/lib/queries";
import { can } from "@/lib/permissions";
import { CHANNEL_META, findIssue, IMPACT_SCOPE_META } from "@/lib/domains";
import { formatMinutes, SLA_POLICY } from "@/lib/sla";
import { maskSecret } from "@/lib/audit-captures";
import { sopsForTicket } from "@/lib/sop";
import { getBaseUrl } from "@/lib/server-utils";
import { formatDate, formatDateTime, isUuid, locationLabel, requestNow, ticketRef, timeAgo } from "@/lib/utils";
import {
  AssetStatusBadge,
  Badge,
  ChannelBadge,
  CriticalityBadge,
  DomainBadge,
  DomainTile,
  PriorityBadge,
  StatusBadge,
} from "@/components/badges";
import { Card, CardHeader, DetailGrid, KeyValueChips, PageHeader } from "@/components/ui";
import { SlaTimerCard } from "@/components/sla-timer";
import { CopyButton, DispatchCard, LifecyclePanel, TicketAdminActions, Timeline, type NoteView } from "./workbench";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Ticket" };
  const [t] = await db.select({ seq: tickets.seq }).from(tickets).where(eq(tickets.id, id)).limit(1);
  return { title: t ? `${ticketRef(t.seq)} · Workbench` : "Ticket" };
}

export default async function TicketWorkbenchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const isTenant = user.role === "TENANT";
  const reporterUser = alias(users, "reporter_user");

  const [row] = await db
    .select({
      ticket: tickets,
      asset: assets,
      unit: units,
      assigneeName: assigneeUser.name,
      assigneeTitle: assigneeUser.title,
      reporterEmail: reporterUser.email,
    })
    .from(tickets)
    .leftJoin(assets, eq(tickets.assetId, assets.id))
    .leftJoin(units, eq(tickets.unitId, units.id))
    .leftJoin(assigneeUser, eq(tickets.assigneeId, assigneeUser.id))
    .leftJoin(reporterUser, eq(tickets.reporterUserId, reporterUser.id))
    .where(and(eq(tickets.id, id), tenantScope(user)))
    .limit(1);
  if (!row) notFound();
  const { ticket: t, asset, unit } = row;

  const [noteRows, staff, history, baseUrl] = await Promise.all([
    db
      .select({ note: ticketNotes, authorRole: users.role })
      .from(ticketNotes)
      .leftJoin(users, eq(ticketNotes.authorId, users.id))
      .where(and(eq(ticketNotes.ticketId, t.id), isTenant ? eq(ticketNotes.isPublic, true) : undefined))
      .orderBy(asc(ticketNotes.createdAt)),
    isTenant ? Promise.resolve([]) : listStaff(),
    t.assetId
      ? db
          .select({ id: tickets.id, seq: tickets.seq, title: tickets.title, status: tickets.status, priority: tickets.priority, createdAt: tickets.createdAt })
          .from(tickets)
          .where(and(eq(tickets.assetId, t.assetId), ne(tickets.id, t.id), tenantScope(user)))
          .orderBy(desc(tickets.createdAt))
          .limit(5)
      : Promise.resolve([]),
    getBaseUrl(),
  ]);

  const canReveal = can.revealSecrets(user.role);
  const notes: NoteView[] = noteRows.map(({ note, authorRole }) => {
    const md = note.metadata ?? {};
    const sensitive = Array.isArray(md.sensitiveKeys) ? md.sensitiveKeys : [];
    let fields = md.fields;
    if (fields && sensitive.length && !canReveal) {
      fields = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, sensitive.includes(k) ? maskSecret(v) : v]));
    }
    return {
      id: note.id,
      type: note.type,
      body: note.body,
      authorName: note.authorName ?? "System",
      authorRole: authorRole ?? null,
      isPublic: note.isPublic,
      createdAt: note.createdAt.toISOString(),
      metadata: {
        from: typeof md.from === "string" ? md.from : undefined,
        to: typeof md.to === "string" ? md.to : undefined,
        captureType: md.captureType,
        fields,
        sensitiveKeys: canReveal ? sensitive : [],
        masked: !canReveal && sensitive.length > 0,
        trace: Array.isArray(md.trace) ? (md.trace as string[]) : undefined,
        pausedMinutes: typeof md.pausedMinutes === "number" ? md.pausedMinutes : undefined,
        slaRestarted: md.slaRestarted === true,
      },
    };
  });

  const issue = findIssue(t.domain, t.issueCode);
  const policy = SLA_POLICY[t.priority];
  const sops = sopsForTicket(t.domain, t.issueCode);
  const serverNow = requestNow();
  const trackingUrl = `${baseUrl}/track/${t.publicToken}`;
  const slaFields = {
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
    <div>
      <PageHeader
        backHref="/tickets"
        backLabel={isTenant ? "My requests" : "Tickets"}
        eyebrow={
          <span className="flex flex-wrap items-center gap-x-2 font-mono normal-case tracking-normal">
            {ticketRef(t.seq)} <span className="font-sans text-slate-300">·</span>
            <span className="font-sans font-medium text-slate-500">
              {CHANNEL_META[t.channel].label} · opened {timeAgo(t.createdAt)}
            </span>
          </span>
        }
        title={t.title}
        actions={
          <>
            <Link
              href={`/track/${t.publicToken}`}
              target="_blank"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              <ExternalLink className="size-4" /> Public view
            </Link>
            {!isTenant ? (
              <TicketAdminActions
                ticketId={t.id}
                title={t.title}
                description={t.description}
                canDelete={can.deleteTickets(user.role)}
              />
            ) : null}
          </>
        }
      />

      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={t.priority} />
        <DomainBadge domain={t.domain} full />
        <ChannelBadge channel={t.channel} />
        <Badge className="bg-white text-slate-600 ring-slate-200">{IMPACT_SCOPE_META[t.impactScope].label}</Badge>
        {t.safetyHazard ? (
          <Badge className="bg-red-600 text-white ring-red-600">
            <ShieldAlert className="size-3" /> Safety hazard
          </Badge>
        ) : null}
        {t.priorityOverridden ? <Badge className="bg-amber-50 text-amber-800 ring-amber-600/25">Priority overridden</Badge> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <LifecyclePanel ticketId={t.id} status={t.status} role={user.role} pausedMinutes={t.slaPausedMinutes} />

          <div className="grid gap-4 sm:grid-cols-2">
            <SlaTimerCard kind="response" sla={slaFields} serverNow={serverNow} targetLabel={`${formatMinutes(policy.responseMinutes)} (${t.priority})`} />
            <SlaTimerCard kind="resolution" sla={slaFields} serverNow={serverNow} targetLabel={`${formatMinutes(policy.resolutionMinutes)}${t.slaPausedMinutes ? ` + ${t.slaPausedMinutes}m paused` : ""}`} />
          </div>

          <Card>
            <CardHeader title="Problem description" description={issue ? `Issue type: ${issue.label}` : t.issueCode} />
            <div className="space-y-4 px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{t.description || "No description provided."}</p>
              {t.resolutionSummary ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Resolution summary</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">{t.resolutionSummary}</p>
                </div>
              ) : null}
            </div>
          </Card>

          <Timeline
            ticketId={t.id}
            notes={notes}
            canCapture={can.workTickets(user.role)}
            isTenant={isTenant}
            me={user.name}
          />
        </div>

        <div className="space-y-6">
          {!isTenant ? (
            <DispatchCard
              ticketId={t.id}
              assigneeId={t.assigneeId}
              assigneeName={row.assigneeName}
              staff={staff.map((s) => ({ id: s.id, name: s.name, skills: s.skills, role: s.role }))}
              domain={t.domain}
              priority={t.priority}
              canOverride={can.overridePriority(user.role)}
              meId={user.id}
            />
          ) : (
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={t.status} />
                {row.assigneeName ? <span className="text-sm text-slate-600">Technician: {row.assigneeName.split(" ")[0]}</span> : null}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Operational metadata" description="Live asset & location context" icon={<Cpu className="size-4" />} />
            <div className="space-y-5 px-5 py-4">
              {asset ? (
                <>
                  <div className="flex items-center gap-3">
                    <DomainTile domain={asset.domain} />
                    <div className="min-w-0">
                      {isTenant ? (
                        <p className="truncate text-sm font-semibold text-slate-900">{asset.name}</p>
                      ) : (
                        <Link href={`/assets/${asset.id}`} className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-600">
                          {asset.name}
                        </Link>
                      )}
                      <p className="font-mono text-xs text-slate-500">{asset.tag}</p>
                    </div>
                  </div>
                  <DetailGrid
                    items={[
                      { label: "Status", value: <AssetStatusBadge status={asset.status} /> },
                      { label: "Criticality", value: <CriticalityBadge criticality={asset.criticality} /> },
                      { label: "Make / model", value: [asset.manufacturer, asset.model].filter(Boolean).join(" ") || null, full: true },
                      ...(!isTenant
                        ? [
                            { label: "Serial", value: asset.serialNumber, mono: true },
                            { label: "IP address", value: asset.ipAddress, mono: true },
                            { label: "Firmware", value: asset.firmware, full: true },
                            { label: "Installed", value: asset.installedAt ? formatDate(asset.installedAt) : null },
                            { label: "Warranty", value: asset.warrantyUntil ? formatDate(asset.warrantyUntil) : null },
                          ]
                        : []),
                    ]}
                  />
                  <div>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">Environment settings</p>
                    <KeyValueChips data={asset.environment} />
                  </div>
                  {!isTenant ? (
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">Technical specs</p>
                      <KeyValueChips data={asset.specs} />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-slate-500">No specific asset linked to this ticket.</p>
              )}
              <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{locationLabel(unit, asset?.locationDetail)}</p>
                  {unit?.occupantName ? <p className="text-xs text-slate-500">Occupant: {unit.occupantName}</p> : null}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="SLA decision trace" description="Deterministic rules applied at intake" icon={<Cpu className="size-4" />} />
            <ol className="space-y-2 px-5 py-4">
              {t.slaTrace.map((line, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-600">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600">{i + 1}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </Card>

          {!isTenant && sops.length ? (
            <Card>
              <CardHeader title="Relevant SOPs" description="Field diagnostic workflows" icon={<BookOpen className="size-4" />} />
              <ul className="divide-y divide-slate-100">
                {sops.slice(0, 3).map((s) => (
                  <li key={s.id}>
                    <Link href={`/docs/sop/${s.id}`} className="block px-5 py-3 hover:bg-slate-50">
                      <p className="font-mono text-[11px] text-indigo-600">{s.id}</p>
                      <p className="text-sm font-medium text-slate-800">{s.title}</p>
                      <p className="text-xs text-slate-500">
                        {s.steps.length} steps · ~{s.estimatedMinutes} min
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Reporter & intake" icon={<User2 className="size-4" />} />
            <div className="space-y-4 px-5 py-4">
              <DetailGrid
                items={[
                  { label: "Reporter", value: t.reporterName, full: true },
                  { label: "Contact", value: t.reporterContact ?? row.reporterEmail, full: true },
                  { label: "Channel", value: CHANNEL_META[t.channel].label },
                  { label: "Logged", value: formatDateTime(t.createdAt) },
                  ...(t.externalRef ? [{ label: "External ref", value: t.externalRef, mono: true, full: true }] : []),
                ]}
              />
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">Public tracking link</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
                    {trackingUrl}
                  </code>
                  <CopyButton text={trackingUrl} />
                </div>
              </div>
            </div>
          </Card>

          {history.length ? (
            <Card>
              <CardHeader title="Asset ticket history" icon={<History className="size-4" />} />
              <ul className="divide-y divide-slate-100">
                {history.map((h) => (
                  <li key={h.id}>
                    <Link href={`/tickets/${h.id}`} className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-50">
                      <span className="font-mono text-[11px] text-slate-400">{ticketRef(h.seq)}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{h.title}</span>
                      <StatusBadge status={h.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
