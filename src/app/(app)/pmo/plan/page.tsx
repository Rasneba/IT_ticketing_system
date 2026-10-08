import { Target } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { Card, LinkButton, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "PMO 30 / 60 / 90 Day Plan" };

const PLAN = [
  {
    phase: "First 30 days",
    focus: "Understand the baseline",
    items: [
      "Commission the portfolio register with every live project loaded.",
      "Confirm each project has an owner, baseline end date and approved amount.",
      "Stand up the action tracker and hold the first weekly review meeting.",
      "Upload the operating procedures into the knowledge base.",
      "Agree RAG and escalation rules with sponsors.",
    ],
  },
  {
    phase: "Next 30 days",
    focus: "Get control",
    items: [
      "Load milestones and the RAID log for every active project.",
      "Introduce the cost management layout with approved vs actual vs forecast.",
      "Run the first monthly portfolio review with the executive dashboard.",
      "Train project managers on the milestone, action and RAID registers.",
      "Publish the communication plan and stakeholder register.",
    ],
  },
  {
    phase: "After 90 days",
    focus: "Deliver benefits",
    items: [
      "Project closure checklist used on every completed project.",
      "Lessons learned feed the monthly review and the way we work.",
      "Procurement and quality registers fully embedded in delivery.",
      "Create repeatable weekly and monthly reporting off the dashboard.",
      "Review the data dictionary and retire anything unused.",
    ],
  },
];

export default async function PlanPage() {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  return (
    <div>
      <PageHeader
        eyebrow="PMO"
        title="30 / 60 / 90 day plan"
        description="How the PMO matures from setup to a controlled, value-delivering function."
        actions={
          <LinkButton href="/pmo" variant="secondary" size="sm">
            PMO home
          </LinkButton>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN.map((phase, i) => (
          <Card key={phase.phase} className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-50 text-sm font-bold text-accent-600">{i + 1}</span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{phase.phase}</h2>
                <p className="text-xs text-slate-500">{phase.focus}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5">
              {phase.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Target className="mt-0.5 size-4 shrink-0 text-accent-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}