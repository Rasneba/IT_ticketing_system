import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ScrollText } from "lucide-react";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { Avatar, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Audit log" };

const ENTITY_TYPES = ["ticket", "asset", "unit", "user", "session", "api_key"];

function entityHref(type: string, id: string | null) {
  if (!id) return null;
  if (type === "ticket") return `/tickets/${id}`;
  if (type === "asset") return `/assets/${id}`;
  if (type === "unit") return `/units/${id}`;
  return null;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireRole(["ADMIN", "MANAGER"]);
  const { type } = await searchParams;
  const filter = type && ENTITY_TYPES.includes(type) ? type : "";
  const rows = await db
    .select()
    .from(auditLogs)
    .where(filter ? eq(auditLogs.entityType, filter) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  return (
    <div>
      <PageHeader title="Audit log" description="Append-only record of sign-ins, ticket transitions, captures, registry and permission changes (latest 200)." />
      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-xl bg-slate-200/60 p-1">
          {["", ...ENTITY_TYPES].map((t) => (
            <Link
              key={t || "all"}
              href={t ? `/audit?type=${t}` : "/audit"}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold capitalize",
                filter === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
              )}
            >
              {t ? t.replace("_", " ") : "All events"}
            </Link>
          ))}
        </div>
      </div>
      <Card className="overflow-hidden">
        {rows.length ? (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => {
              const href = entityHref(r.entityType, r.entityId);
              return (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                  <Avatar name={r.actorName ?? "System"} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{r.actorName ?? "System"}</span> · {href ? <Link href={href} className="hover:text-accent-600">{r.summary}</Link> : r.summary}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-slate-400">
                      <span className="font-mono">{r.action}</span>
                      <span>·</span>
                      <span>{formatDateTime(r.createdAt)}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(r.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={<ScrollText className="size-5" />} title="No audit events" description="Events appear as users work in the system." />
        )}
      </Card>
    </div>
  );
}
