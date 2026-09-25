"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, assets, categories, meterReadings, tickets, units, users, type CategoryType, type Role, type UnitType } from "@/db/schema";
import { actorOf, requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { DOMAINS, isCategoryColor, isCategoryType, ROLES, UNIT_TYPES } from "@/lib/domains";
import { hashPassword, randomSecret, sha256 } from "@/lib/password";
import { logAudit } from "@/lib/audit-log";
import { createTicketRecord } from "@/lib/ticket-service";
import { ACTIVE_STATUSES } from "@/lib/workflow";
import { formatNumber, isUuid, ticketRef } from "@/lib/utils";
import { optStr, str, type ActionResult } from "@/lib/action-types";

/* ---------------------------------- Units --------------------------------- */

export async function saveUnitAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageUnits(user.role)) return { ok: false, error: "Only managers can modify units." };
  const id = optStr(formData, "id");
  const code = str(formData, "code").toUpperCase();
  const name = str(formData, "name");
  const type = str(formData, "type") as UnitType;
  const categoryId = optStr(formData, "categoryId");
  const floor = str(formData, "floor");
  const floorLevel = Number(str(formData, "floorLevel") || "0");
  const areaRaw = str(formData, "areaSqm");
  const contactEmail = optStr(formData, "contactEmail");

  const fieldErrors: Record<string, string> = {};
  if (!/^[A-Z0-9][A-Z0-9-]{0,31}$/.test(code)) fieldErrors.code = "1–32 chars: letters, numbers, dashes";
  if (name.length < 2) fieldErrors.name = "Name is required";
  if (!UNIT_TYPES.includes(type)) fieldErrors.type = "Select a type";
  if (!floor) fieldErrors.floor = "Floor is required";
  if (!Number.isInteger(floorLevel) || floorLevel < -5 || floorLevel > 200) fieldErrors.floorLevel = "Integer between -5 and 200";
  if (areaRaw && (!Number.isFinite(Number(areaRaw)) || Number(areaRaw) < 0)) fieldErrors.areaSqm = "Invalid area";
  if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) fieldErrors.contactEmail = "Invalid email";
  if (categoryId && !isUuid(categoryId)) fieldErrors.categoryId = "Invalid category";
  if (!fieldErrors.code) {
    const clash = await db
      .select({ id: units.id })
      .from(units)
      .where(id && isUuid(id) ? and(eq(units.code, code), ne(units.id, id)) : eq(units.code, code))
      .limit(1);
    if (clash.length) fieldErrors.code = "Unit code already exists";
  }
  if (Object.keys(fieldErrors).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };

  const values = {
    code,
    name,
    type,
    floor,
    floorLevel,
    categoryId: categoryId && isUuid(categoryId) ? categoryId : null,
    areaSqm: areaRaw ? Math.round(Number(areaRaw)) : null,
    occupantName: optStr(formData, "occupantName"),
    contactPhone: optStr(formData, "contactPhone"),
    contactEmail,
    notes: optStr(formData, "notes"),
    updatedAt: new Date(),
  };
  if (id && isUuid(id)) {
    await db.update(units).set(values).where(eq(units.id, id));
    await logAudit({ actor: user, action: "unit.update", entityType: "unit", entityId: id, summary: `Updated unit ${code}` });
  } else {
    const [row] = await db.insert(units).values(values).returning({ id: units.id });
    await logAudit({ actor: user, action: "unit.create", entityType: "unit", entityId: row.id, summary: `Created unit ${code}` });
  }
  revalidatePath("/units");
  return { ok: true, message: id ? `Unit ${code} updated` : `Unit ${code} created` };
}

export async function deleteUnitAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageUnits(user.role)) return { ok: false, error: "Only managers can delete units." };
  if (!isUuid(id)) return { ok: false, error: "Invalid unit." };
  const [row] = await db.delete(units).where(eq(units.id, id)).returning({ code: units.code });
  if (!row) return { ok: false, error: "Unit not found." };
  await logAudit({ actor: user, action: "unit.delete", entityType: "unit", entityId: id, summary: `Deleted unit ${row.code}` });
  revalidatePath("/units");
  return { ok: true, message: `Unit ${row.code} deleted` };
}

/* -------------------------------- Categories ------------------------------- */

const CATEGORY_CODE_RE = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;

