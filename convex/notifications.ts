import { query, mutation, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUser } from "./helpers";

/**
 * Helper function to create a notification. Can be called from any mutation context.
 * Import and use as: await createNotification(ctx, { ... })
 */
export async function createNotification(
  ctx: MutationCtx,
  data: {
    userId: Id<"users">;
    type: string;
    title: string;
    message: string;
    priority?: "low" | "normal" | "high" | "critical";
    link?: string;
  }
) {
  return await ctx.db.insert("notifications", {
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    isRead: false,
    priority: data.priority ?? "normal",
    link: data.link,
  });
}

export const list = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    const limit = args.limit ?? 50;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Sort: unread first, then by creation time (desc)
    notifications.sort((a, b) => {
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      return b._creationTime - a._creationTime;
    });

    return notifications.slice(0, limit);
  },
});

export const getUnreadCount = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});

export const markAsRead = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    const notification = await ctx.db.get(args.id);

    if (!notification) {
      throw new ConvexError("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new ConvexError("Access denied");
    }

    await ctx.db.patch(args.id, { isRead: true });
    return args.id;
  },
});

export const markAllAsRead = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { isRead: true });
    }

    return unread.length;
  },
});
