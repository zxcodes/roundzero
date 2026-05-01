function getPublicAssetBaseUrl() {
  const value =
    typeof window === "undefined"
      ? process.env.VITE_PUBLIC_ASSET_BASE_URL
      : import.meta.env.VITE_PUBLIC_ASSET_BASE_URL;

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

  return `${baseUrl}/${objectKey}`;
}
