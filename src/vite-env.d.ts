/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOPIFY_CLIENT_ID?: string;
  readonly VITE_SHOPIFY_OAUTH_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
