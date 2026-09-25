"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { assets, ticketNotes, tickets, users, type Channel, type ImpactScope, type Priority, type TicketStatus } from "@/db/schema";
import { actorOf, requireUser, type SessionUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { findIssue, IMPACT_SCOPES, isDomain } from "@/lib/domains";
import { computeDueDates, isPriority, SLA_POLICY } from "@/lib/sla";
import { isStatus, STATUS_META } from "@/lib/workflow";
import { CAPTURE_TYPES } from "@/lib/audit-captures";
import { createTicketRecord, ServiceError, transitionTicketRecord } from "@/lib/ticket-service";
import { logAudit } from "@/lib/audit-log";
import { isUuid, ticketRef } from "@/lib/utils";
import { optStr, str, type ActionResult } from "@/lib/action-types";

const STAFF_CHANNELS: Channel[] = ["PORTAL", "PHONE", "EMAIL"];

function revalidateTicket(id?: string) {
  if (id) revalidatePath(`/tickets/${id}`);
  revalidatePath("/tickets");
  revalidatePath("/dashboard");
}

async function loadTicketForUser(ticketId: string, user: SessionUser) {
  if (!isUuid(ticketId)) return null;
  const [t] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!t) return null;
  if (user.role === "TENANT" && t.reporterUserId !== user.id && (!user.unitId || t.unitId !== user.unitId)) return null;
  return t;
}

export async function createTicketAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const domain = str(formData, "domain");
  const issueCode = str(formData, "issueCode");
  const impactScope = (str(formData, "impactScope") || "UNIT") as ImpactScope;
  const description = str(formData, "description");
  const title = optStr(formData, "title");
  let assetId = optStr(formData, "assetId");
  let unitId = optStr(formData, "unitId");
  const assigneeId = optStr(formData, "assigneeId");
  const channelRaw = (str(formData, "channel") || "PORTAL") as Channel;
  const safetyHazard = formData.get("safetyHazard") === "on";

  const fieldErrors: Record<string, string> = {};
  if (!isDomain(domain)) fieldErrors.domain = "Select a system domain";
  else if (!findIssue(domain, issueCode)) fieldErrors.issueCode = "Select the issue type";
  if (!IMPACT_SCOPES.includes(impactScope)) fieldErrors.impactScope = "Invalid impact scope";
  if (description.length < 5) fieldErrors.description = "Describe the problem (at least 5 characters)";
  if (title && title.length > 200) fieldErrors.title = "Title is too long";
  if (assetId && !isUuid(assetId)) assetId = null;
  if (unitId && !isUuid(unitId)) unitId = null;
  if (Object.keys(fieldErrors).length || !isDomain(domain)) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const isTenant = user.role === "TENANT";
  if (isTenant) {
    unitId = user.unitId;
    if (assetId) {
      const [a] = await db.select({ unitId: assets.unitId }).from(assets).where(eq(assets.id, assetId)).limit(1);
      if (!a || a.unitId !== user.unitId) assetId = null;
    }
  }

  let ticketId: string;
  try {
    const ticket = await createTicketRecord({
      title,
      description,
      domain,
      issueCode,
      impactScope,
      safetyHazard,
      channel: isTenant ? "PORTAL" : STAFF_CHANNELS.includes(channelRaw) ? channelRaw : "PORTAL",
      assetId,
      unitId,
      reporterName: isTenant ? user.name : optStr(formData, "reporterName") ?? user.name,
      reporterContact: optStr(formData, "reporterContact"),
      reporterUserId: isTenant || !optStr(formData, "reporterName") ? user.id : null,
      assigneeId: !isTenant && isUuid(assigneeId) ? assigneeId : null,
      autoAssign: true,
      actor: actorOf(user),
    });
    ticketId = ticket.id;
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Could not create the ticket. Please try again." };
  }
  revalidateTicket();
  redirect(`/tickets/${ticketId}`);
}

export async function updateTicketAction(input: { ticketId: string; title: string; description: string }): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.workTickets(user.role)) return { ok: false, error: "You are not permitted to edit tickets." };
  const title = input.title.trim();
  if (title.length < 3 || title.length > 200) return { ok: false, error: "Title must be 3–200 characters." };
  const t = await loadTicketForUser(input.ticketId, user);
  if (!t) return { ok: false, error: "Ticket not found." };
  await db
    .update(tickets)
    .set({ title, description: input.description.trim(), updatedAt: new Date() })
    .where(eq(tickets.id, t.id));
  await logAudit({ actor: user, action: "ticket.update", entityType: "ticket", entityId: t.id, summary: `Edited ${ticketRef(t.seq)} details` });
  revalidateTicket(t.id);
  return { ok: true, message: "Ticket updated" };
}

