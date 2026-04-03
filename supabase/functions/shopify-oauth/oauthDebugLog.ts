/** Structured logs for Supabase Dashboard → Edge Functions → Logs. Never log secrets (OAuth code, access_token). */
export function oauthDebugLog(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ source: "[shopify-oauth]", event, ...data }));
}
