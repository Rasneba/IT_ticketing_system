import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assets,
  ticketNotes,
  tickets,
  users,
  type AssetStatus,
  type Channel,
  type ImpactScope,
  type Role,
  type SystemDomain,
  type TicketStatus,
} from "@/db/schema";
import { CHANNEL_META, DOMAIN_META } from "./domains";
import { classifyTicket, computeDueDates, SLA_POLICY } from "./sla";
import { findTransition, NOTE_PROMPTS, STATUS_META, ACTIVE_STATUSES } from "./workflow";
import { randomCode } from "./password";
import { logAudit } from "./audit-log";
import { ticketRef } from "./utils";

export class ServiceError extends Error {}

export type Actor = { id: string; name: string; role: Role };

export async function pickTechnician(domain: SystemDomain) {
  const load = sql<number>`count(${tickets.id}) filter (where ${tickets.status} in ('OPEN','IN_PROGRESS','PENDING_PARTS'))`.mapWith(
    Number,
  );
  const rows = await db
    .select({ id: users.id, name: users.name, load })
    .from(users)
    .leftJoin(tickets, eq(tickets.assigneeId, users.id))
    .where(
      and(
        eq(users.active, true),
        eq(users.role, "TECHNICIAN"),
        sql`${users.skills} @> ${JSON.stringify([domain])}::jsonb`,
      ),
    )
    .groupBy(users.id, users.name)
    .orderBy(load, asc(users.name))
    .limit(1);
  return rows[0] ?? null;
}

export interface CreateTicketInput {
  title?: string | null;
  description: string;
  domain: SystemDomain;
  issueCode: string;
  impactScope: ImpactScope;
  safetyHazard: boolean;
  channel: Channel;
  assetId?: string | null;
  unitId?: string | null;
  reporterName?: string | null;
  reporterContact?: string | null;
  reporterUserId?: string | null;
  assigneeId?: string | null;
  autoAssign?: boolean;
  externalRef?: string | null;
  actor?: Actor | null;
}

const ASSET_RANK: Partial<Record<AssetStatus, number>> = { OPERATIONAL: 0, DEGRADED: 1, DOWN: 2 };

