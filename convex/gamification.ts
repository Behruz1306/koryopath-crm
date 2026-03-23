import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUser, requireBoss } from "./helpers";

function getCurrentSemester(): { semester: "spring" | "fall"; year: number } {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  // Jan(0)-Jun(5) = spring, Jul(6)-Dec(11) = fall
  const semester = month <= 5 ? "spring" : "fall";
  return { semester, year };
}

export const getSeasonGoal = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx, args.sessionToken);

    const { semester, year } = getCurrentSemester();

    const goals = await ctx.db
      .query("seasonGoals")
      .withIndex("by_semester_year", (q) =>
        q.eq("semester", semester).eq("year", year)
      )
      .collect();

    const goal = goals[0] ?? null;

    // Calculate current departed count for this semester
    const allStudents = await ctx.db.query("students").collect();
    const departedThisSeason = allStudents.filter(
      (s) =>
        s.status === "departed" &&
        s.admissionSemester === semester &&
        s.admissionYear === year
    ).length;

    return {
      semester,
      year,
      targetCount: goal?.targetCount ?? 0,
      currentCount: departedThisSeason,
      goalId: goal?._id ?? null,
    };
  },
});

export const updateSeasonGoal = mutation({
  args: {
    sessionToken: v.string(),
    targetCount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    requireBoss(user);

    const { semester, year } = getCurrentSemester();

    const goals = await ctx.db
      .query("seasonGoals")
      .withIndex("by_semester_year", (q) =>
        q.eq("semester", semester).eq("year", year)
      )
      .collect();

    const existing = goals[0];

    if (existing) {
      await ctx.db.patch(existing._id, { targetCount: args.targetCount });
      return existing._id;
    } else {
      return await ctx.db.insert("seasonGoals", {
        semester,
        year,
        targetCount: args.targetCount,
        currentCount: 0,
      });
    }
  },
});

export const getLeaderboard = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    const agents = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "branch_agent"))
      .collect();

    const allStudents = await ctx.db.query("students").collect();

    const leaderboard = agents
      .map((agent) => {
        const departedCount = allStudents.filter(
          (s) =>
            (s.agentId as string) === (agent._id as string) &&
            s.status === "departed"
        ).length;
        return {
          agentId: agent._id,
          agentName: agent.nameRu,
          branchId: agent.branchId,
          departedCount,
        };
      })
      .sort((a, b) => b.departedCount - a.departedCount);

    // Add rank
    const ranked = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // If agent, anonymize other agents
    if (user.role !== "boss") {
      return ranked.map((entry) => {
        if ((entry.agentId as string) === (user._id as string)) {
          return entry;
        }
        return {
          agentId: null,
          agentName: `Agent #${entry.rank}`,
          branchId: null,
          departedCount: entry.departedCount,
          rank: entry.rank,
        };
      });
    }

    return ranked;
  },
});

export const getAchievements = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    let achievements;
    if (user.role === "boss") {
      achievements = await ctx.db.query("achievements").order("desc").collect();
    } else {
      achievements = await ctx.db
        .query("achievements")
        .order("desc")
        .collect();
      achievements = achievements.filter(
        (a) => a.userId !== undefined && (a.userId as string) === (user._id as string)
      );
    }

    return achievements;
  },
});

export const getWallOfFame = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx, args.sessionToken);

    const allStudents = await ctx.db
      .query("students")
      .withIndex("by_status", (q) => q.eq("status", "departed"))
      .collect();

    const enriched = await Promise.all(
      allStudents.map(async (student) => {
        let university = null;
        if (student.assignedUniversityId) {
          const uni = await ctx.db.get(student.assignedUniversityId);
          if (uni) {
            university = {
              _id: uni._id,
              nameKo: uni.nameKo,
              nameEn: uni.nameEn,
              nameRu: uni.nameRu,
              city: uni.city,
              tier: uni.tier,
            };
          }
        }
        return {
          _id: student._id,
          firstNameRu: student.firstNameRu,
          lastNameRu: student.lastNameRu,
          firstNameEn: student.firstNameEn,
          lastNameEn: student.lastNameEn,
          admissionYear: student.admissionYear,
          admissionSemester: student.admissionSemester,
          assignedProgram: student.assignedProgram,
          photoUrl: student.photoUrl,
          university,
        };
      })
    );

    return enriched;
  },
});
