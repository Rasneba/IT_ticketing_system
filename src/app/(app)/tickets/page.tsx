import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { Inbox, Plus, Search, X } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listStaff, listTickets, type TicketFilters } from "@/lib/queries";
import { DOMAIN_META, DOMAINS, CHANNEL_META } from "@/lib/domains";
import { PRIORITIES, SLA_POLICY } from "@/lib/sla";
import { STATUS_META, TICKET_STATUSES } from "@/lib/workflow";
import { cn, locationLabel, requestNow, ticketRef, timeAgo } from "@/lib/utils";
import { DomainBadge, DomainTile, PriorityBadge, StatusBadge } from "@/components/badges";
import { Avatar, Card, EmptyState, LinkButton, PageHeader, inputClass } from "@/components/ui";
import { AutoSubmitSelect } from "@/components/form-controls";
import { SlaPill } from "@/components/sla-timer";

export const metadata: Metadata = { title: "Tickets" };

type SP = Record<string, string | string[] | undefined>;
const s = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function TicketsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const f: TicketFilters = {
    q: s(sp.q),
    view: s(sp.view),
    status: s(sp.status),
    priority: s(sp.priority),
    domain: s(sp.domain),
    assignee: s(sp.assignee),
  };
  const isTenant = user.role === "TENANT";
  const [rows, staff] = await Promise.all([listTickets(f, user), isTenant ? Promise.resolve([]) : listStaff()]);
  const serverNow = requestNow();

  const tabs = [
    { key: "", label: "Active" },
    ...(isTenant ? [] : [{ key: "mine", label: "My queue" }]),
    { key: "breached", label: "SLA breached" },
    ...(isTenant ? [] : [{ key: "unassigned", label: "Unassigned" }]),
    { key: "parts", label: "Pending parts" },
    { key: "done", label: "Resolved & closed" },
    { key: "all", label: "All" },
  ];
  const hasFilters = !!(f.q || f.status || f.priority || f.domain || f.assignee);
  const tabHref = (key: string) => {
    const params = new URLSearchParams();
    if (key) params.set("view", key);
    for (const k of ["q", "priority", "domain", "assignee"] as const) if (f[k]) params.set(k, f[k]!);
    const qs = params.toString();
    return `/tickets${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title={isTenant ? "My requests" : "Tickets"}
        description={
          isTenant
            ? "Everything reported for your unit, with live SLA status."
            : "Unified queue across physical infrastructure and IT/security hardware — ordered by priority and SLA deadline."
        }
        actions={
          <LinkButton href="/tickets/new">
            <Plus className="size-4" /> {isTenant ? "Report an issue" : "New ticket"}
          </LinkButton>
        }
      />

      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-xl bg-slate-200/60 p-1">
          {tabs.map((t) => {
            const active = (f.view ?? "") === t.key;
            return (
              <Link
                key={t.key || "active"}
                href={tabHref(t.key)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      <Card className="mb-4 p-3">
        <Form action="/tickets" className="flex flex-col gap-2 lg:flex-row lg:items-center">
          {f.view ? <input type="hidden" name="view" value={f.view} /> : null}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={f.q}
              placeholder="Search ref (SR-00012), title, asset tag, unit or reporter…"
              className={cn(inputClass, "pl-9")}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            <AutoSubmitSelect name="priority" defaultValue={f.priority} className={cn(inputClass, "lg:w-36")}>
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p} · {SLA_POLICY[p].label}
                </option>
              ))}
            </AutoSubmitSelect>
            <AutoSubmitSelect name="domain" defaultValue={f.domain} className={cn(inputClass, "lg:w-44")}>
              <option value="">All domains</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {DOMAIN_META[d].short}
                </option>
              ))}
            </AutoSubmitSelect>
            <AutoSubmitSelect name="status" defaultValue={f.status} className={cn(inputClass, "lg:w-40")}>
              <option value="">Any status</option>
              {TICKET_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_META[st].label}
                </option>
              ))}
            </AutoSubmitSelect>
            {!isTenant ? (
              <AutoSubmitSelect name="assignee" defaultValue={f.assignee} className={cn(inputClass, "lg:w-44")}>
                <option value="">Any assignee</option>
                <option value="unassigned">Unassigned</option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">
              Search
            </button>
            {hasFilters ? (
              <Link
                href={f.view ? `/tickets?view=${f.view}` : "/tickets"}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <X className="size-4" /> Clear
              </Link>
            ) : null}
          </div>
        </Form>
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title={hasFilters ? "No tickets match your filters" : "Nothing in this view"}
            description={hasFilters ? "Try widening the search or clearing filters." : "When issues are reported they'll appear here with live SLA timers."}
            action={
              hasFilters ? (
                <LinkButton href="/tickets" variant="secondary" size="sm">
                  Clear filters
                </LinkButton>
              ) : (
                <LinkButton href="/tickets/new" size="sm">
                  <Plus className="size-4" /> Raise a ticket
                </LinkButton>
              )
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              <span>
                <span className="font-semibold text-slate-900">{rows.length}</span> ticket{rows.length === 1 ? "" : "s"}
              </span>
              <span className="hidden sm:inline">SLA timers update live</span>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((t) => (
                <li key={t.id}>
                  <Link href={`/tickets/${t.id}`} className="flex gap-3 px-4 py-3.5 active:bg-slate-50">
                    <DomainTile domain={t.domain} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] text-slate-400">{ticketRef(t.seq)}</span>
                        <PriorityBadge priority={t.priority} showLabel={false} />
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900">{t.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {locationLabel({ name: t.unitName, floor: t.unitFloor, code: t.unitCode })}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <SlaPill sla={t} serverNow={serverNow} />
                        <span className="text-[11px] text-slate-400">{timeAgo(t.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Ticket</th>
                    <th className="px-3 py-2.5">Domain</th>
                    <th className="px-3 py-2.5">Priority</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">SLA</th>
                    <th className="hidden px-3 py-2.5 lg:table-cell">Assignee</th>
                    <th className="hidden px-4 py-2.5 text-right xl:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((t) => (
                    <tr key={t.id} className="group relative transition hover:bg-slate-50/80">
                      <td className="max-w-[420px] px-4 py-3">
                        <Link href={`/tickets/${t.id}`} className="block after:absolute after:inset-0">
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="font-mono">{ticketRef(t.seq)}</span>
                            <span>·</span>
                            <span>{CHANNEL_META[t.channel].label}</span>
                          </div>
                          <p className="truncate font-medium text-slate-900 group-hover:text-accent-700">{t.title}</p>
                          <p className="truncate text-xs text-slate-500">
                            {t.assetTag ? <span className="font-mono">{t.assetTag} · </span> : null}
                            {locationLabel({ name: t.unitName, floor: t.unitFloor, code: t.unitCode })}
                          </p>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <DomainBadge domain={t.domain} />
                      </td>
                      <td className="px-3 py-3">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-3 py-3">
                        <SlaPill sla={t} serverNow={serverNow} />
                      </td>
                      <td className="hidden px-3 py-3 lg:table-cell">
                        {t.assigneeName ? (
                          <span className="flex items-center gap-2 text-slate-700">
                            <Avatar name={t.assigneeName} size="xs" />
                            <span className="truncate text-xs font-medium">{t.assigneeName}</span>
                          </span>
                        ) : (
                          <span className="text-xs italic text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-right text-xs text-slate-500 xl:table-cell">
                        {timeAgo(t.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
