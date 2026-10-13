import { OG_SIZE, ogCard } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "What I keep.";

export default function Image() {
  return ogCard({
    label: "PRIVACY",
    title: "What I keep.",
    line: "What the site stores when you get in touch, and why.",
    icon: ["M6 10.5h12v9.5H6z", "M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3", "M12 14.2v2.6"],
  });
}
