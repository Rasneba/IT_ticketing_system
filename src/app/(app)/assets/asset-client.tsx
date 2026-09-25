"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Printer, RefreshCw, Save, Trash2, X } from "lucide-react";
import type { Asset, AssetStatus, SystemDomain, UnitType } from "@/db/schema";
import { deleteAssetAction, regenerateQrAction, saveAssetAction, setAssetStatusAction } from "@/app/actions/assets";
import type { ActionResult } from "@/lib/action-types";
import { ASSET_STATUSES, ASSET_STATUS_META, CRITICALITIES, CRITICALITY_META, DOMAIN_META, DOMAINS } from "@/lib/domains";
import { cn } from "@/lib/utils";
import { Card, Field, buttonClass, inputClass } from "@/components/ui";
import { FormAlert, Modal, Spinner, SubmitButton } from "@/components/form-controls";

type KV = { key: string; value: string };
const toRows = (o: Record<string, string> | undefined): KV[] => {
  const rows = Object.entries(o ?? {}).map(([key, value]) => ({ key, value }));
  return rows.length ? rows : [{ key: "", value: "" }];
};

function KvEditor({ name, label, hint, initial }: { name: string; label: string; hint: string; initial?: Record<string, string> }) {
  const [rows, setRows] = useState<KV[]>(toRows(initial));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-700">{label}</p>
          <p className="text-[11px] text-slate-500">{hint}</p>
        </div>
        <button type="button" onClick={() => setRows((r) => [...r, { key: "", value: "" }])} className={buttonClass("ghost", "sm")}>
          <Plus className="size-3.5" /> Add
        </button>
      </div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={row.key}
              onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
              placeholder="Key (e.g. Power)"
              className={cn(inputClass, "w-2/5")}
            />
            <input
              value={row.value}
              onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
              placeholder="Value (e.g. 400 V / 3Ph)"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setRows((r) => (r.length > 1 ? r.filter((_, j) => j !== i) : [{ key: "", value: "" }]))}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600"
              aria-label="Remove row"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssetForm({
  asset,
  units,
}: {
  asset?: Asset | null;
  units: { id: string; code: string; name: string; floor: string; type: UnitType }[];
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(saveAssetAction, null);
  const [domain, setDomain] = useState<SystemDomain | "">(asset?.domain ?? "");
  const e = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="space-y-6">
      {asset ? <input type="hidden" name="id" value={asset.id} /> : null}
      <FormAlert message={state && !state.ok ? state.error : null} />
      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Identity & location</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Asset tag" htmlFor="tag" required error={e.tag} hint="Printed on the QR sticker">
            <input id="tag" name="tag" defaultValue={asset?.tag} className={cn(inputClass, "font-mono uppercase")} placeholder="ACC-ZK-MAIN" />
          </Field>
          <Field label="Name" htmlFor="name" required error={e.name} className="sm:col-span-2">
            <input id="name" name="name" defaultValue={asset?.name} className={inputClass} placeholder="ZKTeco SpeedFace-V5L – Main Entrance" />
          </Field>
          <Field label="System domain" htmlFor="domain" required error={e.domain}>
            <select id="domain" name="domain" value={domain} onChange={(ev) => setDomain(ev.target.value as SystemDomain)} className={inputClass}>
              <option value="">Select…</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {DOMAIN_META[d].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unit / zone" htmlFor="unitId" error={e.unitId}>
            <select id="unitId" name="unitId" defaultValue={asset?.unitId ?? ""} className={inputClass}>
              <option value="">— None —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} · {u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Exact location" htmlFor="locationDetail">
            <input id="locationDetail" name="locationDetail" defaultValue={asset?.locationDetail ?? ""} className={inputClass} placeholder="Main glass door, left pillar" />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Hardware & network</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Manufacturer" htmlFor="manufacturer">
            <input id="manufacturer" name="manufacturer" defaultValue={asset?.manufacturer ?? ""} className={inputClass} />
          </Field>
          <Field label="Model" htmlFor="model">
            <input id="model" name="model" defaultValue={asset?.model ?? ""} className={inputClass} />
          </Field>
          <Field label="Serial number" htmlFor="serialNumber">
            <input id="serialNumber" name="serialNumber" defaultValue={asset?.serialNumber ?? ""} className={cn(inputClass, "font-mono")} />
          </Field>
          <Field label="IP address" htmlFor="ipAddress" error={e.ipAddress}>
            <input id="ipAddress" name="ipAddress" defaultValue={asset?.ipAddress ?? ""} className={cn(inputClass, "font-mono")} placeholder="192.168.10.21" />
          </Field>
          <Field label="Firmware / version" htmlFor="firmware">
            <input id="firmware" name="firmware" defaultValue={asset?.firmware ?? ""} className={inputClass} />
          </Field>
          {domain === "SUB_METER" ? (
            <Field label="Meter unit" htmlFor="meterUnit">
              <select id="meterUnit" name="meterUnit" defaultValue={asset?.meterUnit ?? "kWh"} className={inputClass}>
                <option value="kWh">kWh (electricity)</option>
                <option value="m³">m³ (water)</option>
                <option value="BTU">BTU (chilled water)</option>
              </select>
            </Field>
          ) : null}
          <Field label="Criticality" htmlFor="criticality" hint="CRITICAL escalates service-affecting faults one level">
            <select id="criticality" name="criticality" defaultValue={asset?.criticality ?? "STANDARD"} className={inputClass}>
              {CRITICALITIES.map((c) => (
                <option key={c} value={c}>
                  {CRITICALITY_META[c].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" htmlFor="status">
            <select id="status" name="status" defaultValue={asset?.status ?? "OPERATIONAL"} className={inputClass}>
              {ASSET_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {ASSET_STATUS_META[st].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Installed" htmlFor="installedAt" error={e.installedAt}>
            <input id="installedAt" name="installedAt" type="date" defaultValue={asset?.installedAt ?? ""} className={inputClass} />
          </Field>
          <Field label="Warranty until" htmlFor="warrantyUntil" error={e.warrantyUntil}>
            <input id="warrantyUntil" name="warrantyUntil" type="date" defaultValue={asset?.warrantyUntil ?? ""} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card className="grid gap-6 p-5 lg:grid-cols-2">
        <KvEditor name="environment" label="Environment settings" hint="Shown on the public QR report page (safe to disclose)" initial={asset?.environment} />
        <KvEditor name="specs" label="Technical specs" hint="Internal only — ports, controllers, credentials location" initial={asset?.specs} />
        <Field label="Notes" htmlFor="notes" className="lg:col-span-2">
          <textarea id="notes" name="notes" rows={3} defaultValue={asset?.notes ?? ""} className={inputClass} />
        </Field>
      </Card>

      <div className="flex justify-end gap-2">
        <SubmitButton pendingLabel="Saving…">
          <Save className="size-4" /> {asset ? "Save changes" : "Register asset"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function AssetStatusControl({ id, status, canEdit }: { id: string; status: AssetStatus; canEdit: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2.5 rounded-full", ASSET_STATUS_META[optimistic].dot)} />
      <select
        value={optimistic}
        disabled={!canEdit || pending}
        onChange={(e) => {
          const next = e.target.value as AssetStatus;
          startTransition(async () => {
            setOptimistic(next);
            const res = await setAssetStatusAction(id, next);
            if (res.ok) toast.success(res.message ?? "Updated");
            else toast.error(res.error);
          });
        }}
        className={cn(inputClass, "h-9 w-40 py-1")}
      >
        {ASSET_STATUSES.map((st) => (
          <option key={st} value={st}>
            {ASSET_STATUS_META[st].label}
          </option>
        ))}
      </select>
      {pending ? <Spinner className="text-slate-400" /> : null}
    </div>
  );
}

export function DeleteAssetButton({ id, tag }: { id: string; tag: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("ghost", "md", "text-red-600 hover:bg-red-50 hover:text-red-700")}>
        <Trash2 className="size-4" /> Delete
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Delete ${tag}?`} description="Tickets referencing this asset are kept but unlinked. Meter readings are removed.">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary")}>
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteAssetAction(id);
                if (res.ok) {
                  toast.success(res.message ?? "Deleted");
                  router.push("/assets");
                } else toast.error(res.error);
              })
            }
            className={buttonClass("danger")}
          >
            {pending ? <Spinner /> : <Trash2 className="size-4" />} Delete asset
          </button>
        </div>
      </Modal>
    </>
  );
}

export function RegenerateQrButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Re-issue the QR code? Existing stickers for this asset will stop working.")) return;
        startTransition(async () => {
          const res = await regenerateQrAction(id);
          if (res.ok) toast.success(res.message ?? "Re-issued");
          else toast.error(res.error);
        });
      }}
      className={buttonClass("ghost", "sm")}
    >
      {pending ? <Spinner className="size-3.5" /> : <RefreshCw className="size-3.5" />} Re-issue
    </button>
  );
}

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("primary")}>
      <Printer className="size-4" /> {label}
    </button>
  );
}