export async function saveCategoryAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageCategories(user.role)) return { ok: false, error: "Only managers can modify categories." };
  const id = optStr(formData, "id");
  const code = str(formData, "code").toUpperCase();
  const name = str(formData, "name");
  const typeRaw = str(formData, "type");
  const color = str(formData, "color") || "indigo";
  const sortOrderRaw = str(formData, "sortOrder");

  const fieldErrors: Record<string, string> = {};
  if (!CATEGORY_CODE_RE.test(code)) fieldErrors.code = "2–32 chars: letters, numbers, dashes or underscores";
  if (name.length < 2) fieldErrors.name = "Name is required";
  if (!isCategoryType(typeRaw)) fieldErrors.type = "Select what this category applies to";
  if (!isCategoryColor(color)) fieldErrors.color = "Select a colour";
  const sortOrder = sortOrderRaw === "" ? 0 : Number(sortOrderRaw);
  if (!Number.isInteger(sortOrder)) fieldErrors.sortOrder = "Must be a whole number";

  if (!fieldErrors.code) {
    const clash = await db
      .select({ id: categories.id })
      .from(categories)
      .where(id && isUuid(id) ? and(eq(categories.code, code), ne(categories.id, id)) : eq(categories.code, code))
      .limit(1);
    if (clash.length) fieldErrors.code = "Category code already exists";
  }
  if (Object.keys(fieldErrors).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };

  const values = {
    code,
    name,
    type: typeRaw as CategoryType,
    color,
    sortOrder,
    description: optStr(formData, "description"),
    active: formData.get("active") !== null,
    updatedAt: new Date(),
  };
  if (id && isUuid(id)) {
    await db.update(categories).set(values).where(eq(categories.id, id));
    await logAudit({ actor: user, action: "category.update", entityType: "category", entityId: id, summary: `Updated category ${code}` });
  } else {
    const [row] = await db.insert(categories).values(values).returning({ id: categories.id });
    await logAudit({ actor: user, action: "category.create", entityType: "category", entityId: row.id, summary: `Created category ${code}` });
  }
  revalidatePath("/categories");
  revalidatePath("/units");
  revalidatePath("/assets");
  return { ok: true, message: id ? `Category ${code} updated` : `Category ${code} created` };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageCategories(user.role)) return { ok: false, error: "Only managers can delete categories." };
  if (!isUuid(id)) return { ok: false, error: "Invalid category." };
  const [row] = await db.delete(categories).where(eq(categories.id, id)).returning({ code: categories.code });
  if (!row) return { ok: false, error: "Category not found." };
  await logAudit({ actor: user, action: "category.delete", entityType: "category", entityId: id, summary: `Deleted category ${row.code}` });
  revalidatePath("/categories");
  revalidatePath("/units");
  revalidatePath("/assets");
  return { ok: true, message: `Category ${row.code} deleted` };
}

/* ---------------------------------- Users --------------------------------- */

export async function saveUserAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageUsers(user.role)) return { ok: false, error: "Only administrators can manage users." };
  const id = optStr(formData, "id");
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const role = str(formData, "role") as Role;
  const password = str(formData, "password");
  const unitId = optStr(formData, "unitId");
  const skills = formData.getAll("skills").map(String).filter((s) => (DOMAINS as string[]).includes(s));

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Name is required";
  if (!/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = "Valid email required";
  if (!ROLES.includes(role)) fieldErrors.role = "Select a role";
  if (!id && password.length < 8) fieldErrors.password = "Minimum 8 characters";
  if (id && password && password.length < 8) fieldErrors.password = "Minimum 8 characters";
  if (role === "TENANT" && !isUuid(unitId)) fieldErrors.unitId = "Tenants must be linked to a unit";
  if (id === user.id && role !== "ADMIN") fieldErrors.role = "You cannot remove your own admin role";
  if (!fieldErrors.email) {
    const clash = await db
      .select({ id: users.id })
      .from(users)
      .where(id && isUuid(id) ? and(eq(users.email, email), ne(users.id, id)) : eq(users.email, email))
      .limit(1);
    if (clash.length) fieldErrors.email = "Email already registered";
  }
  if (Object.keys(fieldErrors).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };

  const values = {
    name,
    email,
    role,
    title: optStr(formData, "title"),
    phone: optStr(formData, "phone"),
    unitId: isUuid(unitId) ? unitId : null,
    skills: role === "TECHNICIAN" ? skills : [],
    updatedAt: new Date(),
  };
  if (id && isUuid(id)) {
    await db
      .update(users)
      .set(password ? { ...values, passwordHash: await hashPassword(password) } : values)
      .where(eq(users.id, id));
    await logAudit({ actor: user, action: "user.update", entityType: "user", entityId: id, summary: `Updated user ${email}${password ? " (password reset)" : ""}` });
  } else {
    const [row] = await db
      .insert(users)
      .values({ ...values, passwordHash: await hashPassword(password) })
      .returning({ id: users.id });
    await logAudit({ actor: user, action: "user.create", entityType: "user", entityId: row.id, summary: `Created user ${email} (${role})` });
  }
  revalidatePath("/users");
  return { ok: true, message: id ? `${name} updated` : `${name} invited` };
}