export async function createTicketRecord(input: CreateTicketInput) {
  const asset = input.assetId
    ? (await db.select().from(assets).where(eq(assets.id, input.assetId)).limit(1))[0] ?? null
    : null;
  const domain = input.domain;
  const cls = classifyTicket({
    domain,
    issueCode: input.issueCode,
    impactScope: input.impactScope,
    safetyHazard: input.safetyHazard,
    assetCriticality: asset?.criticality ?? null,
  });
  const now = new Date();
  const due = computeDueDates(cls.priority, now);

  let assignee: { id: string; name: string } | null = null;
  let autoAssigned = false;
  if (input.assigneeId) {
    const [u] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, input.assigneeId))
      .limit(1);
    assignee = u ?? null;
  } else if (input.autoAssign !== false) {
    const tech = await pickTechnician(domain);
    if (tech) {
      assignee = { id: tech.id, name: tech.name };
      autoAssigned = true;
    }
  }

  const issueLabel = cls.issue?.label ?? input.issueCode;
  const title = input.title?.trim() || `${issueLabel}${asset ? ` — ${asset.name}` : ""}`;

  const [ticket] = await db
    .insert(tickets)
    .values({
      title: title.slice(0, 200),
      description: input.description,
      domain,
      issueCode: input.issueCode,
      priority: cls.priority,
      status: "OPEN",
      channel: input.channel,
      impactScope: input.impactScope,
      safetyHazard: input.safetyHazard,
      slaTrace: cls.trace,
      assetId: asset?.id ?? null,
      unitId: input.unitId ?? asset?.unitId ?? null,
      reporterName: input.reporterName ?? null,
      reporterContact: input.reporterContact ?? null,
      reporterUserId: input.reporterUserId ?? null,
      assigneeId: assignee?.id ?? null,
      responseDueAt: due.responseDueAt,
      resolutionDueAt: due.resolutionDueAt,
      externalRef: input.externalRef ?? null,
      publicToken: randomCode(16),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const notes: (typeof ticketNotes.$inferInsert)[] = [
    {
      ticketId: ticket.id,
      authorName: "SLA Engine",
      type: "SYSTEM",
      body: `Logged via ${CHANNEL_META[input.channel].label}. Deterministic SLA engine classified this request as ${cls.priority} (${SLA_POLICY[cls.priority].label}).`,
      metadata: { trace: cls.trace },
      isPublic: true,
      createdAt: now,
    },
  ];
  if (assignee) {
    notes.push({
      ticketId: ticket.id,
      authorName: "Dispatcher",
      type: "ASSIGNMENT",
      body: autoAssigned
        ? `Auto-dispatched to ${assignee.name} (least-loaded ${DOMAIN_META[domain].short} technician).`
        : `Assigned to ${assignee.name}.`,
      metadata: { assigneeId: assignee.id },
      isPublic: false,
      createdAt: new Date(now.getTime() + 1000),
    });
  }
  await db.insert(ticketNotes).values(notes);

  if (asset && cls.issue?.serviceAffecting && asset.status in ASSET_RANK) {
    const target: AssetStatus = cls.priority === "P1" ? "DOWN" : "DEGRADED";
    if ((ASSET_RANK[target] ?? 0) > (ASSET_RANK[asset.status] ?? 0)) {
      await db.update(assets).set({ status: target, updatedAt: now }).where(eq(assets.id, asset.id));
    }
  }

  await logAudit({
    actor: input.actor ?? null,
    actorName: input.actor ? undefined : input.reporterName ?? CHANNEL_META[input.channel].label,
    action: "ticket.create",
    entityType: "ticket",
    entityId: ticket.id,
    summary: `Created ${ticketRef(ticket.seq)} (${cls.priority}) via ${CHANNEL_META[input.channel].label}`,
    detail: { issueCode: input.issueCode, domain, priority: cls.priority, assetId: asset?.id ?? null },
  });

  return ticket;
}

export async function transitionTicketRecord(ticketId: string, to: TicketStatus, note: string | null, actor: Actor) {
  const [t] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!t) throw new ServiceError("Ticket not found");
  const transition = findTransition(t.status, to, actor.role);
  if (!transition) {
    throw new ServiceError(
      `Transition ${STATUS_META[t.status].label} → ${STATUS_META[to].label} is not permitted for your role.`,
    );
  }
  const trimmed = note?.trim() || null;
  if (transition.requiresNote && !trimmed) {
    throw new ServiceError(`${NOTE_PROMPTS[transition.requiresNote].title} is required for this transition.`);
  }

  const now = new Date();
  const patch: Partial<typeof tickets.$inferInsert> = { status: to, updatedAt: now };
  let pausedMinutesAdded = 0;

  if (t.status === "PENDING_PARTS" && t.slaPausedAt) {
    const pausedMs = now.getTime() - t.slaPausedAt.getTime();
    pausedMinutesAdded = Math.round(pausedMs / 60000);
    patch.slaPausedAt = null;
    patch.slaPausedMinutes = t.slaPausedMinutes + pausedMinutesAdded;
    patch.resolutionDueAt = new Date(t.resolutionDueAt.getTime() + pausedMs);
  }
  if ((to === "IN_PROGRESS" || to === "PENDING_PARTS" || to === "RESOLVED") && !t.firstResponseAt) {
    patch.firstResponseAt = now;
  }
  if (to === "IN_PROGRESS" && !t.assigneeId && actor.role !== "TENANT") patch.assigneeId = actor.id;
  if (to === "PENDING_PARTS") patch.slaPausedAt = now;
  if (to === "RESOLVED") {
    patch.resolvedAt = now;
    patch.resolutionSummary = trimmed;
  }
  if (to === "CLOSED") patch.closedAt = now;

  const reopening = (t.status === "RESOLVED" && to === "IN_PROGRESS") || (t.status === "CLOSED" && to === "OPEN");
  if (reopening) {
    patch.resolvedAt = null;
    patch.closedAt = null;
    patch.resolutionSummary = null;
    patch.resolutionDueAt = new Date(now.getTime() + SLA_POLICY[t.priority].resolutionMinutes * 60_000);
  }

  await db.update(tickets).set(patch).where(eq(tickets.id, ticketId));
  await db.insert(ticketNotes).values({
    ticketId,
    authorId: actor.id,
    authorName: actor.name,
    type: "STATUS_CHANGE",
    body: trimmed ?? "",
    metadata: {
      from: t.status,
      to,
      ...(pausedMinutesAdded ? { pausedMinutes: pausedMinutesAdded } : {}),
      ...(reopening ? { slaRestarted: true } : {}),
    },
    isPublic: true,
    createdAt: now,
  });

  if (t.assetId && to === "RESOLVED") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(tickets)
      .where(and(eq(tickets.assetId, t.assetId), inArray(tickets.status, ACTIVE_STATUSES), ne(tickets.id, t.id)));
    await db
      .update(assets)
      .set(n === 0 ? { status: "OPERATIONAL", lastServiceAt: now, updatedAt: now } : { lastServiceAt: now, updatedAt: now })
      .where(and(eq(assets.id, t.assetId), ne(assets.status, "RETIRED")));
  }

  await logAudit({
    actor,
    action: "ticket.transition",
    entityType: "ticket",
    entityId: t.id,
    summary: `${ticketRef(t.seq)}: ${STATUS_META[t.status].label} → ${STATUS_META[to].label}`,
    detail: { from: t.status, to, note: trimmed },
  });

  return { from: t.status, to, seq: t.seq };
}
