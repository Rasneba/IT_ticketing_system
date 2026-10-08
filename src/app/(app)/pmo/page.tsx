import Link from "next/link";
import {
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Flag,
  FolderKanban,
  GitPullRequest,
  LayoutDashboard,
  Library,
  Lightbulb,
  ListChecks,
  Megaphone,
  Network,
  PackageCheck,
  Scale,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { REGISTERS } from "@/lib/pmo/defs";
import { CUSTOMERS } from "@/lib/pmo/lists";
import { badgeClass } from "@/lib/pmo/lists";
import { getDashboard, getProjects, getRegisterIndex } from "@/lib/pmo/queries";
import { requireRole } from "@/lib/auth";
import { Badge } from "@/components/badges";
import { Card, CardHeader, LinkButton, PageHeader, StatCard } from "@/components/ui";
import { fmtAmount, fmtNum } from "@/lib/pmo/derive";

export const dynamic = "force-dynamic";
export const metadata = { title: "PMO System" };

const ICONS: Record<string, LucideIcon> = {
  portfolio: FolderKanban,
  milestones: Flag,
  raid: ShieldAlert,
  actions: ListChecks,
  raci: Network,
  stakeholders: Users,
  changes: GitPullRequest,
  costs: CircleDollarSign,
  resources: UserCog,
  procurement: ShoppingCart,
  quality: ShieldCheck,
  meetings: CalendarDays,
  decisions: Scale,
  comms: Megaphone,
  closure: PackageCheck,
  lessons: Lightbulb,
};

export default async function PmoHomePage() {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const [dash, index, projects] = await Promise.all([getDashboard(), getRegisterIndex(), getProjects()]);

  const contents: { href: string; label: string; desc: string; icon: LucideIcon }[] = [
    { href: "/pmo/dashboard", label: "Executive dashboard", desc: "KPI cards and trend charts for the whole portfolio", icon: LayoutDashboard },
    { href: "/pmo/sop", label: "Operating procedures", desc: "Every SOP that governs the PMO", icon: ClipboardList },
    { href: "/pmo/plan", label: "30 / 60 / 90 day plan", desc: "How the PMO matures", icon: GitPullRequest },
    { href: "/pmo/settings", label: "Settings & lists", desc: "Controlled lists and customers behind every drop-down", icon: Settings },
    { href: "/pmo/dictionary", label: "Data dictionary", desc: "Every field in every register, explained", icon: Library },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio Management Office"
        title="PMO System"
        description={`The project control tower: portfolio, registers, dashboards and procedures. ${projects.length} projects · ${CUSTOMERS.length} customers on file.`}
        actions={
          <LinkButton href="/pmo/dashboard" variant="primary" size="sm">
            <LayoutDashboard className="size-4" /> Executive dashboard
          </LinkButton>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active projects" value={`${dash.kpi.active}`} hint={`${dash.kpi.completed} completed`} icon={<FolderKanban className="size-4" />} tone="indigo" />
        <StatCard label="Red projects" value={`${dash.kpi.red}`} hint={`${dash.kpi.overdueActions} actions overdue`} icon={<ShieldAlert className="size-4" />} tone="red" alert={dash.kpi.red > 0 || dash.kpi.overdueActions > 0} />
        <StatCard label="Open milestones" value={`${dash.kpi.openMilestones}`} hint={`${dash.kpi.overdueMilestones} overdue`} icon={<Flag className="size-4" />} tone="amber" />
        <StatCard label="Approved amount" value={fmtAmount(dash.kpi.approved)} hint={`${dash.kpi.utilPct ?? 0}% consumed · forecast ${fmtAmount(dash.kpi.forecast)}`} icon={<CircleDollarSign className="size-4" />} tone="emerald" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        {index.map(({ def, count }) => {
          const Icon = ICONS[def.key] ?? ClipboardList;
          return (
            <Link key={def.key} href={`/pmo/register/${def.key}`} className="group">
              <Card className="h-full p-4 transition group-hover:border-slate-300 group-hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <Icon className="size-5 text-accent-600" />
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">{def.number}</span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-tight text-slate-900 group-hover:text-accent-700">{def.label}</p>
                <p className="mt-1 text-xs text-slate-500">{count}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Active portfolio" description="Projects not yet completed or cancelled, by current RAG." />
            <ul className="divide-y divide-slate-100">
              {dash.projects
                .filter((p) => String(p.status) !== "Completed" && String(p.status) !== "Cancelled")
                .map((p) => (
                  <li key={String(p._id)} className="flex items-center gap-3 px-5 py-3">
                    <Link href={`/pmo/projects/${String(p._id)}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 hover:text-accent-700">
                        {String(p.code ?? "")} <span className="font-normal text-slate-500">· {String(p.name ?? "")}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">{String(p.customer ?? "")}{p.manager ? ` · ${p.manager}` : ""}</p>
                    </Link>
                    <div className="hidden text-right text-xs tabular-nums text-slate-500 sm:block">
                      {fmtNum(p.percent, 0)}%
                      <p className="text-slate-400">
                        {fmtAmount(p.totalApproved)} / {fmtAmount(p.actualCost)}
                      </p>
                    </div>
                    <Badge className={badgeClass("status", String(p.status))}>{String(p.status)}</Badge>
                    <Badge className={badgeClass("rag", String(p.rag))}>{String(p.rag)}</Badge>
                  </li>
                ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="PMO content" description="Procedures, plans and reference material." />
            <div className="space-y-1 p-3">
              {contents.map((c) => {
                const Icon = c.icon;
                return (
                  <Link key={c.href} href={c.href} className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-accent-50 group-hover:text-accent-600">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-accent-700">{c.label}</p>
                      <p className="text-xs text-slate-500">{c.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Open decisions" description="Decisions still awaiting an answer." />
            <div className="p-4">
              <p className="text-3xl font-bold text-slate-900">{dash.kpi.pendingDecisions}</p>
              <p className="mt-1 text-xs text-slate-500">Controlled in the decision log.</p>
              <LinkButton href="/pmo/register/decisions" variant="secondary" size="sm" className="mt-3">
                Open decision log
              </LinkButton>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}