export async function previewOriginVariable(origin: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(origin),
  );

  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `AUTH_PREVIEW_ORIGIN_${hash}`;
}
