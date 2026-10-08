/* -------------------------------------------------------------------------- */
/* Pure derived-value helpers for the PMO module. Shared by server data        */
/* loaders and read at render time - nothing here ever imports a DB client.    */
/* Mirrors the computed columns of the Excel workbook.                         */
/* -------------------------------------------------------------------------- */

export type Row = Record<string, unknown>;

const DAY = 86_400_000;
const TODAY = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
export const todayISO = () => TODAY().toISOString().slice(0, 10);

function parseDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole days from today to the given date, negative when past. */
export function daysLeft(v: unknown): number | null {
  const d = parseDate(v);
  if (!d) return null;
  return Math.round((d.getTime() - TODAY().getTime()) / DAY);
}

const LEVEL: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

export function riskScoreOf(probability: unknown, impact: unknown): number | null {
  const p = LEVEL[String(probability ?? "")];
  const i = LEVEL[String(impact ?? "")];
  if (!p || !i) return null;
  return p * i;
}

export function riskPriorityOf(score: number | null): string {
  if (score === null) return "Medium";
  if (score >= 8) return "Critical";
  if (score >= 6) return "High";
  if (score >= 3) return "Medium";
  return "Low";
}

/** Mendelow-style power/interest classification. */
export function stakeholderClass(influence: unknown, interest: unknown): string | null {
  const p = String(influence ?? "");
  const i = String(interest ?? "");
  if (!p || !i) return null;
  if (p === "High" && i === "High") return "Key Player";
  if (p === "High" && i === "Medium") return "Keep Satisfied";
  if (p === "High" && i === "Low") return "Keep Satisfied";
  if (p === "Low" && i === "High") return "Keep Informed";
  if (p === "Low" && i === "Low") return "Monitor";
  if (p === "Medium" && i === "Medium") return "Manage Closely";
  if (p === "Medium" && i === "High") return "Manage Closely";
  if (p === "Medium" && i === "Low") return "Monitor";
  if (p === "Low" && i === "Medium") return "Keep Informed";
  return "Manage Closely";
}

export function milestoneRag(row: Row): string {
  if (row.actualDate || String(row.status) === "Reached") return "Green";
  if (String(row.status) === "Missed") return "Red";
  const left = daysLeft(row.forecastDate ?? row.baselineDate);
  if (left === null) return "Green";
  if (left < 0) return "Red";
  if (left <= 14) return "Yellow";
  return "Green";
}

export function actionRag(row: Row): string {
  const status = String(row.status ?? "");
  if (status === "Completed" || status === "Cancelled") return "Green";
  const left = daysLeft(row.dueDate);
  if (left === null) return "Green";
  if (left < 0) return "Red";
  if (left <= 3) return "Yellow";
  return "Green";
}

export function changeRag(row: Row): string {
  const s = String(row.approvalStatus ?? "");
  if (s === "Approved") return "Green";
  if (s === "Rejected" || s === "Withdrawn") return "Red";
  return "Yellow";
}

export function decisionRag(row: Row): string {
  const s = String(row.status ?? "");
  if (s === "Implemented") return "Green";
  if (s === "Made") return "Yellow";
  return "Red";
}

export function meetingRag(row: Row): string {
  const s = String(row.status ?? "");
  if (s === "Held") return "Green";
  if (s === "Cancelled" || s === "No Show") return "Red";
  const left = daysLeft(row.date);
  if (left === null) return "Yellow";
  return left < -7 ? "Red" : "Yellow";
}

/** Portfolio schedule variance in days: forecast vs baseline (positive = slippage). */
export function scheduleVariance(row: Row): number | null {
  const f = parseDate(row.forecastEnd);
  const b = parseDate(row.baselineEnd);
  if (!f || !b) return null;
  return Math.round((f.getTime() - b.getTime()) / DAY);
}

/** Cost variance = forecast cost - approved amount (positive = over budget). */
export function costVariance(row: Row): number | null {
  const f = Number(row.forecastCost ?? 0);
  const a = Number(row.totalApproved ?? 0);
  return Number.isFinite(f) && Number.isFinite(a) ? f - a : null;
}

export function healthOf(row: Row): string {
  const rag = String(row.rag ?? "");
  const cv = costVariance(row);
  const sv = scheduleVariance(row);
  if (rag === "Red" || (cv !== null && cv > 0) || (sv !== null && sv > 60)) return "Red";
  if (rag === "Yellow" || (sv !== null && sv > 0)) return "Yellow";
  return "Green";
}

export function costUtilPct(row: Row): number | null {
  const a = Number(row.totalApproved ?? 0);
  if (a <= 0) return null;
  const pct = (Number(row.actual ?? 0) / a) * 100;
  return Math.round(pct * 10) / 10;
}

/** One accountable role per RACI row; validation mirrors the Excel formula. */
export function raciAccountables(row: Row): string[] {
  return ["sponsor", "pmo", "projectManager", "businessOwner", "itLead", "developer", "finance", "procurement", "qa", "endUsers"].filter(
    (col) => String(row[col] ?? "").toUpperCase() === "A",
  );
}

export function raciValidation(row: Row): string {
  const a = raciAccountables(row);
  if (a.length === 0) return "No accountable role assigned";
  if (a.length === 1) return "OK - single accountable";
  return `Multiple accountable: ${a.join(", ")}`;
}

export function fmtAmount(n: unknown): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

export function fmtNum(n: unknown, digits = 0): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(v);
}