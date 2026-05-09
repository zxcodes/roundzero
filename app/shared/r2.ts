import { isDev } from "./env.app";

function getPublicAssetBaseUrl() {
  const value =
    typeof window === "undefined"
      ? process.env.VITE_PUBLIC_ASSET_BASE_URL
      : import.meta.env.VITE_PUBLIC_ASSET_BASE_URL;

  return value?.replace(/\/+$/, "") ?? null;
}

function isDevEnvironment(): boolean {
  if (typeof window !== "undefined") {
    return import.meta.env?.DEV === true;
  }
  return isDev;
}

export function getPublicAssetUrl(objectKey: string) {
  if (objectKey.startsWith("http://") || objectKey.startsWith("https://")) {
    return objectKey;
  }

  const baseUrl = getPublicAssetBaseUrl();
  if (!baseUrl) {
    return null;
  }

  // In local dev, serve R2 objects through the local API proxy instead of
  // the production CDN (which cannot access the local Miniflare bucket).
  if (isDevEnvironment()) {
    return `/api/assets/${encodeURIComponent(objectKey)}`;
  }

  return `${baseUrl}/${objectKey}`;
}
