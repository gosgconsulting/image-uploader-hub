# Project Overview

This app is built with:
- Vite + React 18 + TypeScript
- Tailwind CSS & shadcn/ui
- TanStack Query
- Supabase for data and auth

## Getting Started

1. Install dependencies:
   - npm i
2. Run the dev server:
   - npm run dev
3. Build for production:
   - npm run build
4. Preview the build:
   - npm run preview

## Supabase

The Supabase client is initialized at:
- src/integrations/supabase/client.ts

Ensure your Supabase project URL and anon key are configured in your environment (.env) if needed.

## Shopify app (OAuth) for Refund

Use a **Shopify custom or public app** in the Partner Dashboard (or dev store custom app).

- **Allowed redirection URL(s)** (OAuth callback):  
  `https://<project-ref>.supabase.co/functions/v1/shopify-oauth`
- **App URL** (where Shopify sends merchants after **Install**): **the same** function URL above, so the install request (`?shop=&timestamp=&hmac=`) hits the Edge Function and starts OAuth.

Match the default scopes or set `SHOPIFY_OAUTH_SCOPES` on the function: `read_orders`, `write_orders`.

1. Apply migrations (includes `shopify_oauth_states`, `shopify_oauth_pending`, `claim_nonce` on pending).
2. Set Edge Function secrets: `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_OAUTH_RETURN_URL` (full URL to the Refund page, e.g. `https://your-domain/refund` or `http://localhost:5173/refund` for local dev).
3. Deploy: `supabase functions deploy shopify-oauth`
4. Frontend: `VITE_SAVE_SHOPIFY_CREDENTIALS=true` and `VITE_SHOPIFY_OAUTH_ENABLED=true`. Merchants **install from Shopify Admin**; after OAuth the callback redirects to `SHOPIFY_OAUTH_RETURN_URL` with `shopify_oauth=success`, `shop=…`, and **`shopify_claim=<uuid>`** (one-time link to the pending token). The Refund page uses that UUID to claim into `shopify_credentials` after **sign in** (instructions under **Shopify API**).

**Embedded apps** (`embedded=1`): (1) A 302 to `/admin/oauth/authorize` inside the admin iframe would be blank (Shopify blocks framing that page). (2) **Supabase Edge Functions rewrite `GET` responses with `Content-Type: text/html` to `text/plain`**, so returning HTML from `shopify-oauth` shows source, not a rendered page ([docs](https://supabase.com/docs/guides/functions/http-methods)).

Instead, when embedded, the function **302-redirects** to **`{origin of SHOPIFY_OAUTH_RETURN_URL}/shopify-oauth-embed.html?authorize=…`**, where `shopify-oauth-embed.html` is the static file in **`public/`** (served by your Vite host with real `text/html`). That page runs **`window.top.location.replace(authorizeUrl)`**. Deploy the frontend so that URL exists on the same origin as `SHOPIFY_OAUTH_RETURN_URL`. Optional Edge secret **`SHOPIFY_OAUTH_EMBED_PAGE`**: full URL to that HTML file if it is not at `/shopify-oauth-embed.html` on the return URL origin.

## Testing

- Run all tests: npm run test
- Watch mode: npm run test:watch

## Notes

- All data access should go through Supabase. Any previous references to third-party project builders or tagging plugins have been removed.