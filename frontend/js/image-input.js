// Image input helpers shared by the cell dialog and the editor table:
// reading images from paste/drop events and preparing them for upload.
//
// Every path (file picker, Ctrl+V, drag and drop) goes through prepareImage():
// - JPG/PNG/WebP within the size limit are uploaded untouched;
// - larger images, or other formats the browser can decode (e.g. GIF, BMP,
//   AVIF), are re-encoded as WebP in the browser, shrinking the resolution
//   step by step until they fit. Screenshots are the main use case.
// The backend still validates type (by content) and size.

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const WEBP_QUALITY = 0.85;
const SHRINK_FACTOR = 0.8;
const MAX_SHRINK_STEPS = 8;

/** Reasons: "type" (not a usable image), "size" (cannot fit the limit), "remote" (web image link only). */
export class ImageInputError extends Error {
  constructor(reason) {
    super(reason);
    this.name = "ImageInputError";
    this.reason = reason;
  }
}

// --- Reading from events -----------------------------------------------------

/** Whether a drag carries something we may handle (files or a web image link). */
export function isImageDrag(dataTransfer) {
  const types = Array.from(dataTransfer?.types ?? []);
  return types.includes("Files") || types.includes("text/uri-list");
}

/**
 * File from a drop. Throws ImageInputError("remote") when only a link was
 * dropped (e.g. an image dragged from another website): fetching it would
 * need the server to download arbitrary URLs, which is not supported.
 */
export function fileFromDrop(dataTransfer) {
  const files = Array.from(dataTransfer?.files ?? []);
  if (files.length) return files.find((f) => f.type.startsWith("image/")) ?? files[0];
  throw new ImageInputError(isImageDrag(dataTransfer) ? "remote" : "type");
}

/** First image file on the clipboard, or null. */
export function imageFromClipboard(clipboardData) {
  if (!clipboardData) return null;
  for (const item of clipboardData.items ?? []) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return Array.from(clipboardData.files ?? []).find((f) => f.type.startsWith("image/")) ?? null;
}

/**
 * Whether a paste should be left to the browser: text going into a text
 * field (e.g. the solution name). Copied images often carry HTML too, so only
 * plain text counts.
 */
export function isTextPaste(event) {
  const target = event.target;
  const editable = target instanceof HTMLElement && (target.matches("input, textarea") || target.isContentEditable);
  return editable && Array.from(event.clipboardData?.types ?? []).includes("text/plain");
}

// --- Preparing for upload ----------------------------------------------------

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encode(bitmap, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, width, height);
  let blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  if (blob?.type === "image/webp") return blob;
  // Browsers without WebP encoding fall back to JPEG (no alpha: white background).
  context.globalCompositeOperation = "destination-over";
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  blob = await canvasToBlob(canvas, "image/jpeg", WEBP_QUALITY);
  return blob;
}

async function reencode(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageInputError("type");
  }
  try {
    let scale = 1;
    for (let step = 0; step <= MAX_SHRINK_STEPS; step++) {
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const blob = await encode(bitmap, width, height);
      if (blob && blob.size <= MAX_PHOTO_BYTES) {
        const extension = blob.type === "image/webp" ? "webp" : "jpg";
        return new File([blob], `image.${extension}`, { type: blob.type });
      }
      scale *= SHRINK_FACTOR;
    }
    throw new ImageInputError("size");
  } finally {
    bitmap.close();
  }
}

/**
 * Return a file ready for upload plus whether it was converted.
 * Throws ImageInputError("type" | "size").
 */
export async function prepareImage(file) {
  if (ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_PHOTO_BYTES) {
    return { file, converted: false };
  }
  // Files with no image/* type (e.g. PDF) are still tried: decoding decides.
  return { file: await reencode(file), converted: true };
}

// --- Page guard --------------------------------------------------------------

/**
 * Stop the browser from opening a dropped file (leaving the page) when it is
 * not dropped on a target. Targets call preventDefault() on dragover/drop
 * first; everything else gets a "not allowed" cursor and is ignored.
 */
export function guardWindowDrops() {
  window.addEventListener("dragover", (event) => {
    if (event.defaultPrevented || !isImageDrag(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "none";
  });
  window.addEventListener("drop", (event) => {
    if (!event.defaultPrevented && isImageDrag(event.dataTransfer)) event.preventDefault();
  });
}
