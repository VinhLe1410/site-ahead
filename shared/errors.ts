import { ConvexError } from "convex/values";

function isMessage(value: unknown): value is string {
  return typeof value === "string";
}

export function getErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ConvexError && isMessage(cause.data)) return cause.data;

  return cause instanceof Error ? cause.message : fallback;
}
