/** Keys for linking Shopify OAuth to a signed-in Supabase user (session + local for durability). */
export const SS_SHOPIFY_CLAIM_NONCE = "shopify_pending_claim_nonce";
export const SS_SHOPIFY_CLAIM_SHOP = "shopify_pending_claim_shop";

/** `shopify_credentials.id` after OAuth redirect or Supabase hydrate (signed-in flows). */
export const LS_SHOPIFY_CONNECTION_ID = "shopify_connection_id";

/**
 * Persist claim handoff on the app origin (Refund is a standalone page, not embedded in Admin).
 * Prefer localStorage so the nonce survives reloads and isn’t tied to a discarded iframe during OAuth.
 */
export function writePendingClaimToDurableStorage(
  claimNonce: string,
  shopDomain: string
): void {
  try {
    if (claimNonce) localStorage.setItem(SS_SHOPIFY_CLAIM_NONCE, claimNonce);
    if (shopDomain) localStorage.setItem(SS_SHOPIFY_CLAIM_SHOP, shopDomain);
  } catch {
    /* quota / private mode */
  }
}

export function writePendingClaimToSessionStorage(
  claimNonce: string,
  shopDomain: string
): void {
  try {
    if (claimNonce) sessionStorage.setItem(SS_SHOPIFY_CLAIM_NONCE, claimNonce);
    if (shopDomain) sessionStorage.setItem(SS_SHOPIFY_CLAIM_SHOP, shopDomain);
  } catch {
    /* */
  }
}

export function readPendingClaimNonce(): string {
  try {
    const s = sessionStorage.getItem(SS_SHOPIFY_CLAIM_NONCE);
    if (s) return s;
  } catch {
    /* */
  }
  try {
    return localStorage.getItem(SS_SHOPIFY_CLAIM_NONCE) || "";
  } catch {
    return "";
  }
}

export function readPendingClaimShop(): string {
  try {
    const s = sessionStorage.getItem(SS_SHOPIFY_CLAIM_SHOP);
    if (s) return s;
  } catch {
    /* */
  }
  try {
    return localStorage.getItem(SS_SHOPIFY_CLAIM_SHOP) || "";
  } catch {
    return "";
  }
}

export function clearPendingClaimStorage(): void {
  for (const k of [SS_SHOPIFY_CLAIM_NONCE, SS_SHOPIFY_CLAIM_SHOP]) {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* */
    }
    try {
      localStorage.removeItem(k);
    } catch {
      /* */
    }
  }
}
