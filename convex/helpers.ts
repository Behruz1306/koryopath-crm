import { QueryCtx, MutationCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";

/**
 * Find user by session token (stored in refreshToken field).
 * Throws ConvexError if token is missing, user not found, or user inactive.
 */
export async function getAuthUser(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string
): Promise<Doc<"users">> {
  if (!sessionToken) {
    throw new ConvexError("Session token is required");
  }

  const users = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("refreshToken"), sessionToken))
    .collect();

  const user = users[0];

  if (!user) {
    throw new ConvexError("Invalid session token");
  }

  if (!user.isActive) {
    throw new ConvexError("Account is deactivated");
  }

  return user;
}

/**
 * Throw if user is not a boss.
 */
export function requireBoss(user: Doc<"users">): void {
  if (user.role !== "boss") {
    throw new ConvexError("Access denied: boss role required");
  }
}

/**
 * Generate a simple session token from timestamp + random string.
 * (Convex runtime does not have access to Node.js crypto module)
 */
export function generateSessionToken(): string {
  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).substring(2);
  const random2 = Math.random().toString(36).substring(2);
  const random3 = Math.random().toString(36).substring(2);
  return `${timestamp}_${random1}${random2}${random3}`;
}

/**
 * Transliterate Cyrillic text to Latin following Uzbek MID rules.
 * Covers the full Uzbek Cyrillic alphabet mapping.
 */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  "А": "A", "а": "a",
  "Б": "B", "б": "b",
  "В": "V", "в": "v",
  "Г": "G", "г": "g",
  "Д": "D", "д": "d",
  "Е": "E", "е": "e",
  "Ё": "Yo", "ё": "yo",
  "Ж": "J", "ж": "j",
  "З": "Z", "з": "z",
  "И": "I", "и": "i",
  "Й": "Y", "й": "y",
  "К": "K", "к": "k",
  "Л": "L", "л": "l",
  "М": "M", "м": "m",
  "Н": "N", "н": "n",
  "О": "O", "о": "o",
  "П": "P", "п": "p",
  "Р": "R", "р": "r",
  "С": "S", "с": "s",
  "Т": "T", "т": "t",
  "У": "U", "у": "u",
  "Ф": "F", "ф": "f",
  "Х": "X", "х": "x",
  "Ц": "Ts", "ц": "ts",
  "Ч": "Ch", "ч": "ch",
  "Ш": "Sh", "ш": "sh",
  "Щ": "Sh", "щ": "sh",
  "Ъ": "'", "ъ": "'",
  "Ы": "I", "ы": "i",
  "Ь": "", "ь": "",
  "Э": "E", "э": "e",
  "Ю": "Yu", "ю": "yu",
  "Я": "Ya", "я": "ya",
  "Ў": "O'", "ў": "o'",
  "Қ": "Q", "қ": "q",
  "Ғ": "G'", "ғ": "g'",
  "Ҳ": "H", "ҳ": "h",
};

export function transliterate(text: string): string {
  let result = "";
  for (const char of text) {
    result += CYRILLIC_TO_LATIN[char] ?? char;
  }
  return result;
}
