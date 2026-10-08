import Link from "next/link";
import { CircleDollarSign, Flag, FolderKanban, ListChecks, Scale, ShieldAlert, TrendingUp } from "lucide-react";
import { getDashboard } from "@/lib/pmo/queries";
import { requireRole } from "@/lib/auth";
import { Card, CardHeader, LinkButton, PageHeader, StatCard } from "@/components/ui";
import { BarsBlock, CHART_COLORS, PieBlock, RAGLegend } from "@/components/pmo/charts";
import { fmtAmount, fmtNum } from "@/lib/pmo/derive";

export const dynamic = "force-dynamic";
export const metadata = { title: "PMO Executive Dashboard" };

export default async function PmoDashboardPage() {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const d = await getDashboard();
  const k = d.kpi;

  return (
    <div>
      <PageHeader
        eyebrow="PMO"
        title="Executive dashboard"
        description="Portfolio-level health, cost, schedule and delivery performance at a glance."
        actions={
          <LinkButton href="/pmo" variant="secondary" size="sm">
            PMO home
          </LinkButton>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active projects" value={fmtNum(k.active)} hint={`${k.completed} completed`} icon={<FolderKanban className="size-4" />} tone="indigo" />
        <StatCard label="Red projects" value={fmtNum(k.red)} hint="Need escalation" icon={<ShieldAlert className="size-4" />} tone="red" alert={k.red > 0} />
        <StatCard label="Open risks" value={fmtNum(k.openRisks)} hint={`${k.highRisks} high / critical`} icon={<TrendingUp className="size-4" />} tone="amber" />
        <StatCard label="Available spend" value={fmtAmount(Math.max(0, k.approved - k.actual))} hint="Approved minus actual" icon={<CircleDollarSign className="size-4" />} tone="emerald" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Approved amount" value={fmtAmount(k.approved)} hint="Total portfolio budget" icon={<CircleDollarSign className="size-4" />} tone="sky" />
        <StatCard label="Actual cost" value={fmtAmount(k.actual)} hint={`${k.utilPct ?? 0}% utilised`} icon={<CircleDollarSign className="size-4" />} tone="amber" />
        <StatCard label="Forecast cost" value={fmtAmount(k.forecast)} hint={fmtAmount(Math.max(0, k.forecast - k.actual)) + " yet to spend"} icon={<TrendingUp className="size-4" />} tone="violet" />
        <StatCard label="Open actions" value={fmtNum(k.openActions)} hint={`${k.overdueActions} overdue`} icon={<ListChecks className="size-4" />} tone="red" alert={k.overdueActions > 0} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Milestones open" value={fmtNum(k.openMilestones)} hint={`${k.overdueMilestones} overdue`} icon={<Flag className="size-4" />} tone="amber" />
        <StatCard label="Pending decisions" value={fmtNum(k.pendingDecisions)} hint="Blocking or gating decisions" icon={<Scale className="size-4" />} tone="red" alert={k.pendingDecisions > 0} />
        <StatCard label="Quality pass rate" value={k.qualityPassRate === null ? "—" : `${k.qualityPassRate}%`} hint="Pass vs fail results" icon={<TrendingUp className="size-4" />} tone="emerald" />
        <StatCard label="Closure progress" value={k.closurePct === null ? "—" : `${k.closurePct}%`} hint="Checklist items complete" icon={<Flag className="size-4" />} tone="sky" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Cost by project" description="Approved vs actual vs forecast per project." />
          <div className="p-4">
            <BarsBlock
              data={d.charts.costByProject}
              bars={[
                { key: "approved", color: "#cbd5e1", name: "Approved" },
                { key: "forecast", color: "#0ea5e9", name: "Forecast" },
                { key: "actual", color: "#16a34a", name: "Actual" },
              ]}
              money
              xLabel="Project "
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="RAG mix" description="Active projects by status colour." action={<RAGLegend data={d.charts.ragMix} />} />
          <div className="p-4">
            {d.charts.ragMix.length ? <PieBlock data={d.charts.ragMix} /> : <p className="py-8 text-center text-sm text-slate-400">No active projects yet.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Health mix" description="Computed portfolio health signal." />
          <div className="p-4">
            {d.charts.healthMix.length ? (
              <>
                <PieBlock data={d.charts.healthMix} />
              </>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No health data yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Project status" description="Portfolio split by lifecycle status." />
          <div className="p-4">
            {d.charts.statusMix.length ? (
              <PieBlock data={d.charts.statusMix} palette={CHART_COLORS} height={180} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No projects yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Project type" description="Portfolio by type of work." />
          <div className="p-4">
            {d.charts.typeMix.length ? (
              <PieBlock data={d.charts.typeMix} palette={CHART_COLORS} height={180} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No projects yet.</p>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Cost by category" description="Where approved and actual money has gone." />
          <div className="p-4">
            {d.charts.costByCategory.length ? (
              <BarsBlock
                data={d.charts.costByCategory}
                stacked
                bars={[
                  { key: "approved", color: "#cbd5e1", name: "Approved" },
                  { key: "actual", color: "#0ea5e9", name: "Actual" },
                ]}
                money
                xLabel="Category "
              />
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No cost lines yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Milestone status" description="How delivery milestones are tracking." />
          <div className="p-4">
            {d.charts.milestoneMix.length ? (
              <PieBlock data={d.charts.milestoneMix} palette={CHART_COLORS} height={180} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No milestones yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Action status" description="Volume of open, in-progress and completed actions." />
          <div className="p-4">
            {d.charts.actionMix.length ? (
              <PieBlock data={d.charts.actionMix} palette={CHART_COLORS} height={180} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No actions yet.</p>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Progress by project" description="% complete vs budget utilisation." />
          <div className="p-4">
            {d.charts.utilisation.length ? (
              <BarsBlock data={d.charts.utilisation} bars={[{ key: "util", color: "#8b5cf6", name: "% complete" }]} xLabel="Project " />
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No projects yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Resource load" description="Total allocation per person (over 100% = overload)." />
          <div className="p-4">
            {d.charts.resourceLoad.length ? (
              <BarsBlock
                data={d.charts.resourceLoad}
                bars={[{ key: "allocation", color: d.charts.resourceLoad.some((r) => r.allocation > 100) ? "#dc2626" : "#0ea5e9", name: "Allocation %" }]}
              />
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No resources yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
