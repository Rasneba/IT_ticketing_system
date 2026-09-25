const DEFAULT_TZ = "Asia/Dubai";

function envOr(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function validTimeZone(value: string | undefined) {
  const tz = envOr(value, DEFAULT_TZ);
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

export const BUILDING_NAME = envOr(process.env.NEXT_PUBLIC_BUILDING_NAME, "Marina Heights Residences");
export const BUILDING_TZ = validTimeZone(process.env.NEXT_PUBLIC_BUILDING_TZ);

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Wall-clock reading for a single server request. Only call this from a server
 * component and pass the result down to a client component as a prop, so the
 * timestamp is captured once per request and serialised with the RSC payload.
 * Calling Date.now() directly in a component body is flagged as impure.
 */
export function requestNow(): number {
  return Date.now();
}

export function ticketRef(seq: number) {
  return `SR-${String(seq).padStart(5, "0")}`;
}

let formatters: { dtf: Intl.DateTimeFormat; df: Intl.DateTimeFormat; tf: Intl.DateTimeFormat } | null = null;

function getFormatters() {
  if (!formatters) {
    formatters = {
      dtf: new Intl.DateTimeFormat("en-GB", {
        timeZone: BUILDING_TZ,
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      df: new Intl.DateTimeFormat("en-GB", { timeZone: BUILDING_TZ, day: "2-digit", month: "short", year: "numeric" }),
      tf: new Intl.DateTimeFormat("en-GB", { timeZone: BUILDING_TZ, hour: "2-digit", minute: "2-digit", hour12: false }),
    };
  }
  return formatters;
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return getFormatters().dtf.format(new Date(d));
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return getFormatters().df.format(new Date(d));
}

export function formatTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return getFormatters().tf.format(new Date(d));
}

export function timeAgo(d: Date | string | null | undefined, now: Date = new Date()) {
  if (!d) return "—";
  const diff = now.getTime() - new Date(d).getTime();
  const future = diff < 0;
  const s = Math.abs(diff) / 1000;
  let out: string;
  if (s < 45) out = "just now";
  else if (s < 3600) out = `${Math.round(s / 60)}m`;
  else if (s < 86400) out = `${Math.round(s / 3600)}h`;
  else if (s < 86400 * 30) out = `${Math.round(s / 86400)}d`;
  else return formatDate(d);
  if (out === "just now") return out;
  return future ? `in ${out}` : `${out} ago`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function formatNumber(n: number, digits = 0) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

export function firstName(name: string | null | undefined) {
  return name ? name.split(" ")[0] : "";
}

export function locationLabel(
  unit: { name?: string | null; floor?: string | null; code?: string | null; type?: string | null } | null | undefined,
  detail?: string | null,
) {
  const parts: string[] = [];
  if (unit?.name) parts.push(unit.name);
  if (unit?.floor) parts.push(unit.floor);
  if (unit?.code && (!unit.type || unit.type === "RESIDENTIAL" || unit.type === "COMMERCIAL")) parts.push(`Unit ${unit.code}`);
  if (detail) parts.push(detail);
  return parts.join(" · ") || "Unassigned location";
}
