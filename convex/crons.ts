import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every day: check and mark overdue tasks
crons.interval(
  "check overdue tasks",
  { hours: 24 },
  internal.cronFunctions.checkOverdueTasks
);

// Every day: check expiring documents and send notifications
crons.interval(
  "check expiring documents",
  { hours: 24 },
  internal.cronFunctions.checkExpiringDocuments
);

// Every day: escalate penalties for overdue tasks
crons.interval(
  "escalate penalties",
  { hours: 24 },
  internal.cronFunctions.escalatePenalties
);

export default crons;
