import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { AlertCircle, MapPin, Phone, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { assets, tickets, units } from "@/db/schema";
import { DOMAIN_META, ISSUE_CATALOG } from "@/lib/domains";
import { STATUS_META, ACTIVE_STATUSES } from "@/lib/workflow";
import { BUILDING_NAME, locationLabel, ticketRef, timeAgo } from "@/lib/utils";
import { DomainIcon } from "@/components/badges";
import { ReportForm } from "./report-form";

export const metadata: Metadata = { title: "Report an issue", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [row] = token.length <= 24
    ? await db.select({ asset: assets, unit: units }).from(assets).leftJoin(units, eq(assets.unitId, units.id)).where(eq(assets.qrToken, token)).limit(1)
    : [];

  if (!row || row.asset.status === "RETIRED") {
    return (
      <PublicShell>
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <AlertCircle className="mx-auto size-10 text-amber-500" />
          <h1 className="mt-4 text-lg font-bold text-slate-900">This QR code isn&apos;t active</h1>
          <p className="mt-2 text-sm text-slate-500">The sticker may have been replaced. Please contact reception on +971 4 555 0100 to report your issue.</p>
        </div>
      </PublicShell>
    );
  }
  const { asset, unit } = row;
  const known = await db
    .select({ seq: tickets.seq, title: tickets.title, status: tickets.status, publicToken: tickets.publicToken, createdAt: tickets.createdAt })
    .from(tickets)
    .where(and(eq(tickets.assetId, asset.id), inArray(tickets.status, ACTIVE_STATUSES)))
    .orderBy(desc(tickets.createdAt))
    .limit(2);
  const meta = DOMAIN_META[asset.domain];
  const env = Object.entries(asset.environment ?? {}).filter(([, v]) => v);

  return (
    <PublicShell>
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="bg-slate-900 p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10">
              <DomainIcon domain={asset.domain} className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-300">{meta.label}</p>
              <h1 className="text-lg font-bold leading-tight">{asset.name}</h1>
              <p className="font-mono text-xs text-slate-400">{asset.tag}</p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-white/5 p-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-accent-300" />
            <div>
              <p className="text-sm font-semibold">{locationLabel(unit)}</p>
              {asset.locationDetail ? <p className="text-xs text-slate-400">{asset.locationDetail}</p> : null}
            </div>
          </div>
        </div>
        {env.length ? (
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-5 py-3">
            {env.map(([k, v]) => (
              <span key={k} className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] ring-1 ring-inset ring-slate-200">
                <span className="text-slate-500">{k}:</span> <span className="font-medium text-slate-800">{v}</span>
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {known.length ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Already reported</p>
          <p className="text-xs text-amber-800">The team is aware of these open issues on this device:</p>
          <ul className="mt-2 space-y-1.5">
            {known.map((k) => (
              <li key={k.publicToken}>
                <Link href={`/track/${k.publicToken}`} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-amber-200">
                  <span className="min-w-0 truncate">
                    <span className="font-mono text-slate-500">{ticketRef(k.seq)}</span> · {k.title}
                  </span>
                  <span className="shrink-0 font-semibold text-amber-700">
                    {STATUS_META[k.status].label} · {timeAgo(k.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-amber-700">Different problem? Report it below.</p>
        </section>
      ) : null}

      <ReportForm token={asset.qrToken} issues={ISSUE_CATALOG[asset.domain]} criticality={asset.criticality} domain={asset.domain} />
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <span className="grid size-8 place-items-center rounded-xl bg-accent-600">
            <ShieldCheck className="size-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">{BUILDING_NAME}</p>
            <p className="text-[11px] text-slate-500">Scan-to-Report · Service Desk</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">{children}</main>
      <footer className="mx-auto max-w-lg px-4 pb-8 text-center text-[11px] text-slate-500">
        <p className="flex items-center justify-center gap-1">
          <Phone className="size-3" /> Emergency? Security control room: +971 4 555 0199 · Fire / ambulance: 999
        </p>
      </footer>
    </div>
  );
}
