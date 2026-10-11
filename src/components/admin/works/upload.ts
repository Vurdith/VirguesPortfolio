export type UploadKind = "image" | "video" | "poster";

type Progress = (fraction: number) => void;

/** XHR rather than fetch so large files can report upload progress. */
function send(
  method: "PUT" | "POST",
  url: string,
  body: XMLHttpRequestBodyInit,
  headers: Record<string, string>,
  onProgress?: Progress,
): Promise<XMLHttpRequest> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(xhr) : reject(xhr));
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(body);
  });
}

function messageOf(error: unknown, fallback: string) {
  if (error instanceof XMLHttpRequest) {
    try {
      const json = JSON.parse(error.responseText) as { error?: string };
      if (json.error) return json.error;
    } catch {
      // not JSON
    }
    return fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

/**
 * Uploads straight to R2 through a presigned URL when it is configured, otherwise through the
 * local upload route. Resolves to the public URL or path to store on the piece.
 */
export async function uploadFile(file: File, kind: UploadKind, onProgress?: Progress) {
  const signedRes = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, contentType: file.type, size: file.size }),
  });

  if (signedRes.ok) {
    const signed = (await signedRes.json()) as { uploadUrl?: string; publicUrl?: string };
    if (!signed.uploadUrl || !signed.publicUrl) throw new Error("Upload setup failed.");
    try {
      await send("PUT", signed.uploadUrl, file, { "content-type": file.type }, onProgress);
    } catch (error) {
      throw new Error(messageOf(error, "Upload failed."));
    }
    return signed.publicUrl;
  }

  if (signedRes.status !== 501) {
    const json = (await signedRes.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? "Upload setup failed.");
  }

  const form = new FormData();
  form.set("kind", kind);
  form.set("file", file);
  try {
    const xhr = await send("POST", "/api/admin/upload", form, {}, onProgress);
    const json = JSON.parse(xhr.responseText) as { path?: string };
    if (!json.path) throw new Error("Upload failed.");
    return json.path;
  } catch (error) {
    throw new Error(messageOf(error, "Upload failed."));
  }
}
