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
  media: Media;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReviewStatus = "pending" | "approved" | "rejected";

export type Rating = 1 | 2 | 3 | 4 | 5;

/** An image a visitor attached to a review or reply. Public only once its parent item is approved. */
export type ReviewAttachment = {
  /** Storage file name, e.g. "<uuid>.webp". Random and server-generated. */
  id: string;
  url: string;
};

export type ReviewReply = {
  id: string;
  /** "owner" replies are written by the site owner from the admin. */
  author: "client" | "owner";
  text: string;
  attachments?: ReviewAttachment[];
  /** Client replies start as pending; owner replies are approved when posted. */
  status: ReviewStatus;
  createdAt: string;
};

export type Review = {
  id: string;
  name: string;
  rating: Rating;
  text: string;
  status: ReviewStatus;
  createdAt: string;
  attachments?: ReviewAttachment[];
  replies?: ReviewReply[];
  /** SHA-256 of the thread token handed to the reviewer once, so only they can reply. Never sent out. */
  tokenHash?: string;
  /** Salted hash of the sender's IP, kept briefly for rate limiting and then dropped. Never sent out. */
  ipHash?: string;
};

/** A review as the browser sees it: no hashes, replies and attachments already filtered. */
export type PublicReview = Omit<Review, "tokenHash" | "ipHash" | "replies"> & {
  replies: (ReviewReply & { pending?: boolean })[];
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
