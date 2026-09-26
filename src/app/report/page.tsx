import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { Phone, ShieldCheck } from "lucide-react";
import { ensureDatabaseReady } from "@/db/bootstrap";
import { db } from "@/db";
import { units } from "@/db/schema";
import { ISSUE_CATALOG } from "@/lib/domains";
import { BUILDING_NAME } from "@/lib/utils";
import { PublicTicketForm } from "./report-form";

export const metadata: Metadata = { title: "Report an issue", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PublicReportPage() {
  await ensureDatabaseReady();

  const list = await db
    .select({ id: units.id, code: units.code, name: units.name, floor: units.floor })
    .from(units)
    .orderBy(asc(units.floorLevel), asc(units.code));

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <span className="grid size-8 place-items-center rounded-xl bg-accent-600">
            <ShieldCheck className="size-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">{BUILDING_NAME}</p>
            <p className="text-[11px] text-slate-500">Report an issue · no login needed</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        <div className="rounded-3xl bg-slate-900 p-5 text-white">
          <h1 className="text-lg font-bold leading-tight">Tell us what&apos;s wrong and we&apos;ll take it from here.</h1>
          <p className="mt-1.5 text-sm text-slate-300">
            No account or app needed. You&apos;ll get a link to follow the fix.
          </p>
        </div>

        <PublicTicketForm units={list} issueCatalog={ISSUE_CATALOG} />
      </main>

      <footer className="mx-auto max-w-lg px-4 pb-8 text-center text-[11px] text-slate-500">
        <p className="flex items-center justify-center gap-1">
          <Phone className="size-3" /> Emergency? Security control room: +971 4 555 0199 · Fire / ambulance: 999
        </p>
      </footer>
    </div>
  );
}
