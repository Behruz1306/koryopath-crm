/* eslint-disable */
/**
 * Generated data model stub for Convex.
 * Run `npx convex dev` to regenerate with full types.
 */
import type { GenericId } from "convex/values";
export type Id<T extends string> = GenericId<T>;
export type DataModel = Record<string, any>;
export type Doc<T extends string> = Record<string, any> & { _id: Id<T>; _creationTime: number };
