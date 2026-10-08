import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { pmoProjects } from "@/db/schema";
import { REGISTERS, type RegisterDef } from "./defs";
import { PMO_TABLES } from "./tables";
import {
  actionRag,
  costUtilPct,
  costVariance,
  daysLeft,
  healthOf,
  milestoneRag,
  raciValidation,
  riskPriorityOf,
  riskScoreOf,
  scheduleVariance,
  stakeholderClass,
  type Row,
} from "./derive";

export type ProjectRow = typeof pmoProjects.$inferSelect;

export async function getProjects(): Promise<ProjectRow[]> {
  return db.select().from(pmoProjects).orderBy(asc(pmoProjects.code));
}

async function getProjectMap() {
  const projects = await getProjects();
  const map = new Map<string, ProjectRow>();
  for (const p of projects) map.set(p.id, p);
  return map;
}

const ORDER_COL: Record<string, string> = {
  portfolio: "code",
  milestones: "forecastDate",
  raid: "dateRaised",
  actions: "dueDate",
  raci: "activity",
  stakeholders: "name",
  changes: "requestDate",
  costs: "category",
  resources: "resource",
  procurement: "item",
  quality: "plannedDate",
  meetings: "date",
  decisions: "dueDate",
  comms: "audience",
  closure: "item",
  lessons: "date",
};

function decorateRow(def: RegisterDef, row: Row, map: Map<string, ProjectRow>): Row {
  row._id = row.id;
  if (def.projectScoped) {
    const pid = row.projectId ? String(row.projectId) : null;
    row._pid = pid ?? null;
    const prj = pid && map.get(pid) ? map.get(pid) : undefined;
    row.project = prj ? `${prj.code} · ${prj.name}` : null;
  }
  switch (def.key) {
    case "portfolio": {
      row.sv = scheduleVariance(row);
      row.cv = costVariance(row);
      row.health = healthOf(row);
      break;
    }
    case "milestones": {
      row.days = daysLeft(row.forecastDate ?? row.baselineDate);
      row.rag = milestoneRag(row);
      break;
    }
    case "raid": {
      if (typeof row.riskScore !== "number" || !row.riskScore) row.riskScore = riskScoreOf(row.probability, row.impact) ?? 0;
      row.priority = riskPriorityOf(Number(row.riskScore));
      row.ragStatus = String(row.status);
      break;
    }
    case "actions": {
      row.od = actionRag(row) === "Red" && typeof row.dueDate === "string" ? -(daysLeft(row.dueDate) ?? 0) : 0;
      row.rag = actionRag(row);
      break;
    }
    case "raci": {
      row.aCount = ["sponsor", "pmo", "projectManager", "businessOwner", "itLead", "developer", "finance", "procurement", "qa", "endUsers"].filter(
        (c) => String(row[c] ?? "").toUpperCase() === "A",
      ).length;
      row.validation = raciValidation(row);
      break;
    }
    case "stakeholders": {
      row.class = stakeholderClass(row.influence, row.interest);
      break;
    }
    case "costs": {
      row.util = costUtilPct(row);
      row.variance = Number(row.forecast ?? 0) - Number(row.totalApproved ?? 0);
      break;
    }
    case "resources": {
      const alloc = Number(row.allocation ?? 0);
      row.util = alloc;
      row.load = alloc > 100 ? "Red" : alloc >= 80 ? "Yellow" : "Green";
      row.status = "Allocated";
      break;
    }
    case "procurement": {
      row.variance = Number(row.approvedCost ?? 0) - Number(row.totalApproved ?? 0);
      break;
    }
    default:
      break;
  }
  return row;
}

async function fetchTable(regKey: string) {
  const table = PMO_TABLES[regKey] as any;
  const q = db.select().from(table);
  const col = table[ORDER_COL[regKey]];
  return col ? q.orderBy(asc(col)) : q;
}

export async function getRegisterData(regKey: string): Promise<Row[]> {
  const rows = (await fetchTable(regKey)) as unknown as Row[];
  const map = await getProjectMap();
  return rows.map((r) => {
    const row: Row = { ...r };
    return decorateRow(defOf(regKey), row, map);
  });
}

export function defOf(regKey: string): RegisterDef {
  const def = REGISTERS.find((r) => r.key === regKey);
  if (!def) throw new Error(`Unknown register: ${regKey}`);
  return def;
}

export type RegisterSummary = { def: RegisterDef; count: number };

export async function getRegisterIndex(): Promise<RegisterSummary[]> {
  const counts = await Promise.all(
    REGISTERS.map(async (r) => {
      const table = PMO_TABLES[r.key];
      const [row] = await db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(table as any);
      return { def: r, count: row?.count ?? 0 };
    }),
  );
  return counts;
}

export type Dashboard = {
  projects: Row[];
  kpi: {
    active: number;
    completed: number;
    red: number;
    approved: number;
    actual: number;
    forecast: number;
    utilPct: number | null;
    openMilestones: number;
    overdueMilestones: number;
    openActions: number;
    overdueActions: number;
    openRisks: number;
    highRisks: number;
    openIssues: number;
    pendingChanges: number;
    pendingDecisions: number;
    overloadedResources: number;
    qualityPassRate: number | null;
    closurePct: number | null;
    stakeholders: number;
  };
  charts: {
    ragMix: { name: string; value: number }[];
    statusMix: { name: string; value: number }[];
    healthMix: { name: string; value: number }[];
    typeMix: { name: string; value: number }[];
    costByProject: { name: string; approved: number; actual: number; forecast: number }[];
    costByCategory: { name: string; approved: number; actual: number }[];
    milestoneMix: { name: string; value: number }[];
    actionMix: { name: string; value: number }[];
    resourceLoad: { name: string; allocation: number }[];
    utilisation: { name: string; util: number }[];
  };
};

