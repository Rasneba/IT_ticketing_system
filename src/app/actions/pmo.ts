"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pmoProjects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit-log";
import { isUuid } from "@/lib/utils";
import { optStr, str, type ActionResult } from "@/lib/action-types";
import { REGISTERS, type FieldDef } from "@/lib/pmo/defs";
import { CUSTOMERS, LISTS, type ListKey } from "@/lib/pmo/lists";
import { PMO_TABLES } from "@/lib/pmo/tables";
import { riskPriorityOf, riskScoreOf, stakeholderClass, todayISO } from "@/lib/pmo/derive";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function optionalDate(value: string | null, fieldErrors: Record<string, string>, field: string): string | null {
  if (!value) return null;
  if (!DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
    fieldErrors[field] = "Use a valid date";
    return null;
  }
  return value;
}

function badgeList(list: ListKey | undefined): readonly string[] {
  if (!list) return [];
  return list === "customer" ? CUSTOMERS : LISTS[list];
}

async function resolveText(f: FieldDef, raw: string | null, fieldErrors: Record<string, string>): Promise<string | null> {
  if (f.required && !raw) {
    fieldErrors[f.name] = "Required";
    return null;
  }
  if (!raw) return null;

  const value = raw.trim();
  if (value.length > 240) {
    fieldErrors[f.name] = "Too long (240 max)";
    return null;
  }
  return value;
}

async function resolveSelect(f: FieldDef, raw: string | null, fieldErrors: Record<string, string>): Promise<string | null> {
  if (f.required && !raw) {
    fieldErrors[f.name] = "Required";
    return null;
  }
  if (!raw) return null;

  if (f.name === "projectId") {
    if (!isUuid(raw)) {
      fieldErrors[f.name] = "Select a project";
      return null;
    }
    const [exists] = await db.select({ id: pmoProjects.id }).from(pmoProjects).where(eq(pmoProjects.id, raw)).limit(1);
    if (!exists) {
      fieldErrors[f.name] = "Project not found";
      return null;
    }
    return raw;
  }

  const allowed = badgeList(f.list);
  if (allowed.length && !allowed.includes(raw)) {
    fieldErrors[f.name] = "Pick a valid option";
    return null;
  }
  return raw;
}

function resolveNumber(
  f: FieldDef,
  raw: string | null,
  fieldErrors: Record<string, string>,
  clamp: [number, number] | null,
): number {
  if (!raw || raw.trim() === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    fieldErrors[f.name] = "Invalid number";
    return 0;
  }
  if (clamp && (n < clamp[0] || n > clamp[1])) {
    fieldErrors[f.name] = `Must be between ${clamp[0]} and ${clamp[1]}`;
    return 0;
  }
  return Math.max(0, n);
}

export async function savePmoRowAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageProjects(user.role)) return { ok: false, error: "Only managers can modify the PMO system." };

  const key = str(formData, "reg");
  const def = REGISTERS.find((r) => r.key === key);
  if (!def) return { ok: false, error: "Unknown register." };

  const id = optStr(formData, "id");
  const fieldErrors: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  for (const f of def.fields) {
    const raw = optStr(formData, f.name);
    switch (f.type) {
      case "text":
      case "textarea":
        values[f.name] = await resolveText(f, raw, fieldErrors);
        break;
      case "date":
        values[f.name] = optionalDate(raw, fieldErrors, f.name);
        break;
      case "integer":
        values[f.name] = Math.round(resolveNumber(f, raw, fieldErrors, null));
        break;
      case "number":
      case "percent":
        values[f.name] = resolveNumber(f, raw, fieldErrors, f.type === "percent" ? [0, 100] : null);
        break;
      case "currency":
        values[f.name] = resolveNumber(f, raw, fieldErrors, null);
        break;
      case "select":
        values[f.name] = await resolveSelect(f, raw, fieldErrors);
        break;
    }
  }

  // Derived values captured at save time.
  if (key === "portfolio") values.lastUpdated = todayISO();
  if (key === "raid") {
    const score = riskScoreOf(values.probability, values.impact);
    values.riskScore = score ?? 0;
    values.priority = riskPriorityOf(score);
  }
  if (key === "stakeholders") values.class = stakeholderClass(values.influence, values.interest) ?? null;

  if (key === "portfolio") {
    const code = String(values.code ?? "").toUpperCase();
    values.code = code;
    if (code.length < 3 || code.length > 16) fieldErrors.code = "Project ID 3–16 chars";
    if (values.name && String(values.name).length > 200) fieldErrors.name = "200 chars max";
    if (values.percent == null) values.percent = 0;
    if ((Number(values.totalApproved ?? 0) > 0) && Number(values.forecastCost ?? 0) < 0) fieldErrors.forecastCost = "Forecast cannot be negative";
  }

  if (Object.keys(fieldErrors).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };

  const table = PMO_TABLES[key] as any;
  const entity = def.singular;
  const action = id && isUuid(id) ? "update" : "create";

  if (action === "update") {
    const [existing] = await db.update(table).set(values).where(eq(table.id, id)).returning({ id: table.id });
    if (!existing) return { ok: false, error: "Record not found." };
  } else {
    // Portfolio codes must be unique.
    if (key === "portfolio") {
      const clash = await db
        .select({ id: table.id })
        .from(table)
        .where(eq(table.code, values.code));
      if (clash.length) return { ok: false, error: "Project ID already exists.", fieldErrors: { code: "Already in use" } };
    }
    await db.insert(table).values(values);
  }

  await logAudit({ actor: user, action: `pmo.${action}.${key}`, entityType: `pmo.${key}`, summary: `${action === "create" ? "Created" : "Updated"} ${entity}` });
  revalidatePath("/pmo");
  return { ok: true, message: `${entity[0].toUpperCase()}${entity.slice(1)} ${action === "create" ? "created" : "updated"}` };
}

export async function deletePmoRowAction(id: string, key: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageProjects(user.role)) return { ok: false, error: "Only managers can modify the PMO system." };
  if (!id || !isUuid(id)) return { ok: false, error: "Invalid record." };
  const def = REGISTERS.find((r) => r.key === key);
  if (!def) return { ok: false, error: "Unknown register." };

  const table = PMO_TABLES[key] as any;
  const [row] = await db.delete(table).where(eq(table.id, id)).returning({ id: table.id });
  if (!row) return { ok: false, error: "Record not found." };
  await logAudit({ actor: user, action: `pmo.delete.${key}`, entityType: `pmo.${key}`, summary: `Deleted ${def.singular}` });
  revalidatePath("/pmo");
  return { ok: true, message: `${def.singular} deleted` };
}