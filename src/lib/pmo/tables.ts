import type { AnyPgTable } from "drizzle-orm/pg-core";
import {
  pmoActions,
  pmoChanges,
  pmoClosure,
  pmoComms,
  pmoCosts,
  pmoDecisions,
  pmoLessons,
  pmoMeetings,
  pmoMilestones,
  pmoProcurement,
  pmoProjects,
  pmoQuality,
  pmoRaci,
  pmoRaid,
  pmoResources,
  pmoStakeholders,
} from "@/db/schema";

/** Maps the register keys in defs.ts to their Drizzle tables. Server-only. */
export const PMO_TABLES: Record<string, AnyPgTable> = {
  portfolio: pmoProjects,
  milestones: pmoMilestones,
  raid: pmoRaid,
  actions: pmoActions,
  raci: pmoRaci,
  stakeholders: pmoStakeholders,
  changes: pmoChanges,
  costs: pmoCosts,
  resources: pmoResources,
  procurement: pmoProcurement,
  quality: pmoQuality,
  meetings: pmoMeetings,
  decisions: pmoDecisions,
  comms: pmoComms,
  closure: pmoClosure,
  lessons: pmoLessons,
};