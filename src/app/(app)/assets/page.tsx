import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { and, asc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { Boxes, Plus, QrCode, Search, X } from "lucide-react";
import { db } from "@/db";
import { assets, tickets, units, type AssetStatus } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ASSET_STATUSES, ASSET_STATUS_META, DOMAIN_GROUPS, DOMAIN_META, DOMAINS, isDomain, type DomainGroup } from "@/lib/domains";
import { cn, locationLabel } from "@/lib/utils";
import { AssetStatusBadge, CriticalityBadge, DomainBadge, DomainTile } from "@/components/badges";
import { Card, EmptyState, LinkButton, PageHeader, inputClass } from "@/components/ui";
import { AutoSubmitSelect } from "@/components/form-controls";

export const metadata: Metadata = { title: "Assets" };

type SP = Record<string, string | string[] | undefined>;
const s = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AssetsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const sp = await searchParams;
  const q = s(sp.q);
  const group = s(sp.group) as DomainGroup | "";
  const domain = s(sp.domain);
  const status = s(sp.status) as AssetStatus | "";

  const conds: (SQL | undefined)[] = [];
  if (group === "PHYSICAL" || group === "IT_SECURITY") conds.push(inArray(assets.domain, DOMAINS.filter((d) => DOMAIN_META[d].group === group)));
  if (isDomain(domain)) conds.push(eq(assets.domain, domain));
  if (status && ASSET_STATUSES.includes(status)) conds.push(eq(assets.status, status));
  if (q.trim()) {
    const like = `%${q.trim()}%`;
    conds.push(
      or(ilike(assets.name, like), ilike(assets.tag, like), ilike(assets.model, like), ilike(assets.ipAddress, like), ilike(assets.serialNumber, like), ilike(units.name, like)),
    );
  }

  const openCount = sql<number>`(select count(*) from ${tickets} where ${tickets.assetId} = ${assets.id} and ${tickets.status} in ('OPEN','IN_PROGRESS','PENDING_PARTS'))`.mapWith(Number);
  const rows = await db
    .select({
      id: assets.id,
      tag: assets.tag,
      name: assets.name,
      domain: assets.domain,
      status: assets.status,
      criticality: assets.criticality,
      ipAddress: assets.ipAddress,
      model: assets.model,
      manufacturer: assets.manufacturer,
      locationDetail: assets.locationDetail,
      unitName: units.name,
      unitCode: units.code,
      unitFloor: units.floor,
      unitType: units.type,
      openTickets: openCount,
    })
    .from(assets)
    .leftJoin(units, eq(assets.unitId, units.id))
    .where(and(...conds))
    .orderBy(asc(assets.domain), asc(assets.tag));

  const hasFilters = !!(q || group || domain || status);
  const labelsQs = new URLSearchParams({ ...(domain ? { domain } : {}), ...(group ? { group } : {}) }).toString();
  const groupHref = (g: string) => {
    const p = new URLSearchParams();
    if (g) p.set("group", g);
    if (status) p.set("status", status);
    if (q) p.set("q", q);
    const qs = p.toString();
    return `/assets${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Asset registry"
        description="Every QR-tagged asset across physical infrastructure and IT/security hardware, with live status and open-ticket load."
        actions={
          <>
            <LinkButton href={`/assets/labels${labelsQs ? `?${labelsQs}` : ""}`} variant="secondary">
              <QrCode className="size-4" /> Print QR labels
            </LinkButton>
            {can.manageAssets(user.role) ? (
              <LinkButton href="/assets/new">
                <Plus className="size-4" /> Register asset
              </LinkButton>
            ) : null}
          </>
        }
      />

      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-xl bg-slate-200/60 p-1">
          {[{ key: "", label: "All domains" }, ...(Object.keys(DOMAIN_GROUPS) as DomainGroup[]).map((g) => ({ key: g, label: DOMAIN_GROUPS[g].label }))].map((t) => (
            <Link
              key={t.key || "all"}
              href={groupHref(t.key)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                group === t.key && !domain ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <Card className="mb-4 p-3">
        <Form action="/assets" className="flex flex-col gap-2 md:flex-row">
          {group ? <input type="hidden" name="group" value={group} /> : null}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Search tag, name, model, serial, IP or unit…" className={cn(inputClass, "pl-9")} />
          </div>
          <AutoSubmitSelect name="domain" defaultValue={domain} className={cn(inputClass, "md:w-48")}>
            <option value="">All domains</option>
            {DOMAINS.filter((d) => !group || DOMAIN_META[d].group === group).map((d) => (
              <option key={d} value={d}>
                {DOMAIN_META[d].short}
              </option>
            ))}
          </AutoSubmitSelect>
          <AutoSubmitSelect name="status" defaultValue={status} className={cn(inputClass, "md:w-40")}>
            <option value="">Any status</option>
            {ASSET_STATUSES.map((st) => (
              <option key={st} value={st}>
                {ASSET_STATUS_META[st].label}
              </option>
            ))}
          </AutoSubmitSelect>
          <div className="flex gap-2">
            <button type="submit" className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">
              Search
            </button>
            {hasFilters ? (
              <Link href="/assets" className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100">
                <X className="size-4" /> Clear
              </Link>
            ) : null}
          </div>
        </Form>
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Boxes className="size-5" />}
            title={hasFilters ? "No assets match" : "No assets registered"}
            description={hasFilters ? "Try a different search or clear the filters." : "Register assets to generate QR stickers for scan-to-report."}
            action={
              can.manageAssets(user.role) && !hasFilters ? (
                <LinkButton href="/assets/new" size="sm">
                  <Plus className="size-4" /> Register asset
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-900">{rows.length}</span> assets
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((a) => (
                <li key={a.id}>
                  <Link href={`/assets/${a.id}`} className="flex gap-3 px-4 py-3">
                    <DomainTile domain={a.domain} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{a.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        <span className="font-mono">{a.tag}</span> · {locationLabel({ name: a.unitName, code: a.unitCode, type: a.unitType })}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <AssetStatusBadge status={a.status} />
                        {a.openTickets ? <span className="text-[11px] font-semibold text-orange-600">{a.openTickets} open</span> : null}
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
                    <th className="px-4 py-2.5">Asset</th>
                    <th className="px-3 py-2.5">Domain</th>
                    <th className="hidden px-3 py-2.5 lg:table-cell">Location</th>
                    <th className="hidden px-3 py-2.5 xl:table-cell">IP / model</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Criticality</th>
                    <th className="px-4 py-2.5 text-right">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((a) => (
                    <tr key={a.id} className="group relative hover:bg-slate-50/80">
                      <td className="max-w-[320px] px-4 py-3">
                        <Link href={`/assets/${a.id}`} className="block after:absolute after:inset-0">
                          <p className="truncate font-medium text-slate-900 group-hover:text-indigo-700">{a.name}</p>
                          <p className="font-mono text-xs text-slate-500">{a.tag}</p>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <DomainBadge domain={a.domain} />
                      </td>
                      <td className="hidden max-w-[260px] px-3 py-3 lg:table-cell">
                        <p className="truncate text-xs text-slate-700">{locationLabel({ name: a.unitName, code: a.unitCode, floor: a.unitFloor, type: a.unitType })}</p>
                        <p className="truncate text-[11px] text-slate-400">{a.locationDetail}</p>
                      </td>
                      <td className="hidden px-3 py-3 xl:table-cell">
                        <p className="font-mono text-xs text-slate-700">{a.ipAddress ?? "—"}</p>
                        <p className="truncate text-[11px] text-slate-400">{[a.manufacturer, a.model].filter(Boolean).join(" ")}</p>
                      </td>
                      <td className="px-3 py-3">
                        <AssetStatusBadge status={a.status} />
                      </td>
                      <td className="px-3 py-3">
                        <CriticalityBadge criticality={a.criticality} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {a.openTickets ? (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">{a.openTickets}</span>
                        ) : (
                          <span className="text-xs text-slate-300">0</span>
                        )}
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
