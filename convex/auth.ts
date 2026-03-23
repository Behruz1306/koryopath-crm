import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import bcrypt from "bcryptjs";
import { getAuthUser, generateSessionToken } from "./helpers";

/**
 * Login with email + password.
 * Verifies credentials, generates a session token, stores it in refreshToken field.
 */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new ConvexError("Invalid email or password");
    }

    if (!user.isActive) {
      throw new ConvexError("Account is deactivated");
    }

    const passwordValid = bcrypt.compareSync(args.password, user.passwordHash);
    if (!passwordValid) {
      throw new ConvexError("Invalid email or password");
    }

    const sessionToken = generateSessionToken();

    await ctx.db.patch(user._id, {
      refreshToken: sessionToken,
      lastLogin: Date.now(),
    });

    return {
      sessionToken,
      user: {
        _id: user._id,
        email: user.email,
        nameRu: user.nameRu,
        nameKo: user.nameKo,
        nameEn: user.nameEn,
        role: user.role,
        branchId: user.branchId,
        avatarUrl: user.avatarUrl,
        languagePreference: user.languagePreference,
        telegramChatId: user.telegramChatId,
      },
    };
  },
});

/**
 * Get current user by session token.
 * Returns user data with branch info if available.
 */
export const getMe = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    let branch = null;
    if (user.branchId) {
      branch = await ctx.db.get(user.branchId);
    }

    return {
      _id: user._id,
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
 * Logout: clear session token from user record.
 */
export const logout = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    await ctx.db.patch(user._id, {
      refreshToken: undefined,
    });

    return { success: true };
  },
});

/**
 * Update profile fields for the current user.
 */
export const updateProfile = mutation({
  args: {
    sessionToken: v.string(),
    nameRu: v.optional(v.string()),
    nameKo: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    languagePreference: v.optional(
      v.union(v.literal("ru"), v.literal("ko"), v.literal("en"))
    ),
    telegramChatId: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    const updates: Record<string, unknown> = {};
    if (args.nameRu !== undefined) updates.nameRu = args.nameRu;
    if (args.nameKo !== undefined) updates.nameKo = args.nameKo;
    if (args.nameEn !== undefined) updates.nameEn = args.nameEn;
    if (args.languagePreference !== undefined)
      updates.languagePreference = args.languagePreference;
    if (args.telegramChatId !== undefined)
      updates.telegramChatId = args.telegramChatId;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }

    return { success: true };
  },
});

/**
 * Change password: verify old password, hash and store new one.
 */
export const changePassword = mutation({
  args: {
    sessionToken: v.string(),
    oldPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    const oldValid = bcrypt.compareSync(args.oldPassword, user.passwordHash);
    if (!oldValid) {
      throw new ConvexError("Current password is incorrect");
    }

    if (args.newPassword.length < 6) {
      throw new ConvexError("New password must be at least 6 characters");
    }

    const newHash = bcrypt.hashSync(args.newPassword, 10);

    await ctx.db.patch(user._id, {
      passwordHash: newHash,
    });

    return { success: true };
  },
});
