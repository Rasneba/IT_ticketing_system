import { requireRole } from "@/lib/auth";
import { REGISTERS } from "@/lib/pmo/defs";
import { CUSTOMERS, LISTS, type ListKey } from "@/lib/pmo/lists";
import { Card, LinkButton, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "PMO Data Dictionary" };

const FIELD_LABEL: Record<string, string> = {
  text: "Text",
  textarea: "Long text",
  date: "Date",
  integer: "Whole number",
  number: "Number",
  percent: "Percentage 0–100",
  currency: "Currency (USD)",
  select: "Controlled list",
};

export default async function DictionaryPage() {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  return (
    <div>
      <PageHeader
        eyebrow="PMO"
        title="Data dictionary"
        description="Every field in every register of the PMO system, its type, and where its values come from."
        actions={
          <LinkButton href="/pmo" variant="secondary" size="sm">
            PMO home
          </LinkButton>
        }
      />
      <div className="space-y-5">
        {REGISTERS.map((def) => (
          <Card key={def.key}>
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">{def.number}</span>
                <h2 className="text-sm font-semibold text-slate-900">{def.title}</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">{def.description}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-2.5 font-semibold">Field</th>
                    <th className="px-5 py-2.5 font-semibold">Type</th>
                    <th className="px-5 py-2.5 font-semibold">Required</th>
                    <th className="px-5 py-2.5 font-semibold">Values</th>
                  </tr>
                </thead>
                <tbody>
                  {def.fields.map((f) => {
                    const isProject = f.name === "projectId";
                    const listValues = isProject
                      ? "Projects in the portfolio (02_PROJECT_PORTFOLIO)"
                      : f.list
                        ? f.list === "customer"
                          ? CUSTOMERS.join(", ")
                          : (LISTS[f.list as ListKey] ?? []).join(", ")
                        : null;
                    return (
                      <tr key={f.name} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-2.5">
                          <span className="font-semibold text-slate-800">{f.label}</span>
                          <span className="ml-2 font-mono text-[11px] text-slate-400">{f.name}</span>
                        </td>
                        <td className="px-5 py-2.5 text-slate-600">{FIELD_LABEL[f.type] ?? f.type}</td>
                        <td className="px-5 py-2.5">{f.required ? <span className="font-semibold text-red-600">Yes</span> : <span className="text-slate-400">No</span>}</td>
                        <td className="max-w-[420px] px-5 py-2.5 text-slate-600">{listValues ?? "Free text"}</td>
                      </tr>
                    );
                  })}
                  {def.cols.length ? (
                    <tr className="bg-slate-50/60">
                      <td className="px-5 py-2.5">
                        <span className="text-xs font-semibold text-slate-700">Computed in table view</span>
                        <span className="ml-2 font-mono text-[11px] text-slate-400">{def.cols.map((c) => c.name).join(", ")}</span>
                      </td>
                      <td className="px-5 py-2.5 text-slate-500">Derived</td>
                      <td className="px-5 py-2.5 text-slate-400">—</td>
                      <td className="px-5 py-2.5 text-slate-500">Calculated automatically from the stored fields above.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}