export async function toggleUserActiveAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageUsers(user.role)) return { ok: false, error: "Not permitted." };
  if (!isUuid(id) || id === user.id) return { ok: false, error: "You cannot deactivate yourself." };
  const [row] = await db
    .update(users)
    .set({ active: sql`not ${users.active}`, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({ active: users.active, email: users.email });
  if (!row) return { ok: false, error: "User not found." };
  await logAudit({ actor: user, action: row.active ? "user.activate" : "user.deactivate", entityType: "user", entityId: id, summary: `${row.active ? "Activated" : "Deactivated"} ${row.email}` });
  revalidatePath("/users");
  return { ok: true, message: `${row.email} ${row.active ? "activated" : "deactivated"}` };
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageUsers(user.role)) return { ok: false, error: "Not permitted." };
  if (!isUuid(id) || id === user.id) return { ok: false, error: "You cannot delete yourself." };
  const [row] = await db.delete(users).where(eq(users.id, id)).returning({ email: users.email });
  if (!row) return { ok: false, error: "User not found." };
  await logAudit({ actor: user, action: "user.delete", entityType: "user", entityId: id, summary: `Deleted user ${row.email}` });
  revalidatePath("/users");
  return { ok: true, message: `${row.email} deleted` };
}

/* ------------------------------ Meter readings ---------------------------- */

export async function addReadingAction(input: {
  assetId: string;
  value: number;
  readingAt?: string;
  note?: string;
  replaced?: boolean;
}): Promise<ActionResult<{ anomaly: boolean; ticketId?: string }>> {
  const user = await requireUser();
  if (!can.recordReadings(user.role)) return { ok: false, error: "Not permitted." };
  if (!isUuid(input.assetId)) return { ok: false, error: "Select a meter." };
  if (!Number.isFinite(input.value) || input.value < 0) return { ok: false, error: "Enter a valid cumulative reading." };
  const [meter] = await db.select().from(assets).where(eq(assets.id, input.assetId)).limit(1);
  if (!meter || meter.domain !== "SUB_METER") return { ok: false, error: "Asset is not a sub-meter." };
  const readingAt = input.readingAt ? new Date(input.readingAt) : new Date();
  if (Number.isNaN(readingAt.getTime()) || readingAt.getTime() > Date.now() + 5 * 60_000) {
    return { ok: false, error: "Reading time cannot be in the future." };
  }

  const history = await db
    .select({ value: meterReadings.value, readingAt: meterReadings.readingAt })
    .from(meterReadings)
    .where(and(eq(meterReadings.assetId, meter.id), lt(meterReadings.readingAt, readingAt)))
    .orderBy(desc(meterReadings.readingAt))
    .limit(8);
  const last = history[0];
  if (last && input.value < last.value && !input.replaced) {
    return {
      ok: false,
      error: `Reading is lower than the previous value (${formatNumber(last.value, 2)} ${meter.meterUnit ?? ""}). Tick "meter replaced" if the meter was swapped.`,
    };
  }

  let anomaly = false;
  let rate = 0;
  let avg = 0;
  if (last && !input.replaced && history.length >= 3) {
    const days = Math.max((readingAt.getTime() - last.readingAt.getTime()) / 86_400_000, 1 / 24);
    rate = (input.value - last.value) / days;
    const rates: number[] = [];
    for (let i = 0; i < history.length - 1; i++) {
      const d = (history[i].readingAt.getTime() - history[i + 1].readingAt.getTime()) / 86_400_000;
      if (d > 0) rates.push((history[i].value - history[i + 1].value) / d);
    }
    avg = rates.reduce((a, b) => a + b, 0) / Math.max(rates.length, 1);
    anomaly = avg > 0 && rate > avg * 2;
  }

  await db.insert(meterReadings).values({
    assetId: meter.id,
    value: input.value,
    readingAt,
    recordedById: user.id,
    anomaly,
    note: input.note?.trim() || (input.replaced ? "Meter replaced — new baseline" : anomaly ? "Auto-flagged: consumption > 2× trailing average" : null),
  });

  let ticketId: string | undefined;
  if (anomaly) {
    const existing = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(and(eq(tickets.assetId, meter.id), eq(tickets.issueCode, "CONSUMPTION_ANOMALY"), inArray(tickets.status, ACTIVE_STATUSES)))
      .limit(1);
    if (!existing.length) {
      const t = await createTicketRecord({
        description: `Daily consumption ${formatNumber(rate, 1)} ${meter.meterUnit ?? ""} vs trailing average ${formatNumber(avg, 1)} ${meter.meterUnit ?? ""} (${formatNumber(rate / avg, 1)}×). Flagged automatically on reading entry by ${user.name}.`,
        domain: "SUB_METER",
        issueCode: "CONSUMPTION_ANOMALY",
        impactScope: "UNIT",
        safetyHazard: false,
        channel: "PORTAL",
        assetId: meter.id,
        reporterName: "Meter anomaly engine",
        actor: actorOf(user),
      });
      ticketId = t.id;
      revalidatePath("/tickets");
      revalidatePath("/dashboard");
    }
  }

  await logAudit({
    actor: user,
    action: "meter.reading",
    entityType: "asset",
    entityId: meter.id,
    summary: `Reading ${formatNumber(input.value, 2)} ${meter.meterUnit ?? ""} on ${meter.tag}${anomaly ? " (anomaly)" : ""}${ticketId ? " — ticket raised" : ""}`,
  });
  revalidatePath("/meters");
  revalidatePath(`/assets/${meter.id}`);
  return {
    ok: true,
    message: anomaly
      ? ticketId
        ? "Anomaly detected — P3 ticket raised automatically"
        : "Anomaly detected — existing ticket already open"
      : "Reading recorded",
    data: { anomaly, ticketId },
  };
}

