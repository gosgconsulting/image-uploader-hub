import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleBegin } from "./begin.ts";
import { handleCallback } from "./callback.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const url = new URL(req.url);

  if (req.method === "GET" && url.searchParams.has("code")) {
    return handleCallback(req);
  }

  if (req.method === "POST") {
    const res = await handleBegin(req);
    const h = new Headers(res.headers);
    h.set("Access-Control-Allow-Origin", "*");
    return new Response(res.body, { status: res.status, headers: h });
  }

  return new Response("Not found", { status: 404 });
});
