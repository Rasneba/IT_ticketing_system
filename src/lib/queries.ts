import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { assets, categories, meterReadings, ticketNotes, tickets, units, users, type CategoryType, type TicketStatus } from "@/db/schema";
import type { SessionUser } from "./auth";
import { isDomain } from "./domains";
import { isPriority } from "./sla";
import { ACTIVE_STATUSES, isStatus } from "./workflow";
import { isUuid } from "./utils";

export const assigneeUser = alias(users, "assignee");

export const responseBreachedSql = sql`((${tickets.firstResponseAt} is null and ${tickets.responseDueAt} < now()) or (${tickets.firstResponseAt} > ${tickets.responseDueAt}))`;
export const resolutionBreachedSql = sql`(${tickets.resolvedAt} is null and ((${tickets.slaPausedAt} is null and ${tickets.resolutionDueAt} < now()) or (${tickets.slaPausedAt} is not null and ${tickets.slaPausedAt} > ${tickets.resolutionDueAt})))`;
export const breachedSql = sql`(${responseBreachedSql} or ${resolutionBreachedSql})`;

export function tenantScope(user: SessionUser): SQL | undefined {
  if (user.role !== "TENANT") return undefined;
  return user.unitId
    ? or(eq(tickets.unitId, user.unitId), eq(tickets.reporterUserId, user.id))
    : eq(tickets.reporterUserId, user.id);
}

export const ticketListSelect = {
  id: tickets.id,
  seq: tickets.seq,
  title: tickets.title,
  domain: tickets.domain,
  priority: tickets.priority,
  status: tickets.status,
  channel: tickets.channel,
  issueCode: tickets.issueCode,
  createdAt: tickets.createdAt,
  responseDueAt: tickets.responseDueAt,
  resolutionDueAt: tickets.resolutionDueAt,
  firstResponseAt: tickets.firstResponseAt,
  resolvedAt: tickets.resolvedAt,
  closedAt: tickets.closedAt,
  slaPausedAt: tickets.slaPausedAt,
  assetId: tickets.assetId,
  assetName: assets.name,
  assetTag: assets.tag,
  unitName: units.name,
  unitCode: units.code,
  unitFloor: units.floor,
  assigneeId: tickets.assigneeId,
  assigneeName: assigneeUser.name,
  reporterName: tickets.reporterName,
};

export type TicketFilters = {
  q?: string;
  view?: string;
  status?: string;
  priority?: string;
  domain?: string;
  assignee?: string;
  unitId?: string;
  assetId?: string;
};

export async function listTickets(f: TicketFilters, user: SessionUser, limit = 150) {
  const conds: (SQL | undefined)[] = [tenantScope(user)];
  switch (f.view) {
    case "mine":
      conds.push(eq(tickets.assigneeId, user.id), inArray(tickets.status, ACTIVE_STATUSES));
      break;
    case "breached":
      conds.push(inArray(tickets.status, ACTIVE_STATUSES), breachedSql);
      break;
    case "unassigned":
      conds.push(isNull(tickets.assigneeId), inArray(tickets.status, ACTIVE_STATUSES));
      break;
    case "parts":
      conds.push(eq(tickets.status, "PENDING_PARTS"));
      break;
    case "done":
      conds.push(inArray(tickets.status, ["RESOLVED", "CLOSED"] as TicketStatus[]));
      break;
    case "all":
      break;
    default:
      if (!f.status) conds.push(inArray(tickets.status, ACTIVE_STATUSES));
  }
  if (isStatus(f.status)) conds.push(eq(tickets.status, f.status));
  if (isPriority(f.priority)) conds.push(eq(tickets.priority, f.priority));
  if (isDomain(f.domain)) conds.push(eq(tickets.domain, f.domain));
  if (f.assignee === "unassigned") conds.push(isNull(tickets.assigneeId));
  else if (isUuid(f.assignee)) conds.push(eq(tickets.assigneeId, f.assignee));
  if (isUuid(f.unitId)) conds.push(eq(tickets.unitId, f.unitId));
  if (isUuid(f.assetId)) conds.push(eq(tickets.assetId, f.assetId));
  if (f.q?.trim()) {
    const q = `%${f.q.trim()}%`;
    const num = f.q.match(/\d+/);
    conds.push(
      or(
        ilike(tickets.title, q),
        ilike(assets.name, q),
        ilike(assets.tag, q),
        ilike(units.name, q),
        ilike(units.code, q),
        ilike(tickets.reporterName, q),
        num ? eq(tickets.seq, Number(num[0])) : undefined,
      ),
    );
  }
  const orderBy =
    f.view === "done" || f.view === "all"
      ? [desc(tickets.createdAt)]
      : [asc(tickets.priority), asc(tickets.responseDueAt)];

  return db
    .select(ticketListSelect)
    .from(tickets)
    .leftJoin(assets, eq(tickets.assetId, assets.id))
    .leftJoin(units, eq(tickets.unitId, units.id))
    .leftJoin(assigneeUser, eq(tickets.assigneeId, assigneeUser.id))
    .where(and(...conds))
    .orderBy(...orderBy)
    .limit(limit);
}

