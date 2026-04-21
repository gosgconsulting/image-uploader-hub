/** Limits `next` after login to same-origin paths (no open redirects). */
export function safeAuthRedirectPath(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/refund";
  if (t.includes("://") || t.includes("\\") || t.includes("\0")) return "/refund";
  return t;
}
