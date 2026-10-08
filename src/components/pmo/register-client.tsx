"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { RegisterDef } from "@/lib/pmo/defs";
import { CUSTOMERS, LISTS, badgeClass, type ListKey } from "@/lib/pmo/lists";
import { fmtAmount, fmtNum, type Row } from "@/lib/pmo/derive";
import { savePmoRowAction, deletePmoRowAction } from "@/app/actions/pmo";
import { Badge } from "@/components/badges";
import { buttonClass, Card, inputClass } from "@/components/ui";
import { FormAlert, Modal, Spinner, SubmitButton } from "@/components/form-controls";
import { cn } from "@/lib/utils";

const HIDE: Record<string, string> = {
  sm: "max-sm:hidden",
  md: "max-md:hidden",
  lg: "max-lg:hidden",
  xl: "max-xl:hidden",
};

type ProjectOption = { id: string; code: string; name: string };

export function RegisterClient({
  def,
  rows,
  projects,
  canManage,
}: {
  def: RegisterDef;
  rows: Row[];
  projects: ProjectOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filterCol = def.filter ?? "status";
    return rows.filter((row) => {
      if (filter !== "all" && String(row[filterCol] ?? "") !== filter) return false;
      if (!term) return true;
      return def.cols.some((col) => {
        if (col.align || col.money || col.date) return false;
        return String(row[col.name] ?? "").toLowerCase().includes(term);
      });
    });
  }, [rows, q, filter, def]);

  function edit(row: Row) {
    setEditing(row);
    setOpen(true);
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className={cn(inputClass, "pl-9")}
            aria-label="Search records"
          />
        </div>
        {def.filter ? (
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={cn(inputClass, "sm:w-48")} aria-label="Filter">
            <option value="all">All {def.label.toLowerCase()}</option>
            {(def.filter === "type"
              ? LISTS.raidType
              : def.filter === "rag"
                ? ["Green", "Yellow", "Red"]
                : LISTS.status
            ).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ) : null}
        {canManage ? (
          <button type="button" onClick={() => edit({})} className={buttonClass("primary", "md")}>
            <Plus className="size-4" /> Add {def.singular}
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <h3 className="text-sm font-semibold text-slate-900">No {def.label.toLowerCase()} found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length === 0 ? `The ${def.title} is empty. ${canManage ? "Add the first record." : ""}` : "Try a different search or filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                {def.cols.map((col) => (
                  <th key={col.name} className={cn("px-4 py-2.5 font-semibold", col.align && "text-right", col.hide && HIDE[col.hide])}>
                    {col.label}
                  </th>
                ))}
                {canManage ? <th className="w-20 px-4 py-2.5 text-right font-semibold">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={String(row._id ?? i)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  {def.cols.map((col) => (
                    <td
                      key={col.name}
                      className={cn(
                        "px-4 py-2.5 align-top",
                        col.align && "text-right tabular-nums",
                        col.wide && "min-w-[200px] max-w-[360px]",
                        col.hide && HIDE[col.hide],
                      )}
                    >
                      <Cell col={col} row={row} />
                    </td>
                  ))}
                  {canManage ? (
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => edit(row)}
                          className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <DeleteButton id={String(row._id)} keyName={def.key} label={def.singular} />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && open ? (
        <PmoFormModal
          def={def}
          editing={editing ?? {}}
          projects={projects}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      ) : null}
    </Card>
  );
}

function Cell({ col, row }: { col: { name: string; list?: ListKey; money?: boolean; align?: string; link?: string; wide?: boolean; center?: boolean }; row: Row }) {
  const v = row[col.name];
  if (col.link) {
    const pid = row._pid ? String(row._pid) : String(row._id);
    return (
      <Link href={`/pmo/projects/${pid}`} className="inline-flex max-w-full items-center font-semibold text-accent-700 hover:text-accent-600 hover:underline">
        <span className="truncate">{String(v ?? "") || "—"}</span>
      </Link>
    );
  }
  if (col.center) {
    return <span className="block text-center tabular-nums">{renderValue(col, v)}</span>;
  }
  return <>{renderValue(col, v)}</>;
}

function renderValue(col: { name: string; list?: ListKey; money?: boolean; align?: string }, v: unknown) {
  if (col.list) {
    if (!v) return <span className="text-slate-300">—</span>;
    return <Badge className={badgeClass(col.list, String(v))}>{String(v)}</Badge>;
  }
  if (col.money) return <span className="text-slate-700">{fmtAmount(v)}</span>;
  if (v === null || v === undefined || v === "") return <span className="text-slate-300">—</span>;
  switch (col.name) {
    case "percent":
      return <span className="tabular-nums text-slate-700">{fmtNum(v, 0)}%</span>;
    case "sv":
    case "days":
    case "od":
      return <span className="tabular-nums text-slate-700">{fmtNum(v, 0)}d</span>;
    case "util":
    case "alloc":
      return <span className="tabular-nums text-slate-700">{fmtNum(v, 1)}%</span>;
    case "aCount":
    case "score":
    case "defects":
      return <span className="tabular-nums text-slate-700">{fmtNum(v, 0)}</span>;
    default:
      return <span className="text-slate-700">{String(v)}</span>;
  }
}

function DeleteButton({ id, keyName, label }: { id: string; keyName: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function onDelete() {
    if (!window.confirm(`Delete this ${label}?`)) return;
    start(async () => {
      const res = await deletePmoRowAction(id, keyName);
      if (res.ok) toast.success(res.message ?? "Deleted");
      else toast.error(res.error);
      router.refresh();
    });
  }
  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      aria-label={`Delete ${label}`}
    >
      {pending ? <Spinner className="size-3.5" /> : <Trash2 className="size-3.5" />}
    </button>
  );
}

function PmoFormModal({
  def,
  editing,
  projects,
  onClose,
  onSaved,
}: {
  def: RegisterDef;
  editing: Row;
  projects: ProjectOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(savePmoRowAction, null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Saved");
      onSaved();
    }
  }, [state, onSaved]);

  return (
    <Modal open onClose={onClose} title={`${editing._id ? "Edit" : "Add"} ${def.singular}`} description={def.description} size="lg">
      <FormAlert message={state?.ok === false ? state.error : null} />
      <form action={formAction} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input type="hidden" name="reg" value={def.key} />
        <input type="hidden" name="id" value={String(editing._id ?? "")} />
        {def.fields.map((f) => (
          <FieldInput key={f.name} def={def} field={f} value={editing[f.name]} projects={projects} errors={state?.ok === false ? state.fieldErrors ?? {} : {}} />
        ))}
        <div className="flex items-center justify-end gap-2 pb-1 sm:col-span-2">
          <button type="button" onClick={onClose} className={buttonClass("secondary", "md")}>
            Cancel
          </button>
          <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function FieldInput({
  def,
  field,
  value,
  projects,
  errors,
}: {
  def: RegisterDef;
  field: { name: string; label: string; type: string; list?: ListKey; required?: boolean; hint?: string; placeholder?: string; span?: number };
  value: unknown;
  projects: ProjectOption[];
  errors: Record<string, string>;
}) {
  const full = field.span !== undefined && field.span >= 3;
  const raw = value === null || value === undefined ? "" : String(value);
  const err = errors[field.name];
  const className = cn(inputClass, err && "ring-red-400");

  const selectOrOptions = (() => {
    if (field.name === "projectId") {
      return projects.sort((a, b) => a.code.localeCompare(b.code)).map((p) => (
        <option key={p.id} value={p.id}>
          {p.code} · {p.name}
        </option>
      ));
    }
    const list = field.list === "customer" ? CUSTOMERS : field.list ? LISTS[field.list] : [];
    return list.map((v) => (
      <option key={v} value={v}>
        {v}
      </option>
    ));
  })();

  return (
    <div className={cn(full && "sm:col-span-2")}>
      <label htmlFor={field.name} className="mb-1.5 block text-xs font-semibold text-slate-700">
        {field.label}
        {field.required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {field.type === "textarea" ? (
        <textarea id={field.name} name={field.name} defaultValue={raw} rows={3} placeholder={field.placeholder} className={className} />
      ) : field.type === "select" ? (
        <select id={field.name} name={field.name} defaultValue={raw} className={className}>
          <option value="">— select —</option>
          {selectOrOptions}
        </select>
      ) : field.type === "date" ? (
        <input id={field.name} name={field.name} type="date" defaultValue={raw} className={className} />
      ) : (
        <input
          id={field.name}
          name={field.name}
          type="number"
          step={field.type === "currency" || field.type === "number" ? "0.01" : field.type === "percent" ? "1" : "1"}
          min={field.type === "percent" ? 0 : undefined}
          max={field.type === "percent" ? 100 : undefined}
          defaultValue={raw}
          placeholder={field.placeholder}
          className={className}
        />
      )}
      {err ? <p className="mt-1 text-xs font-medium text-red-600">{err}</p> : field.hint ? <p className="mt-1 text-xs text-slate-500">{field.hint}</p> : null}
    </div>
  );
}