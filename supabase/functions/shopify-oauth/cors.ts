/**
 * Match @supabase/supabase-js `corsHeaders` so `functions.invoke` preflight succeeds.
 * @see https://github.com/supabase/supabase-js/blob/master/src/cors.ts
 */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};
