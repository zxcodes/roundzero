type ViteTypeOptions = {};

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_APP_URL: string;
  readonly VITE_PUBLIC_ASSET_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.wasm" {
  const content: WebAssembly.Module;
  export default content;
}