export type TicketListRow = Awaited<ReturnType<typeof listTickets>>[number];

export async function listStaff() {
  return db
    .select({ id: users.id, name: users.name, role: users.role, skills: users.skills, title: users.title })
    .from(users)
    .where(and(eq(users.active, true), inArray(users.role, ["TECHNICIAN", "MANAGER", "ADMIN"])))
    .orderBy(asc(users.role), asc(users.name));
}

export async function listUnitsBasic() {
  return db
    .select({ id: units.id, code: units.code, name: units.name, floor: units.floor, type: units.type })
    .from(units)
    .orderBy(asc(units.floorLevel), asc(units.code));
}

export async function listCategories(type?: CategoryType, includeInactive = false) {
  const conds: SQL[] = [];
  if (type) conds.push(eq(categories.type, type));
  if (!includeInactive) conds.push(eq(categories.active, true));
  return db
    .select({
      id: categories.id,
      code: categories.code,
      name: categories.name,
      type: categories.type,
      color: categories.color,
    })
    .from(categories)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(categories.sortOrder), asc(categories.code));
}

export async function listAssetsBasic() {
  return db
    .select({
      id: assets.id,
      tag: assets.tag,
      name: assets.name,
      domain: assets.domain,
      unitId: assets.unitId,
      criticality: assets.criticality,
    })
    .from(assets)
    .where(sql`${assets.status} <> 'RETIRED'`)
    .orderBy(asc(assets.tag));
}

