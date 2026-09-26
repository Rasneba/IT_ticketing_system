import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Cpu, KeyRound, Timer, Webhook } from "lucide-react";
import { db } from "@/db";
import { apiKeys, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { DOMAIN_META, DOMAINS, ISSUE_CATALOG } from "@/lib/domains";
import { formatMinutes, PRIORITIES, SLA_POLICY } from "@/lib/sla";
import { API_ENDPOINTS, INGEST_REQUEST, WEBHOOK_EXAMPLES } from "@/lib/blueprint";
import { getBaseUrl } from "@/lib/server-utils";
import { DomainIcon, PriorityBadge } from "@/components/badges";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ApiKeysManager } from "./settings-client";

export const metadata: Metadata = { title: "SLA & Integrations" };

export default async function SettingsPage() {
  const user = await requireRole(["ADMIN", "MANAGER"]);
  const isAdmin = can.manageSettings(user.role);
  const [keys, baseUrl] = await Promise.all([
    isAdmin
      ? db
          .select({
            id: apiKeys.id,
            name: apiKeys.name,
            prefix: apiKeys.prefix,
            createdAt: apiKeys.createdAt,
            lastUsedAt: apiKeys.lastUsedAt,
            revokedAt: apiKeys.revokedAt,
            createdBy: users.name,
          })
          .from(apiKeys)
          .leftJoin(users, eq(apiKeys.createdById, users.id))
          .orderBy(desc(apiKeys.createdAt))
      : Promise.resolve([]),
    getBaseUrl(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="SLA engine & integrations"
        description="The priority matrix is code-reviewed and deterministic — identical inputs always produce the same priority and timers."
      />

      <Card>
        <CardHeader title="Priority matrix" description="Response = first technician engagement · Resolution excludes time in PENDING_PARTS" icon={<Timer className="size-4" />} />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Response</th>
                <th className="px-3 py-2.5">Resolution</th>
                <th className="px-3 py-2.5">Definition</th>
                <th className="hidden px-5 py-2.5 lg:table-cell">Examples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PRIORITIES.map((p) => (
                <tr key={p}>
                  <td className="px-5 py-3">
                    <PriorityBadge priority={p} />
                  </td>
                  <td className="px-3 py-3 font-semibold tabular-nums text-slate-900">{formatMinutes(SLA_POLICY[p].responseMinutes)}</td>
                  <td className="px-3 py-3 font-semibold tabular-nums text-slate-900">{formatMinutes(SLA_POLICY[p].resolutionMinutes)}</td>
                  <td className="px-3 py-3 text-xs text-slate-600">{SLA_POLICY[p].summary}</td>
                  <td className="hidden px-5 py-3 text-xs text-slate-500 lg:table-cell">{SLA_POLICY[p].examples.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["R1 · Base rule", "Catalog (domain, issue code) pair sets the base priority."],
            ["R2 · Scope", "BUILDING-wide impact escalates one level."],
            ["R3 · Critical asset", "CRITICAL asset + service-affecting fault escalates one level."],
            ["R4 · Safety", "Safety hazard flag forces P1."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-800">{t}</p>
              <p className="mt-0.5 text-xs text-slate-500">{d}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Issue catalog" description="Every domain / issue code with its base priority" icon={<Cpu className="size-4" />} />
        <div className="grid gap-px bg-slate-100 md:grid-cols-2 xl:grid-cols-3">
          {DOMAINS.map((d) => (
            <div key={d} className="bg-white p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-800">
                <DomainIcon domain={d} className="size-4 text-slate-400" /> {DOMAIN_META[d].label}
              </p>
              <ul className="space-y-1.5">
                {ISSUE_CATALOG[d].map((i) => (
                  <li key={i.code} className="flex items-start justify-between gap-2 text-xs">
                    <span className="text-slate-600">
                      {i.label}
                      <span className="block font-mono text-[10px] text-slate-400">{i.code}</span>
                    </span>
                    <PriorityBadge priority={i.basePriority} showLabel={false} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="REST / webhook ingestion" description="Let monitoring systems raise tickets automatically" icon={<Webhook className="size-4" />} />
          <div className="space-y-4 p-5">
            <ul className="space-y-2">
              {API_ENDPOINTS.map((e) => (
                <li key={e.method + e.path} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{e.method}</span>
                  <code className="font-mono text-slate-800">{e.path}</code>
                  <span className="text-slate-400">· {e.auth}</span>
                </li>
              ))}
            </ul>
            <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-[11px] leading-relaxed text-slate-200">{`curl -X POST ${baseUrl}/api/v1/tickets \\
  -H "Authorization: Bearer $BSD_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"assetTag":"CCTV-CAM-P03","issueCode":"CAMERA_OFFLINE","externalRef":"hik:videoloss:D19"}'`}</pre>
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-accent-600">Full request schema</summary>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-50 p-4 text-[11px] text-slate-700 ring-1 ring-inset ring-slate-200">{INGEST_REQUEST}</pre>
            </details>
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-accent-600">Webhook payload examples</summary>
              <div className="mt-2 space-y-3">
                {WEBHOOK_EXAMPLES.map((w) => (
                  <div key={w.source}>
                    <p className="mb-1 font-medium text-slate-600">{w.source}</p>
                    <pre className="overflow-x-auto rounded-xl bg-slate-50 p-3 text-[11px] text-slate-700 ring-1 ring-inset ring-slate-200">{w.payload}</pre>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </Card>

        <Card>
          <CardHeader title="API keys" description={isAdmin ? "Keys are shown once and stored as SHA-256 hashes" : "Administrator access required"} icon={<KeyRound className="size-4" />} />
          {isAdmin ? (
            <ApiKeysManager
              keys={keys.map((k) => ({
                ...k,
                createdAt: k.createdAt.toISOString(),
                lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
                revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
              }))}
            />
          ) : (
            <p className="p-5 text-sm text-slate-500">Only administrators can create or revoke ingestion keys.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
