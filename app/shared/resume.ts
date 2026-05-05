export function sanitizeResumeFileName(fileName: string) {
  const trimmed = fileName.trim().toLowerCase();
  const lastDotIndex = trimmed.lastIndexOf(".");
  const baseName = lastDotIndex > 0 ? trimmed.slice(0, lastDotIndex) : trimmed;
  const extension = lastDotIndex > 0 ? trimmed.slice(lastDotIndex + 1) : "";

  const sanitizedBaseName =
    baseName
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "resume";

  return extension ? `${sanitizedBaseName}.${extension}` : sanitizedBaseName;
}

export function getResumeDisplayName(resumeKey: string | null | undefined) {
  if (!resumeKey) {
    return null;
  }

  const fileName = resumeKey.split("/").pop();
  if (!fileName) {
    return "Resume on file";
  }

  const markerIndex = fileName.indexOf("--");
  if (markerIndex === -1) {
    return "Resume on file";
  }

  return fileName.slice(markerIndex + 2).replace(/-/g, " ");
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("File is empty"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: contentType });
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
