import type { QuoteRequest, Review, Work } from "@/types/portfolio";
import { getFirebaseDb } from "@/lib/firebase/admin";

import { createMutex } from "./mutex";
import { DEFAULT_DB, type Db, type DbSession } from "./types";

const ROOT_COLLECTION = "portfolio";
const ROOT_DOC = "main";
const WORKS_COLLECTION = "works";
const REVIEWS_COLLECTION = "reviews";
const QUOTES_COLLECTION = "quotes";

const runExclusive = createMutex();
// Firestore batches are limited to 500 operations; stay comfortably below it.
const BATCH_LIMIT = 400;

function rootRef() {
  return getFirebaseDb().collection(ROOT_COLLECTION).doc(ROOT_DOC);
}

function byNewest<T extends { createdAt?: string; updatedAt?: string }>(a: T, b: T) {
  const aDate = a.updatedAt ?? a.createdAt ?? "";
  const bDate = b.updatedAt ?? b.createdAt ?? "";
  return bDate.localeCompare(aDate);
}

async function readCollection<T>(name: string): Promise<T[]> {
  const snapshot = await rootRef().collection(name).get();
  return snapshot.docs.map((doc) => doc.data() as T);
}

/**
 * Writes only what changed: new or modified documents are set, removed ones are deleted.
 * `before` is the state this write started from.
 */
async function syncCollection<T extends { id: string }>(name: string, before: T[], after: T[]) {
  const collection = rootRef().collection(name);
  const previous = new Map(before.map((item) => [item.id, JSON.stringify(item)]));
  const nextIds = new Set(after.map((item) => item.id));

  type Op = { kind: "set"; item: T } | { kind: "delete"; id: string };
  const ops: Op[] = [];

  for (const item of after) {
    if (previous.get(item.id) !== JSON.stringify(item)) ops.push({ kind: "set", item });
  }
  for (const id of previous.keys()) {
    if (!nextIds.has(id)) ops.push({ kind: "delete", id });
  }

  for (let start = 0; start < ops.length; start += BATCH_LIMIT) {
    const batch = getFirebaseDb().batch();
    for (const op of ops.slice(start, start + BATCH_LIMIT)) {
      if (op.kind === "set") batch.set(collection.doc(op.item.id), op.item);
      else batch.delete(collection.doc(op.id));
    }
    await batch.commit();
  }
}

export async function readFirestoreDb(): Promise<Db> {
  const root = await rootRef().get();
  const rootData = root.data() as
    | {
        auth?: {
          passwordHash?: string | null;
          sessions?: DbSession[];
        };
      }
    | undefined;

  const [works, reviews, quotes] = await Promise.all([
    readCollection<Work>(WORKS_COLLECTION),
    readCollection<Review>(REVIEWS_COLLECTION),
    readCollection<QuoteRequest>(QUOTES_COLLECTION),
  ]);

  return {
    auth: {
      passwordHash: rootData?.auth?.passwordHash ?? DEFAULT_DB.auth.passwordHash,
      sessions: rootData?.auth?.sessions ?? DEFAULT_DB.auth.sessions,
    },
    works: works.sort(byNewest),
    reviews: reviews.sort(byNewest),
    quotes: quotes.sort(byNewest),
  };
}

export async function writeFirestoreDb(
  mutate: (db: Db) => void | Db | Promise<void | Db>,
): Promise<Db> {
  return runExclusive(async () => {
    const db = await readFirestoreDb();
    const before = {
      auth: JSON.stringify(db.auth),
      works: structuredClone(db.works),
      reviews: structuredClone(db.reviews),
      quotes: structuredClone(db.quotes),
    };

    const maybeNext = await mutate(db);
    const next = (maybeNext ?? db) as Db;

    const tasks: Promise<unknown>[] = [
      syncCollection(WORKS_COLLECTION, before.works, next.works),
      syncCollection(REVIEWS_COLLECTION, before.reviews, next.reviews),
      syncCollection(QUOTES_COLLECTION, before.quotes, next.quotes),
    ];
    if (JSON.stringify(next.auth) !== before.auth) {
      tasks.push(
        rootRef().set({ auth: next.auth, updatedAt: new Date().toISOString() }, { merge: true }),
      );
    }
    await Promise.all(tasks);

    return next;
  });
}
