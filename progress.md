# Progress

## Current

- **Refunds UI**: List, filters, import, bulk selection dialog, Supabase persistence ([`src/pages/Refund.tsx`](src/pages/Refund.tsx), [`src/lib/refund-db.ts`](src/lib/refund-db.ts)).
- **Shopify read (dev)**: Order fetch via Vite proxy and optional in-browser token for enrichment ([`src/utils/shopifyOrder.ts`](src/utils/shopifyOrder.ts), [`vite.config.ts`](vite.config.ts)). Saving Shopify API settings runs a GET `shop.json` ping when a token is present ([`src/components/ShopifySettings.tsx`](src/components/ShopifySettings.tsx)). [`normalizeShopDomain`](src/lib/shopifyAdminApi.ts) keeps only the hostname so pasted Admin URLs do not break the proxy (mirrored in `shopify-create-refund` refundLogic).
- **Shopify refund (server)**: `shopify-create-refund` Edge Function, `shopify_credentials` + **`shopify_install_tokens`** (offline token per shop after OAuth), refund metadata columns, client invoke + settings upsert. Embedded bulk refunds: App Bridge session token in `Authorization`, verified with `SHOPIFY_CLIENT_SECRET`, then offline token from `shopify_install_tokens`. Set `VITE_SHOPIFY_CLIENT_ID` for embedded session tokens; set `VITE_SAVE_SHOPIFY_CREDENTIALS=true` for user-scoped rows; default browser-only for non-server paths.
- **Docs**: [`architecture.md`](architecture.md) describes requirements and flows.

## Operational notes

- Apply migrations (includes `shopify_credentials` and refund metadata columns).
- Deploy the function: `supabase functions deploy shopify-create-refund` (project linked; `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically on Supabase-hosted functions).
- **Signed in**: save credentials to `shopify_credentials` and run bulk refunds with a Supabase JWT. **Embedded** (no sign-in): run bulk refunds with a Shopify session token after OAuth has populated `shopify_install_tokens`.

## Verification (local)

- `npm run test` — includes `shopifyRefundPayload` unit tests.
- `npm run build` — passes.
