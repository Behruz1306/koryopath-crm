import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const userRoleValidator = v.union(v.literal("boss"), v.literal("branch_agent"));
export const languageValidator = v.union(v.literal("ru"), v.literal("ko"), v.literal("en"));

export const studentStatusValidator = v.union(
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
);

export const priorityValidator = v.union(
  v.literal("normal"),
  v.literal("high"),
  v.literal("urgent")
);

export const educationLevelValidator = v.union(
  v.literal("class_11"),
  v.literal("college"),
  v.literal("bachelor"),
  v.literal("master")
);

export const topikLevelValidator = v.union(
  v.literal("none"),
  v.literal("level_1"),
  v.literal("level_2"),
  v.literal("level_3"),
  v.literal("level_4"),
  v.literal("level_5"),
  v.literal("level_6")
);

export const semesterValidator = v.union(v.literal("spring"), v.literal("fall"));
export const genderValidator = v.union(v.literal("male"), v.literal("female"));

export const paymentStatusValidator = v.union(
  v.literal("not_paid"),
  v.literal("partial"),
  v.literal("full"),
  v.literal("refunded")
);

export const documentTypeValidator = v.union(
  v.literal("passport"),
  v.literal("internal_passport"),
  v.literal("birth_certificate"),
  v.literal("school_diploma"),
  v.literal("school_transcript"),
  v.literal("diploma_apostille"),
  v.literal("transcript_apostille"),
  v.literal("topik_certificate"),
  v.literal("medical_certificate"),
  v.literal("hiv_certificate"),
  v.literal("no_criminal_record"),
  v.literal("bank_statement"),
  v.literal("sponsor_documents"),
  v.literal("photos"),
  v.literal("motivation_letter"),
  v.literal("recommendation_letter"),
  v.literal("portfolio"),
  v.literal("health_insurance"),
  v.literal("acceptance_letter"),
  v.literal("visa_d2"),
  v.literal("ars_registration"),
  v.literal("contract_signed"),
  v.literal("payment_receipt")
);

export const documentStatusValidator = v.union(
  v.literal("missing"),
  v.literal("uploaded"),
  v.literal("verified"),
  v.literal("rejected"),
  v.literal("expired")
);

export const taskStatusValidator = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("overdue")
);

export const taskPriorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical")
);

export const taskTypeValidator = v.union(
  v.literal("document"),
  v.literal("payment"),
  v.literal("submission"),
  v.literal("follow_up"),
  v.literal("interview"),
  v.literal("other")
);

export const penaltyTypeValidator = v.union(
  v.literal("warning_1"),
  v.literal("warning_2"),
  v.literal("fine"),
  v.literal("bonus")
);

export const universityTierValidator = v.union(
  v.literal("SKY"),
  v.literal("national"),
  v.literal("private_top"),
  v.literal("private_mid"),
  v.literal("community")
);

export const notificationPriorityValidator = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("critical")
);

