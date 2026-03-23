import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUser, requireBoss } from "./helpers";

// ─── getByStudent ───────────────────────────────────────────────────────────────

export const getByStudent = query({
  args: {
    sessionToken: v.string(),
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new ConvexError("Student not found");
    }

    // Enforce branch access for agents
    if (user.role === "branch_agent" && student.branchId !== user.branchId) {
      throw new ConvexError("Access denied: student belongs to another branch");
    }

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    // Sort by type alphabetically
    documents.sort((a, b) => a.type.localeCompare(b.type));

    return documents;
  },
});

// ─── update ─────────────────────────────────────────────────────────────────────

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("documents"),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("missing"),
        v.literal("uploaded"),
        v.literal("verified"),
        v.literal("rejected"),
        v.literal("expired")
      )
    ),
    notes: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found");
    }

    const student = await ctx.db.get(document.studentId);
    if (!student) {
      throw new ConvexError("Student not found");
    }

    // Enforce branch access for agents
    if (user.role === "branch_agent" && student.branchId !== user.branchId) {
      throw new ConvexError("Access denied: student belongs to another branch");
    }

    // Build patch
    const { sessionToken, id, ...fields } = args;
    const patch: Record<string, string | number | undefined> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    // If setting fileUrl, also set uploadedAt and status
    if (args.fileUrl !== undefined) {
      patch.uploadedAt = Date.now();
      patch.status = "uploaded";
    }

    await ctx.db.patch(args.id, patch);

    return args.id;
  },
});

// ─── verify ─────────────────────────────────────────────────────────────────────

export const verify = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("documents"),
    status: v.union(v.literal("verified"), v.literal("rejected")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    requireBoss(user);

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found");
    }

    const student = await ctx.db.get(document.studentId);
    if (!student) {
      throw new ConvexError("Student not found");
    }

    // Update document
    await ctx.db.patch(args.id, {
      status: args.status,
      verifiedAt: Date.now(),
      verifiedById: user._id,
      notes: args.notes,
    });

    // Create notification for the student's agent
    const statusLabel = args.status === "verified" ? "verified" : "rejected";
    await ctx.db.insert("notifications", {
      userId: student.agentId,
      type: `document_${statusLabel}`,
      title: `Document ${statusLabel}`,
      message: `Document ${document.type} ${statusLabel} for student ${student.firstNameRu} ${student.lastNameRu}`,
      isRead: false,
      priority: args.status === "rejected" ? "high" : "normal",
      link: `/students/${student._id}`,
    });

    return args.id;
  },
});

// ─── getExpiring ────────────────────────────────────────────────────────────────

export const getExpiring = query({
  args: {
    sessionToken: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    const days = args.days ?? 30;

    const now = Date.now();
    const cutoffMs = now + days * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(cutoffMs).toISOString().split("T")[0];
    const todayDate = new Date(now).toISOString().split("T")[0];

    // Get all documents — filter for those with expiryDate set
    const allDocuments = await ctx.db.query("documents").collect();

    const expiring = allDocuments.filter(
      (d) => d.expiryDate && d.expiryDate >= todayDate && d.expiryDate <= cutoffDate
    );

    // Enrich with student info and respect branch access
    const results = [];
    for (const doc of expiring) {
      const student = await ctx.db.get(doc.studentId);
      if (!student) continue;

      // Enforce branch access for agents
      if (user.role === "branch_agent" && student.branchId !== user.branchId) {
        continue;
      }

      results.push({
        ...doc,
        student: {
          _id: student._id,
          firstNameRu: student.firstNameRu,
          lastNameRu: student.lastNameRu,
          firstNameEn: student.firstNameEn,
          lastNameEn: student.lastNameEn,
          branchId: student.branchId,
        },
      });
    }

    // Sort by expiry date ascending (soonest first)
    results.sort((a, b) => (a.expiryDate! < b.expiryDate! ? -1 : 1));

    return results;
  },
});

// ─── generateUploadUrl ──────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx, args.sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

// ─── saveFile ───────────────────────────────────────────────────────────────────

export const saveFile = mutation({
  args: {
    sessionToken: v.string(),
    documentId: v.id("documents"),
    storageId: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new ConvexError("Document not found");
    }

    const student = await ctx.db.get(document.studentId);
    if (!student) {
      throw new ConvexError("Student not found");
    }

    // Enforce branch access for agents
    if (user.role === "branch_agent" && student.branchId !== user.branchId) {
      throw new ConvexError("Access denied: student belongs to another branch");
    }

    const url = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(args.documentId, {
      fileUrl: url ?? undefined,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileId: args.storageId,
      status: "uploaded",
      uploadedAt: Date.now(),
    });

    return args.documentId;
  },
});
