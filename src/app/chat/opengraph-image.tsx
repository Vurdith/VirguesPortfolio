import { OG_SIZE, ogCard } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Brief your project.";

export default function Image() {
  return ogCard({
    label: "CHAT",
    title: "Brief your project.",
    line: "Tell the assistant what you need. Get a price, then a personal reply.",
    icon: ["M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12Z", "M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"],
  });
}