export async function deleteReadingAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.deleteReadings(user.role)) return { ok: false, error: "Only managers can delete readings." };
  if (!isUuid(id)) return { ok: false, error: "Invalid reading." };
  const [row] = await db.delete(meterReadings).where(eq(meterReadings.id, id)).returning({ assetId: meterReadings.assetId });
  if (!row) return { ok: false, error: "Reading not found." };
  await logAudit({ actor: user, action: "meter.reading_delete", entityType: "asset", entityId: row.assetId, summary: "Deleted a meter reading" });
  revalidatePath("/meters");
  return { ok: true, message: "Reading deleted" };
}

/* --------------------------------- API keys ------------------------------- */

export async function createApiKeyAction(name: string): Promise<ActionResult<{ key: string }>> {
  const user = await requireUser();
  if (!can.manageSettings(user.role)) return { ok: false, error: "Only administrators can create API keys." };
  const label = name.trim();
  if (label.length < 3 || label.length > 120) return { ok: false, error: "Name must be 3–120 characters." };
  const key = `bsd_live_${randomSecret(24)}`;
  const [row] = await db
    .insert(apiKeys)
    .values({ name: label, prefix: key.slice(0, 13), keyHash: sha256(key), createdById: user.id })
    .returning({ id: apiKeys.id });
  await logAudit({ actor: user, action: "apikey.create", entityType: "api_key", entityId: row.id, summary: `Created API key '${label}'` });
  revalidatePath("/settings");
  return { ok: true, message: "API key created", data: { key } };
}

export async function revokeApiKeyAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageSettings(user.role)) return { ok: false, error: "Not permitted." };
  if (!isUuid(id)) return { ok: false, error: "Invalid key." };
  const [row] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, id))
    .returning({ name: apiKeys.name });
  if (!row) return { ok: false, error: "Key not found." };
  await logAudit({ actor: user, action: "apikey.revoke", entityType: "api_key", entityId: id, summary: `Revoked API key '${row.name}'` });
  revalidatePath("/settings");
  return { ok: true, message: `Key '${row.name}' revoked` };
}

export async function ticketRefLabel(seq: number) {
  return ticketRef(seq);
}
