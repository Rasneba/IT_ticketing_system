import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CalendarRange, CircleDollarSign, Milestone } from "lucide-react";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/utils";
import { ProjectStatusBadge, RagBadge } from "@/components/badges";
import { Card, CardHeader, DetailGrid, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const { id } = await params;
  const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1).then((rows) => rows[0]);
  if (!project) notFound();

  const variance = project.budget - project.actualCost;
  const consumed = project.budget > 0 ? Math.min(100, Math.round((project.actualCost / project.budget) * 100)) : 0;

  return (
    <div>
      <PageHeader
        backHref="/projects"
        backLabel="Project register"
        eyebrow={<span className="font-mono normal-case tracking-normal">{project.code}</span>}
        title={project.name}
        description={[project.department, project.sponsor ? `Sponsor: ${project.sponsor}` : null].filter(Boolean).join(" · ") || undefined}
        actions={
          <span className="inline-flex items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <RagBadge rag={project.rag} />
          </span>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <DetailGrid
            items={[
              { label: "Project manager", value: project.projectManager ?? "Unassigned" },
              { label: "Sponsor", value: project.sponsor ?? "—" },
              { label: "Department", value: project.department ?? "—" },
              { label: "Status", value: <ProjectStatusBadge status={project.status} /> },
              { label: "RAG", value: <RagBadge rag={project.rag} /> },
              { label: "% complete", value: `${project.percentComplete}%` },
              { label: "Start date", value: formatDate(project.startDate) },
              { label: "Target end date", value: formatDate(project.targetEndDate) },
              { label: "Next milestone", value: project.nextMilestone ?? "—", full: true },
              { label: "Notes", value: project.notes ?? "—", full: true },
            ]}
          />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Delivery progress</p>
            <span className="text-2xl font-bold tabular-nums text-slate-900">{project.percentComplete}%</span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={project.percentComplete >= 100 ? "h-full rounded-full bg-emerald-500" : "h-full rounded-full bg-accent-500"}
              style={{ width: `${Math.min(100, Math.max(0, project.percentComplete))}%` }}
            />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarRange className="size-3.5" />
            {formatDate(project.startDate)} → {formatDate(project.targetEndDate)}
          </p>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader title="Cost" icon={<CircleDollarSign className="size-4" />} />
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Approved budget</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{formatNumber(project.budget)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Actual cost</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {formatNumber(project.actualCost)}
                <span className="ml-1.5 text-xs font-medium text-slate-400">{consumed}%</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Variance vs budget</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${variance < 0 ? "text-red-600" : "text-emerald-600"}`}>
                {variance < 0 ? `-${formatNumber(Math.abs(variance))}` : formatNumber(variance)}
              </p>
            </div>
          </div>
          <div className="px-5 pb-5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${consumed > 100 ? "bg-red-500" : consumed > 90 ? "bg-amber-500" : "bg-accent-500"}`} style={{ width: `${Math.min(100, consumed)}%` }} />
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader title="Next milestone" icon={<Milestone className="size-4" />} />
          <p className="px-5 pb-5 text-sm text-slate-700">{project.nextMilestone ?? "No milestone recorded yet."}</p>
        </Card>
      </div>
    </div>
  );
}
