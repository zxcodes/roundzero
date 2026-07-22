const encodeHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  return encodeHex(await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer));
}

export async function sha256Text(value: string): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(value));
}

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
};

export async function hashStableValue(value: unknown): Promise<string> {
  return sha256Text(JSON.stringify(stableValue(value)));
}
