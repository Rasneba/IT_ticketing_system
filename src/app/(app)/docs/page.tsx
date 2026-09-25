import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowRight, BookOpen, Code2, Database, Download, FileText, FolderTree, Smartphone, Wrench } from "lucide-react";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { SOPS } from "@/lib/sop";
import { DATA_DICTIONARY, FILE_TREE, PRISMA_SCHEMA, SERVER_ACTIONS } from "@/lib/blueprint";
import { DomainBadge } from "@/components/badges";
import { Card, CardHeader, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "SOP & Documents" };

const PDFS = [
  {
    file: "srs_building_service_desk.pdf",
    title: "Software Requirements Specification",
    subtitle: "IEEE 830-compliant · features, security & compliance NFRs, ER diagram, traceability",
    tone: "from-indigo-600 to-violet-600",
  },
  {
    file: "ticket_management_blueprint.pdf",
    title: "Ticket Management Blueprint",
    subtitle: "Lifecycle state transitions, dynamic SLA JavaScript logic, REST/webhook schemas, SOP execution tables",
    tone: "from-slate-800 to-slate-950",
  },
  {
    file: "operations_sop_schema_blueprint.pdf",
    title: "Integrated Operations SOP & Schema Blueprint",
    subtitle: "File structure, data models, Server Actions, public mobile report view and field SOPs",
    tone: "from-emerald-600 to-teal-700",
  },
];

export default async function DocsPage() {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const [sample] = await db.select({ qrToken: assets.qrToken, name: assets.name }).from(assets).where(eq(assets.tag, "POS-PRN-4B")).limit(1);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Knowledge base"
        title="SOP & documentation"
        description="Generated deliverables, field diagnostic SOPs and the integrated schema blueprint — always in sync with the running system."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {PDFS.map((p) => (
          <a
            key={p.file}
            href={`/api/docs/${p.file}`}
            target="_blank"
            className="group relative overflow-hidden rounded-2xl p-5 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${p.tone}`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <FileText className="size-6 opacity-90" />
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  <Download className="size-3" /> PDF
                </span>
              </div>
              <p className="mt-6 text-base font-bold">{p.title}</p>
              <p className="mt-1 text-xs text-white/75">{p.subtitle}</p>
              <p className="mt-4 font-mono text-[10px] text-white/60">{p.file}</p>
            </div>
          </a>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Wrench className="size-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Standard operating procedures — field diagnostic workflows</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SOPS.map((s) => (
            <Link key={s.id} href={`/docs/sop/${s.id}`} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold text-indigo-600">{s.id}</span>
                <span className="text-[11px] text-slate-400">~{s.estimatedMinutes} min</span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-slate-900 group-hover:text-indigo-700">{s.title}</p>
              <p className="mt-1 line-clamp-3 text-xs text-slate-500">{s.summary}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {s.domains.map((d) => (
                  <DomainBadge key={d} domain={d} />
                ))}
                <span className="text-[11px] text-slate-400">{s.steps.length} steps</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Complete file structure" description="Next.js App Router · RSC · Server Actions · Drizzle/PostgreSQL" icon={<FolderTree className="size-4" />} />
          <pre className="overflow-x-auto p-5 font-mono text-[11px] leading-relaxed text-slate-700">{FILE_TREE}</pre>
        </Card>
        <Card>
          <CardHeader title="Data model" description="Enums: SystemDomain · Role · TicketStatus · Priority" icon={<Database className="size-4" />} />
          <ul className="divide-y divide-slate-100">
            {DATA_DICTIONARY.map((t) => (
              <li key={t.table} className="px-5 py-3">
                <p className="font-mono text-xs font-semibold text-slate-900">{t.table}</p>
                <p className="text-xs text-slate-600">{t.purpose}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{t.keys}</p>
              </li>
            ))}
          </ul>
          <details className="border-t border-slate-100 px-5 py-3">
            <summary className="cursor-pointer text-xs font-semibold text-indigo-600">Reference Prisma models</summary>
            <pre className="mt-3 max-h-[480px] overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-200">{PRISMA_SCHEMA}</pre>
          </details>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Next.js Server Actions" description="All mutations run server-side with role checks, validation, audit logging and instant revalidation" icon={<Code2 className="size-4" />} />
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2">Action</th>
                  <th className="px-3 py-2">Roles</th>
                  <th className="px-5 py-2">Behaviour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SERVER_ACTIONS.map((a) => (
                  <tr key={a.name}>
                    <td className="px-5 py-2.5 align-top">
                      <p className="font-mono font-semibold text-slate-800">{a.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">{a.file}</p>
                    </td>
                    <td className="px-3 py-2.5 align-top text-slate-600">{a.roles}</td>
                    <td className="px-5 py-2.5 align-top text-slate-600">{a.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader title="Public mobile report view" description="Scan-to-Report without tenant authentication" icon={<Smartphone className="size-4" />} />
          <div className="space-y-3 p-5 text-xs text-slate-600">
            <p>Each sticker encodes <code className="rounded bg-slate-100 px-1">/r/&lt;qrToken&gt;</code> — an unguessable token, not the asset ID, preventing enumeration.</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Pre-populates asset name, tag, exact location, environment settings and target domain</li>
              <li>Shows only public-safe metadata (no IPs, serials or specs)</li>
              <li>Issue picker from the domain catalog with a live SLA estimate</li>
              <li>Known-issue banner to reduce duplicate reports</li>
              <li>Honeypot + per-asset rate limit; redirect to a live tracking page</li>
            </ul>
            {sample ? (
              <Link href={`/r/${sample.qrToken}`} target="_blank" className="mt-2 inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-500">
                Open sample: {sample.name} <ArrowRight className="size-3.5" />
              </Link>
            ) : null}
          </div>
        </Card>
      </section>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <BookOpen className="size-3.5" /> PDFs are generated on demand from the same source-of-truth modules (SLA engine, workflow, SOP library) used by the application.
      </p>
    </div>
  );
}