export async function getDashboard(): Promise<Dashboard> {
  const projects = await getRegisterData("portfolio");
  const plan = await getRegisterData("milestones");
  const act = await getRegisterData("actions");
  const raid = await getRegisterData("raid");
  const costs = await getRegisterData("costs");
  const changes = await getRegisterData("changes");
  const decisions = await getRegisterData("decisions");
  const resources = await getRegisterData("resources");
  const quality = await getRegisterData("quality");
  const closure = await getRegisterData("closure");
  const stakeholders = await getRegisterData("stakeholders");

  const sum = (rows: Row[], key: string) => rows.reduce((a, r) => a + (Number(r[key] ?? 0) || 0), 0);

  const active = projects.filter((p) => p.status && String(p.status) !== "Completed" && String(p.status) !== "Cancelled");
  const red = active.filter((p) => String(p.rag) === "Red");
  const approved = sum(projects, "totalApproved");
  const actual = sum(projects, "actualCost");
  const forecast = sum(projects, "forecastCost");
  const utilPct = approved > 0 ? Math.round((actual / approved) * 100) : null;

  const today = new Date().toISOString().slice(0, 10);
  const overdueMilestones = plan.filter((m) => String(m.status) !== "Reached" && String(m.forecastDate ?? m.baselineDate ?? "") < today).length;
  const openActions = act.filter((a) => String(a.status) === "Open" || String(a.status) === "In Progress");
  const overdueActions = openActions.filter((a) => String(a.dueDate ?? "") < today).length;

  const openRisks = raid.filter((r) => String(r.type) === "Risk" && String(r.status) !== "Closed");
  const openIssues = raid.filter((r) => String(r.type) === "Issue" && String(r.status) !== "Closed");
  const highRisks = openRisks.filter((r) => Number(r.riskScore ?? 0) >= 6);

  const pendingChanges = changes.filter((c) => String(c.approvalStatus) === "Pending").length;
  const pendingDecisions = decisions.filter((d) => String(d.status) === "Pending").length;

  const allocByPerson = new Map<string, number>();
  for (const r of resources) {
    const name = String(r.resource ?? "");
    if (!name) continue;
    allocByPerson.set(name, (allocByPerson.get(name) ?? 0) + (Number(r.allocation ?? 0) || 0));
  }
  const overloadedResources = [...allocByPerson.values()].filter((v) => v > 100).length;

  const passes = quality.filter((q) => String(q.result) === "Pass").length;
  const fails = quality.filter((q) => String(q.result) === "Fail").length;
  const qualityPassRate = passes + fails > 0 ? Math.round((passes / (passes + fails)) * 100) : null;

  const closureOpen = closure.filter((c) => String(c.status) !== "Complete").length;
  const closurePct = closure.length > 0 ? Math.round(((closure.length - closureOpen) / closure.length) * 100) : null;

  const countBy = (rows: Row[], key: string, map?: (v: string) => string) => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const v = String(r[key] ?? "");
      if (!v) continue;
      const k = map ? map(v) : v;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  };

  const typeMix = countBy(projects, "type", (v) => (v === "Implementation" ? "Implementation" : v));

  const costByProject = projects.map((p) => ({
    name: String(p.code ?? ""),
    approved: Number(p.totalApproved ?? 0),
    actual: Number(p.actualCost ?? 0),
    forecast: Number(p.forecastCost ?? 0),
  }));

  const costByCategory = [...costs.reduce((m, c) => {
    const cat = String(c.category ?? "Other");
    const g = m.get(cat) ?? { name: cat, approved: 0, actual: 0 };
    g.approved += Number(c.totalApproved ?? 0) || 0;
    g.actual += Number(c.actual ?? 0) || 0;
    m.set(cat, g);
    return m;
  }, new Map<string, { name: string; approved: number; actual: number }>()).values()];

  const resourceLoad = [...allocByPerson.entries()].map(([name, allocation]) => ({ name, allocation }));

  const utilisation = projects.map((p) => ({
    name: String(p.code ?? ""),
    util: Number(p.percent ?? 0),
  }));

  return {
    projects,
    kpi: {
      active: active.length,
      completed: projects.filter((p) => String(p.status) === "Completed").length,
      red: red.length,
      approved,
      actual,
      forecast,
      utilPct,
      openMilestones: plan.filter((m) => String(m.status) !== "Reached").length,
      overdueMilestones,
      openActions: openActions.length,
      overdueActions,
      openRisks: openRisks.length,
      highRisks: highRisks.length,
      openIssues: openIssues.length,
      pendingChanges,
      pendingDecisions,
      overloadedResources,
      qualityPassRate,
      closurePct,
      stakeholders: stakeholders.length,
    },
    charts: {
      ragMix: countBy(active, "rag"),
      statusMix: countBy(projects, "status"),
      healthMix: countBy(projects, "health"),
      typeMix,
      costByProject,
      costByCategory,
      milestoneMix: countBy(plan, "status"),
      actionMix: countBy(act, "status"),
      resourceLoad,
      utilisation,
    },
  };
}