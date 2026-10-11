import type { QuoteRequest, Review, Work } from "@/types/portfolio";

export type DbSession = {
  id: string;
  tokenHash: string;
  createdAt: string;
  lastSeenAt: string;
};

export type Db = {
  auth: {
    passwordHash: string | null;
    sessions: DbSession[];
  };
  works: Work[];
  reviews: Review[];
  quotes: QuoteRequest[];
};

export const DEFAULT_DB: Db = {
  auth: {
    passwordHash: null,
    sessions: [],
  },
  works: [],
  reviews: [],
  quotes: [],
};



