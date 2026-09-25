import type { Metadata } from "next";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { tickets, units, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { listUnitsBasic } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { UsersManager } from "./users-client";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireRole(["ADMIN"]);
  const [rows, unitsList] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        title: users.title,
        phone: users.phone,
        unitId: users.unitId,
        unitCode: units.code,
        skills: users.skills,
        active: users.active,
        lastLoginAt: users.lastLoginAt,
        activeTickets: sql<number>`(select count(*) from ${tickets} where ${tickets.assigneeId} = ${users.id} and ${tickets.status} in ('OPEN','IN_PROGRESS','PENDING_PARTS'))`.mapWith(Number),
      })
      .from(users)
      .leftJoin(units, eq(users.unitId, units.id))
      .orderBy(asc(users.role), asc(users.name)),
    listUnitsBasic(),
  ]);
  return (
    <div>
      <PageHeader title="Users & roles" description="Role-based access: administrators, property managers, field technicians (with domain skills for auto-dispatch) and tenants." />
      <UsersManager
        rows={rows.map((r) => ({ ...r, lastLoginAt: r.lastLoginAt ? r.lastLoginAt.toISOString() : null }))}
        units={unitsList}
        meId={me.id}
      />
    </div>
  );
}
