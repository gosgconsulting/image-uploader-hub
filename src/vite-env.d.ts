/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SHOPIFY_CLIENT_ID?: string;
  /** When set, used for App Bridge instead of VITE_SHOPIFY_CLIENT_ID (match Edge SHOPIFY_CUSTOM_APP_*). */
  readonly VITE_SHOPIFY_CUSTOM_APP_CLIENT_ID?: string;
  readonly VITE_SHOPIFY_OAUTH_ENABLED?: string;
  /** Default n8n (or other) webhook when no URL is saved in Webhook settings. */
  readonly VITE_WEBHOOK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
