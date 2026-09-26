import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { Download, ExternalLink, FileText, Gauge, History, Pencil, Plus, QrCode } from "lucide-react";
import { db } from "@/db";
import { assets, meterReadings, tickets, units } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { DOMAIN_META } from "@/lib/domains";
import { sopsForTicket } from "@/lib/sop";
import { getBaseUrl, qrSvg, reportPath } from "@/lib/server-utils";
import { formatDate, formatDateTime, formatNumber, isUuid, locationLabel, ticketRef, timeAgo } from "@/lib/utils";
import { CriticalityBadge, DomainBadge, DomainTile, PriorityBadge, StatusBadge } from "@/components/badges";
import { Card, CardHeader, DetailGrid, EmptyState, KeyValueChips, LinkButton, PageHeader } from "@/components/ui";
import { Sparkline } from "@/components/charts";
import { CopyButton } from "../../tickets/[id]/workbench";
import { AssetStatusControl, DeleteAssetButton, RegenerateQrButton } from "../asset-client";

export const metadata: Metadata = { title: "Asset" };

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [row] = await db.select({ asset: assets, unit: units }).from(assets).leftJoin(units, eq(assets.unitId, units.id)).where(eq(assets.id, id)).limit(1);
  if (!row) notFound();
  const { asset, unit } = row;

  const [ticketRows, readings, baseUrl] = await Promise.all([
    db
      .select({ id: tickets.id, seq: tickets.seq, title: tickets.title, status: tickets.status, priority: tickets.priority, createdAt: tickets.createdAt })
      .from(tickets)
      .where(eq(tickets.assetId, asset.id))
      .orderBy(desc(tickets.createdAt))
      .limit(12),
    asset.domain === "SUB_METER"
      ? db.select().from(meterReadings).where(eq(meterReadings.assetId, asset.id)).orderBy(asc(meterReadings.readingAt)).limit(400)
      : Promise.resolve([]),
    getBaseUrl(),
  ]);
  const url = `${baseUrl}${reportPath(asset.qrToken)}`;
  const svg = await qrSvg(url);
  const deltas = readings.slice(1).map((r, i) => r.value - readings[i].value);
  const anomalies = readings.slice(1).map((r, i) => (r.anomaly ? i : -1)).filter((i) => i >= 0);
  const sops = sopsForTicket(asset.domain);

  return (
    <div>
      <PageHeader
        backHref="/assets"
        backLabel="Asset registry"
        eyebrow={<span className="font-mono normal-case tracking-normal">{asset.tag}</span>}
        title={
          <span className="flex items-center gap-3">
            <DomainTile domain={asset.domain} size="lg" />
            <span>{asset.name}</span>
          </span>
        }
        actions={
          <>
            <LinkButton href={`/tickets/new?assetId=${asset.id}`}>
              <Plus className="size-4" /> Raise ticket
            </LinkButton>
            {can.editAssets(user.role) ? (
              <LinkButton href={`/assets/${asset.id}/edit`} variant="secondary">
                <Pencil className="size-4" /> Edit
              </LinkButton>
            ) : null}
            {can.deleteAssets(user.role) ? <DeleteAssetButton id={asset.id} tag={asset.tag} /> : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader
              title="Operational metadata"
              description={DOMAIN_META[asset.domain].description}
              action={<AssetStatusControl id={asset.id} status={asset.status} canEdit={can.editAssets(user.role)} />}
            />
            <div className="space-y-5 px-5 py-4">
              <DetailGrid
                className="sm:grid-cols-3"
                items={[
                  { label: "Domain", value: <DomainBadge domain={asset.domain} full /> },
                  { label: "Criticality", value: <CriticalityBadge criticality={asset.criticality} /> },
                  { label: "Location", value: locationLabel(unit, asset.locationDetail), full: true },
                  { label: "Manufacturer", value: asset.manufacturer },
                  { label: "Model", value: asset.model },
                  { label: "Serial", value: asset.serialNumber, mono: true },
                  { label: "IP address", value: asset.ipAddress, mono: true },
                  { label: "Firmware", value: asset.firmware },
                  { label: "Meter unit", value: asset.meterUnit },
                  { label: "Installed", value: asset.installedAt ? formatDate(asset.installedAt) : null },
                  { label: "Warranty until", value: asset.warrantyUntil ? formatDate(asset.warrantyUntil) : null },
                  { label: "Last service", value: asset.lastServiceAt ? `${formatDate(asset.lastServiceAt)} (${timeAgo(asset.lastServiceAt)})` : null },
                ]}
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">Environment settings (public)</p>
                  <KeyValueChips data={asset.environment} />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">Technical specs (internal)</p>
                  <KeyValueChips data={asset.specs} />
                </div>
              </div>
              {asset.notes ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{asset.notes}</p> : null}
            </div>
          </Card>

          {asset.domain === "SUB_METER" ? (
            <Card>
              <CardHeader
                title="Consumption trend"
                description={`Daily consumption (${asset.meterUnit ?? ""}) · red dots are auto-flagged anomalies`}
                icon={<Gauge className="size-4" />}
                action={<Link href={`/meters?meter=${asset.id}`} className="text-xs font-semibold text-accent-600">Record reading</Link>}
              />
              <div className="px-5 py-4">
                <Sparkline values={deltas.slice(-30)} highlight={anomalies.filter((i) => i >= deltas.length - 30).map((i) => i - Math.max(0, deltas.length - 30))} height={80} />
                {readings.length ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Latest register: <span className="font-semibold text-slate-800">{formatNumber(readings[readings.length - 1].value, 2)} {asset.meterUnit}</span> ·{" "}
                    {formatDateTime(readings[readings.length - 1].readingAt)}
                  </p>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Ticket history" description="All service requests raised against this asset" icon={<History className="size-4" />} />
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
              <EmptyState icon={<History className="size-5" />} title="No tickets yet" description="This asset has a clean service record." />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="QR sticker" description="Scan-to-report — no login required" icon={<QrCode className="size-4" />} action={can.manageAssets(user.role) ? <RegenerateQrButton id={asset.id} /> : undefined} />
            <div className="space-y-4 p-5">
              <div className="mx-auto w-52 rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center">
                <div className="mx-auto size-40 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
                <p className="mt-2 font-mono text-xs font-bold text-slate-800">{asset.tag}</p>
                <p className="text-[10px] text-slate-500">Scan to report an issue</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">{url}</code>
                <CopyButton text={url} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href={reportPath(asset.qrToken)} target="_blank" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                  <ExternalLink className="size-3.5" /> Open report page
                </a>
                <a
                  href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
                  download={`${asset.tag}-qr.svg`}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                >
                  <Download className="size-3.5" /> Download SVG
                </a>
              </div>
            </div>
          </Card>

          {sops.length ? (
            <Card>
              <CardHeader title="Standard operating procedures" icon={<FileText className="size-4" />} />
              <ul className="divide-y divide-slate-100">
                {sops.map((s) => (
                  <li key={s.id}>
                    <Link href={`/docs/sop/${s.id}`} className="block px-5 py-3 hover:bg-slate-50">
                      <p className="font-mono text-[11px] text-accent-600">{s.id}</p>
                      <p className="text-sm font-medium text-slate-800">{s.title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {unit ? (
            <Card className="p-5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Unit</p>
              <Link href={`/units/${unit.id}`} className="mt-1 block text-sm font-semibold text-slate-900 hover:text-accent-600">
                {unit.name} · {unit.code}
              </Link>
              <p className="text-xs text-slate-500">
                {unit.floor}
                {unit.occupantName ? ` · ${unit.occupantName}` : ""}
              </p>
              {unit.contactPhone ? <p className="mt-1 text-xs text-slate-500">{unit.contactPhone}</p> : null}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
