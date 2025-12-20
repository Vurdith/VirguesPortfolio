export type Media = {
  kind: "image" | "video";
  srcType: "upload" | "url";
  src: string;
  poster?: string;
};

export type Work = {
  id: string;
  slug: string;
  title: string;
  year?: number;
  tags: string[];
  summary?: string;
  media: Media;
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



