import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUser, requireBoss } from "./helpers";
import { createNotification } from "./notifications";

export const list = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    let penalties;
    if (user.role === "boss") {
      penalties = await ctx.db.query("penalties").order("desc").collect();
    } else {
      penalties = await ctx.db
        .query("penalties")
        .withIndex("by_agent", (q) => q.eq("agentId", user._id))
        .order("desc")
        .collect();
    }

    // Enrich with agent info
    const enriched = await Promise.all(
      penalties.map(async (penalty) => {
        const agent = await ctx.db.get(penalty.agentId);
        const branch = agent?.branchId
          ? await ctx.db.get(agent.branchId)
          : null;
        return {
          ...penalty,
          agent: agent
            ? {
                _id: agent._id,
                nameRu: agent.nameRu,
                nameEn: agent.nameEn,
                branchName: branch?.nameRu ?? null,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    agentId: v.id("users"),
    type: v.union(
      v.literal("warning_1"),
      v.literal("warning_2"),
      v.literal("fine"),
      v.literal("bonus")
    ),
    reason: v.string(),
    amountUsd: v.optional(v.number()),
    relatedStudentId: v.optional(v.id("students")),
    relatedTaskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    requireBoss(user);

    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new ConvexError("Agent not found");
    }

    const penaltyId = await ctx.db.insert("penalties", {
      agentId: args.agentId,
      issuedById: user._id,
      type: args.type,
      reason: args.reason,
      amountUsd: args.amountUsd,
      relatedStudentId: args.relatedStudentId,
      relatedTaskId: args.relatedTaskId,
      issuedAt: Date.now(),
    });

    const typeLabel =
      args.type === "bonus"
        ? "Bonus"
        : args.type === "fine"
          ? "Fine"
          : "Warning";

    await createNotification(ctx, {
      userId: args.agentId,
      type: args.type === "bonus" ? "bonus_received" : "penalty_issued",
      title: `${typeLabel} Issued`,
      message: `You have received a ${typeLabel.toLowerCase()}: ${args.reason}`,
      priority: args.type === "bonus" ? "normal" : "high",
      link: `/penalties/${penaltyId}`,
    });

    return penaltyId;
  },
});

export const acknowledge = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("penalties"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    const penalty = await ctx.db.get(args.id);

    if (!penalty) {
      throw new ConvexError("Penalty not found");
    }

    if (penalty.agentId !== user._id) {
      throw new ConvexError("Access denied: you can only acknowledge your own penalties");
    }

    if (penalty.acknowledgedAt) {
      throw new ConvexError("Penalty already acknowledged");
    }

    await ctx.db.patch(args.id, { acknowledgedAt: Date.now() });
    return args.id;
  },
});

export const getSummary = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    requireBoss(user);

    const allPenalties = await ctx.db.query("penalties").collect();

    // Group by agent
    const agentMap = new Map<
      string,
      { warningCount: number; fineTotal: number; bonusTotal: number }
    >();

    for (const p of allPenalties) {
      const agentIdStr = p.agentId as string;
      if (!agentMap.has(agentIdStr)) {
        agentMap.set(agentIdStr, {
          warningCount: 0,
          fineTotal: 0,
          bonusTotal: 0,
        });
      }
      const summary = agentMap.get(agentIdStr)!;

      if (p.type === "warning_1" || p.type === "warning_2") {
        summary.warningCount += 1;
      } else if (p.type === "fine") {
        summary.fineTotal += p.amountUsd ?? 0;
      } else if (p.type === "bonus") {
        summary.bonusTotal += p.amountUsd ?? 0;
      }
    }

    // Enrich with agent info
    const results = await Promise.all(
      Array.from(agentMap.entries()).map(async ([agentIdStr, summary]) => {
        const agent = await ctx.db.get(agentIdStr as any);
        const branch =
          agent?.branchId ? await ctx.db.get(agent.branchId) : null;
        return {
          agentId: agentIdStr,
          agentName: agent?.nameRu ?? "Unknown",
          branchName: branch?.nameRu ?? "Unknown",
          warningCount: summary.warningCount,
          fineTotal: summary.fineTotal,
          bonusTotal: summary.bonusTotal,
        };
      })
    );

    return results;
  },
});
