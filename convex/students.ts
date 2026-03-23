import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUser, requireBoss, transliterate } from "./helpers";

const ALL_DOCUMENT_TYPES = [
  "passport", "internal_passport", "birth_certificate", "school_diploma",
  "school_transcript", "diploma_apostille", "transcript_apostille",
  "topik_certificate", "medical_certificate", "hiv_certificate",
  "no_criminal_record", "bank_statement", "sponsor_documents", "photos",
  "motivation_letter", "recommendation_letter", "portfolio",
  "health_insurance", "acceptance_letter", "visa_d2", "ars_registration",
  "contract_signed", "payment_receipt",
] as const;

// ─── list ──────────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    topikLevel: v.optional(v.string()),
    search: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    const page = args.page ?? 1;
    const limit = args.limit ?? 20;

    // Determine branch filter
    const branchFilter =
      user.role === "branch_agent" ? user.branchId : args.branchId;

    // Base query – use index when filtering by branch
    let students;
    if (branchFilter) {
      students = await ctx.db
        .query("students")
        .withIndex("by_branch", (q) => q.eq("branchId", branchFilter))
        .collect();
    } else {
      students = await ctx.db.query("students").collect();
    }

    // Apply status filter
    if (args.status) {
      students = students.filter((s) => s.status === args.status);
    }

    // Apply priority filter
    if (args.priority) {
      students = students.filter((s) => s.priority === args.priority);
    }

    // Apply topikLevel filter
    if (args.topikLevel) {
      students = students.filter((s) => s.topikLevel === args.topikLevel);
    }

    // Apply search filter (firstNameRu, lastNameRu, passportNumber)
    if (args.search) {
      const term = args.search.toLowerCase();
      students = students.filter(
        (s) =>
          s.firstNameRu.toLowerCase().includes(term) ||
          s.lastNameRu.toLowerCase().includes(term) ||
          (s.passportNumber && s.passportNumber.toLowerCase().includes(term))
      );
    }

    // Sort
    const sortBy = args.sortBy ?? "_creationTime";
    const sortOrder = args.sortOrder ?? "desc";
    students.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const total = students.length;

    // Paginate
    const start = (page - 1) * limit;
    const paged = students.slice(start, start + limit);

    // Enrich each student with doc counts and relations
    const enriched = await Promise.all(
      paged.map(async (student) => {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_student", (q) => q.eq("studentId", student._id))
          .collect();

        const totalDocuments = docs.length;
        const verifiedDocuments = docs.filter(
          (d) => d.status === "verified"
        ).length;
        const uploadedDocuments = docs.filter(
          (d) => d.status === "uploaded" || d.status === "verified"
        ).length;

        const agent = await ctx.db.get(student.agentId);
        const branch = await ctx.db.get(student.branchId);
        const university = student.assignedUniversityId
          ? await ctx.db.get(student.assignedUniversityId)
          : null;

        return {
          ...student,
          totalDocuments,
          verifiedDocuments,
          uploadedDocuments,
          agent: agent
            ? { _id: agent._id, nameRu: agent.nameRu, nameEn: agent.nameEn }
            : null,
          branch: branch
            ? { _id: branch._id, nameRu: branch.nameRu, city: branch.city }
            : null,
          university: university
            ? {
                _id: university._id,
                nameEn: university.nameEn,
                nameRu: university.nameRu,
              }
            : null,
        };
      })
    );

    return { students: enriched, total, page, limit };
  },
});

// ─── getById ───────────────────────────────────────────────────────────────────

