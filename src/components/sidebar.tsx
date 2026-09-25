"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Boxes,
  Building2,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  QrCode,
  ScrollText,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/db/schema";
import { logoutAction } from "@/app/actions/auth";
import { ROLE_META } from "@/lib/domains";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui";

type NavItem = { href: string; label: string; icon: LucideIcon; roles?: Role[]; count?: "active" };
const STAFF: Role[] = ["ADMIN", "MANAGER", "TECHNICIAN"];

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Operations",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/tickets", label: "Tickets", icon: Ticket, count: "active" },
    ],
  },
  {
    section: "Infrastructure",
    items: [
      { href: "/assets", label: "Assets", icon: Boxes, roles: STAFF },
      { href: "/units", label: "Units", icon: Building2, roles: STAFF },
      { href: "/meters", label: "Sub-meters", icon: Gauge, roles: STAFF },
      { href: "/assets/labels", label: "QR labels", icon: QrCode, roles: STAFF },
    ],
  },
  {
    section: "Knowledge",
    items: [{ href: "/docs", label: "SOP & Documents", icon: BookOpen, roles: STAFF }],
  },
  {
    section: "Administration",
    items: [
      { href: "/users", label: "Users", icon: Users, roles: ["ADMIN"] },
      { href: "/settings", label: "SLA & Integrations", icon: Settings, roles: ["ADMIN", "MANAGER"] },
      { href: "/audit", label: "Audit log", icon: ScrollText, roles: ["ADMIN", "MANAGER"] },
    ],
  },
];

export type SidebarUser = { name: string; email: string; role: Role; title: string | null; unitLabel: string | null };

function isActive(pathname: string, href: string) {
  if (href === "/assets") return pathname === "/assets" || (pathname.startsWith("/assets/") && !pathname.startsWith("/assets/labels"));
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavContent({
  user,
  activeCount,
  breachedCount,
  onNavigate,
}: {
  user: SidebarUser;
  activeCount: number;
  breachedCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/40">
          <ShieldCheck className="size-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-white">Building Service Desk</p>
          <p className="truncate text-[11px] text-slate-400">Marina Heights Residences</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <Link
          href="/tickets/new"
          onClick={onNavigate}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Plus className="size-4" /> {user.role === "TENANT" ? "Report an issue" : "New ticket"}
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((group) => {
          const items = group.items.filter((i) => !i.roles || i.roles.includes(user.role));
          if (!items.length) return null;
          return (
            <div key={group.section}>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  const label = item.href === "/tickets" && user.role === "TENANT" ? "My requests" : item.label;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition",
                          active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", active ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300")} />
                        <span className="flex-1 truncate">{label}</span>
                        {item.count === "active" && activeCount > 0 ? (
                          <span className="flex items-center gap-1">
                            {breachedCount > 0 ? (
                              <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white" title="SLA breached">
                                {breachedCount}
                              </span>
                            ) : null}
                            <span className="rounded-full bg-white/10 px-1.5 text-[10px] font-semibold text-slate-300">
                              {activeCount}
                            </span>
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5">
          <Avatar name={user.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-[11px] text-slate-400">
              {ROLE_META[user.role].label}
              {user.unitLabel ? ` · ${user.unitLabel}` : ""}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function Sidebar(props: { user: SidebarUser; activeCount: number; breachedCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-slate-950 lg:block print:hidden">
        <NavContent {...props} />
      </aside>

      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden print:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <ShieldCheck className="size-4 text-white" />
          </div>
          <span className="truncate text-sm font-bold text-slate-900">Service Desk</span>
        </div>
        <Link
          href="/tickets/new"
          className="grid size-9 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm"
          aria-label="New ticket"
        >
          <Plus className="size-4" />
        </Link>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-950 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-5 grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
            <NavContent {...props} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
