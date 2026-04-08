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

Optional: set **`VITE_WEBHOOK_URL`** in `.env` to use that webhook URL by default for Image Imports when nothing is saved in the Webhook popover. Restart the dev server after changing env vars.

## Shopify app (OAuth) for Refund

Use a **Shopify custom or public app** in the Partner Dashboard (or dev store custom app).

- **Allowed redirection URL(s)** (OAuth callback):  
  `https://<project-ref>.supabase.co/functions/v1/shopify-oauth`
- **App URL** (where Shopify sends merchants after **Install**): **the same** function URL above, so the install request (`?shop=&timestamp=&hmac=`) hits the Edge Function and starts OAuth.

Match the default scopes or set `SHOPIFY_OAUTH_SCOPES` on the function: `read_orders`, `write_orders`.

1. Apply migrations (includes `shopify_oauth_states`, `shopify_oauth_pending`, `shopify_install_tokens`, `claim_nonce` on pending).
2. Set Edge Function secrets on **`shopify-oauth`**: `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_OAUTH_RETURN_URL` (full URL to the Refund page, e.g. `https://your-domain/refund` or `http://localhost:5173/refund` for local dev).  
   Set the **same** `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` on **`shopify-create-refund`** so it can verify [Shopify session tokens](https://shopify.dev/docs/apps/auth/oauth/session-tokens) (HS256) and load the offline token from `shopify_install_tokens`.
3. Deploy: `supabase functions deploy shopify-oauth` and `supabase functions deploy shopify-create-refund`
4. Frontend: `VITE_SAVE_SHOPIFY_CREDENTIALS=true`, `VITE_SHOPIFY_OAUTH_ENABLED=true`, and **`VITE_SHOPIFY_CLIENT_ID`** (same value as `SHOPIFY_CLIENT_ID`) for [App Bridge](https://shopify.dev/docs/api/app-bridge) session tokens when the Refund app runs **embedded** in Shopify Admin. Merchants **install from Shopify Admin**; after OAuth the callback stores the offline Admin token in **`shopify_install_tokens`** (and pending / user credentials as before). The Refund page can run **bulk refunds embedded** using a fresh session token without Supabase sign-in, as long as OAuth has completed once for that shop.

Optional: after OAuth, **`shopify_claim=<uuid>`** still lets a signed-in user copy the token into `shopify_credentials` (see **Shopify API** in the UI).

**Install / OAuth**: the function always **302** redirects to Shopify’s **`/admin/oauth/authorize`** URL. Configure the Partner app for a **non-embedded** install (standalone / new tab) so that redirect runs in a full browser window—Shopify typically blocks loading the authorize page inside an Admin iframe.

## Testing

- Run all tests: npm run test
- Watch mode: npm run test:watch

## Notes

- All data access should go through Supabase. Any previous references to third-party project builders or tagging plugins have been removed.