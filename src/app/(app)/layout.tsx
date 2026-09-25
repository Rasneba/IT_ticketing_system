import type { ReactNode } from "react";
import { and, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { breachedSql, tenantScope } from "@/lib/queries";
import { ACTIVE_STATUSES } from "@/lib/workflow";
import { Sidebar } from "@/components/sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [counts] = await db
    .select({
      active: sql<number>`count(*)`.mapWith(Number),
      breached: sql<number>`count(*) filter (where ${breachedSql})`.mapWith(Number),
    })
    .from(tickets)
    .where(and(tenantScope(user), inArray(tickets.status, ACTIVE_STATUSES)));

  return (
    <div className="min-h-screen">
      <Sidebar
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
          title: user.title,
          unitLabel: user.unitCode ? `Unit ${user.unitCode}` : null,
        }}
        activeCount={counts?.active ?? 0}
        breachedCount={counts?.breached ?? 0}
      />
      <div className="lg:pl-64 print:pl-0">
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
}
