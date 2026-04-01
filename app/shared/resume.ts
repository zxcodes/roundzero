const resumeStorageKeyPrefix = "pending-resume";

export type PendingResume = {
  fileName: string;
  resumeKey: string;
};

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

export function getPendingResumeStorageKey(userId: string) {
  return `${resumeStorageKeyPrefix}:${userId}`;
}

export function readPendingResume(storageKey: string): PendingResume | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingResume;
  } catch {
    return null;
  }
}

export function writePendingResume(storageKey: string, pendingResume: PendingResume) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(pendingResume));
}

export function clearPendingResume(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(storageKey);
}

export function uploadFileToSignedUrl({
  file,
  uploadUrl,
  onProgress,
}: {
  file: File;
  uploadUrl: string;
  onProgress?: (progress: number) => void;
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(new Error("Upload failed"));
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}
