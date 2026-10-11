import { hasFirebaseAdminConfig } from "@/lib/firebase/admin";

import { ensureDbFile, readDb as readFileDb, writeDb as writeFileDb } from "./file";
import { readFirestoreAuth, readFirestoreDb, writeFirestoreDb } from "./firestore";
import type { Db } from "./types";

export { ensureDbFile };

export async function readDb(): Promise<Db> {
  if (hasFirebaseAdminConfig()) {
    return readFirestoreDb();
  }

  return readFileDb();
}

/** Admin auth only. On Firestore this skips reading every work, review and quote. */
export async function readAuth(): Promise<Db["auth"]> {
  if (hasFirebaseAdminConfig()) {
    return readFirestoreAuth();
  }

  return (await readFileDb()).auth;
}

export async function writeDb(
  mutate: (db: Db) => void | Db | Promise<void | Db>,
): Promise<Db> {
  if (hasFirebaseAdminConfig()) {
    return writeFirestoreDb(mutate);
  }

  return writeFileDb(mutate);
}