export async function getDashboardData(user: SessionUser) {
  const scope = tenantScope(user);
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const active = inArray(tickets.status, ACTIVE_STATUSES);
  const n = sql<number>`count(*)`.mapWith(Number);

  const [statusCounts, priorityCounts, breached, domainCounts, sla30, workload, watchlist, assetsAttention, activity] =
    await Promise.all([
      db.select({ status: tickets.status, n }).from(tickets).where(scope).groupBy(tickets.status),
      db.select({ priority: tickets.priority, n }).from(tickets).where(and(scope, active)).groupBy(tickets.priority),
      db.select({ n }).from(tickets).where(and(scope, active, breachedSql)),
      db
        .select({ domain: tickets.domain, n, active: sql<number>`count(*) filter (where ${tickets.status} in ('OPEN','IN_PROGRESS','PENDING_PARTS'))`.mapWith(Number) })
        .from(tickets)
        .where(and(scope, gte(tickets.createdAt, since30)))
        .groupBy(tickets.domain),
      db
        .select({
          resolved: sql<number>`count(*) filter (where ${tickets.resolvedAt} is not null)`.mapWith(Number),
          met: sql<number>`count(*) filter (where ${tickets.resolvedAt} is not null and ${tickets.resolvedAt} <= ${tickets.resolutionDueAt})`.mapWith(Number),
          responded: sql<number>`count(*) filter (where ${tickets.firstResponseAt} is not null)`.mapWith(Number),
          responseMet: sql<number>`count(*) filter (where ${tickets.firstResponseAt} is not null and ${tickets.firstResponseAt} <= ${tickets.responseDueAt})`.mapWith(Number),
          avgResponseMin: sql<number>`coalesce(avg(extract(epoch from (${tickets.firstResponseAt} - ${tickets.createdAt})) / 60) filter (where ${tickets.firstResponseAt} is not null), 0)`.mapWith(Number),
          avgResolutionMin: sql<number>`coalesce(avg(extract(epoch from (${tickets.resolvedAt} - ${tickets.createdAt})) / 60) filter (where ${tickets.resolvedAt} is not null), 0)`.mapWith(Number),
          total: n,
        })
        .from(tickets)
        .where(and(scope, gte(tickets.createdAt, since30))),
      user.role === "TENANT"
        ? Promise.resolve([] as { id: string; name: string; title: string | null; active: number; p1: number }[])
        : db
            .select({
              id: users.id,
              name: users.name,
              title: users.title,
              active: sql<number>`count(${tickets.id}) filter (where ${tickets.status} in ('OPEN','IN_PROGRESS','PENDING_PARTS'))`.mapWith(Number),
              p1: sql<number>`count(${tickets.id}) filter (where ${tickets.status} in ('OPEN','IN_PROGRESS','PENDING_PARTS') and ${tickets.priority} = 'P1')`.mapWith(Number),
            })
            .from(users)
            .leftJoin(tickets, eq(tickets.assigneeId, users.id))
            .where(and(eq(users.role, "TECHNICIAN"), eq(users.active, true)))
            .groupBy(users.id, users.name, users.title)
            .orderBy(asc(users.name)),
      db
        .select(ticketListSelect)
        .from(tickets)
        .leftJoin(assets, eq(tickets.assetId, assets.id))
        .leftJoin(units, eq(tickets.unitId, units.id))
        .leftJoin(assigneeUser, eq(tickets.assigneeId, assigneeUser.id))
        .where(and(scope, active))
        .orderBy(
          sql`least(case when ${tickets.firstResponseAt} is null then ${tickets.responseDueAt} end, case when ${tickets.slaPausedAt} is null then ${tickets.resolutionDueAt} end) asc nulls last`,
        )
        .limit(8),
      user.role === "TENANT"
        ? Promise.resolve([])
        : db
            .select({
              id: assets.id,
              tag: assets.tag,
              name: assets.name,
              domain: assets.domain,
              status: assets.status,
              criticality: assets.criticality,
              unitName: units.name,
              unitCode: units.code,
            })
            .from(assets)
            .leftJoin(units, eq(assets.unitId, units.id))
            .where(inArray(assets.status, ["DOWN", "DEGRADED", "MAINTENANCE"]))
            .orderBy(asc(assets.status), asc(assets.criticality))
            .limit(6),
      db
        .select({
          id: ticketNotes.id,
          type: ticketNotes.type,
          body: ticketNotes.body,
          metadata: ticketNotes.metadata,
          authorName: ticketNotes.authorName,
          createdAt: ticketNotes.createdAt,
          ticketId: tickets.id,
          seq: tickets.seq,
          title: tickets.title,
        })
        .from(ticketNotes)
        .innerJoin(tickets, eq(ticketNotes.ticketId, tickets.id))
        .where(and(scope, user.role === "TENANT" ? eq(ticketNotes.isPublic, true) : undefined))
        .orderBy(desc(ticketNotes.createdAt))
        .limit(8),
    ]);

  return {
    statusCounts,
    priorityCounts,
    breached: breached[0]?.n ?? 0,
    domainCounts,
    sla30: sla30[0],
    workload,
    watchlist,
    assetsAttention,
    activity,
  };
}

export async function getMeterOverview() {
  const meters = await db
    .select({
      id: assets.id,
      tag: assets.tag,
      name: assets.name,
      meterUnit: assets.meterUnit,
      status: assets.status,
      unitName: units.name,
      unitCode: units.code,
    })
    .from(assets)
    .leftJoin(units, eq(assets.unitId, units.id))
    .where(and(eq(assets.domain, "SUB_METER"), sql`${assets.status} <> 'RETIRED'`))
    .orderBy(asc(assets.tag));

  const since = new Date(Date.now() - 45 * 86400_000);
  const readings = meters.length
    ? await db
        .select({
          id: meterReadings.id,
          assetId: meterReadings.assetId,
          value: meterReadings.value,
          readingAt: meterReadings.readingAt,
          anomaly: meterReadings.anomaly,
        })
        .from(meterReadings)
        .where(and(inArray(meterReadings.assetId, meters.map((m) => m.id)), gte(meterReadings.readingAt, since)))
        .orderBy(asc(meterReadings.readingAt))
    : [];
  return { meters, readings };
}

export async function countOpenForAsset(assetId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(tickets)
    .where(and(eq(tickets.assetId, assetId), inArray(tickets.status, ACTIVE_STATUSES)));
  return row?.n ?? 0;
}

export { isNotNull };
