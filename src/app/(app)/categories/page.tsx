import type { Metadata } from "next";
import { asc, eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/db";
import { assets, categories, tickets, units, type CategoryType } from "@/db/schema";
import { CATEGORY_TYPES, CATEGORY_TYPE_META } from "@/lib/domains";
import { PageHeader } from "@/components/ui";
import { CategoriesManager, type CategoryRow } from "./categories-client";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const user = await requireRole(["ADMIN", "MANAGER"]);
  const canManage = can.manageCategories(user.role);

  const rows = await db
    .select({
      id: categories.id,
      code: categories.code,
      name: categories.name,
      type: categories.type,
      description: categories.description,
      color: categories.color,
      sortOrder: categories.sortOrder,
      active: categories.active,
      unitCount: sql<number>`(select count(*) from ${units} where ${units.categoryId} = ${categories.id})`.mapWith(Number),
      assetCount: sql<number>`(select count(*) from ${assets} where ${assets.categoryId} = ${categories.id})`.mapWith(Number),
      ticketCount: sql<number>`(select count(*) from ${tickets} where ${tickets.categoryId} = ${categories.id})`.mapWith(Number),
    })
    .from(categories)
    .orderBy(asc(categories.type), asc(categories.sortOrder), asc(categories.code));

  const typed = rows as CategoryRow[];
  const summary = CATEGORY_TYPES.map((t: CategoryType) => ({
    type: t,
    count: typed.filter((r) => r.type === t).length,
  }));

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Reusable groupings with their own id and code, applied across locations, assets and tickets."
      />
      <CategoriesManager rows={typed} canManage={canManage} summary={summary} />
    </div>
  );
}
