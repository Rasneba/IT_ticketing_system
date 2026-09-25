import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAudit(entry: {
  actor?: { id: string; name: string } | null;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  detail?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      actorId: entry.actor?.id ?? null,
      actorName: entry.actor?.name ?? entry.actorName ?? "System",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary,
      detail: entry.detail ?? {},
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err);
  }
}
