import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, requireBoss } from "./helpers";

export const daily = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    requireBoss(user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    // New students today by branch
    const allStudents = await ctx.db.query("students").collect();
    const newStudentsToday = allStudents.filter(
      (s) => s._creationTime >= todayStart
    );

    const branches = await ctx.db.query("branches").collect();
    const branchMap = new Map(branches.map((b) => [b._id as string, b]));

    const newByBranch = branches.map((branch) => ({
      branchId: branch._id,
      branchName: branch.nameRu,
      count: newStudentsToday.filter(
        (s) => (s.branchId as string) === (branch._id as string)
      ).length,
    }));

    // Overdue tasks with agent info
    const now = Date.now();
    const allTasks = await ctx.db.query("tasks").collect();
    const overdueTasks = allTasks.filter(
      (t) => t.dueDate < now && t.status !== "completed"
    );

    const overdueWithAgent = await Promise.all(
      overdueTasks.map(async (task) => {
        const agent = await ctx.db.get(task.agentId);
        return {
          ...task,
          agentName: agent?.nameRu ?? "Unknown",
          agentBranchId: agent?.branchId,
        };
      })
    );

    // Documents uploaded today
    const allDocs = await ctx.db.query("documents").collect();
    const docsUploadedToday = allDocs.filter(
      (d) => d.uploadedAt && d.uploadedAt >= todayStart
    ).length;

    // Agent activity
    const agents = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "branch_agent"))
      .collect();

    const activityLogs = await ctx.db.query("activityLogs").collect();
    const todayLogs = activityLogs.filter(
      (l) => l._creationTime >= todayStart
    );

    const agentActivity = agents.map((agent) => ({
      agentId: agent._id,
      agentName: agent.nameRu,
      branchId: agent.branchId,
      lastLogin: agent.lastLogin ?? null,
      actionCountToday: todayLogs.filter(
        (l) => (l.userId as string) === (agent._id as string)
      ).length,
    }));

    return {
      newStudentsByBranch: newByBranch,
      overdueTasks: overdueWithAgent,
      documentsUploadedToday: docsUploadedToday,
      agentActivity,
    };
  },
});

export const weekly = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    requireBoss(user);

    // Conversion funnel: count per status
    const allStudents = await ctx.db.query("students").collect();
    const statusCounts: Record<string, number> = {};
    for (const s of allStudents) {
      statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
    }

    const conversionFunnel = Object.entries(statusCounts).map(
      ([status, count]) => ({ status, count })
    );

    // Agent KPIs
    const agents = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "branch_agent"))
      .collect();

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const allTasks = await ctx.db.query("tasks").collect();

    const agentKpis = agents.map((agent) => {
      const agentStudents = allStudents.filter(
        (s) => (s.agentId as string) === (agent._id as string)
      );
      const agentTasks = allTasks.filter(
        (t) => (t.agentId as string) === (agent._id as string)
      );
      const completedThisWeek = agentTasks.filter(
        (t) => t.status === "completed" && t.completedAt && t.completedAt >= weekAgo
      );

      // Average processing speed: avg time from creation to completion (this week)
      let avgProcessingMs = 0;
      if (completedThisWeek.length > 0) {
        const totalMs = completedThisWeek.reduce((sum, t) => {
          return sum + ((t.completedAt ?? 0) - t._creationTime);
        }, 0);
        avgProcessingMs = totalMs / completedThisWeek.length;
      }

      return {
        agentId: agent._id,
        agentName: agent.nameRu,
        branchId: agent.branchId,
        studentsCount: agentStudents.length,
        completedTasksThisWeek: completedThisWeek.length,
        avgProcessingHours: Math.round(avgProcessingMs / (1000 * 60 * 60)),
      };
    });

    // Expiring docs this week
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const todayStr = new Date().toISOString().split("T")[0];
    const weekStr = weekFromNow.toISOString().split("T")[0];

    const allDocs = await ctx.db.query("documents").collect();
    const expiringDocs = allDocs.filter(
      (d) =>
        d.expiryDate &&
        d.expiryDate >= todayStr &&
        d.expiryDate <= weekStr
    );

    return {
      conversionFunnel,
      agentKpis,
      expiringDocsThisWeek: expiringDocs,
    };
  },
});

export const monthly = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    requireBoss(user);

    const allStudents = await ctx.db.query("students").collect();
    const allUniversities = await ctx.db.query("universities").collect();
    const uniMap = new Map(allUniversities.map((u) => [u._id as string, u]));

    // Students by university
    const byUniversity: Record<string, { name: string; count: number }> = {};
    for (const s of allStudents) {
      if (s.assignedUniversityId) {
        const uniIdStr = s.assignedUniversityId as string;
        const uni = uniMap.get(uniIdStr);
        if (!byUniversity[uniIdStr]) {
          byUniversity[uniIdStr] = {
            name: uni?.nameEn ?? "Unknown",
            count: 0,
          };
        }
        byUniversity[uniIdStr].count += 1;
      }
    }

    const studentsByUniversity = Object.entries(byUniversity)
      .map(([id, data]) => ({ universityId: id, ...data }))
      .sort((a, b) => b.count - a.count);

    // Revenue: contract vs paid totals
    let contractTotal = 0;
    let paidTotal = 0;
    for (const s of allStudents) {
      contractTotal += s.contractAmount ?? 0;
      paidTotal += s.paidAmount;
    }

    // Branch comparison
    const branches = await ctx.db.query("branches").collect();
    const branchComparison = branches.map((branch) => {
      const branchStudents = allStudents.filter(
        (s) => (s.branchId as string) === (branch._id as string)
      );
      const departed = branchStudents.filter(
        (s) => s.status === "departed"
      ).length;
      const branchRevenue = branchStudents.reduce(
        (sum, s) => sum + s.paidAmount,
        0
      );
      return {
        branchId: branch._id,
        branchName: branch.nameRu,
        totalStudents: branchStudents.length,
        departedStudents: departed,
        revenue: branchRevenue,
      };
    });

    // Top universities (by student count)
    const topUniversities = studentsByUniversity.slice(0, 10);

    // Average TOPIK level
    const topikMap: Record<string, number> = {
      none: 0,
      level_1: 1,
      level_2: 2,
      level_3: 3,
      level_4: 4,
      level_5: 5,
      level_6: 6,
    };
    const topikSum = allStudents.reduce(
      (sum, s) => sum + (topikMap[s.topikLevel] ?? 0),
      0
    );
    const avgTopikLevel =
      allStudents.length > 0
        ? Math.round((topikSum / allStudents.length) * 10) / 10
        : 0;

    // Spring vs fall counts
    const springCount = allStudents.filter(
      (s) => s.admissionSemester === "spring"
    ).length;
    const fallCount = allStudents.filter(
      (s) => s.admissionSemester === "fall"
    ).length;

    return {
      studentsByUniversity,
      revenue: { contractTotal, paidTotal },
      branchComparison,
      topUniversities,
      avgTopikLevel,
      semesterDistribution: { spring: springCount, fall: fallCount },
    };
  },
});
