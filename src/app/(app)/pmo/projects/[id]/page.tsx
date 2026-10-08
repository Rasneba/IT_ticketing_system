import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowUpRight, CalendarClock, CircleDollarSign, Flag, FolderKanban, ListChecks, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { getProjects, getRegisterData } from "@/lib/pmo/queries";
import { badgeClass, type ListKey } from "@/lib/pmo/lists";
import { fmtAmount, fmtNum } from "@/lib/pmo/derive";
import { requireRole } from "@/lib/auth";
import { Badge } from "@/components/badges";
import { Card, CardHeader, DetailGrid, PageHeader, StatCard } from "@/components/ui";
import type { Row } from "@/lib/pmo/derive";

export const dynamic = "force-dynamic";
export const metadata = { title: "Project dashboard" };

type Sections = { key: string; label: string; rows: Row[]; cols: string[] };

export default async function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const { id } = await params;

  const projects = await getProjects();
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

  const [milestones, actions, raid, costs, changes, decisions, meetings, closure, quality, procurement, lessons] = await Promise.all([
    getRegisterData("milestones"),
    getRegisterData("actions"),
    getRegisterData("raid"),
    getRegisterData("costs"),
    getRegisterData("changes"),
    getRegisterData("decisions"),
    getRegisterData("meetings"),
    getRegisterData("closure"),
    getRegisterData("quality"),
    getRegisterData("procurement"),
    getRegisterData("lessons"),
  ]);

  const mine = (rows: Row[]) => rows.filter((r) => String(r._pid) === id);

  const m = mine(milestones);
  const a = mine(actions);
  const r = mine(raid);
  const c = mine(costs);
  const ch = mine(changes);
  const de = mine(decisions);
  const mt = mine(meetings);
  const cl = mine(closure);
  const q = mine(quality);
  const pc = mine(procurement);
  const le = mine(lessons);

  const approved = Number(project.totalApproved ?? 0) || 0;
  const actual = Number(project.actualCost ?? 0) || 0;
  const forecast = Number(project.forecastCost ?? 0) || 0;

  const today = new Date().toISOString().slice(0, 10);
  const forecastEnd = project.forecastEnd ?? null;
  const daysLeft = forecastEnd
    ? Math.round((new Date(`${forecastEnd}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000)
    : null;

  const openActions = a.filter((x) => String(x.status) === "Open" || String(x.status) === "In Progress");
  const overdueActions = openActions.filter((x) => String(x.dueDate ?? "") < today);
  const openMilestones = m.filter((x) => String(x.status) !== "Reached");
  const overdueMilestones = openMilestones.filter((x) => String(x.forecastDate ?? x.baselineDate ?? "") < today);
  const openRisks = r.filter((x) => String(x.type) === "Risk" && String(x.status) !== "Closed");
  const openIssues = r.filter((x) => String(x.type) === "Issue" && String(x.status) !== "Closed");

  const sections: Sections[] = [
    { key: "milestones", label: "Milestone Tracker", rows: m, cols: ["milestone", "owner", "forecastDate", "days", "status", "rag"] },
    { key: "actions", label: "Action Tracker", rows: a, cols: ["action", "owner", "dueDate", "status", "rag"] },
    { key: "raid", label: "RAID Log", rows: r, cols: ["type", "description", "score", "priority", "owner", "status"] },
    { key: "costs", label: "Cost Management", rows: c, cols: ["category", "totalApproved", "committed", "actual", "forecast", "util", "variance"] },
    { key: "changes", label: "Change Control", rows: ch, cols: ["description", "costImpact", "scheduleImpact", "approvalStatus", "implementationStatus"] },
    { key: "decisions", label: "Decision Log", rows: de, cols: ["decisionRequired", "maker", "status", "dueDate"] },
    { key: "closure", label: "Project Closure", rows: cl, cols: ["item", "owner", "status", "evidence"] },
  ];

  const registerPages = [
    { key: "quality", label: "Quality control", count: q.length },
    { key: "procurement", label: "Procurement", count: pc.length },
    { key: "meetings", label: "Meeting minutes", count: mt.length },
    { key: "lessons", label: "Lessons learned", count: le.length },
  ];

  const status = String(project.status);
  const rag = String(project.rag);

  return (
    <div>
      <PageHeader
        backHref="/pmo"
        backLabel="PMO home"
        eyebrow={<span className="font-mono normal-case tracking-normal">{project.code}</span>}
        title={project.name}
        description={[project.customer ? `Customer: ${project.customer}` : null, project.manager ? `PM: ${project.manager}` : null]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <span className="inline-flex items-center gap-2">
            <Badge className={badgeClass("status", status)}>{status}</Badge>
            <Badge className={badgeClass("rag", rag)}>{rag}</Badge>
            <Link href={`/pmo/register/portfolio`} className="text-xs font-medium text-slate-500 hover:text-slate-800">
              Edit in portfolio <ArrowUpRight className="ml-0.5 inline size-3" />
            </Link>
          </span>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Progress" value={`${fmtNum(project.percent, 0)}%`} hint="Percent complete" icon={<TrendingUp className="size-4" />} tone="indigo" />
        <StatCard
          label="Open milestones"
          value={fmtNum(openMilestones.length)}
          hint={overdueMilestones.length ? `${overdueMilestones.length} overdue` : "None overdue"}
          icon={<Flag className="size-4" />}
          tone="amber"
          alert={overdueMilestones.length > 0}
        />
        <StatCard
          label="Open actions"
          value={fmtNum(openActions.length)}
          hint={overdueActions.length ? `${overdueActions.length} overdue` : "None overdue"}
          icon={<ListChecks className="size-4" />}
          tone="red"
          alert={overdueActions.length > 0}
        />
        <StatCard label="Open risks / issues" value={`${openRisks.length} / ${openIssues.length}`} hint="Risks / issues open" icon={<ShieldAlert className="size-4" />} tone="amber" alert={openRisks.length + openIssues.length > 0} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Approved amount" value={fmtAmount(approved)} hint="Total budget approved" icon={<CircleDollarSign className="size-4" />} tone="sky" />
        <StatCard label="Actual cost" value={fmtAmount(actual)} hint={approved > 0 ? `${Math.round((actual / approved) * 100)}% consumed` : "No budget set"} icon={<CircleDollarSign className="size-4" />} tone="amber" />
        <StatCard label="Forecast cost" value={fmtAmount(forecast)} hint={`${forecast - actual >= 0 ? "Yet to pay" : "Over actual"}`} icon={<TrendingUp className="size-4" />} tone="violet" />
        <StatCard
          label="Cost variance"
          value={fmtAmount(forecast - approved)}
          hint={forecast - approved > 0 ? "Over approved budget" : "Within approved budget"}
          icon={<TrendingDown className="size-4" />}
          tone={forecast - approved > 0 ? "red" : "emerald"}
          alert={forecast - approved > 0}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Project charter</h2>
          <DetailGrid
            items={[
              { label: "Customer", value: project.customer, full: true },
              { label: "Type", value: project.type },
              { label: "Department", value: project.department },
              { label: "Priority", value: project.priority },
              { label: "Start date", value: project.startDate },
              { label: "Baseline end", value: project.baselineEnd },
              { label: "Forecast end", value: project.forecastEnd },
              { label: "Actual end", value: project.actualEnd },
              { label: "Last updated", value: project.lastUpdated },
              { label: "Days to forecast end", value: daysLeft === null ? null : `${daysLeft}d`, mono: true },
              { label: "Notes", value: project.notes, full: true },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="Weekly status" description="Snapshot for this week's review." />
          <div className="p-5">
            <dl className="space-y-2.5 text-sm">
              {(
                [
                  ["Portfolio status", status],
                  ["RAG", rag],
                  ["Forecast end", project.forecastEnd ?? "—"],
                  ["Milestones open", `${openMilestones.length} (${overdueMilestones.length} overdue)`],
                  ["Actions open", `${openActions.length} (${overdueActions.length} overdue)`],
                  ["Risks open", `${openRisks.length} · issues ${openIssues.length}`],
                  ["Closure items", `${cl.length - cl.filter((x) => String(x.status) === "Complete").length} of ${cl.length} open`],
                  ["Quality pass/fail", `${q.filter((x) => String(x.result) === "Pass").length}/${q.filter((x) => String(x.result) === "Fail").length}`],
                  ["Next milestone", String(m[0]?.milestone ?? "—")],
                ] as [string, ReactNode][]
              ).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 border-b border-slate-50 pb-2 last:border-0">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <CalendarClock className="size-3.5" /> Auto-generated from PMO registers.
            </p>
          </div>
        </Card>
      </div>

      {sections.map((s) => (
        <Card key={s.key} className="mb-4">
          <CardHeader
            title={s.label}
            description={`${s.rows.length} records`}
            action={
              <Link href={`/pmo/register/${s.key}`} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:text-accent-600">
                Open <ArrowUpRight className="size-3" />
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                  {s.cols.map((col) => (
                    <th key={col} className="px-4 py-2.5 font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.rows.length === 0 ? (
                  <tr>
                    <td colSpan={s.cols.length} className="px-4 py-6 text-center text-sm text-slate-400">
                      No records yet.
                    </td>
                  </tr>
                ) : (
                  s.rows.map((row, i) => (
                    <tr key={String(row._id ?? i)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      {s.cols.map((col) => (
                        <td key={col} className="px-4 py-2.5 align-top text-slate-700">
                          <MiniCell section={s.key} col={col} row={row} />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {registerPages.map((gp) => (
          <Link key={gp.key} href={`/pmo/register/${gp.key}`} className="group">
            <Card className="p-4 transition group-hover:border-slate-300 group-hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 group-hover:text-accent-700">{gp.label}</p>
                <ArrowUpRight className="size-4 text-slate-400 group-hover:text-accent-600" />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                <FolderKanban className="mr-1 inline size-3.5" />
                {gp.count} records for this project
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function statusListFor(section: string): string {
  switch (section) {
    case "milestones":
      return "milestoneStatus";
    case "actions":
      return "actionStatus";
    case "raid":
      return "raidStatus";
    case "changes":
      return "changeStatus";
    case "decisions":
      return "decisionStatus";
    case "closure":
      return "closureStatus";
    default:
      return "";
  }
}

const MONEY_COLS = new Set(["totalApproved", "committed", "actual", "forecast", "variance", "costImpact"]);
const NUM_COLS = new Set(["days", "score", "scheduleImpact"]);
const LIST_COLS: Record<string, string> = {
  rag: "rag",
  priority: "priority",
  type: "raidType",
  approvalStatus: "changeStatus",
  implementationStatus: "changeImpl",
};

function MiniCell({ section, col, row }: { section: string; col: string; row: Row }) {
  const v = row[col];
  if (col === "status") {
    const lk = statusListFor(section);
    if (lk) return <Badge className={badgeClass(lk as ListKey, String(v))}>{String(v)}</Badge>;
  }
  if (LIST_COLS[col]) {
    return <Badge className={badgeClass(LIST_COLS[col] as ListKey, String(v))}>{String(v)}</Badge>;
  }
  if (v === null || v === undefined || v === "") return <span className="text-slate-300">—</span>;
  if (MONEY_COLS.has(col)) return <span className="tabular-nums">{fmtAmount(v)}</span>;
  if (NUM_COLS.has(col)) return <span className="tabular-nums">{fmtNum(v, 0)}d</span>;
  if (col === "util") return <span className="tabular-nums">{fmtNum(v, 1)}%</span>;
  return <span className="max-w-[300px] truncate">{String(v)}</span>;
}