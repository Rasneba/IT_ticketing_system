"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { assets, tickets, type ImpactScope } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { findIssue, IMPACT_SCOPES } from "@/lib/domains";
import { createTicketRecord } from "@/lib/ticket-service";
import { str, type ActionResult } from "@/lib/action-types";

/** Public, unauthenticated Scan-to-Report submission from an asset QR sticker. */
export async function submitPublicReportAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (str(formData, "website")) return { ok: false, error: "Submission rejected." }; // honeypot

  const token = str(formData, "token");
  const issueCode = str(formData, "issueCode");
  const impactScope = (str(formData, "impactScope") || "SINGLE") as ImpactScope;
  const description = str(formData, "description").slice(0, 2000);
  const reporterName = str(formData, "reporterName").slice(0, 120);
  const reporterContact = str(formData, "reporterContact").slice(0, 120);
  const safetyHazard = formData.get("safetyHazard") === "on";

  const [asset] = await db.select().from(assets).where(eq(assets.qrToken, token)).limit(1);
  if (!asset || asset.status === "RETIRED") return { ok: false, error: "This QR code is no longer valid. Please contact reception." };

  const fieldErrors: Record<string, string> = {};
  if (!findIssue(asset.domain, issueCode)) fieldErrors.issueCode = "Choose what's wrong";
  if (!IMPACT_SCOPES.includes(impactScope)) fieldErrors.impactScope = "Choose who is affected";
  if (reporterName.length < 2) fieldErrors.reporterName = "Your name helps the technician find you";
  if (reporterContact.length < 5) fieldErrors.reporterContact = "Phone or email so we can update you";
  if (Object.keys(fieldErrors).length) return { ok: false, error: "A couple of details are missing.", fieldErrors };

  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)`.mapWith(Number) })
    .from(tickets)
    .where(
      and(eq(tickets.assetId, asset.id), eq(tickets.channel, "QR_SCAN"), gte(tickets.createdAt, new Date(Date.now() - 10 * 60_000))),
    );
  if (recent >= 5) {
    return { ok: false, error: "This device was reported several times in the last few minutes — the team is already on it." };
  }

  const viewer = await getCurrentUser();
  const ticket = await createTicketRecord({
    description: description || "(No additional details provided)",
    domain: asset.domain,
    issueCode,
    impactScope,
    safetyHazard,
    channel: "QR_SCAN",
    assetId: asset.id,
    reporterName,
    reporterContact,
    reporterUserId: viewer?.id ?? null,
    autoAssign: true,
    actor: null,
  });
  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  redirect(`/track/${ticket.publicToken}?new=1`);
}
