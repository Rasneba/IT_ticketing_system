import type { ReactNode } from "react";
import {
  Cctv,
  Droplets,
  Fan,
  Fingerprint,
  Gauge,
  KeyRound,
  Network,
  PhoneCall,
  Printer,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { AssetStatus, Channel, Criticality, Priority, Role, SystemDomain, TicketStatus, UnitType } from "@/db/schema";
import {
  ASSET_STATUS_META,
  CHANNEL_META,
  CRITICALITY_META,
  DOMAIN_META,
  ROLE_META,
  UNIT_TYPE_META,
} from "@/lib/domains";
import { SLA_POLICY } from "@/lib/sla";
import { STATUS_META } from "@/lib/workflow";
import { cn } from "@/lib/utils";

export const DOMAIN_ICONS: Record<SystemDomain, LucideIcon> = {
  HVAC: Fan,
  PLUMBING: Droplets,
  ELECTRICAL: Zap,
  SUB_METER: Gauge,
  WATER_PUMP: Waves,
  ACCESS_CONTROL: Fingerprint,
  LOCK_ENCODER: KeyRound,
  VOIP_PBX: PhoneCall,
  POS_PRINTER: Printer,
  CCTV: Cctv,
  NETWORK: Network,
};

export function DomainIcon({ domain, className }: { domain: SystemDomain; className?: string }) {
  const Icon = DOMAIN_ICONS[domain] ?? Network;
  return <Icon className={className} aria-hidden />;
}

export function DomainTile({ domain, size = "md" }: { domain: SystemDomain; size?: "sm" | "md" | "lg" }) {
  const meta = DOMAIN_META[domain];
  const box = size === "sm" ? "size-7 rounded-lg" : size === "lg" ? "size-12 rounded-2xl" : "size-9 rounded-xl";
  const icon = size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-4.5";
  return (
    <span className={cn("inline-grid shrink-0 place-items-center", box, meta.soft)}>
      <DomainIcon domain={domain} className={icon} />
    </span>
  );
}

export function Badge({ className, children, dot }: { className?: string; children: ReactNode; dot?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        className,
      )}
    >
      {dot ? <span className={cn("size-1.5 rounded-full", dot)} /> : null}
      {children}
    </span>
  );
}

export function PriorityBadge({ priority, showLabel = true }: { priority: Priority; showLabel?: boolean }) {
  const p = SLA_POLICY[priority];
  return (
    <Badge className={cn("font-semibold", p.badge)}>
      {priority}
      {showLabel ? <span className="font-medium opacity-90">{p.label}</span> : null}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const m = STATUS_META[status];
  return (
    <Badge className={m.badge} dot={m.dot}>
      {m.label}
    </Badge>
  );
}

export function DomainBadge({ domain, full }: { domain: SystemDomain; full?: boolean }) {
  const m = DOMAIN_META[domain];
  return (
    <Badge className={m.badge}>
      <DomainIcon domain={domain} className="size-3" />
      {full ? m.label : m.short}
    </Badge>
  );
}

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const m = ASSET_STATUS_META[status];
  return (
    <Badge className={m.badge} dot={m.dot}>
      {m.label}
    </Badge>
  );
}

export function CriticalityBadge({ criticality }: { criticality: Criticality }) {
  const m = CRITICALITY_META[criticality];
  return <Badge className={m.badge}>{m.label}</Badge>;
}

export function RoleBadge({ role }: { role: Role }) {
  const m = ROLE_META[role];
  return <Badge className={m.badge}>{m.label}</Badge>;
}

export function UnitTypeBadge({ type }: { type: UnitType }) {
  const m = UNIT_TYPE_META[type];
  return <Badge className={m.badge}>{m.label}</Badge>;
}

export function ChannelBadge({ channel }: { channel: Channel }) {
  return <Badge className="bg-white text-slate-600 ring-slate-200">{CHANNEL_META[channel].label}</Badge>;
}
