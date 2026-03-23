import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import bcrypt from "bcryptjs";
import { getAuthUser, requireBoss } from "./helpers";

/**
 * List users.
 * Boss sees all users with branch info.
 * Agent sees only themselves.
 */
export const list = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthUser(ctx, args.sessionToken);

    if (currentUser.role === "boss") {
      const allUsers = await ctx.db.query("users").collect();

      const usersWithBranch = await Promise.all(
        allUsers.map(async (user) => {
          let branch = null;
          if (user.branchId) {
            branch = await ctx.db.get(user.branchId);
          }
          return {
            _id: user._id,
            _creationTime: user._creationTime,
            email: user.email,
            nameRu: user.nameRu,
            nameKo: user.nameKo,
            nameEn: user.nameEn,
            role: user.role,
            branchId: user.branchId,
            avatarUrl: user.avatarUrl,
            languagePreference: user.languagePreference,
            telegramChatId: user.telegramChatId,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            branch,
          };
        })
      );

      return usersWithBranch;
    }

    // Agent: return only self
    let branch = null;
    if (currentUser.branchId) {
      branch = await ctx.db.get(currentUser.branchId);
    }

    return [
      {
        _id: currentUser._id,
        _creationTime: currentUser._creationTime,
        email: currentUser.email,
        nameRu: currentUser.nameRu,
        nameKo: currentUser.nameKo,
        nameEn: currentUser.nameEn,
        role: currentUser.role,
        branchId: currentUser.branchId,
        avatarUrl: currentUser.avatarUrl,
        languagePreference: currentUser.languagePreference,
        telegramChatId: currentUser.telegramChatId,
        isActive: currentUser.isActive,
        lastLogin: currentUser.lastLogin,
        branch,
      },
    ];
  },
});

/**
 * Get a single user by ID.
 */
export const getById = query({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthUser(ctx, args.sessionToken);

    // Agents can only view themselves
    if (currentUser.role !== "boss" && currentUser._id !== args.userId) {
      throw new ConvexError("Access denied");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    let branch = null;
    if (user.branchId) {
      branch = await ctx.db.get(user.branchId);
    }

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      email: user.email,
      nameRu: user.nameRu,
      nameKo: user.nameKo,
      nameEn: user.nameEn,
      role: user.role,
      branchId: user.branchId,
      avatarUrl: user.avatarUrl,
      languagePreference: user.languagePreference,
      telegramChatId: user.telegramChatId,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      branch,
    };
  },
});

/**
 * Create a new user (boss only).
 * Password is hashed before storage.
 */
export const create = mutation({
  args: {
    sessionToken: v.string(),
    email: v.string(),
    password: v.string(),
    nameRu: v.string(),
    nameKo: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    role: v.union(v.literal("boss"), v.literal("branch_agent")),
    branchId: v.optional(v.id("branches")),
    languagePreference: v.union(
      v.literal("ru"),
      v.literal("ko"),
      v.literal("en")
    ),
    telegramChatId: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthUser(ctx, args.sessionToken);
    requireBoss(currentUser);

    // Check for duplicate email
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new ConvexError("A user with this email already exists");
    }

    if (args.password.length < 6) {
      throw new ConvexError("Password must be at least 6 characters");
    }

    const passwordHash = bcrypt.hashSync(args.password, 10);

    const userId = await ctx.db.insert("users", {
      email: args.email,
      passwordHash,
      nameRu: args.nameRu,
      nameKo: args.nameKo,
      nameEn: args.nameEn,
      role: args.role,
      branchId: args.branchId,
      languagePreference: args.languagePreference,
      telegramChatId: args.telegramChatId,
      avatarUrl: args.avatarUrl,
      isActive: true,
    });

    return { userId };
  },
});

/**
 * Deactivate a user (boss only).
 * Sets isActive to false and clears session token.
 */
export const deactivate = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthUser(ctx, args.sessionToken);
    requireBoss(currentUser);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    if (user._id === currentUser._id) {
      throw new ConvexError("Cannot deactivate yourself");
    }

    await ctx.db.patch(args.userId, {
      isActive: false,
      refreshToken: undefined,
    });

    return { success: true };
  },
});
