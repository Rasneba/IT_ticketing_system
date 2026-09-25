"use client";

import { useActionState, useMemo, useState } from "react";
import { Clock, Send, ShieldAlert } from "lucide-react";
import type { ImpactScope, SystemDomain } from "@/db/schema";
import { submitPublicTicketAction } from "@/app/actions/public";
import type { ActionResult } from "@/lib/action-types";
import type { IssueType } from "@/lib/domains";
import { DOMAINS, DOMAIN_GROUPS, DOMAIN_META, IMPACT_SCOPES, IMPACT_SCOPE_META, type DomainGroup } from "@/lib/domains";
import { classifyTicket, formatMinutes, SLA_POLICY } from "@/lib/sla";
import { cn } from "@/lib/utils";
import { FormAlert, SubmitButton } from "@/components/form-controls";

const input =
  "block w-full rounded-xl border-0 bg-white px-3.5 py-3 text-base text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm";

export type PublicUnit = { id: string; code: string; name: string; floor: string };

export function PublicTicketForm({
  units,
  issueCatalog,
}: {
  units: PublicUnit[];
  issueCatalog: Record<SystemDomain, IssueType[]>;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(submitPublicTicketAction, null);
  const [domain, setDomain] = useState<SystemDomain | "">("");
  const [issueCode, setIssueCode] = useState("");
  const [scope, setScope] = useState<ImpactScope>("SINGLE");
  const [safety, setSafety] = useState(false);
  const e = state && !state.ok ? state.fieldErrors ?? {} : {};

  const issues = domain ? issueCatalog[domain] : [];

  const preview = useMemo(
    () =>
      domain && issueCode
        ? classifyTicket({ domain, issueCode, impactScope: scope, safetyHazard: safety, assetCriticality: null })
        : null,
    [domain, issueCode, scope, safety],
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="domain" value={domain} />
      <input type="hidden" name="issueCode" value={issueCode} />
      <input type="hidden" name="impactScope" value={scope} />
      <div className="hidden" aria-hidden>
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <FormAlert message={state && !state.ok ? state.error : null} />

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-bold text-slate-900">Which system has a problem?</h2>
        {e.domain ? <p className="mt-1 text-xs font-medium text-red-600">{e.domain}</p> : null}
        <div className="mt-3 space-y-4">
          {(Object.keys(DOMAIN_GROUPS) as DomainGroup[]).map((group) => (
            <div key={group}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {DOMAIN_GROUPS[group].label}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {DOMAINS.filter((d) => DOMAIN_META[d].group === group).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDomain(d);
                      setIssueCode("");
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-[0.99]",
                      domain === d
                        ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500"
                        : "border-slate-200 bg-white text-slate-700",
                    )}
                  >
                    {DOMAIN_META[d].short}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {domain ? (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-bold text-slate-900">What&apos;s wrong?</h2>
          {e.issueCode ? <p className="mt-1 text-xs font-medium text-red-600">{e.issueCode}</p> : null}
          <div className="mt-3 space-y-2">
            {issues.map((i) => (
              <button
                key={i.code}
                type="button"
                onClick={() => setIssueCode(i.code)}
                className={cn(
                  "w-full rounded-2xl border p-3.5 text-left transition active:scale-[0.99]",
                  issueCode === i.code
                    ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                    : "border-slate-200 bg-white",
                )}
              >
                <span className="block text-sm font-semibold text-slate-900">{i.label}</span>
                {i.hint ? <span className="mt-0.5 block text-xs text-slate-500">{i.hint}</span> : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-bold text-slate-900">Where and who is affected?</h2>
        <label className="mt-3 block">
          <span className="text-sm font-semibold text-slate-900">Your location (optional)</span>
          <select name="unitId" defaultValue="" className={cn(input, "mt-2")}>
            <option value="">Not listed / common area</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} · {u.name} ({u.floor})
              </option>
            ))}
          </select>
          {e.unitId ? <span className="mt-1 block text-xs font-medium text-red-600">{e.unitId}</span> : null}
        </label>

        <h3 className="mt-4 text-sm font-semibold text-slate-900">Who is affected?</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {IMPACT_SCOPES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={cn(
                "rounded-2xl border px-3 py-2.5 text-left",
                scope === s ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500" : "border-slate-200",
              )}
            >
              <span className="block text-xs font-semibold text-slate-800">{IMPACT_SCOPE_META[s].label}</span>
              <span className="block text-[11px] text-slate-500">{IMPACT_SCOPE_META[s].description}</span>
            </button>
          ))}
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-2xl bg-red-50 p-3.5 ring-1 ring-inset ring-red-200">
          <input
            type="checkbox"
            name="safetyHazard"
            checked={safety}
            onChange={(ev) => setSafety(ev.target.checked)}
            className="mt-0.5 size-5 rounded border-red-300 text-red-600"
          />
          <span>
            <span className="flex items-center gap-1 text-sm font-semibold text-red-800">
              <ShieldAlert className="size-4" /> Safety risk
            </span>
            <span className="text-xs text-red-700/80">Water near electrics, smoke, sparks or someone trapped</span>
          </span>
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-slate-900">Details (optional)</span>
          <textarea
            name="description"
            rows={3}
            className={cn(input, "mt-2")}
            placeholder="When it started, what you hear or see, anything you already tried…"
          />
        </label>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-bold text-slate-900">How can we reach you?</h2>
        <p className="text-xs text-slate-500">
          No account needed — we only use this to update you, and you get a link to track progress.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <input name="reporterName" autoComplete="name" className={input} placeholder="Your name" />
            {e.reporterName ? <p className="mt-1 text-xs font-medium text-red-600">{e.reporterName}</p> : null}
          </div>
          <div>
            <input
              name="reporterContact"
              autoComplete="tel"
              className={input}
              placeholder="Mobile number or email"
            />
            {e.reporterContact ? (
              <p className="mt-1 text-xs font-medium text-red-600">{e.reporterContact}</p>
            ) : null}
          </div>
        </div>
      </section>

      {preview ? (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-900 p-4 text-white">
          <span className={cn("rounded-xl px-2.5 py-1.5 text-lg font-black", SLA_POLICY[preview.priority].badge)}>
            {preview.priority}
          </span>
          <div className="text-sm">
            <p className="flex items-center gap-1 font-semibold">
              <Clock className="size-4 text-indigo-300" /> A technician will respond within{" "}
              {formatMinutes(preview.responseMinutes)}
            </p>
            <p className="text-xs text-slate-400">
              Target fix time {formatMinutes(preview.resolutionMinutes)} · {SLA_POLICY[preview.priority].label} priority
            </p>
          </div>
        </div>
      ) : null}

      <SubmitButton
        size="lg"
        className="h-12 w-full rounded-2xl text-base"
        pendingLabel="Sending request…"
        disabled={!domain || !issueCode}
      >
        <Send className="size-4" /> Send request
      </SubmitButton>
    </form>
  );
}
