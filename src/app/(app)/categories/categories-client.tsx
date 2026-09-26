"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { FolderTree, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import type { CategoryType } from "@/db/schema";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/admin";
import type { ActionResult } from "@/lib/action-types";
import {
  CATEGORY_COLORS,
  CATEGORY_TYPES,
  CATEGORY_TYPE_META,
  categoryBadgeClass,
  isCategoryType,
} from "@/lib/domains";
import { cn } from "@/lib/utils";
import { Card, EmptyState, Field, StatCard, buttonClass, inputClass } from "@/components/ui";
import { FormAlert, Modal, SubmitButton } from "@/components/form-controls";

export type CategoryRow = {
  id: string;
  code: string;
  name: string;
  type: CategoryType;
  description: string | null;
  color: string;
  sortOrder: number;
  active: boolean;
  unitCount: number;
  assetCount: number;
  ticketCount: number;
};

function CategoryBadge({ code, name, color }: { code: string; name: string; color: string }) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset",
        categoryBadgeClass(color),
      )}
    >
      {code}
    </span>
  );
}

function CategoryForm({ row, onDone }: { row: CategoryRow | null; onDone: () => void }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(async (prev, fd) => {
    const res = await saveCategoryAction(prev, fd);
    if (res.ok) {
      toast.success(res.message ?? "Saved");
      onDone();
    }
    return res;
  }, null);
  const e = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="space-y-4">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <FormAlert message={state && !state.ok ? state.error : null} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" htmlFor="code" required error={e.code} hint="Unique id, e.g. TOWER-A">
          <input
            id="code"
            name="code"
            defaultValue={row?.code}
            className={cn(inputClass, "font-mono uppercase")}
            placeholder="TOWER-A"
          />
        </Field>
        <Field label="Name" htmlFor="name" required error={e.name}>
          <input id="name" name="name" defaultValue={row?.name} className={inputClass} placeholder="Tower A" />
        </Field>

        <Field label="Applies to" htmlFor="type" required error={e.type}>
          <select id="type" name="type" defaultValue={row?.type ?? "UNIT"} className={inputClass}>
            {CATEGORY_TYPES.map((t) => (
              <option key={t} value={t}>
                {CATEGORY_TYPE_META[t].label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Colour" htmlFor="color" error={e.color}>
          <select id="color" name="color" defaultValue={row?.color ?? "indigo"} className={inputClass}>
            {CATEGORY_COLORS.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Sort order" htmlFor="sortOrder" error={e.sortOrder} hint="Lower shows first">
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={row?.sortOrder ?? 0}
            className={inputClass}
          />
        </Field>

        <Field label="Status" htmlFor="active" hint="Inactive categories are hidden in pickers">
          <label className="flex h-[42px] items-center gap-2.5">
            <input
              id="active"
              name="active"
              type="checkbox"
              defaultChecked={row ? row.active : true}
              className="size-4 rounded border-slate-300 text-accent-600"
            />
            <span className="text-sm text-slate-700">Active</span>
          </label>
        </Field>

        <Field label="Description" htmlFor="description" className="sm:col-span-2">
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={row?.description ?? ""}
            className={inputClass}
            placeholder="What belongs in this category?"
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={buttonClass("secondary")}>
          Cancel
        </button>
        <SubmitButton pendingLabel="Saving…">{row ? "Save category" : "Create category"}</SubmitButton>
      </div>
    </form>
  );
}

export function CategoriesManager({
  rows,
  canManage,
  summary,
}: {
  rows: CategoryRow[];
  canManage: boolean;
  summary: { type: CategoryType; count: number }[];
}) {
  const [optimisticRows, removeRow] = useOptimistic(rows, (state: CategoryRow[], id: string) =>
    state.filter((r) => r.id !== id),
  );
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<CategoryType | "">("");
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<CategoryRow | null>(null);

  const filtered = filter ? optimisticRows.filter((r) => r.type === filter) : optimisticRows;

  const remove = (row: CategoryRow) => {
    setConfirm(null);
    startTransition(async () => {
      removeRow(row.id);
      const res = await deleteCategoryAction(row.id);
      if (res.ok) toast.success(res.message ?? "Deleted");
      else toast.error(res.error);
    });
  };

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {summary.map((s) => (
          <StatCard
            key={s.type}
            label={CATEGORY_TYPE_META[s.type].label}
            value={s.count}
            icon={s.type === "UNIT" ? <Tags className="size-4" /> : <FolderTree className="size-4" />}
            tone="indigo"
            hint={CATEGORY_TYPE_META[s.type].blurb}
          />
        ))}
      </div>

      <Card className="mb-4 flex flex-col gap-2 p-3 sm:flex-row">
        <select
          value={filter}
          onChange={(e) => setFilter(isCategoryType(e.target.value) ? e.target.value : "")}
          className={cn(inputClass, "sm:w-56")}
        >
          <option value="">All types</option>
          {CATEGORY_TYPES.map((t) => (
            <option key={t} value={t}>
              {CATEGORY_TYPE_META[t].label}
            </option>
          ))}
        </select>
        {canManage ? (
          <button type="button" onClick={() => setCreating(true)} className={buttonClass("primary")}>
            <Plus className="size-4" /> New category
          </button>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderTree className="size-5" />}
            title={optimisticRows.length ? "No categories of this type" : "No categories yet"}
            description={
              optimisticRows.length
                ? "Choose a different type from the filter."
                : "Create categories to group locations, assets and tickets."
            }
            action={
              canManage && !optimisticRows.length ? (
                <button onClick={() => setCreating(true)} className={buttonClass("primary", "sm")}>
                  New category
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Applies to</th>
                  <th className="hidden px-3 py-2.5 md:table-cell">Sort</th>
                  <th className="px-3 py-2.5 text-center">Used by</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  {canManage ? <th className="px-4 py-2.5 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <CategoryBadge code={r.code} name={r.name} color={r.color} />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      {r.description ? (
                        <p className="max-w-xs truncate text-[11px] text-slate-500">{r.description}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{CATEGORY_TYPE_META[r.type].label}</td>
                    <td className="hidden px-3 py-3 text-xs tabular-nums text-slate-600 md:table-cell">{r.sortOrder}</td>
                    <td className="px-3 py-3 text-center text-xs tabular-nums text-slate-600">
                      {r.type === "UNIT" ? r.unitCount : r.type === "ASSET" ? r.assetCount : r.ticketCount}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.active ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(r)}
                            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            aria-label="Edit"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirm(r)}
                            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete"
                          >
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

      <Modal
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `Edit ${editing.code}` : "New category"}
        size="lg"
      >
        <CategoryForm
          key={editing?.id ?? "new"}
          row={editing}
          onDone={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={`Delete category ${confirm?.code}?`}
        description="Anything using it keeps its data but loses the category label."
      >
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