export async function transitionTicketAction(input: { ticketId: string; to: TicketStatus; note?: string }): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.workTickets(user.role)) return { ok: false, error: "You are not permitted to change ticket status." };
  if (!isUuid(input.ticketId) || !isStatus(input.to)) return { ok: false, error: "Invalid request." };
  try {
    await transitionTicketRecord(input.ticketId, input.to, input.note ?? null, actorOf(user));
  } catch (err) {
    if (err instanceof ServiceError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "Could not update the ticket status." };
  }
  revalidateTicket(input.ticketId);
  revalidatePath("/assets");
  return { ok: true, message: `Moved to ${STATUS_META[input.to].label}` };
}

export async function addNoteAction(input: { ticketId: string; body: string; isPublic: boolean }): Promise<ActionResult> {
  const user = await requireUser();
  const body = input.body.trim();
  if (body.length < 1) return { ok: false, error: "Write a note first." };
  if (body.length > 5000) return { ok: false, error: "Note is too long (5,000 characters max)." };
  const t = await loadTicketForUser(input.ticketId, user);
  if (!t) return { ok: false, error: "Ticket not found." };
  await db.insert(ticketNotes).values({
    ticketId: t.id,
    authorId: user.id,
    authorName: user.name,
    type: "COMMENT",
    body,
    isPublic: user.role === "TENANT" ? true : input.isPublic,
  });
  await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, t.id));
  revalidateTicket(t.id);
  return { ok: true, message: "Note added" };
}

export async function addAuditCaptureAction(input: {
  ticketId: string;
  captureType: string;
  fields: Record<string, string>;
  body?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.workTickets(user.role)) return { ok: false, error: "Only staff can record technical captures." };
  const type = CAPTURE_TYPES[input.captureType];
  if (!type) return { ok: false, error: "Unknown capture type." };
  const t = await loadTicketForUser(input.ticketId, user);
  if (!t) return { ok: false, error: "Ticket not found." };

  const fields: Record<string, string> = {};
  for (const f of type.fields) {
    const v = (input.fields[f.key] ?? "").trim().slice(0, 300);
    if (f.required && !v) return { ok: false, error: `${f.label} is required.` };
    if (v) fields[f.key] = v;
  }
  const sensitiveKeys = type.fields.filter((f) => f.sensitive).map((f) => f.key);
  await db.insert(ticketNotes).values({
    ticketId: t.id,
    authorId: user.id,
    authorName: user.name,
    type: "AUDIT_CAPTURE",
    body: (input.body ?? "").trim().slice(0, 2000) || `${type.label} recorded.`,
    metadata: { captureType: input.captureType, fields, sensitiveKeys },
    isPublic: false,
  });

  // Keep the asset registry in sync with field captures.
  if (t.assetId) {
    if (input.captureType === "IP_CONFIGURATION" && fields.newIp) {
      await db.update(assets).set({ ipAddress: fields.newIp, updatedAt: new Date() }).where(eq(assets.id, t.assetId));
    }
    if (input.captureType === "FIRMWARE_UPDATE" && fields.toVersion) {
      await db.update(assets).set({ firmware: fields.toVersion, updatedAt: new Date() }).where(eq(assets.id, t.assetId));
    }
    revalidatePath(`/assets/${t.assetId}`);
  }

  await logAudit({
    actor: user,
    action: "ticket.capture",
    entityType: "ticket",
    entityId: t.id,
    summary: `${type.label} captured on ${ticketRef(t.seq)}`,
    detail: { captureType: input.captureType, keys: Object.keys(fields) },
  });
  revalidateTicket(t.id);
  return { ok: true, message: `${type.label} captured` };
}

