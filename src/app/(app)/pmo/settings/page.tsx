import { requireRole } from "@/lib/auth";
import { CUSTOMERS, LISTS, type ListKey } from "@/lib/pmo/lists";
import { Card, CardHeader, LinkButton, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "PMO Settings & Lists" };

const GROUPS: { title: string; hint: string; keys: ListKey[] }[] = [
  { title: "Project lifecycle", hint: "Status, RAG and prioritisation.", keys: ["status", "rag", "priority", "projType"] },
  { title: "Organisation", hint: "Departments and people.", keys: ["dept", "customer"] },
  { title: "Risk & delivery", hint: "RAID, milestones and actions.", keys: ["raidType", "raidCategory", "raidStatus", "riskStatus", "milestoneStatus", "actionStatus"] },
  { title: "Change & decisions", hint: "Change control and decision log.", keys: ["changeStatus", "changeImpl", "decisionStatus"] },
  { title: "Cost & resources", hint: "Money and capacity.", keys: ["costCategory", "costStatus", "resourceStatus"] },
  { title: "Quality & procurement", hint: "Delivery assurance.", keys: ["qualityResult", "qualityStatus", "procurementStatus"] },
  { title: "Meetings & comms", hint: "Rhythm of the PMO.", keys: ["meetingType", "meetingStatus", "commFrequency", "frequency", "engagement"] },
  { title: "Closure & lessons", hint: "Ending well.", keys: ["closureStatus", "lessonStatus"] },
  { title: "RACI", hint: "Responsibility codes.", keys: ["raci"] },
];

export default async function SettingsPage() {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  return (
    <div>
      <PageHeader
        eyebrow="PMO"
        title="Settings & controlled lists"
        description="Every drop-down value used across the PMO registers, mirroring the 23_SETTINGS sheet of the Excel system."
        actions={
          <LinkButton href="/pmo" variant="secondary" size="sm">
            PMO home
          </LinkButton>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((group) => (
          <Card key={group.title}>
            <CardHeader title={group.title} description={group.hint} />
            <div className="space-y-3 p-5">
              {group.keys.map((key) => (
                <div key={key}>
                  <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-slate-400">{key}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(key === "customer" ? CUSTOMERS : LISTS[key]).map((v) => (
                      <span key={v} className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}