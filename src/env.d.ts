/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly FACEBOOK_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
