import sharp from "sharp";

const MAX_EDGE = 1600;
// Decoded size cap (width x height x frames), so a small file cannot expand into gigabytes of pixels.
const MAX_PIXELS = 64_000_000;
const MAX_FRAMES = 120;

export class ImageRejected extends Error {}

/** The real format from the first bytes. The client's MIME type and file name are never consulted. */
export function sniffImage(bytes: Uint8Array): "jpeg" | "png" | "gif" | "webp" | null {
  if (bytes.length < 12) return null;
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (ascii(1, 4) === "PNG" && bytes[0] === 0x89 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "png";
  }
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return "gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

/**
 * Decodes the upload, drops all metadata (EXIF, GPS, comments), caps its size and re-encodes it as
 * WebP. Animated GIFs and WebPs stay animated. Anything that is not a real image throws ImageRejected.
 */
export async function reencodeImage(input: Buffer): Promise<Buffer> {
  if (!sniffImage(input)) throw new ImageRejected("Unsupported image type.");

  try {
    const source = sharp(input, { animated: true, limitInputPixels: MAX_PIXELS, failOn: "error" });
    const meta = await source.metadata();
    const frames = meta.pages ?? 1;
    const frameHeight = meta.pageHeight ?? meta.height ?? 0;
    if (!meta.width || !frameHeight) throw new ImageRejected("Could not read that image.");
    if (frames > MAX_FRAMES || meta.width * frameHeight * frames > MAX_PIXELS) {
      throw new ImageRejected("That image is too large.");
    }

    // sharp keeps no metadata unless asked to, so EXIF and GPS data are gone from the output.
    return await source
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch (err) {
    if (err instanceof ImageRejected) throw err;
    throw new ImageRejected("Could not read that image.");
  }
}