export const getById = query({
  args: {
    sessionToken: v.string(),
    id: v.id("students"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    const student = await ctx.db.get(args.id);
    if (!student) {
      throw new ConvexError("Student not found");
    }

    // Enforce branch access for agents
    if (user.role === "branch_agent" && student.branchId !== user.branchId) {
      throw new ConvexError("Access denied: student belongs to another branch");
    }

    // Documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    // Tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    // Comments – hide internal ones from non-boss
    let comments = await ctx.db
      .query("comments")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();
    if (user.role !== "boss") {
      comments = comments.filter((c) => !c.isInternal);
    }

    // Relations
    const branch = await ctx.db.get(student.branchId);
    const agent = await ctx.db.get(student.agentId);
    const university = student.assignedUniversityId
      ? await ctx.db.get(student.assignedUniversityId)
      : null;

    return {
      ...student,
      documents,
      tasks,
      comments,
      branch,
      agent,
      university,
    };
  },
});

// ─── create ────────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    sessionToken: v.string(),
    firstNameRu: v.string(),
    lastNameRu: v.string(),
    firstNameEn: v.optional(v.string()),
    lastNameEn: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    passportNumber: v.optional(v.string()),
    passportIssueDate: v.optional(v.string()),
    passportExpiryDate: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    telegramUsername: v.optional(v.string()),
    parentName: v.optional(v.string()),
    parentPhone: v.optional(v.string()),
    region: v.optional(v.string()),
    district: v.optional(v.string()),
    fullAddress: v.optional(v.string()),
    currentEducationLevel: v.optional(
      v.union(
        v.literal("class_11"),
        v.literal("college"),
        v.literal("bachelor"),
        v.literal("master")
      )
    ),
    schoolName: v.optional(v.string()),
    graduationYear: v.optional(v.number()),
    gpaScore: v.optional(v.number()),
    topikLevel: v.union(
      v.literal("none"),
      v.literal("level_1"),
      v.literal("level_2"),
      v.literal("level_3"),
      v.literal("level_4"),
      v.literal("level_5"),
      v.literal("level_6")
    ),
    topikCertificateNumber: v.optional(v.string()),
    topikExpiryDate: v.optional(v.string()),
    koreanSchoolName: v.optional(v.string()),
    koreanStudyMonths: v.optional(v.number()),
    contractAmount: v.optional(v.number()),
    paidAmount: v.optional(v.number()),
    paymentStatus: v.optional(
      v.union(
        v.literal("not_paid"),
        v.literal("partial"),
        v.literal("full"),
        v.literal("refunded")
      )
    ),
    priority: v.optional(
      v.union(v.literal("normal"), v.literal("high"), v.literal("urgent"))
    ),
    preferredUniversities: v.optional(v.array(v.id("universities"))),
    intakeDeadline: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    // Boss overrides
    agentId: v.optional(v.id("users")),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    // Determine agent and branch
    const agentId = user.role === "boss" && args.agentId ? args.agentId : user._id;
    const branchId =
      user.role === "boss" && args.branchId
        ? args.branchId
        : user.branchId;

    if (!branchId) {
      throw new ConvexError("Branch must be specified");
    }

    // Auto-transliterate names if English not provided
    const firstNameEn = args.firstNameEn || transliterate(args.firstNameRu);
    const lastNameEn = args.lastNameEn || transliterate(args.lastNameRu);

    // Check passport duplicate
    if (args.passportNumber) {
      const existing = await ctx.db
        .query("students")
        .withIndex("by_passport", (q) =>
          q.eq("passportNumber", args.passportNumber!)
        )
        .first();
      if (existing) {
        throw new ConvexError(
          `Student with passport ${args.passportNumber} already exists`
        );
      }
    }

    // Insert student
    const studentId = await ctx.db.insert("students", {
      branchId,
      agentId,
      firstNameRu: args.firstNameRu,
      lastNameRu: args.lastNameRu,
      firstNameEn,
      lastNameEn,
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      passportNumber: args.passportNumber,
      passportIssueDate: args.passportIssueDate,
      passportExpiryDate: args.passportExpiryDate,
      phone: args.phone,
      email: args.email,
      telegramUsername: args.telegramUsername,
      parentName: args.parentName,
      parentPhone: args.parentPhone,
      region: args.region,
      district: args.district,
      fullAddress: args.fullAddress,
      currentEducationLevel: args.currentEducationLevel,
      schoolName: args.schoolName,
      graduationYear: args.graduationYear,
      gpaScore: args.gpaScore,
      topikLevel: args.topikLevel,
      topikCertificateNumber: args.topikCertificateNumber,
      topikExpiryDate: args.topikExpiryDate,
      koreanSchoolName: args.koreanSchoolName,
      koreanStudyMonths: args.koreanStudyMonths,
      contractAmount: args.contractAmount,
      paidAmount: args.paidAmount ?? 0,
      paymentStatus: args.paymentStatus ?? "not_paid",
      status: "new",
      priority: args.priority ?? "normal",
      preferredUniversities: args.preferredUniversities,
      intakeDeadline: args.intakeDeadline,
      photoUrl: args.photoUrl,
    });

    // Create all 23 document records with status "missing"
    for (const docType of ALL_DOCUMENT_TYPES) {
      await ctx.db.insert("documents", {
        studentId,
        type: docType,
        status: "missing",
      });
    }

    // Create auto-task: "Collect initial documents" due in 7 days
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    await ctx.db.insert("tasks", {
      studentId,
      agentId,
      createdById: user._id,
      title: "Collect initial documents",
      description: `Collect initial document set for ${args.firstNameRu} ${args.lastNameRu}`,
      dueDate: Date.now() + sevenDaysMs,
      status: "pending",
      priority: "medium",
      type: "document",
    });

    // Activity log
    await ctx.db.insert("activityLogs", {
      userId: user._id,
      studentId,
      action: "student_created",
      details: {
        firstNameRu: args.firstNameRu,
        lastNameRu: args.lastNameRu,
      },
    });

    return studentId;
  },
});

