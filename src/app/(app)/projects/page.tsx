import type { Metadata } from "next";
import { asc, ne, sql } from "drizzle-orm";
import { CircleDollarSign, FolderKanban, TriangleAlert } from "lucide-react";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui";
import { ProjectsManager } from "./projects-client";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const canManage = can.manageProjects(user.role);

  const [rows, statRows] = await Promise.all([
    db
      .select({
        id: projects.id,
        code: projects.code,
        name: projects.name,
        sponsor: projects.sponsor,
        projectManager: projects.projectManager,
        department: projects.department,
        startDate: projects.startDate,
        targetEndDate: projects.targetEndDate,
        status: projects.status,
        rag: projects.rag,
        percentComplete: projects.percentComplete,
        budget: projects.budget,
        actualCost: projects.actualCost,
        nextMilestone: projects.nextMilestone,
        notes: projects.notes,
      })
      .from(projects)
      .orderBy(asc(projects.code)),
    db
      .select({
        active: sql<number>`count(*) filter (where ${projects.status} = 'ACTIVE')`.mapWith(Number),
        red: sql<number>`count(*) filter (where ${projects.rag} = 'RED' and ${projects.status} <> 'COMPLETED')`.mapWith(Number),
        overdue: sql<number>`count(*) filter (where ${projects.targetEndDate} < now()::date and ${projects.status} not in ('COMPLETED','CANCELLED'))`.mapWith(Number),
        budget: sql<number>`coalesce(sum(${projects.budget}), 0)`.mapWith(Number),
        actualCost: sql<number>`coalesce(sum(${projects.actualCost}), 0)`.mapWith(Number),
      })
      .from(projects)
      .where(ne(projects.status, "CANCELLED")),
  ]);
  const stats = statRows[0];

  const spend = stats.budget > 0 ? Math.round((stats.actualCost / stats.budget) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Project register"
        description="Every active project in one place — sponsor, owner, dates, RAG, progress and budget."
      />
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active projects" value={formatNumber(stats.active)} icon={<FolderKanban className="size-4" />} tone="sky" hint={`${rows.length} projects registered`} />
        <StatCard label="Red projects" value={formatNumber(stats.red)} icon={<TriangleAlert className="size-4" />} tone="red" alert={stats.red > 0} hint={stats.overdue ? `${stats.overdue} past target end date` : "No overdue projects"} />
        <StatCard label="Approved budget" value={formatNumber(stats.budget)} icon={<CircleDollarSign className="size-4" />} tone="emerald" hint="Sum of registered project budgets" />
        <StatCard label="Actual cost" value={formatNumber(stats.actualCost)} icon={<CircleDollarSign className="size-4" />} tone="amber" hint={`${spend}% of budget consumed`} />
      </div>
      <ProjectsManager rows={rows} canManage={canManage} />
    </div>
  );
}
