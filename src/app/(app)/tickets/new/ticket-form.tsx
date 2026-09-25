"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, Cpu, Send, ShieldAlert } from "lucide-react";
import type { Criticality, ImpactScope, Role, SystemDomain, UnitType } from "@/db/schema";
import { createTicketAction } from "@/app/actions/tickets";
import type { ActionResult } from "@/lib/action-types";
import { DOMAIN_GROUPS, DOMAIN_META, DOMAINS, IMPACT_SCOPES, IMPACT_SCOPE_META, ISSUE_CATALOG, type DomainGroup } from "@/lib/domains";
import { classifyTicket, formatMinutes, SLA_POLICY } from "@/lib/sla";
import { cn } from "@/lib/utils";
import { DomainIcon, PriorityBadge } from "@/components/badges";
import { Card, Field, inputClass } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/form-controls";

type AssetOpt = { id: string; tag: string; name: string; domain: SystemDomain; unitId: string | null; criticality: Criticality };
type UnitOpt = { id: string; code: string; name: string; floor: string; type: UnitType };
type StaffOpt = { id: string; name: string; role: Role; skills: string[] };

export function TicketForm({
  role,
  tenantUnit,
  units,
  assets,
  staff,
  defaultAssetId,
  defaultUnitId,
}: {
  role: Role;
  tenantUnit: { id: string | null; label: string } | null;
  units: UnitOpt[];
  assets: AssetOpt[];
  staff: StaffOpt[];
  defaultAssetId: string;
  defaultUnitId: string;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(createTicketAction, null);
  const initialAsset = assets.find((a) => a.id === defaultAssetId);
  const [assetId, setAssetId] = useState(initialAsset?.id ?? "");
  const [domain, setDomain] = useState<SystemDomain | "">(initialAsset?.domain ?? "");
  const [issueCode, setIssueCode] = useState("");
  const [unitId, setUnitId] = useState(initialAsset?.unitId ?? defaultUnitId);
  const [scope, setScope] = useState<ImpactScope>("UNIT");
  const [safety, setSafety] = useState(false);
  const isTenant = role === "TENANT";
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  const asset = assets.find((a) => a.id === assetId);
  const preview = useMemo(
    () =>
      domain && issueCode
        ? classifyTicket({ domain, issueCode, impactScope: scope, safetyHazard: safety, assetCriticality: asset?.criticality ?? null })
        : null,
    [domain, issueCode, scope, safety, asset?.criticality],
  );

  const onAsset = (id: string) => {
    setAssetId(id);
    const a = assets.find((x) => x.id === id);
    if (a) {
      if (a.domain !== domain) {
        setDomain(a.domain);
        setIssueCode("");
      }
      if (a.unitId) setUnitId(a.unitId);
    }
  };

  const suggested = domain ? staff.filter((s) => s.role === "TECHNICIAN" && s.skills.includes(domain)) : [];

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <FormAlert message={state && !state.ok ? state.error : null} />

        <Card className="space-y-5 p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">1 · Affected system</h2>
            <p className="text-xs text-slate-500">Choose the asset (pre-fills domain & location) or just the domain.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Asset (optional)" htmlFor="assetId">
              <select id="assetId" name="assetId" value={assetId} onChange={(e) => onAsset(e.target.value)} className={inputClass}>
                <option value="">— No specific asset —</option>
                {DOMAINS.map((d) => {
                  const list = assets.filter((a) => a.domain === d);
                  if (!list.length) return null;
                  return (
                    <optgroup key={d} label={DOMAIN_META[d].short}>
                      {list.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.tag} — {a.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </Field>
            {isTenant ? (
              <Field label="Location">
                <div className={cn(inputClass, "bg-slate-50 text-slate-600")}>{tenantUnit?.label}</div>
              </Field>
            ) : (
              <Field label="Unit / location" htmlFor="unitId" error={errors.unitId}>
                <select id="unitId" name="unitId" value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputClass}>
                  <option value="">— Select unit —</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code} · {u.name} ({u.floor})
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <input type="hidden" name="domain" value={domain} />
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-700">
              System domain <span className="text-red-500">*</span>
            </p>
            {errors.domain ? <p className="mb-2 text-xs font-medium text-red-600">{errors.domain}</p> : null}
            <div className="space-y-3">
              {(Object.keys(DOMAIN_GROUPS) as DomainGroup[]).map((g) => (
                <div key={g}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{DOMAIN_GROUPS[g].label}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {DOMAINS.filter((d) => DOMAIN_META[d].group === g).map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => {
                          setDomain(d);
                          setIssueCode("");
                          if (asset && asset.domain !== d) setAssetId("");
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition",
                          domain === d
                            ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                        )}
                      >
                        <span className={cn("grid size-6 shrink-0 place-items-center rounded-lg", DOMAIN_META[d].soft)}>
                          <DomainIcon domain={d} className="size-3.5" />
                        </span>
                        <span className="truncate">{DOMAIN_META[d].short}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="space-y-5 p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">2 · What&apos;s wrong?</h2>
            <p className="text-xs text-slate-500">The issue type drives the base priority in the SLA matrix.</p>
          </div>
          <input type="hidden" name="issueCode" value={issueCode} />
          {domain ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {ISSUE_CATALOG[domain].map((issue) => (
                <button
                  type="button"
                  key={issue.code}
                  onClick={() => setIssueCode(issue.code)}
                  className={cn(
                    "flex items-start justify-between gap-2 rounded-xl border p-3 text-left transition",
                    issueCode === issue.code
                      ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{issue.label}</span>
                    {issue.hint ? <span className="mt-0.5 block text-xs text-slate-500">{issue.hint}</span> : null}
                  </span>
                  <PriorityBadge priority={issue.basePriority} showLabel={false} />
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              Select a system domain first.
            </p>
          )}
          {errors.issueCode ? <p className="text-xs font-medium text-red-600">{errors.issueCode}</p> : null}

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-700">Who is affected?</p>
            <input type="hidden" name="impactScope" value={scope} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {IMPACT_SCOPES.map((sc) => (
                <button
                  type="button"
                  key={sc}
                  onClick={() => setScope(sc)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition",
                    scope === sc ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500" : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <span className="block text-xs font-semibold text-slate-800">{IMPACT_SCOPE_META[sc].label}</span>
                  <span className="block text-[11px] text-slate-500">{IMPACT_SCOPE_META[sc].description}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-red-200 bg-red-50/50 p-3">
            <input
              type="checkbox"
              name="safetyHazard"
              checked={safety}
              onChange={(e) => setSafety(e.target.checked)}
              className="mt-0.5 size-4 rounded border-red-300 text-red-600 focus:ring-red-500"
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-red-800">
                <ShieldAlert className="size-4" /> Safety hazard
              </span>
              <span className="text-xs text-red-700/80">Water near electrics, smoke, sparks, trapped person — forces P1.</span>
            </span>
          </label>

          <Field label="Title (optional)" htmlFor="title" hint="Auto-generated from issue type and asset if left blank." error={errors.title}>
            <input id="title" name="title" className={inputClass} placeholder="e.g. Kitchen printer offline after power blip" />
          </Field>
          <Field label="Description" htmlFor="description" required error={errors.description}>
            <textarea
              id="description"
              name="description"
              rows={4}
              className={inputClass}
              placeholder="What happened, since when, error codes on the display, anything already tried…"
            />
          </Field>
        </Card>

        {!isTenant ? (
          <Card className="space-y-4 p-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">3 · Intake & dispatch</h2>
              <p className="text-xs text-slate-500">For phone / email intake record who reported it.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Channel" htmlFor="channel">
                <select id="channel" name="channel" className={inputClass} defaultValue="PORTAL">
                  <option value="PORTAL">Portal</option>
                  <option value="PHONE">Phone</option>
                  <option value="EMAIL">Email</option>
                </select>
              </Field>
              <Field label="Reporter name" htmlFor="reporterName">
                <input id="reporterName" name="reporterName" className={inputClass} placeholder="Defaults to you" />
              </Field>
              <Field label="Reporter contact" htmlFor="reporterContact">
                <input id="reporterContact" name="reporterContact" className={inputClass} placeholder="+971… or email" />
              </Field>
            </div>
            <Field
              label="Assign to"
              htmlFor="assigneeId"
              hint={suggested.length ? `Skilled for this domain: ${suggested.map((s) => s.name).join(", ")}` : "Auto-dispatch picks the least-loaded skilled technician."}
            >
              <select id="assigneeId" name="assigneeId" className={inputClass} defaultValue="">
                <option value="">Auto-dispatch (recommended)</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {domain && s.skills.includes(domain) ? " ★" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </Card>
        ) : null}
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <Cpu className="size-3.5" /> SLA engine preview
            </div>
            {preview ? (
              <div className="mt-3 flex items-center gap-3">
                <span className={cn("rounded-xl px-3 py-2 text-2xl font-black", SLA_POLICY[preview.priority].badge)}>{preview.priority}</span>
                <div>
                  <p className="text-lg font-bold">{SLA_POLICY[preview.priority].label}</p>
                  <p className="text-xs text-slate-400">{SLA_POLICY[preview.priority].summary}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Select a domain and issue type to see the priority.</p>
            )}
          </div>
          {preview ? (
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-medium uppercase text-slate-500">Response</p>
                  <p className="text-lg font-bold text-slate-900">{formatMinutes(preview.responseMinutes)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-medium uppercase text-slate-500">Resolution</p>
                  <p className="text-lg font-bold text-slate-900">{formatMinutes(preview.resolutionMinutes)}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Decision trace</p>
                <ol className="space-y-1.5">
                  {preview.trace.map((line, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-600">
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-700">
                        {i + 1}
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>
              </div>
              {preview.priority === "P1" ? (
                <div className="flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  <AlertTriangle className="size-4 shrink-0" />
                  P1 tickets page the on-call technician immediately. For fire or life-threatening emergencies call 999 first.
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="border-t border-slate-100 p-5">
            <SubmitButton className="w-full" size="lg" pendingLabel="Creating ticket…" disabled={!domain || !issueCode}>
              <Send className="size-4" /> {isTenant ? "Submit request" : "Create ticket"}
            </SubmitButton>
            <p className="mt-2 text-center text-[11px] text-slate-400">Deterministic: identical inputs always yield the same priority.</p>
          </div>
        </Card>
      </div>
    </form>
  );
}
