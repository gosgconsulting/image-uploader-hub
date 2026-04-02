/** SessionStorage keys for linking Shopify OAuth to a signed-in Supabase user. */
export const SS_SHOPIFY_CLAIM_NONCE = "shopify_pending_claim_nonce";
export const SS_SHOPIFY_CLAIM_SHOP = "shopify_pending_claim_shop";

/** `shopify_credentials.id` after OAuth redirect or Supabase hydrate (signed-in flows). */
export const LS_SHOPIFY_CONNECTION_ID = "shopify_connection_id";
