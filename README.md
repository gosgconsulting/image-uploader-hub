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

Use a **Shopify custom or public app** in the Partner Dashboard (or dev store custom app) with redirect URL:

`https://<project-ref>.supabase.co/functions/v1/shopify-oauth`

Match the default scopes or set `SHOPIFY_OAUTH_SCOPES` on the function: `read_orders`, `write_orders`.

1. Apply migrations (includes `shopify_oauth_states`).
2. Set Edge Function secrets: `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_OAUTH_RETURN_URL` (full URL to the Refund page, e.g. `https://your-domain/refund` or `http://localhost:5173/refund` for local dev).
3. Deploy: `supabase functions deploy shopify-oauth`
4. Frontend: `VITE_SAVE_SHOPIFY_CREDENTIALS=true` and `VITE_SHOPIFY_OAUTH_ENABLED=true`, signed-in user, then **Shopify API → Connect with Shopify app**.

## Testing

- Run all tests: npm run test
- Watch mode: npm run test:watch

## Notes

- All data access should go through Supabase. Any previous references to third-party project builders or tagging plugins have been removed.