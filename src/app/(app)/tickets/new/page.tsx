import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listAssetsBasic, listStaff, listUnitsBasic } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { TicketForm } from "./ticket-form";

export const metadata: Metadata = { title: "New ticket" };

export default async function NewTicketPage({ searchParams }: { searchParams: Promise<{ assetId?: string; unitId?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isTenant = user.role === "TENANT";
  const [unitsList, assetsList, staff] = await Promise.all([
    isTenant ? Promise.resolve([]) : listUnitsBasic(),
    listAssetsBasic(),
    isTenant ? Promise.resolve([]) : listStaff(),
  ]);
  const visibleAssets = isTenant ? assetsList.filter((a) => a.unitId && a.unitId === user.unitId) : assetsList;

  return (
    <div>
      <PageHeader
        backHref="/tickets"
        backLabel="Tickets"
        title={isTenant ? "Report an issue" : "New ticket"}
        description="Pick the system and issue type — the deterministic SLA engine assigns priority and response/resolution timers automatically."
      />
      <TicketForm
        role={user.role}
        tenantUnit={isTenant ? { id: user.unitId, label: `${user.unitName ?? "Your unit"}${user.unitCode ? ` · Unit ${user.unitCode}` : ""}` } : null}
        units={unitsList}
        assets={visibleAssets}
        staff={staff.map((s) => ({ id: s.id, name: s.name, role: s.role, skills: s.skills }))}
        defaultAssetId={sp.assetId ?? ""}
        defaultUnitId={sp.unitId ?? ""}
      />
    </div>
  );
}