// ─── update ────────────────────────────────────────────────────────────────────

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("students"),
    firstNameRu: v.optional(v.string()),
    lastNameRu: v.optional(v.string()),
    firstNameEn: v.optional(v.string()),
    lastNameEn: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    passportNumber: v.optional(v.string()),
    passportIssueDate: v.optional(v.string()),
    passportExpiryDate: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    telegramUsername: v.optional(v.string()),
    parentName: v.optional(v.string()),
    parentPhone: v.optional(v.string()),
    region: v.optional(v.string()),
    district: v.optional(v.string()),
    fullAddress: v.optional(v.string()),
    currentEducationLevel: v.optional(
      v.union(
        v.literal("class_11"),
        v.literal("college"),
        v.literal("bachelor"),
        v.literal("master")
      )
    ),
    schoolName: v.optional(v.string()),
    graduationYear: v.optional(v.number()),
    gpaScore: v.optional(v.number()),
    topikLevel: v.optional(
      v.union(
        v.literal("none"),
        v.literal("level_1"),
        v.literal("level_2"),
        v.literal("level_3"),
        v.literal("level_4"),
        v.literal("level_5"),
        v.literal("level_6")
      )
    ),
    topikCertificateNumber: v.optional(v.string()),
    topikExpiryDate: v.optional(v.string()),
    koreanSchoolName: v.optional(v.string()),
    koreanStudyMonths: v.optional(v.number()),
    contractAmount: v.optional(v.number()),
    paidAmount: v.optional(v.number()),
    paymentStatus: v.optional(
      v.union(
        v.literal("not_paid"),
        v.literal("partial"),
        v.literal("full"),
        v.literal("refunded")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("docs_collecting"),
        v.literal("docs_ready"),
        v.literal("submitted_to_uni"),
        v.literal("accepted"),
        v.literal("visa_processing"),
        v.literal("visa_ready"),
        v.literal("departed"),
        v.literal("rejected"),
        v.literal("on_hold")
      )
    ),
    priority: v.optional(
      v.union(v.literal("normal"), v.literal("high"), v.literal("urgent"))
    ),
    preferredUniversities: v.optional(v.array(v.id("universities"))),
    assignedUniversityId: v.optional(v.id("universities")),
    assignedProgram: v.optional(v.string()),
    admissionYear: v.optional(v.number()),
    admissionSemester: v.optional(v.union(v.literal("spring"), v.literal("fall"))),
    intakeDeadline: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    const student = await ctx.db.get(args.id);
    if (!student) {
      throw new ConvexError("Student not found");
    }

    // Enforce branch access for agents
    if (user.role === "branch_agent" && student.branchId !== user.branchId) {
      throw new ConvexError("Access denied: student belongs to another branch");
    }

    // Only boss can assign university
    if (args.assignedUniversityId !== undefined && user.role !== "boss") {
      throw new ConvexError("Only boss can assign university");
    }

    // Build patch object (exclude sessionToken and id)
    const { sessionToken, id, ...fields } = args;
    const patch: Record<string, any> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    // Re-transliterate if Russian names changed but English names not provided
    if (args.firstNameRu && !args.firstNameEn) {
      patch.firstNameEn = transliterate(args.firstNameRu);
    }
    if (args.lastNameRu && !args.lastNameEn) {
      patch.lastNameEn = transliterate(args.lastNameRu);
    }

    // Handle status change side-effects
    const newStatus = args.status;
    const oldStatus = student.status;

    if (newStatus && newStatus !== oldStatus) {
      // Log status change
      await ctx.db.insert("activityLogs", {
        userId: user._id,
        studentId: student._id,
        action: "status_changed",
        details: { from: oldStatus, to: newStatus },
      });

      if (newStatus === "accepted") {
        patch.acceptedAt = Date.now();
        // Auto-task: Apply for D-2 visa
        await ctx.db.insert("tasks", {
          studentId: student._id,
          agentId: student.agentId,
          createdById: user._id,
          title: "Apply for D-2 visa",
          description: `Start D-2 visa application for ${student.firstNameRu} ${student.lastNameRu}`,
          dueDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
          status: "pending",
          priority: "high",
          type: "submission",
        });
      }

      if (newStatus === "submitted_to_uni") {
        patch.submittedAt = Date.now();
      }

      if (newStatus === "visa_ready") {
        // Task: Book flight
        await ctx.db.insert("tasks", {
          studentId: student._id,
          agentId: student.agentId,
          createdById: user._id,
          title: "Book flight to South Korea",
          description: `Assist ${student.firstNameRu} ${student.lastNameRu} with flight booking`,
          dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
          status: "pending",
          priority: "high",
          type: "other",
        });
        // Task: Arrange Seoul transfer
        await ctx.db.insert("tasks", {
          studentId: student._id,
          agentId: student.agentId,
          createdById: user._id,
          title: "Arrange Seoul airport transfer",
          description: `Organize airport pickup and housing for ${student.firstNameRu} ${student.lastNameRu}`,
          dueDate: Date.now() + 10 * 24 * 60 * 60 * 1000,
          status: "pending",
          priority: "medium",
          type: "other",
        });
      }

      if (newStatus === "departed") {
        // Increment season goal counter
        const now = new Date();
        const semester = now.getMonth() < 6 ? "spring" : "fall";
        const year = now.getFullYear();

        const goal = await ctx.db
          .query("seasonGoals")
          .withIndex("by_semester_year", (q) =>
            q.eq("semester", semester as "spring" | "fall").eq("year", year)
          )
          .first();

        if (goal) {
          await ctx.db.patch(goal._id, {
            currentCount: goal.currentCount + 1,
          });
        }

        // Create achievement
        await ctx.db.insert("achievements", {
          userId: student.agentId,
          studentId: student._id,
          type: "student_departed",
          title: "Student Departed",
          description: `${student.firstNameRu} ${student.lastNameRu} has successfully departed to South Korea`,
        });
      }
    }

    // Patch student
    await ctx.db.patch(args.id, patch);

    return args.id;
  },
});

