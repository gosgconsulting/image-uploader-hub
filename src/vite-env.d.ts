/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOPIFY_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
