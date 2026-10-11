import fs from "node:fs/promises";
import path from "node:path";

import { createMutex } from "./mutex";
import { DEFAULT_DB, type Db } from "./types";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "db.json");
const DB_DIR = path.dirname(DB_PATH);

const runExclusive = createMutex();

async function writeAtomic(targetPath: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  const tmp = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, contents, "utf8");

  try {
    await fs.rename(tmp, targetPath);
  } catch {
    // Windows can be strict about renaming over existing files; fall back gracefully.
    try {
      await fs.rm(targetPath, { force: true });
    } catch {
      // ignore
    }
    try {
      await fs.rename(tmp, targetPath);
    } catch {
      await fs.copyFile(tmp, targetPath);
      await fs.rm(tmp, { force: true });
    }
  }
}

export async function ensureDbFile(): Promise<void> {
  try {
    await fs.access(DB_PATH);
  } catch {
    const json = JSON.stringify(DEFAULT_DB, null, 2);
    try {
      await writeAtomic(DB_PATH, json);
    } catch (err) {
      console.warn("Failed to create DB file (likely read-only FS):", err);
      // On Vercel, we can't write, but we should at least not crash the whole app.
    }
  }
}

/** Reads the file and throws if it is unreadable or corrupt, so a write never overwrites it. */
async function readDbStrict(): Promise<Db> {
  await ensureDbFile();
  try {
    const db = JSON.parse(await fs.readFile(DB_PATH, "utf8")) as Db;
    // Files written before quotes existed have no such list.
    db.quotes ??= [];
    return db;
  } catch (err) {
    // Still missing after ensureDbFile means a read-only disk: start from an empty database.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(DEFAULT_DB);
    throw err;
  }
}

/** Public reads degrade to an empty database instead of failing the page. */
export async function readDb(): Promise<Db> {
  try {
    return await readDbStrict();
  } catch (err) {
    console.error("Database read failed, falling back to default:", err);
    return structuredClone(DEFAULT_DB);
  }
}

export async function writeDb(
  mutate: (db: Db) => void | Db | Promise<void | Db>,
): Promise<Db> {
  return runExclusive(async () => {
    const db = await readDbStrict();
    const maybeNext = await mutate(db);
    const next = (maybeNext ?? db) as Db;

    try {
      await fs.mkdir(DB_DIR, { recursive: true });
      await writeAtomic(DB_PATH, JSON.stringify(next, null, 2));
    } catch (err) {
      // Read-only deployments (no Firestore, no writable disk) still answer this request.
      console.error("Database write failed:", err);
    }

    return next;
  });
}
