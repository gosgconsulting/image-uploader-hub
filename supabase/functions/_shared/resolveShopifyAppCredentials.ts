/**
 * OAuth authorize, access_token exchange, install HMAC, and session-token verification
 * all require the same Partner/custom app client id + secret.
 *
 * Prefer `SHOPIFY_CUSTOM_APP_*` when both are set so deploys can switch apps without
 * renaming existing `SHOPIFY_CLIENT_*` secrets; otherwise use `SHOPIFY_CLIENT_*`.
 */
export function resolveShopifyAppCredentialsFromEnv(): {
  clientId: string;
  clientSecret: string;
} {
  const customId = Deno.env.get("SHOPIFY_CUSTOM_APP_CLIENT_ID")?.trim() ?? "";
  const customSecret = Deno.env.get("SHOPIFY_CUSTOM_APP_CLIENT_SECRET")?.trim() ?? "";
  if (customId && customSecret) {
    return { clientId: customId, clientSecret: customSecret };
  }

  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID")?.trim() ?? "";
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET")?.trim() ?? "";
  return { clientId, clientSecret };
}

export { resolveShopifyAppCredentialsFromEnv as resolveShopifyAppCredentials };
