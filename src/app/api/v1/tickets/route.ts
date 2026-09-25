import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assets, tickets } from "@/db/schema";
import { authenticateApiKey, getBaseUrl } from "@/lib/server-utils";
import { findIssue, IMPACT_SCOPES, isDomain } from "@/lib/domains";
import { evaluateTicketSla, isPriority } from "@/lib/sla";
import { ACTIVE_STATUSES, isStatus } from "@/lib/workflow";
import { createTicketRecord } from "@/lib/ticket-service";
import { ticketRef } from "@/lib/utils";

export const dynamic = "force-dynamic";

const IngestSchema = z.object({
  assetTag: z.string().max(40).optional(),
  qrToken: z.string().max(24).optional(),
  domain: z.string().optional(),
  issueCode: z.string().min(1).max(64),
  impactScope: z.enum(IMPACT_SCOPES as [string, ...string[]]).optional(),
  safetyHazard: z.boolean().optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  externalRef: z.string().max(120).optional(),
  reporterName: z.string().max(160).optional(),
  reporterContact: z.string().max(160).optional(),
});

const json = (data: unknown, status = 200) => Response.json(data, { status });

export async function POST(req: Request) {
  const key = await authenticateApiKey(req);
  if (!key) return json({ error: "unauthorized", message: "Provide a valid API key via 'Authorization: Bearer <key>'." }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json", message: "Request body must be JSON." }, 400);
  }
  const parsed = IngestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "validation_failed", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, 422);
  }
  const input = parsed.data;

  let asset: typeof assets.$inferSelect | undefined;
  if (input.assetTag || input.qrToken) {
    [asset] = await db
      .select()
      .from(assets)
      .where(input.assetTag ? eq(assets.tag, input.assetTag.toUpperCase()) : eq(assets.qrToken, input.qrToken!))
      .limit(1);
    if (!asset) return json({ error: "asset_not_found", message: "No asset matches assetTag / qrToken." }, 404);
  }
  const domain = asset?.domain ?? input.domain;
  if (!isDomain(domain)) return json({ error: "invalid_domain", message: "Provide a valid domain or a known asset." }, 422);
  if (!findIssue(domain, input.issueCode)) {
    return json({ error: "invalid_issue_code", message: `issueCode '${input.issueCode}' is not in the ${domain} catalog.` }, 422);
  }

  const base = await getBaseUrl();
  if (input.externalRef) {
    const [existing] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.externalRef, input.externalRef), inArray(tickets.status, ACTIVE_STATUSES)))
      .limit(1);
    if (existing) {
      return json({
        id: existing.id,
        reference: ticketRef(existing.seq),
        priority: existing.priority,
        status: existing.status,
        responseDueAt: existing.responseDueAt,
        resolutionDueAt: existing.resolutionDueAt,
        slaTrace: existing.slaTrace,
        trackingUrl: `${base}/track/${existing.publicToken}`,
        deduplicated: true,
      });
    }
  }

  const ticket = await createTicketRecord({
    title: input.title,
    description: input.description ?? "",
    domain,
    issueCode: input.issueCode,
    impactScope: (input.impactScope as (typeof IMPACT_SCOPES)[number] | undefined) ?? "UNIT",
    safetyHazard: input.safetyHazard ?? false,
    channel: "API",
    assetId: asset?.id ?? null,
    reporterName: input.reporterName ?? key.name,
    reporterContact: input.reporterContact ?? null,
    externalRef: input.externalRef ?? null,
    autoAssign: true,
    actor: null,
  });

  return json(
    {
      id: ticket.id,
      reference: ticketRef(ticket.seq),
      priority: ticket.priority,
      status: ticket.status,
      responseDueAt: ticket.responseDueAt,
      resolutionDueAt: ticket.resolutionDueAt,
      slaTrace: ticket.slaTrace,
      trackingUrl: `${base}/track/${ticket.publicToken}`,
      deduplicated: false,
    },
    201,
  );
}

export async function GET(req: Request) {
  const key = await authenticateApiKey(req);
  if (!key) return json({ error: "unauthorized" }, 401);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50));
  const conds: SQL[] = [];
  if (isStatus(status)) conds.push(eq(tickets.status, status));
  if (isPriority(priority)) conds.push(eq(tickets.priority, priority));

  const rows = await db
    .select({ t: tickets, assetTag: assets.tag })
    .from(tickets)
    .leftJoin(assets, eq(tickets.assetId, assets.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(tickets.createdAt))
    .limit(limit);
  const now = new Date();
  return json({
    data: rows.map(({ t, assetTag }) => {
      const sla = evaluateTicketSla(t, now);
      return {
        id: t.id,
        reference: ticketRef(t.seq),
        title: t.title,
        domain: t.domain,
        issueCode: t.issueCode,
        priority: t.priority,
        status: t.status,
        channel: t.channel,
        assetTag,
        createdAt: t.createdAt,
        responseDueAt: t.responseDueAt,
        resolutionDueAt: t.resolutionDueAt,
        sla: { overall: sla.overall, response: sla.response.status, resolution: sla.resolution.status },
      };
    }),
  });
}
