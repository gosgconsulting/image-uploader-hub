import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCallback } from "./callback.ts";
import { handleInstallEntry } from "./installEntry.ts";
import { handleClaim } from "./claim.ts";
import { handleBeginManualOAuth } from "./beginManualOAuth.ts";
import { corsHeaders } from "./cors.ts";
import { oauthDebugLog } from "./oauthDebugLog.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (req.method === "GET" && url.searchParams.has("code")) {
    oauthDebugLog("route_oauth_callback", {
      shopify_admin_url: url.searchParams.get("shop")
        ? `https://${String(url.searchParams.get("shop")).replace(/^https?:\/\//i, "").split("/")[0]}`
        : null,
      has_oauth_state: url.searchParams.has("state"),
      has_code: true,
    });
    return handleCallback(req);
  }

  if (
    req.method === "GET" &&
    url.searchParams.has("shop") &&
    url.searchParams.has("hmac") &&
    url.searchParams.has("timestamp")
  ) {
    const shopRaw = url.searchParams.get("shop") ?? "";
    const host = shopRaw.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
    oauthDebugLog("route_install_entry", {
      shopify_admin_url: host ? `https://${host}` : null,
      shop_param: shopRaw,
    });
    return handleInstallEntry(req);
  }

  if (req.method === "POST") {
    let parsed: unknown;
    try {
      parsed = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      (parsed as Record<string, unknown>).action === "begin_oauth"
    ) {
      const res = await handleBeginManualOAuth(req, parsed as Record<string, unknown>);
      const h = mergeCors(res.headers);
      return new Response(res.body, { status: res.status, headers: h });
    }
    const res = await handleClaim(req, parsed);
    const h = mergeCors(res.headers);
    return new Response(res.body, { status: res.status, headers: h });
  }

  return new Response("Not found", {
    status: 404,
    headers: corsHeaders,
  });
});

function mergeCors(from: Headers): Headers {
  const h = new Headers(from);
  for (const [k, v] of Object.entries(corsHeaders)) {
    h.set(k, v);
  }
  return h;
}