// ─── remove ────────────────────────────────────────────────────────────────────

export const remove = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("students"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    requireBoss(user);

    const student = await ctx.db.get(args.id);
    if (!student) {
      throw new ConvexError("Student not found");
    }

    // Delete related documents
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    // Delete related tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    // Delete related comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Delete related activity logs
    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    // Delete student
    await ctx.db.delete(args.id);

    return { success: true };
  },
});

// ─── getStats ──────────────────────────────────────────────────────────────────

export const getStats = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    let students;
    if (user.role === "branch_agent" && user.branchId) {
      students = await ctx.db
        .query("students")
        .withIndex("by_branch", (q) => q.eq("branchId", user.branchId!))
        .collect();
    } else {
      students = await ctx.db.query("students").collect();
    }

    // Count by status
    const statusMap: Record<string, number> = {};
    const priorityMap: Record<string, number> = {};

    for (const s of students) {
      statusMap[s.status] = (statusMap[s.status] ?? 0) + 1;
      priorityMap[s.priority] = (priorityMap[s.priority] ?? 0) + 1;
    }

    const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
    const byPriority = Object.entries(priorityMap).map(([priority, count]) => ({ priority, count }));

    return { byStatus, byPriority, total: students.length };
  },
});

// ─── assignUniversity ──────────────────────────────────────────────────────────

