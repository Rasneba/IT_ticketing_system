import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Inbox,
  Plus,
  QrCode,
  Siren,
  Ticket as TicketIcon,
  Timer,
} from "lucide-react";
import type { SystemDomain } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { DOMAIN_GROUPS, DOMAIN_META, DOMAINS, type DomainGroup } from "@/lib/domains";
import { PRIORITIES, SLA_POLICY, formatMinutes } from "@/lib/sla";
import { STATUS_META } from "@/lib/workflow";
import { BUILDING_NAME, BUILDING_TZ, cn, firstName, formatDate, locationLabel, requestNow, ticketRef, timeAgo } from "@/lib/utils";
import { AssetStatusBadge, DomainTile, PriorityBadge, StatusBadge } from "@/components/badges";
import { Avatar, Card, CardHeader, EmptyState, LinkButton, StatCard } from "@/components/ui";
import { SlaPill } from "@/components/sla-timer";

export const metadata: Metadata = { title: "Dashboard" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: BUILDING_TZ }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user);
  const serverNow = requestNow();
  const isTenant = user.role === "TENANT";

  const statusMap = Object.fromEntries(data.statusCounts.map((s) => [s.status, s.n])) as Record<string, number>;
  const open = statusMap.OPEN ?? 0;
  const inProgress = statusMap.IN_PROGRESS ?? 0;
  const pending = statusMap.PENDING_PARTS ?? 0;
  const active = open + inProgress + pending;
  const priorityMap = Object.fromEntries(data.priorityCounts.map((p) => [p.priority, p.n])) as Record<string, number>;
  const p1 = priorityMap.P1 ?? 0;
  const sla = data.sla30;
  const compliance = sla && sla.resolved ? Math.round((sla.met / sla.resolved) * 100) : 100;
  const responseCompliance = sla && sla.responded ? Math.round((sla.responseMet / sla.responded) * 100) : 100;

  const domainMap = new Map(data.domainCounts.map((d) => [d.domain, d]));
  const maxDomain = Math.max(1, ...data.domainCounts.map((d) => d.n));
  const maxLoad = Math.max(1, ...data.workload.map((w) => w.active));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">{formatDate(new Date())}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.7rem]">
            {greeting()}, {firstName(user.name)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isTenant
              ? `${user.unitName ?? "Your unit"}${user.unitCode ? ` · Unit ${user.unitCode}` : ""} — track and raise service requests.`
              : `${BUILDING_NAME} · live operational overview across physical and IT/security domains.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isTenant ? (
            <LinkButton href="/assets/labels" variant="secondary">
              <QrCode className="size-4" /> QR labels
            </LinkButton>
          ) : null}
          <LinkButton href="/tickets/new">
            <Plus className="size-4" /> {isTenant ? "Report an issue" : "New ticket"}
          </LinkButton>
        </div>
      </div>

      {p1 > 0 ? (
        <Link
          href="/tickets?priority=P1"
          className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm transition-colors hover:border-red-300 hover:bg-red-100"
        >
          <span className="relative grid size-9 place-items-center rounded-xl bg-red-600 text-white">
            <Siren className="size-4" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-red-300 ring-2 ring-red-50" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-800">
              {p1} urgent P1 incident{p1 > 1 ? "s" : ""} active
            </p>
            <p className="text-xs text-red-700/80">30-minute response · 4-hour resolution — life-safety, perimeter security or building-wide outage</p>
          </div>
          <ArrowRight className="size-4 text-red-500" />
        </Link>
      ) : null}

      <div className={cn("grid gap-4", isTenant ? "sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-6")}>
        <StatCard
          label={isTenant ? "Active requests" : "Active tickets"}
          value={active}
          icon={<TicketIcon className="size-4" />}
          tone="indigo"
          href="/tickets"
          hint={`${open} open · ${inProgress} in progress · ${pending} parts`}
        />
        {!isTenant ? (
          <StatCard label="P1 urgent" value={p1} icon={<Siren className="size-4" />} tone="red" href="/tickets?priority=P1" alert={p1 > 0} hint="30-min response SLA" />
        ) : null}
        <StatCard
          label="SLA breached"
          value={data.breached}
          icon={<AlertTriangle className="size-4" />}
          tone={data.breached ? "red" : "emerald"}
          href="/tickets?view=breached"
          hint="Active tickets past response or resolution target"
          alert={data.breached > 0 && p1 === 0}
        />
        <StatCard
          label="Resolution SLA (30d)"
          value={`${compliance}%`}
          icon={<CheckCircle2 className="size-4" />}
          tone={compliance >= 90 ? "emerald" : compliance >= 75 ? "amber" : "red"}
          hint={`${sla?.met ?? 0}/${sla?.resolved ?? 0} resolved within target`}
        />
        {!isTenant ? (
          <>
            <StatCard
              label="Avg first response (30d)"
              value={formatMinutes(Math.round(sla?.avgResponseMin ?? 0))}
              icon={<Timer className="size-4" />}
              tone="sky"
              hint={`${responseCompliance}% responses within SLA`}
            />
            <StatCard
              label="Assets needing attention"
              value={data.assetsAttention.length}
              icon={<Boxes className="size-4" />}
              tone={data.assetsAttention.length ? "amber" : "emerald"}
              href="/assets?status=DOWN"
              hint="Down, degraded or in maintenance"
            />
          </>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="SLA watchlist"
            description="Active tickets ordered by the nearest response / resolution deadline"
            icon={<Clock className="size-4" />}
            action={
              <Link href="/tickets" className="text-xs font-semibold text-accent-600 hover:text-accent-500">
                View all
              </Link>
            }
          />
          {data.watchlist.length ? (
            <ul className="divide-y divide-slate-100">
              {data.watchlist.map((t) => (
                <li key={t.id}>
                  <Link href={`/tickets/${t.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                    <DomainTile domain={t.domain} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400">{ticketRef(t.seq)}</span>
                        <PriorityBadge priority={t.priority} showLabel={false} />
                        <span className="hidden sm:inline-flex">
                          <StatusBadge status={t.status} />
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{t.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {locationLabel({ name: t.unitName, code: t.unitCode, floor: t.unitFloor })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SlaPill sla={t} serverNow={serverNow} />
                      <span className="text-[11px] text-slate-400">{t.assigneeName ? firstName(t.assigneeName) : "Unassigned"}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Inbox className="size-5" />}
              title="All clear"
              description="There are no active tickets right now."
              action={<LinkButton href="/tickets/new" size="sm">Raise a ticket</LinkButton>}
            />
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Lifecycle pipeline" description="Current ticket states" icon={<Activity className="size-4" />} />
            <div className="space-y-3 px-5 py-4">
              {(["OPEN", "IN_PROGRESS", "PENDING_PARTS", "RESOLVED", "CLOSED"] as const).map((s) => {
                const n = statusMap[s] ?? 0;
                const total = Math.max(1, ...Object.values(statusMap));
                return (
                  <Link key={s} href={`/tickets?status=${s}`} className="group block">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className={cn("size-2 rounded-full", STATUS_META[s].dot)} />
                        {STATUS_META[s].label}
                      </span>
                      <span className="font-semibold tabular-nums text-slate-900">{n}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={cn("h-full rounded-full transition-[width] duration-300 ease-[var(--ease-standard)] group-hover:opacity-80", STATUS_META[s].dot)} style={{ width: `${(n / total) * 100}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
          <Card>
            <CardHeader title="Active by priority" description="Deterministic SLA matrix" icon={<Timer className="size-4" />} />
            <div className="grid grid-cols-4 gap-2 px-5 py-4">
              {PRIORITIES.map((p) => (
                <Link key={p} href={`/tickets?priority=${p}`} className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-center transition hover:border-slate-200 hover:bg-white">
                  <p className={cn("text-xl font-bold tabular-nums", SLA_POLICY[p].text)}>{priorityMap[p] ?? 0}</p>
                  <p className="text-[11px] font-semibold text-slate-600">{p}</p>
                  <p className="text-[10px] text-slate-400">{formatMinutes(SLA_POLICY[p].responseMinutes)}</p>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {!isTenant ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Tickets by domain" description="Last 30 days · solid = still active" icon={<Boxes className="size-4" />} />
            <div className="grid gap-6 px-5 py-4 md:grid-cols-2">
              {(Object.keys(DOMAIN_GROUPS) as DomainGroup[]).map((group) => (
                <div key={group}>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{DOMAIN_GROUPS[group].label}</p>
                  <ul className="space-y-2.5">
                    {DOMAINS.filter((d) => DOMAIN_META[d].group === group).map((d: SystemDomain) => {
                      const row = domainMap.get(d);
                      const total = row?.n ?? 0;
                      const act = row?.active ?? 0;
                      return (
                        <li key={d}>
                          <Link href={`/tickets?view=all&domain=${d}`} className="flex items-center gap-2.5">
                            <DomainTile domain={d} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="truncate font-medium text-slate-700">{DOMAIN_META[d].short}</span>
                                <span className="tabular-nums text-slate-500">
                                  <span className="font-semibold text-slate-900">{act}</span> / {total}
                                </span>
                              </div>
                              <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div className={cn("absolute inset-y-0 left-0 rounded-full opacity-30", DOMAIN_META[d].accent)} style={{ width: `${(total / maxDomain) * 100}%` }} />
                                <div className={cn("absolute inset-y-0 left-0 rounded-full", DOMAIN_META[d].accent)} style={{ width: `${(act / maxDomain) * 100}%` }} />
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Technician workload" description="Active tickets per technician" icon={<Activity className="size-4" />} />
            {data.workload.length ? (
              <ul className="space-y-3.5 px-5 py-4">
                {data.workload.map((w) => (
                  <li key={w.id} className="flex items-center gap-3">
                    <Avatar name={w.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-slate-800">{w.name}</p>
                        <span className="text-xs tabular-nums text-slate-500">
                          {w.active} active{w.p1 ? <span className="ml-1 font-semibold text-red-600">· {w.p1} P1</span> : null}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-slate-400">{w.title}</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn("h-full rounded-full", w.active >= 5 ? "bg-red-500" : w.active >= 3 ? "bg-amber-500" : "bg-emerald-500")}
                          style={{ width: `${(w.active / maxLoad) * 100}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No technicians" description="Add technicians under Users." />
            )}
          </Card>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        {!isTenant ? (
          <Card>
            <CardHeader title="Assets needing attention" icon={<AlertTriangle className="size-4" />} action={<Link href="/assets" className="text-xs font-semibold text-accent-600">Registry</Link>} />
            {data.assetsAttention.length ? (
              <ul className="divide-y divide-slate-100">
                {data.assetsAttention.map((a) => (
                  <li key={a.id}>
                    <Link href={`/assets/${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                      <DomainTile domain={a.domain} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{a.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          <span className="font-mono">{a.tag}</span> · {a.unitName}
                        </p>
                      </div>
                      <AssetStatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<CheckCircle2 className="size-5" />} title="Everything operational" description="No assets are down or degraded." />
            )}
          </Card>
        ) : null}
        <Card className={isTenant ? "xl:col-span-3" : "xl:col-span-2"}>
          <CardHeader title="Recent activity" description="Latest updates across tickets" icon={<Activity className="size-4" />} />
          {data.activity.length ? (
            <ul className="divide-y divide-slate-100">
              {data.activity.map((a) => (
                <li key={a.id}>
                  <Link href={`/tickets/${a.ticketId}`} className="flex gap-3 px-5 py-3 hover:bg-slate-50">
                    <Avatar name={a.authorName ?? "System"} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">{a.authorName ?? "System"}</span>{" "}
                        {a.type === "STATUS_CHANGE"
                          ? `moved to ${STATUS_META[(a.metadata.to as keyof typeof STATUS_META) ?? "OPEN"]?.label ?? "a new state"}`
                          : a.type === "AUDIT_CAPTURE"
                            ? "recorded a technical capture on"
                            : a.type === "ASSIGNMENT"
                              ? "updated assignment on"
                              : a.type === "SYSTEM"
                                ? "logged"
                                : "commented on"}{" "}
                        <span className="font-mono text-xs text-slate-500">{ticketRef(a.seq)}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">{a.body || a.title}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(a.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Activity className="size-5" />} title="No activity yet" />
          )}
        </Card>
      </div>
    </div>
  );
}
