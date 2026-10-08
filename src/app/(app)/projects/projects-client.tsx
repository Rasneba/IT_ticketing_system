"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FolderKanban, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { ProjectStatus, Rag } from "@/db/schema";
import { deleteProjectAction, saveProjectAction } from "@/app/actions/projects";
import type { ActionResult } from "@/lib/action-types";
import { PROJECT_STATUSES, PROJECT_STATUS_META, RAGS, RAG_META } from "@/lib/domains";
import { cn } from "@/lib/utils";
import { ProjectStatusBadge, RagBadge } from "@/components/badges";
import { Card, EmptyState, Field, buttonClass, inputClass } from "@/components/ui";
import { FormAlert, Modal, SubmitButton } from "@/components/form-controls";

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  sponsor: string | null;
  projectManager: string | null;
  department: string | null;
  startDate: string | null;
  targetEndDate: string | null;
  status: ProjectStatus;
  rag: Rag;
  percentComplete: number;
  budget: number;
  actualCost: number;
  nextMilestone: string | null;
  notes: string | null;
};

const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

function ProjectForm({ project, onDone }: { project: ProjectRow | null; onDone: () => void }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(async (prev, fd) => {
    const res = await saveProjectAction(prev, fd);
    if (res.ok) {
      toast.success(res.message ?? "Saved");
      onDone();
    }
    return res;
  }, null);
  const e = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={formAction} className="space-y-4">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <FormAlert message={state && !state.ok ? state.error : null} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Project ID" htmlFor="code" required error={e.code}>
          <input id="code" name="code" defaultValue={project?.code} className={cn(inputClass, "font-mono uppercase")} placeholder="PRJ-001" />
        </Field>
        <Field label="Project name" htmlFor="name" required error={e.name} className="sm:col-span-2">
          <input id="name" name="name" defaultValue={project?.name} className={inputClass} placeholder="ERP Implementation" />
        </Field>
        <Field label="Sponsor" htmlFor="sponsor">
          <input id="sponsor" name="sponsor" defaultValue={project?.sponsor ?? ""} className={inputClass} placeholder="CEO" />
        </Field>
        <Field label="Project manager" htmlFor="projectManager">
          <input id="projectManager" name="projectManager" defaultValue={project?.projectManager ?? ""} className={inputClass} placeholder="Project Manager" />
        </Field>
        <Field label="Department" htmlFor="department">
          <input id="department" name="department" defaultValue={project?.department ?? ""} className={inputClass} placeholder="IT" />
        </Field>
        <Field label="Start date" htmlFor="startDate" error={e.startDate}>
          <input id="startDate" name="startDate" type="date" defaultValue={project?.startDate ?? ""} className={inputClass} />
        </Field>
        <Field label="Target end date" htmlFor="targetEndDate" error={e.targetEndDate}>
          <input id="targetEndDate" name="targetEndDate" type="date" defaultValue={project?.targetEndDate ?? ""} className={inputClass} />
        </Field>
        <Field label="Next milestone" htmlFor="nextMilestone">
          <input id="nextMilestone" name="nextMilestone" defaultValue={project?.nextMilestone ?? ""} className={inputClass} placeholder="UAT sign-off" />
        </Field>
        <Field label="Status" htmlFor="status" required error={e.status}>
          <select id="status" name="status" defaultValue={project?.status ?? "ACTIVE"} className={inputClass}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="RAG" htmlFor="rag" required error={e.rag}>
          <select id="rag" name="rag" defaultValue={project?.rag ?? "GREEN"} className={inputClass}>
            {RAGS.map((r) => (
              <option key={r} value={r}>
                {RAG_META[r].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="% complete" htmlFor="percentComplete" error={e.percentComplete}>
          <input id="percentComplete" name="percentComplete" type="number" min={0} max={100} defaultValue={project?.percentComplete ?? 0} className={inputClass} />
        </Field>
        <Field label="Budget" htmlFor="budget" error={e.budget} hint="Total approved amount">
          <input id="budget" name="budget" type="number" min={0} step="0.01" defaultValue={project?.budget ?? 0} className={inputClass} />
        </Field>
        <Field label="Actual cost" htmlFor="actualCost" error={e.actualCost} hint="Spend to date">
          <input id="actualCost" name="actualCost" type="number" min={0} step="0.01" defaultValue={project?.actualCost ?? 0} className={inputClass} />
        </Field>
        <Field label="Notes" htmlFor="notes" className="sm:col-span-3">
          <textarea id="notes" name="notes" rows={3} defaultValue={project?.notes ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={buttonClass("secondary")}>
          Cancel
        </button>
        <SubmitButton pendingLabel="Saving…">{project ? "Save project" : "Create project"}</SubmitButton>
      </div>
    </form>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", value >= 100 ? "bg-emerald-500" : value >= 50 ? "bg-accent-500" : "bg-slate-400")}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-slate-600">{value}%</span>
    </div>
  );
}

export function ProjectsManager({ rows, canManage }: { rows: ProjectRow[]; canManage: boolean }) {
  const [optimisticRows, removeRow] = useOptimistic(rows, (state: ProjectRow[], id: string) => state.filter((r) => r.id !== id));
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<ProjectRow | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "">("");
  const [rag, setRag] = useState<Rag | "">("");

  const filtered = optimisticRows.filter(
    (r) =>
      (!status || r.status === status) &&
      (!rag || r.rag === rag) &&
      (!q || `${r.code} ${r.name} ${r.sponsor ?? ""} ${r.projectManager ?? ""} ${r.department ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );

  const remove = (row: ProjectRow) => {
    setConfirm(null);
    startTransition(async () => {
      removeRow(row.id);
      const res = await deleteProjectAction(row.id);
      if (res.ok) toast.success(res.message ?? "Deleted");
      else toast.error(res.error);
    });
  };

  return (
    <>
      <Card className="mb-4 flex flex-col gap-2 p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by project ID, name, sponsor or manager…" className={cn(inputClass, "pl-9")} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | "")} className={cn(inputClass, "sm:w-44")}>
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_META[s].label}
            </option>
          ))}
        </select>
        <select value={rag} onChange={(e) => setRag(e.target.value as Rag | "")} className={cn(inputClass, "sm:w-36")}>
          <option value="">All RAG</option>
          {RAGS.map((r) => (
            <option key={r} value={r}>
              {RAG_META[r].label}
            </option>
          ))}
        </select>
        {canManage ? (
          <button type="button" onClick={() => setCreating(true)} className={buttonClass("primary")}>
            <Plus className="size-4" /> New project
          </button>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="size-5" />}
            title={optimisticRows.length ? "No projects match" : "No projects yet"}
            description={optimisticRows.length ? "Adjust the filter." : "Register every active project so nothing is managed in the dark."}
            action={
              canManage && !optimisticRows.length ? (
                <button onClick={() => setCreating(true)} className={buttonClass("primary", "sm")}>
                  New project
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Project</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">RAG</th>
                  <th className="hidden px-3 py-2.5 lg:table-cell">Manager / dept</th>
                  <th className="hidden px-3 py-2.5 md:table-cell">Timeline</th>
                  <th className="px-3 py-2.5">Progress</th>
                  <th className="hidden px-3 py-2.5 text-right xl:table-cell">Budget / actual</th>
                  <th className="hidden px-3 py-2.5 xl:table-cell">Next milestone</th>
                  {canManage ? <th className="px-4 py-2.5 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${p.id}`} className="group block">
                        <p className="font-medium text-slate-900 group-hover:text-accent-700">{p.name}</p>
                        <p className="font-mono text-xs text-slate-500">{p.code}</p>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <ProjectStatusBadge status={p.status} />
                    </td>
                    <td className="px-3 py-3">
                      <RagBadge rag={p.rag} />
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <p className="text-xs text-slate-700">{p.projectManager ?? <span className="italic text-slate-400">Unassigned</span>}</p>
                      <p className="text-[11px] text-slate-400">{p.department ?? p.sponsor ?? "—"}</p>
                    </td>
                    <td className="hidden px-3 py-3 text-xs text-slate-600 md:table-cell">
                      {p.startDate ?? "—"} → {p.targetEndDate ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <Progress value={p.percentComplete} />
                    </td>
                    <td className="hidden px-3 py-3 text-right xl:table-cell">
                      <p className="text-xs font-semibold tabular-nums text-slate-700">{money(p.budget)}</p>
                      <p className="text-[11px] tabular-nums text-slate-400">{money(p.actualCost)} spent</p>
                    </td>
                    <td className="hidden max-w-40 truncate px-3 py-3 text-xs text-slate-600 xl:table-cell">{p.nextMilestone ?? "—"}</td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setEditing(p)} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Edit">
                            <Pencil className="size-4" />
                          </button>
                          <button type="button" onClick={() => setConfirm(p)} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
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

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? `Edit ${editing.code}` : "New project"} size="lg">
        <ProjectForm
          key={editing?.id ?? "new"}
          project={editing}
          onDone={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={`Delete project ${confirm?.code}?`}
        description="The register entry is removed permanently. Related records are not affected."
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