export default defineSchema({
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    nameRu: v.string(),
    nameKo: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    role: userRoleValidator,
    branchId: v.optional(v.id("branches")),
    avatarUrl: v.optional(v.string()),
    languagePreference: languageValidator,
    telegramChatId: v.optional(v.string()),
    isActive: v.boolean(),
    lastLogin: v.optional(v.number()),
    refreshToken: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_branch", ["branchId"]),

  branches: defineTable({
    nameRu: v.string(),
    nameEn: v.optional(v.string()),
    city: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    agentId: v.optional(v.id("users")),
  }),

  students: defineTable({
    branchId: v.id("branches"),
    agentId: v.id("users"),
    // Personal data
    firstNameRu: v.string(),
    lastNameRu: v.string(),
    firstNameEn: v.optional(v.string()),
    lastNameEn: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(genderValidator),
    passportNumber: v.optional(v.string()),
    passportIssueDate: v.optional(v.string()),
    passportExpiryDate: v.optional(v.string()),
    // Contacts
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    telegramUsername: v.optional(v.string()),
    parentName: v.optional(v.string()),
    parentPhone: v.optional(v.string()),
    // Address
    region: v.optional(v.string()),
    district: v.optional(v.string()),
    fullAddress: v.optional(v.string()),
    // Academic data
    currentEducationLevel: v.optional(educationLevelValidator),
    schoolName: v.optional(v.string()),
    graduationYear: v.optional(v.number()),
    gpaScore: v.optional(v.number()),
    // Korean language
    topikLevel: topikLevelValidator,
    topikCertificateNumber: v.optional(v.string()),
    topikExpiryDate: v.optional(v.string()),
    koreanSchoolName: v.optional(v.string()),
    koreanStudyMonths: v.optional(v.number()),
    // Finances
    contractAmount: v.optional(v.number()),
    paidAmount: v.number(),
    paymentStatus: paymentStatusValidator,
    // Status
    status: studentStatusValidator,
    priority: priorityValidator,
    // University
    preferredUniversities: v.optional(v.array(v.id("universities"))),
    assignedUniversityId: v.optional(v.id("universities")),
    assignedProgram: v.optional(v.string()),
    admissionYear: v.optional(v.number()),
    admissionSemester: v.optional(semesterValidator),
    // Timestamps
    intakeDeadline: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
    // Photo
    photoUrl: v.optional(v.string()),
  })
    .index("by_branch", ["branchId"])
    .index("by_agent", ["agentId"])
    .index("by_status", ["status"])
    .index("by_passport", ["passportNumber"])
    .index("by_branch_status", ["branchId", "status"]),

  documents: defineTable({
    studentId: v.id("students"),
    type: documentTypeValidator,
    fileId: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    status: documentStatusValidator,
    uploadedAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    verifiedById: v.optional(v.id("users")),
    expiryDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_student", ["studentId"])
    .index("by_student_type", ["studentId", "type"])
    .index("by_status", ["status"]),

  universities: defineTable({
    nameKo: v.string(),
    nameEn: v.string(),
    nameRu: v.optional(v.string()),
    city: v.string(),
    region: v.optional(v.string()),
    tier: universityTierValidator,
    website: v.optional(v.string()),
    applicationPortalUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    availablePrograms: v.optional(v.array(v.string())),
    languageRequirements: v.optional(v.object({
      topik_min: v.optional(v.number()),
      english_score: v.optional(v.number()),
    })),
    springDeadline: v.optional(v.string()),
    fallDeadline: v.optional(v.string()),
    tuitionPerSemesterUsd: v.optional(v.number()),
    dormitoryAvailable: v.boolean(),
    dormitoryCostUsd: v.optional(v.number()),
    uzbekStudentsCount: v.optional(v.number()),
    uzbekCommunityContact: v.optional(v.string()),
    acceptanceRateUzbek: v.optional(v.number()),
    notesRu: v.optional(v.string()),
  })
    .index("by_tier", ["tier"])
    .index("by_city", ["city"]),

  tasks: defineTable({
    studentId: v.optional(v.id("students")),
    agentId: v.id("users"),
    createdById: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.number(),
    completedAt: v.optional(v.number()),
    status: taskStatusValidator,
    priority: taskPriorityValidator,
    type: taskTypeValidator,
  })
    .index("by_agent", ["agentId"])
    .index("by_status", ["status"])
    .index("by_student", ["studentId"])
    .index("by_agent_status", ["agentId", "status"]),

  penalties: defineTable({
    agentId: v.id("users"),
    issuedById: v.id("users"),
    type: penaltyTypeValidator,
    reason: v.string(),
    amountUsd: v.optional(v.number()),
    relatedStudentId: v.optional(v.id("students")),
    relatedTaskId: v.optional(v.id("tasks")),
    issuedAt: v.number(),
    acknowledgedAt: v.optional(v.number()),
  })
    .index("by_agent", ["agentId"])
    .index("by_type", ["type"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    priority: notificationPriorityValidator,
    link: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"]),

  activityLogs: defineTable({
    userId: v.id("users"),
    studentId: v.optional(v.id("students")),
    action: v.string(),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_student", ["studentId"]),

  comments: defineTable({
    studentId: v.id("students"),
    authorId: v.id("users"),
    text: v.string(),
    isInternal: v.boolean(),
  })
    .index("by_student", ["studentId"]),

  seasonGoals: defineTable({
    semester: semesterValidator,
    year: v.number(),
    targetCount: v.number(),
    currentCount: v.number(),
  })
    .index("by_semester_year", ["semester", "year"]),

  achievements: defineTable({
    userId: v.optional(v.id("users")),
    studentId: v.optional(v.id("students")),
    type: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
  }),
});
