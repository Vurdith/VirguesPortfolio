const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export type UploadKind = "image" | "video" | "poster";

/** File extension for an allowed upload MIME type, or null if the type is not accepted. */
export function extensionForMime(mime: string) {
  return EXTENSIONS[mime] ?? null;
}

/** Whether a MIME type is the right family for the upload kind (video vs image/poster). */
export function mimeMatchesKind(mime: string, kind: UploadKind) {
  return mime.startsWith(kind === "video" ? "video/" : "image/");
}
