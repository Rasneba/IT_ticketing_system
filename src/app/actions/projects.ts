"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { projects, type ProjectStatus, type Rag } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { isProjectStatus, isRag } from "@/lib/domains";
import { logAudit } from "@/lib/audit-log";
import { isUuid } from "@/lib/utils";
import { optStr, str, type ActionResult } from "@/lib/action-types";

const CODE_RE = /^[A-Z0-9][A-Z0-9-]{0,31}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function optionalDate(value: string | null, field: string, fieldErrors: Record<string, string>) {
  if (!value) return null;
  if (!DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
    fieldErrors[field] = "Use a valid date";
    return null;
  }
  return value;
}

function optionalAmount(value: string, field: string, fieldErrors: Record<string, string>) {
  if (!value) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    fieldErrors[field] = "Must be zero or more";
    return 0;
  }
  return n;
}

export async function saveProjectAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageProjects(user.role)) return { ok: false, error: "Only managers can modify projects." };

  const id = optStr(formData, "id");
  const code = str(formData, "code").toUpperCase();
  const name = str(formData, "name");
  const status = str(formData, "status");
  const rag = str(formData, "rag");
  const percentRaw = str(formData, "percentComplete");
  const fieldErrors: Record<string, string> = {};

  if (!CODE_RE.test(code)) fieldErrors.code = "1–32 chars: letters, numbers, dashes";
  if (name.length < 2) fieldErrors.name = "Name is required";
  if (!isProjectStatus(status)) fieldErrors.status = "Select a status";
  if (!isRag(rag)) fieldErrors.rag = "Select a RAG status";

  const percent = percentRaw === "" ? 0 : Number(percentRaw);
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) fieldErrors.percentComplete = "Whole number between 0 and 100";

  const start = optionalDate(optStr(formData, "startDate"), "startDate", fieldErrors);
  const end = optionalDate(optStr(formData, "targetEndDate"), "targetEndDate", fieldErrors);
  if (start && end && start > end) fieldErrors.targetEndDate = "End date is before the start date";

  const budget = optionalAmount(str(formData, "budget"), "budget", fieldErrors);
  const actualCost = optionalAmount(str(formData, "actualCost"), "actualCost", fieldErrors);

  if (!fieldErrors.code) {
    const clash = await db
      .select({ id: projects.id })
      .from(projects)
      .where(id && isUuid(id) ? and(eq(projects.code, code), ne(projects.id, id)) : eq(projects.code, code))
      .limit(1);
    if (clash.length) fieldErrors.code = "Project ID already exists";
  }
  if (Object.keys(fieldErrors).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };

  const values = {
    code,
    name,
    sponsor: optStr(formData, "sponsor"),
    projectManager: optStr(formData, "projectManager"),
    department: optStr(formData, "department"),
    startDate: start,
    targetEndDate: end,
    status: status as ProjectStatus,
    rag: rag as Rag,
    percentComplete: percent,
    budget,
    actualCost,
    nextMilestone: optStr(formData, "nextMilestone"),
    notes: optStr(formData, "notes"),
    updatedAt: new Date(),
  };

  if (id && isUuid(id)) {
    await db.update(projects).set(values).where(eq(projects.id, id));
    await logAudit({ actor: user, action: "project.update", entityType: "project", entityId: id, summary: `Updated project ${code}` });
  } else {
    const [row] = await db.insert(projects).values(values).returning({ id: projects.id });
    await logAudit({ actor: user, action: "project.create", entityType: "project", entityId: row.id, summary: `Created project ${code}` });
  }
  revalidatePath("/projects");
  return { ok: true, message: id ? `Project ${code} updated` : `Project ${code} created` };
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageProjects(user.role)) return { ok: false, error: "Only managers can delete projects." };
  if (!isUuid(id)) return { ok: false, error: "Invalid project." };
  const [row] = await db.delete(projects).where(eq(projects.id, id)).returning({ code: projects.code });
  if (!row) return { ok: false, error: "Project not found." };
  await logAudit({ actor: user, action: "project.delete", entityType: "project", entityId: id, summary: `Deleted project ${row.code}` });
  revalidatePath("/projects");
  return { ok: true, message: `Project ${row.code} deleted` };
}
