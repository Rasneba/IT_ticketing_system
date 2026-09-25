"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { assets, type AssetStatus, type Criticality } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ASSET_STATUSES, CRITICALITIES, isDomain } from "@/lib/domains";
import { randomCode } from "@/lib/password";
import { logAudit } from "@/lib/audit-log";
import { isUuid } from "@/lib/utils";
import { optStr, str, type ActionResult } from "@/lib/action-types";

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseKv(raw: string): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { key: string; value: string }[];
    const out: Record<string, string> = {};
    for (const row of parsed) {
      const k = String(row.key ?? "").trim().slice(0, 60);
      const v = String(row.value ?? "").trim().slice(0, 200);
      if (k && v) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export async function saveAssetAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = optStr(formData, "id");
  if (id ? !can.editAssets(user.role) : !can.manageAssets(user.role)) {
    return { ok: false, error: "You are not permitted to modify assets." };
  }

  const tag = str(formData, "tag").toUpperCase();
  const name = str(formData, "name");
  const domain = str(formData, "domain");
  const unitId = optStr(formData, "unitId");
  const ipAddress = optStr(formData, "ipAddress");
  const criticality = (str(formData, "criticality") || "STANDARD") as Criticality;
  const status = (str(formData, "status") || "OPERATIONAL") as AssetStatus;
  const installedAt = optStr(formData, "installedAt");
  const warrantyUntil = optStr(formData, "warrantyUntil");

  const fieldErrors: Record<string, string> = {};
  if (!/^[A-Z0-9][A-Z0-9-]{2,39}$/.test(tag)) fieldErrors.tag = "3–40 chars: letters, numbers and dashes";
  if (name.length < 3) fieldErrors.name = "Name is required";
  if (!isDomain(domain)) fieldErrors.domain = "Select a domain";
  if (unitId && !isUuid(unitId)) fieldErrors.unitId = "Invalid unit";
  if (ipAddress && !IPV4.test(ipAddress)) fieldErrors.ipAddress = "Enter a valid IPv4 address";
  if (!CRITICALITIES.includes(criticality)) fieldErrors.criticality = "Invalid criticality";
  if (!ASSET_STATUSES.includes(status)) fieldErrors.status = "Invalid status";
  if (installedAt && !DATE.test(installedAt)) fieldErrors.installedAt = "Invalid date";
  if (warrantyUntil && !DATE.test(warrantyUntil)) fieldErrors.warrantyUntil = "Invalid date";

  if (!fieldErrors.tag) {
    const clash = await db
      .select({ id: assets.id })
      .from(assets)
      .where(id && isUuid(id) ? and(eq(assets.tag, tag), ne(assets.id, id)) : eq(assets.tag, tag))
      .limit(1);
    if (clash.length) fieldErrors.tag = "This tag is already in use";
  }
  if (Object.keys(fieldErrors).length || !isDomain(domain)) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const values = {
    tag,
    name,
    domain,
    unitId,
    locationDetail: optStr(formData, "locationDetail"),
    manufacturer: optStr(formData, "manufacturer"),
    model: optStr(formData, "model"),
    serialNumber: optStr(formData, "serialNumber"),
    ipAddress,
    firmware: optStr(formData, "firmware"),
    criticality,
    status,
    meterUnit: domain === "SUB_METER" ? optStr(formData, "meterUnit") ?? "kWh" : null,
    installedAt,
    warrantyUntil,
    notes: optStr(formData, "notes"),
    environment: parseKv(str(formData, "environment")),
    specs: parseKv(str(formData, "specs")),
    updatedAt: new Date(),
  };

  let savedId: string;
  if (id && isUuid(id)) {
    const [row] = await db.update(assets).set(values).where(eq(assets.id, id)).returning({ id: assets.id });
    if (!row) return { ok: false, error: "Asset not found." };
    savedId = row.id;
    await logAudit({ actor: user, action: "asset.update", entityType: "asset", entityId: savedId, summary: `Updated asset ${tag}` });
  } else {
    const [row] = await db
      .insert(assets)
      .values({ ...values, qrToken: randomCode(10) })
      .returning({ id: assets.id });
    savedId = row.id;
    await logAudit({ actor: user, action: "asset.create", entityType: "asset", entityId: savedId, summary: `Registered asset ${tag}` });
  }
  revalidatePath("/assets");
  revalidatePath(`/assets/${savedId}`);
  redirect(`/assets/${savedId}`);
}

export async function deleteAssetAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.deleteAssets(user.role)) return { ok: false, error: "Only managers can delete assets." };
  if (!isUuid(id)) return { ok: false, error: "Invalid asset." };
  const [row] = await db.delete(assets).where(eq(assets.id, id)).returning({ tag: assets.tag });
  if (!row) return { ok: false, error: "Asset not found." };
  await logAudit({ actor: user, action: "asset.delete", entityType: "asset", entityId: id, summary: `Deleted asset ${row.tag}` });
  revalidatePath("/assets");
  return { ok: true, message: `${row.tag} deleted` };
}

export async function setAssetStatusAction(id: string, status: AssetStatus): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.editAssets(user.role)) return { ok: false, error: "Not permitted." };
  if (!isUuid(id) || !ASSET_STATUSES.includes(status)) return { ok: false, error: "Invalid request." };
  const [row] = await db
    .update(assets)
    .set({ status, updatedAt: new Date() })
    .where(eq(assets.id, id))
    .returning({ tag: assets.tag });
  if (!row) return { ok: false, error: "Asset not found." };
  await logAudit({ actor: user, action: "asset.status", entityType: "asset", entityId: id, summary: `${row.tag} status → ${status}` });
  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: `Status set to ${status.toLowerCase()}` };
}

export async function regenerateQrAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!can.manageAssets(user.role)) return { ok: false, error: "Only managers can re-issue QR codes." };
  if (!isUuid(id)) return { ok: false, error: "Invalid asset." };
  const [row] = await db
    .update(assets)
    .set({ qrToken: randomCode(10), updatedAt: new Date() })
    .where(eq(assets.id, id))
    .returning({ tag: assets.tag });
  if (!row) return { ok: false, error: "Asset not found." };
  await logAudit({ actor: user, action: "asset.qr_reissue", entityType: "asset", entityId: id, summary: `Re-issued QR sticker for ${row.tag}` });
  revalidatePath(`/assets/${id}`);
  revalidatePath("/assets/labels");
  return { ok: true, message: "New QR code issued — reprint the sticker" };
}
