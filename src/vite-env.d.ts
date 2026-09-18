/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_CLIENT_URL: string;
  readonly VITE_DOCS_URL: string;
  readonly VITE_WEB_URL: string;
  readonly VITE_ADMIN_DATA_SOURCE?: 'mock' | 'api';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
