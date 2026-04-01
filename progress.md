# Progress

## Current

- **Refunds UI**: List, filters, import, bulk selection dialog, Supabase persistence ([`src/pages/Refund.tsx`](src/pages/Refund.tsx), [`src/lib/refund-db.ts`](src/lib/refund-db.ts)).
- **Shopify read (dev)**: Order fetch via Vite proxy and optional in-browser token for enrichment ([`src/utils/shopifyOrder.ts`](src/utils/shopifyOrder.ts), [`vite.config.ts`](vite.config.ts)). Saving Shopify API settings runs a GET `shop.json` ping when a token is present ([`src/components/ShopifySettings.tsx`](src/components/ShopifySettings.tsx)). [`normalizeShopDomain`](src/lib/shopifyAdminApi.ts) keeps only the hostname so pasted Admin URLs do not break the proxy (mirrored in `shopify-create-refund` refundLogic).
- **Shopify refund (server)**: `shopify-create-refund` Edge Function, `shopify_credentials` table, refund metadata columns, client invoke + settings upsert. Set `VITE_SAVE_SHOPIFY_CREDENTIALS=true` to store tokens in Supabase; default is browser-only.
- **Docs**: [`architecture.md`](architecture.md) describes requirements and flows.

## Operational notes

- Apply migrations (includes `shopify_credentials` and refund metadata columns).
- Deploy the function: `supabase functions deploy shopify-create-refund` (project linked; `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically on Supabase-hosted functions).
- Users must be **signed in** to save credentials and run bulk Shopify refunds.

## Verification (local)

- `npm run test` — includes `shopifyRefundPayload` unit tests.
- `npm run build` — passes.
