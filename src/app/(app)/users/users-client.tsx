"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Power, Trash2, Users } from "lucide-react";
import type { Role, UnitType } from "@/db/schema";
import { deleteUserAction, saveUserAction, toggleUserActiveAction } from "@/app/actions/admin";
import type { ActionResult } from "@/lib/action-types";
import { DOMAIN_META, DOMAINS, ROLES, ROLE_META } from "@/lib/domains";
import { cn, timeAgo } from "@/lib/utils";
import { DomainIcon, RoleBadge } from "@/components/badges";
import { Avatar, Card, EmptyState, Field, buttonClass, inputClass } from "@/components/ui";
import { FormAlert, Modal, SubmitButton } from "@/components/form-controls";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string | null;
  phone: string | null;
  unitId: string | null;
  unitCode: string | null;
  skills: string[];
  active: boolean;
  lastLoginAt: string | null;
  activeTickets: number;
};
type UnitOpt = { id: string; code: string; name: string; floor: string; type: UnitType };
type Op = { type: "remove"; id: string } | { type: "toggle"; id: string };

function UserForm({ user, units, onDone }: { user: UserRow | null; units: UnitOpt[]; onDone: () => void }) {
  const [role, setRole] = useState<Role>(user?.role ?? "TECHNICIAN");
  const [state, formAction] = useActionState<ActionResult | null, FormData>(async (prev, fd) => {
    const res = await saveUserAction(prev, fd);
    if (res.ok) {
      toast.success(res.message ?? "Saved");
      onDone();
    }
    return res;
  }, null);
  const e = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={formAction} className="space-y-4">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <FormAlert message={state && !state.ok ? state.error : null} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" required error={e.name}>
          <input id="name" name="name" defaultValue={user?.name} className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="email" required error={e.email}>
          <input id="email" name="email" type="email" defaultValue={user?.email} className={inputClass} />
        </Field>
        <Field label="Role" htmlFor="role" required error={e.role}>
          <select id="role" name="role" value={role} onChange={(ev) => setRole(ev.target.value as Role)} className={inputClass}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_META[r].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Job title" htmlFor="title">
          <input id="title" name="title" defaultValue={user?.title ?? ""} className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <input id="phone" name="phone" defaultValue={user?.phone ?? ""} className={inputClass} />
        </Field>
        <Field label={user ? "New password (optional)" : "Password"} htmlFor="password" required={!user} error={e.password} hint="Minimum 8 characters">
          <input id="password" name="password" type="password" autoComplete="new-password" className={inputClass} />
        </Field>
        {role === "TENANT" || role === "MANAGER" ? (
          <Field label="Linked unit" htmlFor="unitId" required={role === "TENANT"} error={e.unitId} className="sm:col-span-2">
            <select id="unitId" name="unitId" defaultValue={user?.unitId ?? ""} className={inputClass}>
              <option value="">— None —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} · {u.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>
      {role === "TECHNICIAN" ? (
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-700">Domain skills (used by auto-dispatch)</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DOMAINS.map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs has-[:checked]:border-accent-400 has-[:checked]:bg-accent-50">
                <input type="checkbox" name="skills" value={d} defaultChecked={user?.skills.includes(d)} className="size-3.5 rounded border-slate-300 text-accent-600" />
                <DomainIcon domain={d} className="size-3.5 text-slate-500" />
                <span className="truncate">{DOMAIN_META[d].short}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={buttonClass("secondary")}>
          Cancel
        </button>
        <SubmitButton pendingLabel="Saving…">{user ? "Save user" : "Create user"}</SubmitButton>
      </div>
    </form>
  );
}

export function UsersManager({ rows, units, meId }: { rows: UserRow[]; units: UnitOpt[]; meId: string }) {
  const [optimistic, apply] = useOptimistic(rows, (state: UserRow[], op: Op) =>
    op.type === "remove" ? state.filter((r) => r.id !== op.id) : state.map((r) => (r.id === op.id ? { ...r, active: !r.active } : r)),
  );
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<UserRow | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const list = optimistic.filter((u) => !roleFilter || u.role === roleFilter);

  const run = (op: Op, fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      apply(op);
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Done");
      else toast.error(res.error);
    });

  return (
    <>
      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-0.5">
          {[{ key: "", label: "All" }, ...ROLES.map((r) => ({ key: r, label: ROLE_META[r].label }))].map((t) => (
            <button
              key={t.key || "all"}
              type="button"
              onClick={() => setRoleFilter(t.key as Role | "")}
              className={cn("rounded-md px-3 py-1.5 text-xs font-semibold", roleFilter === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button type="button" onClick={() => setCreating(true)} className={buttonClass("primary")}>
          <Plus className="size-4" /> New user
        </button>
      </Card>
      <Card className="overflow-hidden">
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-3 py-2.5">Role</th>
                  <th className="hidden px-3 py-2.5 lg:table-cell">Skills / unit</th>
                  <th className="hidden px-3 py-2.5 text-center md:table-cell">Active tickets</th>
                  <th className="hidden px-3 py-2.5 md:table-cell">Last login</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((u) => (
                  <tr key={u.id} className={cn("hover:bg-slate-50/70", !u.active && "opacity-50")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="md" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {u.name} {u.id === meId ? <span className="text-xs font-normal text-slate-400">(you)</span> : null}
                          </p>
                          <p className="truncate text-xs text-slate-500">{u.email}</p>
                          {u.title ? <p className="truncate text-[11px] text-slate-400">{u.title}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <RoleBadge role={u.role} />
                      {!u.active ? <p className="mt-1 text-[10px] font-semibold uppercase text-red-600">Deactivated</p> : null}
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      {u.role === "TECHNICIAN" ? (
                        <div className="flex flex-wrap gap-1">
                          {u.skills.map((s) => (
                            <span key={s} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {DOMAIN_META[s as keyof typeof DOMAIN_META]?.short ?? s}
                            </span>
                          ))}
                        </div>
                      ) : u.unitCode ? (
                        <span className="font-mono text-xs text-slate-600">Unit {u.unitCode}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-3 text-center text-xs font-semibold text-slate-700 md:table-cell">{u.activeTickets}</td>
                    <td className="hidden px-3 py-3 text-xs text-slate-500 md:table-cell">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEditing(u)} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Edit">
                          <Pencil className="size-4" />
                        </button>
                        {u.id !== meId ? (
                          <>
                            <button
                              type="button"
                              onClick={() => run({ type: "toggle", id: u.id }, () => toggleUserActiveAction(u.id))}
                              className={cn("grid size-8 place-items-center rounded-lg hover:bg-slate-100", u.active ? "text-slate-500" : "text-emerald-600")}
                              aria-label={u.active ? "Deactivate" : "Activate"}
                              title={u.active ? "Deactivate" : "Activate"}
                            >
                              <Power className="size-4" />
                            </button>
                            <button type="button" onClick={() => setConfirm(u)} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                              <Trash2 className="size-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Users className="size-5" />} title="No users in this role" />
        )}
      </Card>
      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? `Edit ${editing.name}` : "New user"} size="lg">
        <UserForm key={editing?.id ?? "new"} user={editing} units={units} onDone={() => { setCreating(false); setEditing(null); }} />
      </Modal>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={`Delete ${confirm?.name}?`} description="Assigned tickets become unassigned. Consider deactivating instead to preserve history.">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirm(null)} className={buttonClass("secondary")}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const u = confirm;
              setConfirm(null);
              if (u) run({ type: "remove", id: u.id }, () => deleteUserAction(u.id));
            }}
            className={buttonClass("danger")}
          >
            <Trash2 className="size-4" /> Delete user
          </button>
        </div>
      </Modal>
    </>
  );
}
