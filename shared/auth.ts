const publicPaths = new Set(["/", "/login"]);

export function normalizeReturnTo(
  value: string | null,
  origin: string,
): string {
  if (value === null || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  try {
    const destination = new URL(value, origin);

    // Match the router's case-insensitive, decoded paths and trailing slashes.
    const pathname =
      decodeURIComponent(destination.pathname)
        .toLowerCase()
        .replace(/\/+$/, "") || "/";

    if (destination.origin !== origin || publicPaths.has(pathname)) {
      return "/app";
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/app";
  }
}