export const assignUniversity = mutation({
  args: {
    sessionToken: v.string(),
    studentId: v.id("students"),
    universityId: v.id("universities"),
    program: v.optional(v.string()),
    admissionYear: v.optional(v.number()),
    admissionSemester: v.optional(v.union(v.literal("spring"), v.literal("fall"))),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    requireBoss(user);

    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new ConvexError("Student not found");
    }

    const university = await ctx.db.get(args.universityId);
    if (!university) {
      throw new ConvexError("University not found");
    }

    // Patch student with university assignment
    await ctx.db.patch(args.studentId, {
      assignedUniversityId: args.universityId,
      assignedProgram: args.program,
      admissionYear: args.admissionYear,
      admissionSemester: args.admissionSemester,
    });

    // Create notification for the student's agent
    await ctx.db.insert("notifications", {
      userId: student.agentId,
      type: "university_assigned",
      title: "University Assigned",
      message: `${student.firstNameRu} ${student.lastNameRu} has been assigned to ${university.nameEn}`,
      isRead: false,
      priority: "high",
      link: `/students/${args.studentId}`,
    });

    // Activity log
    await ctx.db.insert("activityLogs", {
      userId: user._id,
      studentId: args.studentId,
      action: "university_assigned",
      details: {
        universityId: args.universityId,
        universityName: university.nameEn,
        program: args.program,
      },
    });

    return args.studentId;
  },
});

// ─── exportList ────────────────────────────────────────────────────────────────

export const exportList = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    topikLevel: v.optional(v.string()),
    search: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);

    const branchFilter =
      user.role === "branch_agent" ? user.branchId : args.branchId;

    let students;
    if (branchFilter) {
      students = await ctx.db
        .query("students")
        .withIndex("by_branch", (q) => q.eq("branchId", branchFilter))
        .collect();
    } else {
      students = await ctx.db.query("students").collect();
    }

    // Apply filters
    if (args.status) {
      students = students.filter((s) => s.status === args.status);
    }
    if (args.priority) {
      students = students.filter((s) => s.priority === args.priority);
    }
    if (args.topikLevel) {
      students = students.filter((s) => s.topikLevel === args.topikLevel);
    }
    if (args.search) {
      const term = args.search.toLowerCase();
      students = students.filter(
        (s) =>
          s.firstNameRu.toLowerCase().includes(term) ||
          s.lastNameRu.toLowerCase().includes(term) ||
          (s.passportNumber && s.passportNumber.toLowerCase().includes(term))
      );
    }

    // Sort
    const sortBy = args.sortBy ?? "_creationTime";
    const sortOrder = args.sortOrder ?? "desc";
    students.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Enrich with relations (no pagination)
    const enriched = await Promise.all(
      students.map(async (student) => {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_student", (q) => q.eq("studentId", student._id))
          .collect();

        const totalDocuments = docs.length;
        const verifiedDocuments = docs.filter(
          (d) => d.status === "verified"
        ).length;
        const uploadedDocuments = docs.filter(
          (d) => d.status === "uploaded" || d.status === "verified"
        ).length;

        const agent = await ctx.db.get(student.agentId);
        const branch = await ctx.db.get(student.branchId);
        const university = student.assignedUniversityId
          ? await ctx.db.get(student.assignedUniversityId)
          : null;

        return {
          ...student,
          totalDocuments,
          verifiedDocuments,
          uploadedDocuments,
          agent: agent
            ? { _id: agent._id, nameRu: agent.nameRu, nameEn: agent.nameEn }
            : null,
          branch: branch
            ? { _id: branch._id, nameRu: branch.nameRu, city: branch.city }
            : null,
          university: university
            ? {
                _id: university._id,
                nameEn: university.nameEn,
                nameRu: university.nameRu,
              }
            : null,
        };
      })
    );

    return { students: enriched, total: enriched.length };
  },
});