export async function assignTicketAction(input: { ticketId: string; assigneeId: string | null }): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.assignTickets(user.role)) return { ok: false, error: "Not permitted." };
  const t = await loadTicketForUser(input.ticketId, user);
  if (!t) return { ok: false, error: "Ticket not found." };
  let assignee: { id: string; name: string } | null = null;
  if (input.assigneeId) {
    if (!isUuid(input.assigneeId)) return { ok: false, error: "Invalid assignee." };
    const [u] = await db
      .select({ id: users.id, name: users.name, role: users.role, active: users.active })
      .from(users)
      .where(eq(users.id, input.assigneeId))
      .limit(1);
    if (!u || !u.active || u.role === "TENANT") return { ok: false, error: "Assignee must be an active staff member." };
    assignee = u;
  }
  if ((assignee?.id ?? null) === t.assigneeId) return { ok: true };
  await db.update(tickets).set({ assigneeId: assignee?.id ?? null, updatedAt: new Date() }).where(eq(tickets.id, t.id));
  await db.insert(ticketNotes).values({
    ticketId: t.id,
    authorId: user.id,
    authorName: user.name,
    type: "ASSIGNMENT",
    body: assignee ? `Assigned to ${assignee.name}.` : "Unassigned — returned to the queue.",
    metadata: { assigneeId: assignee?.id ?? null },
  });
  await logAudit({
    actor: user,
    action: "ticket.assign",
    entityType: "ticket",
    entityId: t.id,
    summary: `${ticketRef(t.seq)} assigned to ${assignee?.name ?? "nobody"}`,
  });
  revalidateTicket(t.id);
  return { ok: true, message: assignee ? `Assigned to ${assignee.name}` : "Unassigned" };
}

export async function overridePriorityAction(input: { ticketId: string; priority: Priority; reason: string }): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.overridePriority(user.role)) return { ok: false, error: "Only managers can override the SLA engine." };
  if (!isPriority(input.priority)) return { ok: false, error: "Invalid priority." };
  const reason = input.reason.trim();
  if (reason.length < 5) return { ok: false, error: "Give a reason for the override (min 5 characters)." };
  const t = await loadTicketForUser(input.ticketId, user);
  if (!t) return { ok: false, error: "Ticket not found." };
  if (t.priority === input.priority) return { ok: false, error: `Ticket is already ${input.priority}.` };

  const due = computeDueDates(input.priority, t.createdAt);
  const resolutionDueAt = new Date(due.resolutionDueAt.getTime() + t.slaPausedMinutes * 60_000);
  const traceLine = `Manual override by ${user.name}: ${t.priority} to ${input.priority} (${reason})`;
  await db
    .update(tickets)
    .set({
      priority: input.priority,
      priorityOverridden: true,
      responseDueAt: due.responseDueAt,
      resolutionDueAt,
      slaTrace: [...t.slaTrace, traceLine],
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, t.id));
  await db.insert(ticketNotes).values({
    ticketId: t.id,
    authorId: user.id,
    authorName: user.name,
    type: "SYSTEM",
    body: `Priority overridden ${t.priority} → ${input.priority} (${SLA_POLICY[input.priority].label}). Reason: ${reason}`,
    metadata: { from: t.priority, to: input.priority },
    isPublic: false,
  });
  await logAudit({
    actor: user,
    action: "ticket.priority_override",
    entityType: "ticket",
    entityId: t.id,
    summary: `${ticketRef(t.seq)} priority ${t.priority} → ${input.priority}`,
    detail: { reason },
  });
  revalidateTicket(t.id);
  return { ok: true, message: `Priority set to ${input.priority}` };
}

export async function deleteTicketAction(ticketId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.deleteTickets(user.role)) return { ok: false, error: "Only administrators can delete tickets." };
  if (!isUuid(ticketId)) return { ok: false, error: "Invalid ticket." };
  const [t] = await db.delete(tickets).where(eq(tickets.id, ticketId)).returning({ seq: tickets.seq });
  if (!t) return { ok: false, error: "Ticket not found." };
  await logAudit({ actor: user, action: "ticket.delete", entityType: "ticket", entityId: ticketId, summary: `Deleted ${ticketRef(t.seq)}` });
  revalidateTicket();
  return { ok: true, message: `${ticketRef(t.seq)} deleted` };
}

export async function quickAssignToMeAction(ticketId: string): Promise<ActionResult> {
  const user = await requireUser();
  return assignTicketAction({ ticketId, assigneeId: user.id });
}

// Guard used by tenants to confirm they can see a ticket (exported for tracking links).
export async function canViewTicket(ticketId: string) {
  const user = await requireUser();
  const [t] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(
      and(
        eq(tickets.id, ticketId),
        user.role === "TENANT"
          ? or(eq(tickets.reporterUserId, user.id), user.unitId ? eq(tickets.unitId, user.unitId) : undefined)
          : undefined,
      ),
    )
    .limit(1);
  return !!t;
}
