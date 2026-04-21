/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOPIFY_CLIENT_ID?: string;
  readonly VITE_SHOPIFY_OAUTH_ENABLED?: string;
  /** Default n8n (or other) webhook when no URL is saved in Webhook settings. */
  readonly VITE_WEBHOOK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
