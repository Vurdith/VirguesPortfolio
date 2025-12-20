import type { Work } from "@/types/portfolio";

export const mockWorks: Work[] = [
  {
    id: "w_0001",
    slug: "blackroom-interface",
    title: "Blackroom Interface",
    year: 2025,
    tags: ["UI", "Motion", "Systems"],
    summary: "A monochrome UI system built to feel like a physical artifact.",
    media: { kind: "image", srcType: "url", src: "" },
    published: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "w_0002",
    slug: "scanline-gallery",
    title: "Scanline Gallery",
    year: 2025,
    tags: ["Web", "Interaction"],
    summary: "A strict grid that breaks open under a lens.",
    media: { kind: "image", srcType: "url", src: "" },
    published: true,
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
  },
  {
    id: "w_0003",
    slug: "projection-room",
    title: "Projection Room",
    year: 2024,
    tags: ["Video", "Art Direction"],
    summary: "A full-screen work view that behaves like a private screening.",
    media: { kind: "video", srcType: "url", src: "", poster: "" },
    published: true,
    createdAt: "2025-01-03T00:00:00.000Z",
    updatedAt: "2025-01-03T00:00:00.000Z",
  },
  {
    id: "w_0004",
    slug: "type-as-architecture",
    title: "Type as Architecture",
    year: 2024,
    tags: ["Typography", "UX"],
    summary: "Hierarchy as a spatial instrument — not a template.",
    media: { kind: "image", srcType: "url", src: "" },
    published: true,
    createdAt: "2025-01-04T00:00:00.000Z",
    updatedAt: "2025-01-04T00:00:00.000Z",
  },
];



