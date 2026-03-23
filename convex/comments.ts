import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUser } from "./helpers";

export const getByStudent = query({
  args: {
    sessionToken: v.string(),
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    let comments = await ctx.db
      .query("comments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .order("desc")
      .collect();

    // Agent can only see non-internal comments
    if (user.role !== "boss") {
      comments = comments.filter((c) => !c.isInternal);
    }

    // Enrich with author info
    const enriched = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);
        return {
          ...comment,
          author: author
            ? {
                _id: author._id,
                nameRu: author.nameRu,
                nameEn: author.nameEn,
                role: author.role,
                avatarUrl: author.avatarUrl,
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
    studentId: v.id("students"),
    text: v.string(),
    isInternal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new ConvexError("Student not found");
    }

    // Only boss can create internal comments
    const isInternal = args.isInternal ?? false;
    if (isInternal && user.role !== "boss") {
      throw new ConvexError("Only boss can create internal comments");
    }

    // Agents can only comment on their own students
    if (user.role !== "boss" && student.agentId !== user._id) {
      throw new ConvexError("Access denied: not your student");
    }

    const commentId = await ctx.db.insert("comments", {
      studentId: args.studentId,
      authorId: user._id,
      text: args.text,
      isInternal,
    });

    return commentId;
  },
});
