import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { Boxes, Plus, Ticket } from "lucide-react";
import { db } from "@/db";
import { assets, tickets, units } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { isUuid, ticketRef, timeAgo } from "@/lib/utils";
import { AssetStatusBadge, DomainTile, PriorityBadge, StatusBadge, UnitTypeBadge } from "@/components/badges";
import { Card, CardHeader, DetailGrid, EmptyState, LinkButton, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Unit" };

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [unit] = await db.select().from(units).where(eq(units.id, id)).limit(1);
  if (!unit) notFound();
  const [assetRows, ticketRows] = await Promise.all([
    db.select().from(assets).where(eq(assets.unitId, unit.id)).orderBy(asc(assets.domain), asc(assets.tag)),
    db
      .select({ id: tickets.id, seq: tickets.seq, title: tickets.title, status: tickets.status, priority: tickets.priority, createdAt: tickets.createdAt })
      .from(tickets)
      .where(eq(tickets.unitId, unit.id))
      .orderBy(desc(tickets.createdAt))
      .limit(20),
  ]);

  return (
    <div>
      <PageHeader
        backHref="/units"
        backLabel="Units"
        eyebrow={<span className="font-mono normal-case tracking-normal">Unit {unit.code}</span>}
        title={unit.name}
        description={`${unit.floor}${unit.occupantName ? ` · ${unit.occupantName}` : ""}`}
        actions={
          <LinkButton href={`/tickets/new?unitId=${unit.id}`}>
            <Plus className="size-4" /> Raise ticket
          </LinkButton>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5">
          <DetailGrid
            items={[
              { label: "Type", value: <UnitTypeBadge type={unit.type} /> },
              { label: "Floor", value: unit.floor },
              { label: "Occupant", value: unit.occupantName ?? "Vacant", full: true },
              { label: "Phone", value: unit.contactPhone },
              { label: "Email", value: unit.contactEmail },
              { label: "Area", value: unit.areaSqm ? `${unit.areaSqm} m²` : null },
              { label: "Assets", value: assetRows.length },
              { label: "Notes", value: unit.notes, full: true },
            ]}
          />
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Assets in this unit" icon={<Boxes className="size-4" />} />
          {assetRows.length ? (
            <ul className="divide-y divide-slate-100">
              {assetRows.map((a) => (
                <li key={a.id}>
                  <Link href={`/assets/${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <DomainTile domain={a.domain} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{a.name}</p>
                      <p className="font-mono text-xs text-slate-500">{a.tag}</p>
                    </div>
                    <AssetStatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Boxes className="size-5" />} title="No assets" description="No QR-tagged assets are registered in this unit." />
          )}
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader title="Service history" icon={<Ticket className="size-4" />} />
          {ticketRows.length ? (
            <ul className="divide-y divide-slate-100">
              {ticketRows.map((t) => (
                <li key={t.id}>
                  <Link href={`/tickets/${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <span className="font-mono text-xs text-slate-400">{ticketRef(t.seq)}</span>
                    <PriorityBadge priority={t.priority} showLabel={false} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{t.title}</span>
                    <StatusBadge status={t.status} />
                    <span className="hidden text-xs text-slate-400 sm:inline">{timeAgo(t.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Ticket className="size-5" />} title="No tickets yet" />
          )}
        </Card>
      </div>
    </div>
  );
}
