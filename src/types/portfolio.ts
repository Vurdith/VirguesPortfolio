export type Media = {
  kind: "image" | "video";
  srcType: "upload" | "url";
  src: string;
  poster?: string;
  /** Description for screen readers and search; falls back to the work title. */
  alt?: string;
  /** Focal point (0-100) used when the image is cropped into a card. */
  focus?: { x: number; y: number };
};

export type Work = {
  id: string;
  slug: string;
  title: string;
  year?: number;
  tags: string[];
  summary?: string;
  /** Case study fields, all optional. */
  client?: string;
  role?: string;
  problem?: string;
  solution?: string;
  result?: string;
  link?: string;
  /** Manual position in the gallery (lower first). Works without one follow, newest first. */
  order?: number;
  /** Cover piece. When `items` is set, this mirrors `items[0]`. */
  media: Media;
  /** Every piece of a collection, in order (cover first). Absent for single-piece works. */
  items?: Media[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReviewStatus = "pending" | "approved" | "rejected";

export type Rating = 1 | 2 | 3 | 4 | 5;

export type Review = {
  id: string;
  name: string;
  rating: Rating;
  text: string;
  status: ReviewStatus;
  createdAt: string;
};

export type QuoteStatus = "new" | "replied" | "closed";

export type QuoteRequest = {
  id: string;
  name: string;
  /** At least one of email, discord or x is always set. */
  email?: string;
  discord?: string;
  x?: string;
  service: string;
  budget: string;
  deadline: string;
  details: string;
  status: QuoteStatus;
  createdAt: string;
  /** Salted hash of the sender's IP, kept briefly for rate limiting and then dropped. */
  ipHash?: string;
};
