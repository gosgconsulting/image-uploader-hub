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
- **App URL** (where Shopify sends merchants after **Install**): the function URL above. For the **default** platform app, use that URL **without** extra query params so the install request (`?shop=&timestamp=&hmac=`) hits the Edge Function and starts OAuth.

Match the default scopes or set `SHOPIFY_OAUTH_SCOPES` on the function: `read_orders`, `write_orders`.

### Per-brand Partner app (`?tenant=` + DB credentials)

Merchants can use **their own** Partner app (instead of only global Edge secrets):

1. **Apply migrations** so `brand_shopify_partner_apps`, `shopify_oauth_states.partner_app_id`, and `shopify_install_tokens.partner_app_id` exist, plus RPCs `upsert_brand_shopify_partner_app`, `get_brand_shopify_partner_app_public`, `delete_brand_shopify_partner_app`.
2. In **Shopify connection** settings (with a brand selected), save **Partner Client ID** and **Partner Client secret** for that brand.
3. In the Partner Dashboard for **their** app, set **App URL** to:  
   `https://<project-ref>.supabase.co/functions/v1/shopify-oauth?tenant=<brand_uuid>`  
   where `<brand_uuid>` is the **Tenant id** shown in the UI (same as `brands.id`).
4. Set **Allowed redirection URL(s)** to the **canonical** callback URL **without** `?tenant=`:  
   `https://<project-ref>.supabase.co/functions/v1/shopify-oauth`  
   (must match what the Edge function sends as `redirect_uri` in the authorize step.)
5. **Embedded refunds / session tokens**: after OAuth, the offline token is stored with `partner_app_id`; `shopify-create-refund` and `shopify-admin-get` resolve the correct client secret from the DB using the session JWT `aud` claim and shop. If no per-brand row matches, the process falls back to **`SHOPIFY_CLIENT_*` / `SHOPIFY_CUSTOM_APP_*`** env secrets.

**Shopify behavior**: confirm on a test install that Shopify preserves the `tenant=` query parameter on the initial GET to your function URL; if your Partner app type strips it, use a path-based URL or Shopify’s documented workaround.

1. Apply migrations (includes `shopify_oauth_states`, `shopify_oauth_pending`, `shopify_install_tokens`, `claim_nonce` on pending).
2. Set Edge Function secrets on **`shopify-oauth`**: `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_OAUTH_RETURN_URL` (full URL to the Refund page, e.g. `https://your-domain/refund` or `http://localhost:5173/refund` for local dev).  
   Set the **same** client id + secret on **`shopify-create-refund`** (and **`shopify-admin-get`**) so they can verify [Shopify session tokens](https://shopify.dev/docs/apps/auth/oauth/session-tokens) (HS256) and load the offline token from `shopify_install_tokens`.  
   **Own Partner / custom app:** you can instead set **`SHOPIFY_CUSTOM_APP_CLIENT_ID`** and **`SHOPIFY_CUSTOM_APP_CLIENT_SECRET`** on those functions (when both are set, they override `SHOPIFY_CLIENT_*`). Use one pair only; the id and secret must belong to the same Shopify app.
3. Deploy: `supabase functions deploy shopify-oauth`, `supabase functions deploy shopify-create-refund`, and `supabase functions deploy shopify-admin-get`
4. Frontend: `VITE_SAVE_SHOPIFY_CREDENTIALS=true`, `VITE_SHOPIFY_OAUTH_ENABLED=true`, and **`VITE_SHOPIFY_CLIENT_ID`** (same public API key as the Edge app’s client id) for [App Bridge](https://shopify.dev/docs/api/app-bridge) when the Refund app runs **embedded** in Shopify Admin. If you use the custom Edge vars above, set **`VITE_SHOPIFY_CUSTOM_APP_CLIENT_ID`** to that app’s public client id (it overrides `VITE_SHOPIFY_CLIENT_ID` when present). Never put the client **secret** in Vite env—only on Supabase secrets. Merchants **install from Shopify Admin**; after OAuth the callback stores the offline Admin token in **`shopify_install_tokens`**. The Refund page can run **bulk refunds embedded** using a fresh session token without Supabase sign-in, as long as OAuth has completed once for that shop.

Optional: after OAuth, **`shopify_claim=<uuid>`** still lets a signed-in user copy the token into `shopify_credentials` (see **Shopify API** in the UI).

**Install / OAuth**: the function always **302** redirects to Shopify’s **`/admin/oauth/authorize`** URL. Configure the Partner app for a **non-embedded** install (standalone / new tab) so that redirect runs in a full browser window—Shopify typically blocks loading the authorize page inside an Admin iframe.

## Testing

- Run all tests: npm run test
- Watch mode: npm run test:watch

## Notes

- All data access should go through Supabase. Any previous references to third-party project builders or tagging plugins have been removed.