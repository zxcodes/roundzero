function getPublicAssetBaseUrl() {
  const value = import.meta.env.VITE_PUBLIC_ASSET_BASE_URL;
  return value?.replace(/\/+$/, "") ?? null;
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
  if (import.meta.env?.DEV) {
    return `/api/assets/${encodeURIComponent(objectKey)}`;
  }

  return `${baseUrl}/${objectKey}`;
}
