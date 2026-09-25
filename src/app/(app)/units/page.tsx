import type { Metadata } from "next";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { assets, categories, tickets, units } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listCategories } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { UnitsManager } from "./units-client";

export const metadata: Metadata = { title: "Units" };

export default async function UnitsPage() {
  const user = await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const canManage = can.manageUnits(user.role);
  const rows = await db
    .select({
      id: units.id,
      code: units.code,
      name: units.name,
      type: units.type,
      floor: units.floor,
      floorLevel: units.floorLevel,
      occupantName: units.occupantName,
      contactPhone: units.contactPhone,
      contactEmail: units.contactEmail,
      areaSqm: units.areaSqm,
      notes: units.notes,
      categoryId: units.categoryId,
      categoryCode: categories.code,
      categoryName: categories.name,
      categoryColor: categories.color,
      assetCount: sql<number>`(select count(*) from ${assets} where ${assets.unitId} = ${units.id})`.mapWith(Number),
      openTickets: sql<number>`(select count(*) from ${tickets} where ${tickets.unitId} = ${units.id} and ${tickets.status} in ('OPEN','IN_PROGRESS','PENDING_PARTS'))`.mapWith(Number),
    })
    .from(units)
    .leftJoin(categories, eq(units.categoryId, categories.id))
    .orderBy(asc(units.floorLevel), asc(units.code));

  const categoryOptions = canManage ? await listCategories("UNIT", true) : [];

  return (
    <div>
      <PageHeader
        title="Units & zones"
        description="Apartments, retail units, common areas and plant rooms — the location backbone for every asset and ticket."
      />
      <UnitsManager rows={rows} categories={categoryOptions} canManage={canManage} />
    </div>
  );
}
