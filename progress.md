# Progress

## Current

- **Refunds UI**: List, filters, import, bulk selection dialog, Supabase persistence ([`src/pages/Refund.tsx`](src/pages/Refund.tsx), [`src/lib/refund-db.ts`](src/lib/refund-db.ts)).
- **Shopify read (dev)**: Order fetch via Vite proxy and optional in-browser token for enrichment ([`src/utils/shopifyOrder.ts`](src/utils/shopifyOrder.ts), [`vite.config.ts`](vite.config.ts)).
- **Shopify refund (server)**: `shopify-create-refund` Edge Function, `shopify_credentials` table, refund metadata columns, client invoke + settings upsert.
- **Docs**: [`architecture.md`](architecture.md) describes requirements and flows.

## Operational notes

- Apply migrations (includes `shopify_credentials` and refund metadata columns).
- Deploy the function: `supabase functions deploy shopify-create-refund` (project linked; `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically on Supabase-hosted functions).
- Users must be **signed in** to save credentials and run bulk Shopify refunds.

## Verification (local)

- `npm run test` — includes `shopifyRefundPayload` unit tests.
- `npm run build` — passes.
