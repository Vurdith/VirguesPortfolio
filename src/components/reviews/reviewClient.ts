import { REVIEW_ATTACHMENTS } from "@/lib/reviewLimits";

const TOKENS_KEY = "ui:reviewTokens";

type TokenMap = Record<string, string>;

function readTokens(): TokenMap {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TOKENS_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as TokenMap) : {};
  } catch {
    return {};
  }
}

/** The thread token for a review this browser submitted, or null. */
export const getThreadToken = (reviewId: string) => readTokens()[reviewId] ?? null;

/** Keeps the token the server returned once. Returns false when the browser blocks storage. */
export function saveThreadToken(reviewId: string, token: string) {
  try {
    window.localStorage.setItem(TOKENS_KEY, JSON.stringify({ ...readTokens(), [reviewId]: token }));
    return true;
  } catch {
    return false;
  }
}

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

const ALLOWED = new Set<string>(REVIEW_ATTACHMENTS.types);

/**
 * Checks a chosen file and shrinks it when it would not fit in one request. Returns the file to
 * upload, or a message for the visitor. The server checks everything again from the real bytes.
 */
export async function prepareImage(file: File): Promise<{ file: File } | { error: string }> {
  if (!ALLOWED.has(file.type)) return { error: "Use a JPG, PNG, WebP or GIF image." };
  if (file.size > REVIEW_ATTACHMENTS.maxBytes) return { error: "Images can be up to 5MB." };
  if (file.size <= REVIEW_ATTACHMENTS.uploadBytes) return { file };
  if (file.type === "image/gif") return { error: "GIFs can be up to 4MB." };

  const shrunk = await shrinkImage(file);
  return shrunk ? { file: shrunk } : { error: "Could not shrink that image. Try a smaller one." };
}

async function shrinkImage(file: File): Promise<File | null> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    let scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));

    for (let attempt = 0; attempt < 4; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
      if (blob && blob.size <= REVIEW_ATTACHMENTS.uploadBytes) {
        return new File([blob], "image.webp", { type: blob.type });
      }
      scale *= 0.75;
    }
  } catch {
    // Not decodable here; the caller reports it.
  } finally {
    bitmap?.close();
  }
  return null;
}

export type UploadedImage = { id: string; url: string };

/** Uploads one image with progress. Rejects with a message fit to show the visitor. */
export function uploadImage(
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/reviews/upload");
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onerror = () => reject(new Error("Network error. Try again."));
    request.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    request.onload = () => {
      const body = request.response as (Partial<UploadedImage> & { error?: string }) | null;
      if (request.status === 201 && body?.id && body.url) resolve({ id: body.id, url: body.url });
      else if (request.status === 413) reject(new Error("Images can be up to 5MB."));
      else reject(new Error(body?.error || "Upload failed."));
    };

    signal.addEventListener("abort", () => request.abort(), { once: true });
    const form = new FormData();
    form.append("file", file);
    request.send(form);
  });
}
