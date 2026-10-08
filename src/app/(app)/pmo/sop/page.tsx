import Link from "next/link";
import { BookOpen, ScrollText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { Card, CardHeader, LinkButton, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "PMO Operating Procedures" };

const SOPS = [
  { code: "SOP-PMO-01", title: "Portfolio Management", summary: "How the portfolio register is run: adding projects, keeping RAG current, and reviewing the whole portfolio monthly." },
  { code: "SOP-PMO-02", title: "Project Initiation", summary: "Setting up a new project: charter, portfolio entry, milestone plan and stakeholder identification." },
  { code: "SOP-PMO-03", title: "Project Planning", summary: "Baseline schedule and budget, precedence, and the initial risk assessment." },
  { code: "SOP-PMO-04", title: "Monitoring & Control", summary: "Weekly progress, variance review, and how RAG and health colours are calculated." },
  { code: "SOP-PMO-05", title: "Milestone Management", summary: "Recording baseline, forecast and actual dates; escalation when a milestone slips." },
  { code: "SOP-PMO-06", title: "Risk & Issue Management", summary: "Maintaining the RAID log, scoring risks, and running risk reviews." },
  { code: "SOP-PMO-07", title: "Change Control", summary: "Submitting change requests, impact assessment and the approval gate before implementation." },
  { code: "SOP-PMO-08", title: "Project Closure", summary: "Working the closure checklist to 100% before a project is formally closed." },
  { code: "SOP-PMO-09", title: "Communication Management", summary: "The communication plan, meeting minutes, decision log and escalation path." },
];

export default async function SopPage() {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  return (
    <div>
      <PageHeader
        eyebrow="PMO"
        title="Operating procedures"
        description="The documented way the PMO works. Every register has one procedure behind it."
        actions={
          <LinkButton href="/pmo" variant="secondary" size="sm">
            PMO home
          </LinkButton>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SOPS.map((sop) => (
          <Card key={sop.code} className="p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-accent-600">
              <ScrollText className="size-3.5" /> {sop.code}
            </div>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">{sop.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{sop.summary}</p>
            <Link href="/pmo/dictionary" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:text-accent-600">
              <BookOpen className="size-3.5" /> Field reference
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}