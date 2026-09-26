import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardCheck, PhoneForwarded, Wrench } from "lucide-react";
import { getSop } from "@/lib/sop";
import { requireRole } from "@/lib/auth";
import { CAPTURE_TYPES } from "@/lib/audit-captures";
import { findIssue } from "@/lib/domains";
import { DomainBadge, PriorityBadge } from "@/components/badges";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { PrintButton } from "../../../assets/asset-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const sop = getSop(id);
  return { title: sop ? `${sop.id} · ${sop.title}` : "SOP" };
}

export default async function SopPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const { id } = await params;
  const sop = getSop(id);
  if (!sop) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        backHref="/docs"
        backLabel="SOP & Documents"
        eyebrow={<span className="font-mono normal-case tracking-normal">{sop.id} · ~{sop.estimatedMinutes} min · {sop.audience}</span>}
        title={sop.title}
        description={sop.summary}
        actions={<span className="print:hidden"><PrintButton label="Print SOP" /></span>}
      />
      <div className="-mt-3 mb-6 flex flex-wrap gap-2">
        {sop.domains.map((d) => (
          <DomainBadge key={d} domain={d} full />
        ))}
        {sop.issueCodes.map((code) => {
          const issue = sop.domains.map((d) => findIssue(d, code)).find(Boolean);
          return issue ? (
            <span key={code} className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
              <PriorityBadge priority={issue.basePriority} showLabel={false} /> {issue.label}
            </span>
          ) : null;
        })}
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Tools & access" icon={<Wrench className="size-4" />} />
          <ul className="list-disc space-y-1 px-9 py-4 text-sm text-slate-700">
            {sop.tools.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader title="Safety & compliance" icon={<AlertTriangle className="size-4 text-amber-600" />} className="border-amber-100" />
          <ul className="list-disc space-y-1 px-9 py-4 text-sm text-amber-900">
            {sop.safety.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mb-6 overflow-hidden">
        <CardHeader title="Step-by-step execution" description="Record evidence in the ticket timeline as you go" />
        <ol className="divide-y divide-slate-100">
          {sop.steps.map((s, i) => (
            <li key={i} className="grid gap-3 px-5 py-4 md:grid-cols-[2.5rem_1fr_16rem]">
              <span className="grid size-8 place-items-center rounded-full bg-accent-600 text-sm font-bold text-white">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{s.action}</p>
                <p className="mt-0.5 text-sm text-slate-600">{s.detail}</p>
                {s.command ? (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 px-3 py-2 font-mono text-[11px] leading-relaxed text-emerald-300">{s.command}</pre>
                ) : null}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-100">
                <p className="mb-0.5 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="size-3.5" /> Expected
                </p>
                {s.expected}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader title="Verification" icon={<CheckCircle2 className="size-4" />} />
          <ul className="list-disc space-y-1 px-9 py-4 text-sm text-slate-700">
            {sop.verification.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Escalation" icon={<PhoneForwarded className="size-4" />} />
          <ul className="list-disc space-y-1 px-9 py-4 text-sm text-slate-700">
            {sop.escalation.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Workbench captures" icon={<ClipboardCheck className="size-4" />} />
          <ul className="space-y-2 px-5 py-4">
            {sop.captures.map((c) => (
              <li key={c} className="text-sm">
                <p className="font-medium text-slate-800">{CAPTURE_TYPES[c]?.label ?? c}</p>
                <p className="text-xs text-slate-500">{CAPTURE_TYPES[c]?.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
