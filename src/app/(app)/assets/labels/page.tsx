import type { Metadata } from "next";
import { and, asc, eq, inArray, ne, type SQL } from "drizzle-orm";
import { QrCode } from "lucide-react";
import { db } from "@/db";
import { assets, units } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { DOMAIN_META, DOMAINS, isDomain, type DomainGroup } from "@/lib/domains";
import { getBaseUrl, qrSvg, reportPath } from "@/lib/server-utils";
import { BUILDING_NAME, locationLabel } from "@/lib/utils";
import { DomainIcon } from "@/components/badges";
import { EmptyState, PageHeader } from "@/components/ui";
import { PrintButton } from "../asset-client";

export const metadata: Metadata = { title: "QR labels" };

export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ domain?: string; group?: string }> }) {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const sp = await searchParams;
  const conds: (SQL | undefined)[] = [ne(assets.status, "RETIRED")];
  if (isDomain(sp.domain)) conds.push(eq(assets.domain, sp.domain));
  if (sp.group === "PHYSICAL" || sp.group === "IT_SECURITY") {
    const g = sp.group as DomainGroup;
    conds.push(inArray(assets.domain, DOMAINS.filter((d) => DOMAIN_META[d].group === g)));
  }
  const rows = await db
    .select({
      id: assets.id,
      tag: assets.tag,
      name: assets.name,
      domain: assets.domain,
      qrToken: assets.qrToken,
      locationDetail: assets.locationDetail,
      unitName: units.name,
      unitCode: units.code,
      unitFloor: units.floor,
      unitType: units.type,
    })
    .from(assets)
    .leftJoin(units, eq(assets.unitId, units.id))
    .where(and(...conds))
    .orderBy(asc(assets.domain), asc(assets.tag));
  const base = await getBaseUrl();
  const labels = await Promise.all(rows.map(async (r) => ({ ...r, svg: await qrSvg(`${base}${reportPath(r.qrToken)}`) })));

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          backHref="/assets"
          backLabel="Asset registry"
          title="QR sticker sheet"
          description={`${labels.length} labels · each sticker opens the public Scan-to-Report page with asset, location and domain pre-filled.`}
          actions={<PrintButton label="Print stickers" />}
        />
      </div>
      {labels.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-2">
          {labels.map((l) => (
            <div key={l.id} className="break-inside-avoid rounded-2xl border-2 border-dashed border-slate-300 bg-white p-3 text-center print:rounded-lg">
              <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                <span className="truncate">{BUILDING_NAME}</span>
                <DomainIcon domain={l.domain} className="size-3.5 shrink-0" />
              </div>
              <div className="mx-auto mt-1.5 aspect-square w-full max-w-[150px] [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: l.svg }} />
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-accent-700">Scan to report an issue</p>
              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-tight text-slate-900">{l.name}</p>
              <p className="mt-0.5 font-mono text-[10px] text-slate-600">{l.tag}</p>
              <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500">
                {locationLabel({ name: l.unitName, floor: l.unitFloor, code: l.unitCode, type: l.unitType })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<QrCode className="size-5" />} title="No assets to print" description="Register assets first." />
      )}
    </div>
  );
}
