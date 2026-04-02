import { decodeJwt, jwtVerify } from "https://esm.sh/jose@5.9.6";

function baseShopFromDest(dest: string): string | null {
  try {
    const host = new URL(dest).hostname.toLowerCase();
    if (!host.endsWith(".myshopify.com")) return null;
    return host;
  } catch {
    return null;
  }
}

export type VerifySessionOk = { ok: true; shopDomain: string };
export type VerifySessionErr = { ok: false; error: string };

/**
 * Shopify session tokens are HS256 JWTs signed with the app's client secret.
 * @see https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens/set-up-session-tokens
 */
export async function verifyShopifySessionToken(
  token: string,
  clientId: string,
  clientSecret: string
): Promise<VerifySessionOk | VerifySessionErr> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, error: "Empty token" };

  let headerAlg: string;
  try {
    const first = trimmed.split(".")[0];
    const json = JSON.parse(atob(first.replace(/-/g, "+").replace(/_/g, "/")));
    headerAlg = typeof json?.alg === "string" ? json.alg : "";
  } catch {
    return { ok: false, error: "Invalid session token" };
  }
  if (headerAlg !== "HS256") {
    return { ok: false, error: "Not a Shopify session token" };
  }

  let claims: { dest?: unknown; iss?: unknown; aud?: unknown };
  try {
    claims = decodeJwt(trimmed) as { dest?: unknown; iss?: unknown; aud?: unknown };
  } catch {
    return { ok: false, error: "Invalid session token" };
  }

  const dest = typeof claims.dest === "string" ? claims.dest : "";
  const shopDomain = baseShopFromDest(dest);
  if (!shopDomain) return { ok: false, error: "Invalid dest in session token" };

  const aud = claims.aud;
  const audOk =
    aud === clientId ||
    (Array.isArray(aud) && aud.includes(clientId));
  if (!audOk) return { ok: false, error: "Invalid audience in session token" };

  const expectedIss = `https://${shopDomain}/admin`;
  if (claims.iss !== expectedIss) {
    return { ok: false, error: "Invalid issuer in session token" };
  }

  const key = new TextEncoder().encode(clientSecret);
  try {
    await jwtVerify(trimmed, key, {
      algorithms: ["HS256"],
      audience: clientId,
      issuer: expectedIss,
    });
  } catch {
    return { ok: false, error: "Invalid or expired session token" };
  }

  return { ok: true, shopDomain };
}
