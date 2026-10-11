import type { Media } from "@/types/portfolio";

/** CSS object-position / background-position for a media item's focal point (centre by default). */
export function focusPosition(media: Media): string {
  const focus = media.focus;
  return focus ? `${focus.x}% ${focus.y}%` : "center";
}
