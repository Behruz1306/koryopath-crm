import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUser, requireBoss } from "./helpers";

/**
 * List all branches.
 */
export const list = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx, args.sessionToken);

    const branches = await ctx.db.query("branches").collect();

    // Attach agent info to each branch
    const branchesWithAgent = await Promise.all(
      branches.map(async (branch) => {
        let agent = null;
        if (branch.agentId) {
          const agentDoc = await ctx.db.get(branch.agentId);
          if (agentDoc) {
            agent = {
              _id: agentDoc._id,
              nameRu: agentDoc.nameRu,
              nameEn: agentDoc.nameEn,
              email: agentDoc.email,
            };
          }
        }
        return { ...branch, agent };
      })
    );

    return branchesWithAgent;
  },
});

/**
 * Get a single branch by ID.
 */
export const getById = query({
  args: {
    sessionToken: v.string(),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx, args.sessionToken);

    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new ConvexError("Branch not found");
    }

    let agent = null;
    if (branch.agentId) {
      const agentDoc = await ctx.db.get(branch.agentId);
      if (agentDoc) {
        agent = {
          _id: agentDoc._id,
          nameRu: agentDoc.nameRu,
          nameEn: agentDoc.nameEn,
          email: agentDoc.email,
        };
      }
    }

    return { ...branch, agent };
  },
});

/**
 * Create a new branch (boss only).
 */
export const create = mutation({
  args: {
    sessionToken: v.string(),
    nameRu: v.string(),
    nameEn: v.optional(v.string()),
    city: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    agentId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthUser(ctx, args.sessionToken);
    requireBoss(currentUser);

    // Validate agent exists if provided
    if (args.agentId) {
      const agent = await ctx.db.get(args.agentId);
      if (!agent) {
        throw new ConvexError("Assigned agent not found");
      }
      if (!agent.isActive) {
        throw new ConvexError("Assigned agent is deactivated");
      }
    }

    const branchId = await ctx.db.insert("branches", {
      nameRu: args.nameRu,
      nameEn: args.nameEn,
      city: args.city,
      address: args.address,
      phone: args.phone,
      email: args.email,
      agentId: args.agentId,
    });

    return { branchId };
  },
});

/**
 * Update a branch (boss only).
 */
export const update = mutation({
  args: {
    sessionToken: v.string(),
    branchId: v.id("branches"),
    nameRu: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    agentId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthUser(ctx, args.sessionToken);
    requireBoss(currentUser);

    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new ConvexError("Branch not found");
    }

    // Validate agent if being changed
    if (args.agentId) {
      const agent = await ctx.db.get(args.agentId);
      if (!agent) {
        throw new ConvexError("Assigned agent not found");
      }
      if (!agent.isActive) {
        throw new ConvexError("Assigned agent is deactivated");
      }
    }

    const updates: Record<string, unknown> = {};
    if (args.nameRu !== undefined) updates.nameRu = args.nameRu;
    if (args.nameEn !== undefined) updates.nameEn = args.nameEn;
    if (args.city !== undefined) updates.city = args.city;
    if (args.address !== undefined) updates.address = args.address;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.email !== undefined) updates.email = args.email;
    if (args.agentId !== undefined) updates.agentId = args.agentId;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.branchId, updates);
    }

    return { success: true };
  },
});
