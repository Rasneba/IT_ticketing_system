"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { UnitType } from "@/db/schema";
import { deleteUnitAction, saveUnitAction } from "@/app/actions/admin";
import type { ActionResult } from "@/lib/action-types";
import { UNIT_TYPES, UNIT_TYPE_META, categoryBadgeClass } from "@/lib/domains";
import { cn } from "@/lib/utils";
import { UnitTypeBadge } from "@/components/badges";
import { Card, EmptyState, Field, buttonClass, inputClass } from "@/components/ui";
import { FormAlert, Modal, SubmitButton } from "@/components/form-controls";

export type UnitRow = {
  id: string;
  code: string;
  name: string;
  type: UnitType;
  floor: string;
  floorLevel: number;
  occupantName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  areaSqm: number | null;
  notes: string | null;
  assetCount: number;
  openTickets: number;
  categoryId: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  categoryColor: string | null;
};

export type CategoryOption = { id: string; code: string; name: string; color: string };

function UnitForm({
  unit,
  categories,
  onDone,
}: {
  unit: UnitRow | null;
  categories: CategoryOption[];
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(async (prev, fd) => {
    const res = await saveUnitAction(prev, fd);
    if (res.ok) {
      toast.success(res.message ?? "Saved");
      onDone();
    }
    return res;
  }, null);
  const e = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={formAction} className="space-y-4">
      {unit ? <input type="hidden" name="id" value={unit.id} /> : null}
      <FormAlert message={state && !state.ok ? state.error : null} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Code" htmlFor="code" required error={e.code}>
          <input id="code" name="code" defaultValue={unit?.code} className={cn(inputClass, "font-mono uppercase")} placeholder="4B" />
        </Field>
        <Field label="Name" htmlFor="name" required error={e.name} className="sm:col-span-2">
          <input id="name" name="name" defaultValue={unit?.name} className={inputClass} placeholder="Mado Coffee" />
        </Field>
        <Field label="Type" htmlFor="type" required error={e.type}>
          <select id="type" name="type" defaultValue={unit?.type ?? "RESIDENTIAL"} className={inputClass}>
            {UNIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {UNIT_TYPE_META[t].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Floor" htmlFor="floor" required error={e.floor}>
          <input id="floor" name="floor" defaultValue={unit?.floor} className={inputClass} placeholder="Ground Floor" />
        </Field>
        <Field label="Category" htmlFor="categoryId" error={e.categoryId} className="sm:col-span-2">
          <select id="categoryId" name="categoryId" defaultValue={unit?.categoryId ?? ""} className={inputClass}>
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Floor level" htmlFor="floorLevel" error={e.floorLevel} hint="Sort order (B1 = -1)">
          <input id="floorLevel" name="floorLevel" type="number" defaultValue={unit?.floorLevel ?? 0} className={inputClass} />
        </Field>
        <Field label="Occupant / tenant" htmlFor="occupantName" className="sm:col-span-2">
          <input id="occupantName" name="occupantName" defaultValue={unit?.occupantName ?? ""} className={inputClass} />
        </Field>
        <Field label="Area (m²)" htmlFor="areaSqm" error={e.areaSqm}>
          <input id="areaSqm" name="areaSqm" type="number" min={0} defaultValue={unit?.areaSqm ?? ""} className={inputClass} />
        </Field>
        <Field label="Contact phone" htmlFor="contactPhone">
          <input id="contactPhone" name="contactPhone" defaultValue={unit?.contactPhone ?? ""} className={inputClass} />
        </Field>
        <Field label="Contact email" htmlFor="contactEmail" error={e.contactEmail} className="sm:col-span-2">
          <input id="contactEmail" name="contactEmail" type="email" defaultValue={unit?.contactEmail ?? ""} className={inputClass} />
        </Field>
        <Field label="Notes" htmlFor="notes" className="sm:col-span-3">
          <textarea id="notes" name="notes" rows={2} defaultValue={unit?.notes ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={buttonClass("secondary")}>
          Cancel
        </button>
        <SubmitButton pendingLabel="Saving…">{unit ? "Save unit" : "Create unit"}</SubmitButton>
      </div>
    </form>
  );
}

export function UnitsManager({
  rows,
  categories,
  canManage,
}: {
  rows: UnitRow[];
  categories: CategoryOption[];
  canManage: boolean;
}) {
  const [optimisticRows, removeRow] = useOptimistic(rows, (state: UnitRow[], id: string) => state.filter((r) => r.id !== id));
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<UnitRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<UnitRow | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<UnitType | "">("");

  const filtered = optimisticRows.filter(
    (r) =>
      (!type || r.type === type) &&
      (!q || `${r.code} ${r.name} ${r.occupantName ?? ""} ${r.floor}`.toLowerCase().includes(q.toLowerCase())),
  );

  const remove = (row: UnitRow) => {
    setConfirm(null);
    startTransition(async () => {
      removeRow(row.id);
      const res = await deleteUnitAction(row.id);
      if (res.ok) toast.success(res.message ?? "Deleted");
      else toast.error(res.error);
    });
  };

  return (
    <>
      <Card className="mb-4 flex flex-col gap-2 p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by code, name, occupant or floor…" className={cn(inputClass, "pl-9")} />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value as UnitType | "")} className={cn(inputClass, "sm:w-48")}>
          <option value="">All types</option>
          {UNIT_TYPES.map((t) => (
            <option key={t} value={t}>
              {UNIT_TYPE_META[t].label}
            </option>
          ))}
        </select>
        {canManage ? (
          <button type="button" onClick={() => setCreating(true)} className={buttonClass("primary")}>
            <Plus className="size-4" /> New unit
          </button>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 className="size-5" />}
            title={optimisticRows.length ? "No units match" : "No units yet"}
            description={optimisticRows.length ? "Adjust the filter." : "Create apartments, retail units and plant rooms."}
            action={canManage && !optimisticRows.length ? <button onClick={() => setCreating(true)} className={buttonClass("primary", "sm")}>New unit</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="hidden px-3 py-2.5 md:table-cell">Floor</th>
                  <th className="hidden px-3 py-2.5 lg:table-cell">Occupant / contact</th>
                  <th className="px-3 py-2.5 text-center">Assets</th>
                  <th className="px-3 py-2.5 text-center">Open</th>
                  {canManage ? <th className="px-4 py-2.5 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <Link href={`/units/${u.id}`} className="group block">
                        <p className="font-medium text-slate-900 group-hover:text-indigo-700">{u.name}</p>
                        <p className="font-mono text-xs text-slate-500">{u.code}</p>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <UnitTypeBadge type={u.type} />
                        {u.categoryCode ? (
                          <span
                            title={u.categoryName ?? undefined}
                            className={cn(
                              "inline-flex items-center rounded-lg px-1.5 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset",
                              categoryBadgeClass(u.categoryColor),
                            )}
                          >
                            {u.categoryCode}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 text-xs text-slate-600 md:table-cell">{u.floor}</td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <p className="text-xs text-slate-700">{u.occupantName ?? <span className="italic text-slate-400">Vacant</span>}</p>
                      <p className="text-[11px] text-slate-400">{u.contactPhone ?? u.contactEmail}</p>
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-semibold text-slate-700">{u.assetCount}</td>
                    <td className="px-3 py-3 text-center">
                      {u.openTickets ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">{u.openTickets}</span> : <span className="text-xs text-slate-300">0</span>}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setEditing(u)} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Edit">
                            <Pencil className="size-4" />
                          </button>
                          <button type="button" onClick={() => setConfirm(u)} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? `Edit ${editing.code}` : "New unit"} size="lg">
        <UnitForm
          key={editing?.id ?? "new"}
          unit={editing}
          categories={categories}
          onDone={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={`Delete unit ${confirm?.code}?`} description="Assets and tickets in this unit are kept but unlinked from the location.">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirm(null)} className={buttonClass("secondary")}>
            Cancel
          </button>
          <button type="button" onClick={() => confirm && remove(confirm)} className={buttonClass("danger")}>
            <Trash2 className="size-4" /> Delete
          </button>
        </div>
      </Modal>
    </>
  );
}
