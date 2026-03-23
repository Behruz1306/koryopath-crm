import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUser, requireBoss } from "./helpers";
import { createNotification } from "./notifications";

export const list = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    type: v.optional(v.string()),
    studentId: v.optional(v.id("students")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    let tasksQuery = ctx.db.query("tasks");

    let tasks;
    if (user.role === "boss") {
      tasks = await tasksQuery.collect();
    } else {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_agent", (q) => q.eq("agentId", user._id))
        .collect();
    }

    // Apply filters
    if (args.status) {
      tasks = tasks.filter((t) => t.status === args.status);
    }
    if (args.priority) {
      tasks = tasks.filter((t) => t.priority === args.priority);
    }
    if (args.type) {
      tasks = tasks.filter((t) => t.type === args.type);
    }
    if (args.studentId) {
      tasks = tasks.filter(
        (t) => t.studentId !== undefined && t.studentId === args.studentId
      );
    }

    // Enrich with student info
    const enriched = await Promise.all(
      tasks.map(async (task) => {
        let student = null;
        if (task.studentId) {
          const s = await ctx.db.get(task.studentId);
          if (s) {
            student = {
              _id: s._id,
              firstNameRu: s.firstNameRu,
              lastNameRu: s.lastNameRu,
              firstNameEn: s.firstNameEn,
              lastNameEn: s.lastNameEn,
              status: s.status,
            };
          }
        }
        return { ...task, student };
      })
    );

    return enriched;
  },
});

export const getById = query({
  args: {
    sessionToken: v.string(),
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new ConvexError("Task not found");
    }

    if (user.role !== "boss" && task.agentId !== user._id) {
      throw new ConvexError("Access denied");
    }

    let student = null;
    if (task.studentId) {
      student = await ctx.db.get(task.studentId);
    }

    return { ...task, student };
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.number(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    type: v.union(
      v.literal("document"),
      v.literal("payment"),
      v.literal("submission"),
      v.literal("follow_up"),
      v.literal("interview"),
      v.literal("other")
    ),
    agentId: v.optional(v.id("users")),
    studentId: v.optional(v.id("students")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    let assignedAgentId = user._id;

    if (args.agentId) {
      if (user.role !== "boss") {
        throw new ConvexError("Only boss can assign tasks to other agents");
      }
      const agent = await ctx.db.get(args.agentId);
      if (!agent) {
        throw new ConvexError("Agent not found");
      }
      assignedAgentId = args.agentId;
    }

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      dueDate: args.dueDate,
      priority: args.priority,
      type: args.type,
      status: "pending",
      agentId: assignedAgentId,
      createdById: user._id,
      studentId: args.studentId,
    });

    // Notify the assigned agent (if assigned to someone else)
    if (assignedAgentId !== user._id) {
      await createNotification(ctx, {
        userId: assignedAgentId,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `You have been assigned a new task: ${args.title}`,
        priority: args.priority === "critical" ? "high" : "normal",
        link: `/tasks/${taskId}`,
      });
    }

    return taskId;
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("tasks"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("overdue")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      )
    ),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new ConvexError("Task not found");
    }

    if (user.role !== "boss" && task.agentId !== user._id) {
      throw new ConvexError("Access denied");
    }

    const updates: Record<string, unknown> = {};

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.completedAt !== undefined) updates.completedAt = args.completedAt;

    if (args.status !== undefined) {
      updates.status = args.status;

      if (args.status === "completed") {
        updates.completedAt = Date.now();
      }

      // If marking overdue, notify boss
      if (args.status === "overdue") {
        const bosses = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "boss"))
          .collect();

        for (const boss of bosses) {
          await createNotification(ctx, {
            userId: boss._id,
            type: "task_overdue",
            title: "Task Overdue",
            message: `Task "${task.title}" is now overdue`,
            priority: "high",
            link: `/tasks/${args.id}`,
          });
        }
      }
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const getOverdue = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    const now = Date.now();

    let tasks;
    if (user.role === "boss") {
      tasks = await ctx.db.query("tasks").collect();
    } else {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_agent", (q) => q.eq("agentId", user._id))
        .collect();
    }

    const overdue = tasks.filter(
      (t) => t.dueDate < now && t.status !== "completed"
    );

    return overdue;
  },
});
