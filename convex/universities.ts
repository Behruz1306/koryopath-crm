import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUser, requireBoss } from "./helpers";

const tierOrder: Record<string, number> = {
  SKY: 0,
  national: 1,
  private_top: 2,
  private_mid: 3,
  community: 4,
};

/**
 * Convert topikLevel string to a numeric value for comparison.
 * "none" → 0, "level_1" → 1, ... "level_6" → 6
 */
function topikLevelToNumber(level: string): number {
  if (level === "none") return 0;
  const match = level.match(/^level_(\d)$/);
  return match ? parseInt(match[1], 10) : 0;
}

// ─── list ───────────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    sessionToken: v.string(),
    search: v.optional(v.string()),
    tier: v.optional(
      v.union(
        v.literal("SKY"),
        v.literal("national"),
        v.literal("private_top"),
        v.literal("private_mid"),
        v.literal("community")
      )
    ),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx, args.sessionToken);

    let universities;

    // Use indexes when possible
    if (args.tier) {
      universities = await ctx.db
        .query("universities")
        .withIndex("by_tier", (q) => q.eq("tier", args.tier!))
        .collect();
    } else if (args.city) {
      universities = await ctx.db
        .query("universities")
        .withIndex("by_city", (q) => q.eq("city", args.city!))
        .collect();
    } else {
      universities = await ctx.db.query("universities").collect();
    }

    // Apply city filter if tier index was used
    if (args.tier && args.city) {
      universities = universities.filter((u) => u.city === args.city);
    }

    // Apply search filter (case-insensitive across nameEn, nameKo, nameRu)
    if (args.search) {
      const term = args.search.toLowerCase();
      universities = universities.filter(
        (u) =>
          u.nameEn.toLowerCase().includes(term) ||
          u.nameKo.toLowerCase().includes(term) ||
          (u.nameRu && u.nameRu.toLowerCase().includes(term))
      );
    }

    // Sort by tier (SKY first, then national, etc.)
    universities.sort(
      (a, b) => (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99)
    );

    return universities;
  },
});

// ─── getById ────────────────────────────────────────────────────────────────────

export const getById = query({
  args: {
    sessionToken: v.string(),
    id: v.id("universities"),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx, args.sessionToken);

    const university = await ctx.db.get(args.id);
    if (!university) {
      throw new ConvexError("University not found");
    }

    return university;
  },
});

// ─── create ─────────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    sessionToken: v.string(),
    nameKo: v.string(),
    nameEn: v.string(),
    nameRu: v.optional(v.string()),
    city: v.string(),
    region: v.optional(v.string()),
    tier: v.union(
      v.literal("SKY"),
      v.literal("national"),
      v.literal("private_top"),
      v.literal("private_mid"),
      v.literal("community")
    ),
    website: v.optional(v.string()),
    applicationPortalUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    availablePrograms: v.optional(v.array(v.string())),
    languageRequirements: v.optional(
      v.object({
        topik_min: v.optional(v.number()),
        english_score: v.optional(v.number()),
      })
    ),
    springDeadline: v.optional(v.string()),
    fallDeadline: v.optional(v.string()),
    tuitionPerSemesterUsd: v.optional(v.number()),
    dormitoryAvailable: v.boolean(),
    dormitoryCostUsd: v.optional(v.number()),
    uzbekStudentsCount: v.optional(v.number()),
    uzbekCommunityContact: v.optional(v.string()),
    acceptanceRateUzbek: v.optional(v.number()),
    notesRu: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    requireBoss(user);

    const { sessionToken, ...fields } = args;
    const universityId = await ctx.db.insert("universities", fields);

    return universityId;
  },
});

// ─── update ─────────────────────────────────────────────────────────────────────

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("universities"),
    nameKo: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    nameRu: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    tier: v.optional(
      v.union(
        v.literal("SKY"),
        v.literal("national"),
        v.literal("private_top"),
        v.literal("private_mid"),
        v.literal("community")
      )
    ),
    website: v.optional(v.string()),
    applicationPortalUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    availablePrograms: v.optional(v.array(v.string())),
    languageRequirements: v.optional(
      v.object({
        topik_min: v.optional(v.number()),
        english_score: v.optional(v.number()),
      })
    ),
    springDeadline: v.optional(v.string()),
    fallDeadline: v.optional(v.string()),
    tuitionPerSemesterUsd: v.optional(v.number()),
    dormitoryAvailable: v.optional(v.boolean()),
    dormitoryCostUsd: v.optional(v.number()),
    uzbekStudentsCount: v.optional(v.number()),
    uzbekCommunityContact: v.optional(v.string()),
    acceptanceRateUzbek: v.optional(v.number()),
    notesRu: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionToken);
    requireBoss(user);

    const university = await ctx.db.get(args.id);
    if (!university) {
      throw new ConvexError("University not found");
    }

    const { sessionToken, id, ...fields } = args;
    const patch: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    await ctx.db.patch(args.id, patch);

    return args.id;
  },
});

// ─── matchForStudent ────────────────────────────────────────────────────────────

export const matchForStudent = query({
  args: {
    sessionToken: v.string(),
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx, args.sessionToken);

    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new ConvexError("Student not found");
    }

    const universities = await ctx.db.query("universities").collect();

    const studentTopikNum = topikLevelToNumber(student.topikLevel);
    const studentGpa = student.gpaScore ?? 0;
    const studentBudget = student.contractAmount ?? 0;

    const scored = universities.map((uni) => {
      let score = 0;

      // TOPIK requirement match: student's level >= university required (+30)
      const requiredTopik = uni.languageRequirements?.topik_min ?? 0;
      if (studentTopikNum >= requiredTopik) {
        score += 30;
      }

      // Tuition fits budget: tuitionPerSemesterUsd * 2 <= contractAmount (+20)
      if (
        uni.tuitionPerSemesterUsd &&
        studentBudget > 0 &&
        uni.tuitionPerSemesterUsd * 2 <= studentBudget
      ) {
        score += 20;
      }

      // Higher acceptance rate for Uzbeks (+15 * rate)
      if (uni.acceptanceRateUzbek) {
        score += 15 * uni.acceptanceRateUzbek;
      }

      // University tier bonus
      const tierBonus: Record<string, number> = {
        SKY: 10,
        national: 8,
        private_top: 6,
        private_mid: 4,
        community: 2,
      };
      score += tierBonus[uni.tier] ?? 0;

      // Has Uzbek community (+5)
      if (uni.uzbekStudentsCount && uni.uzbekStudentsCount > 0) {
        score += 5;
      }

      // Dormitory available (+5)
      if (uni.dormitoryAvailable) {
        score += 5;
      }

      return {
        ...uni,
        matchScore: Math.round(score * 100) / 100,
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.matchScore - a.matchScore);

    return scored;
  },
});

// ─── compare ────────────────────────────────────────────────────────────────────

export const compare = query({
  args: {
    sessionToken: v.string(),
    ids: v.array(v.id("universities")),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx, args.sessionToken);

    if (args.ids.length < 2 || args.ids.length > 5) {
      throw new ConvexError("Please provide between 2 and 5 university IDs to compare");
    }

    const universities = await Promise.all(
      args.ids.map(async (id) => {
        const uni = await ctx.db.get(id);
        if (!uni) {
          throw new ConvexError(`University not found: ${id}`);
        }
        return uni;
      })
    );

    return universities;
  },
});
