import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { AlertTriangle, Gauge } from "lucide-react";
import { db } from "@/db";
import { meterReadings, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getMeterOverview } from "@/lib/queries";
import { cn, formatNumber, isUuid } from "@/lib/utils";
import { Card, CardHeader, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { Bars, Sparkline } from "@/components/charts";
import { ReadingPanel } from "./meters-client";

export const metadata: Metadata = { title: "Sub-meters" };

export default async function MetersPage({ searchParams }: { searchParams: Promise<{ meter?: string }> }) {
  const user = await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const sp = await searchParams;
  const { meters, readings } = await getMeterOverview();

  if (!meters.length) {
    return (
      <div>
        <PageHeader title="Sub-meters" />
        <Card>
          <EmptyState
            icon={<Gauge className="size-5" />}
            title="No sub-meters registered"
            description="Register an asset with the Sub-Metering domain to start recording readings."
            action={<LinkButton href="/assets/new" size="sm">Register meter</LinkButton>}
          />
        </Card>
      </div>
    );
  }

  const byMeter = new Map<string, typeof readings>();
  for (const r of readings) {
    const list = byMeter.get(r.assetId) ?? [];
    list.push(r);
    byMeter.set(r.assetId, list);
  }
  const stats = meters.map((m) => {
    const list = byMeter.get(m.id) ?? [];
    const deltas = list.slice(1).map((r, i) => ({ v: r.value - list[i].value, anomaly: r.anomaly, at: r.readingAt }));
    const last7 = deltas.slice(-7).reduce((a, d) => a + d.v, 0);
    return { meter: m, list, deltas, last7, anomalies: list.filter((r) => r.anomaly).length, latest: list[list.length - 1] };
  });
  const selectedId = isUuid(sp.meter) && meters.some((m) => m.id === sp.meter) ? sp.meter! : meters[0].id;
  const selected = stats.find((s) => s.meter.id === selectedId)!;

  const table = await db
    .select({
      id: meterReadings.id,
      value: meterReadings.value,
      readingAt: meterReadings.readingAt,
      anomaly: meterReadings.anomaly,
      note: meterReadings.note,
      recordedBy: users.name,
    })
    .from(meterReadings)
    .leftJoin(users, eq(meterReadings.recordedById, users.id))
    .where(eq(meterReadings.assetId, selectedId))
    .orderBy(desc(meterReadings.readingAt))
    .limit(60);

  return (
    <div>
      <PageHeader
        title="Sub-meter readings"
        description="Tenant electricity and water sub-metering. Readings above 2× the trailing average are flagged and raise a P3 ticket automatically."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.meter.id}
            href={`/meters?meter=${s.meter.id}`}
            scroll={false}
            className={cn(
              "rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md",
              s.meter.id === selectedId ? "border-indigo-400 ring-1 ring-indigo-400" : "border-slate-200",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{s.meter.name}</p>
                <p className="font-mono text-[11px] text-slate-500">
                  {s.meter.tag} · {s.meter.unitCode}
                </p>
              </div>
              {s.anomalies ? (
                <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-200">
                  <AlertTriangle className="size-3" /> {s.anomalies}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] text-slate-500">Last 7 days</p>
                <p className="text-lg font-bold tabular-nums text-slate-900">
                  {formatNumber(s.last7, 1)} <span className="text-xs font-medium text-slate-500">{s.meter.meterUnit}</span>
                </p>
              </div>
              <div className="w-32">
                <Sparkline values={s.deltas.slice(-21).map((d) => d.v)} height={36} highlight={s.deltas.slice(-21).map((d, i) => (d.anomaly ? i : -1)).filter((i) => i >= 0)} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-3">
          <CardHeader
            title={`${selected.meter.name} — daily consumption`}
            description={`Last 30 days in ${selected.meter.meterUnit ?? ""} · ${selected.meter.unitName ?? ""}`}
            icon={<Gauge className="size-4" />}
            action={<Link href={`/assets/${selected.meter.id}`} className="text-xs font-semibold text-indigo-600">Asset details</Link>}
          />
          <div className="px-5 py-5">
            <Bars
              unit={selected.meter.meterUnit ?? ""}
              data={selected.deltas.slice(-30).map((d) => ({
                label: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(d.at),
                value: d.v,
                highlight: d.anomaly,
              }))}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <ReadingPanel
          key={selectedId}
          meter={{ id: selected.meter.id, name: selected.meter.name, unit: selected.meter.meterUnit ?? "", latest: selected.latest?.value ?? null }}
          readings={table.map((r) => ({ ...r, readingAt: r.readingAt.toISOString() }))}
          canRecord={can.recordReadings(user.role)}
          canDelete={can.deleteReadings(user.role)}
          me={user.name}
        />
      </div>
    </div>
  );
}
