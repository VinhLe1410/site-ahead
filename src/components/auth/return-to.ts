import type { Location } from "react-router";
import { normalizeReturnTo as normalizeDestination } from "../../../shared/auth";

export function normalizeReturnTo(value: string | null): string {
  return normalizeDestination(value, window.location.origin);
}

export function locationReturnTo({
  pathname,
  search,
  hash,
}: Pick<Location, "pathname" | "search" | "hash">): string {
  return normalizeReturnTo(`${pathname}${search}${hash}`);
}

export function withReturnTo(path: string, returnTo: string): string {
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
