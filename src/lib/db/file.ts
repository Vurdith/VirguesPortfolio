import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_DB, type Db } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "db.json");
const DB_DIR = path.dirname(DB_PATH);

let chain: Promise<void> = Promise.resolve();

async function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const prev = chain;
  let release!: () => void;
  chain = new Promise<void>((resolve) => {
    release = resolve;
  });

  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

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
    await writeAtomic(DB_PATH, json);
  }
}

export async function readDb(): Promise<Db> {
  await ensureDbFile();

  const raw = await fs.readFile(DB_PATH, "utf8");
  try {
    return JSON.parse(raw) as Db;
  } catch {
    // If the file was corrupted, reset it rather than crashing the app.
    const json = JSON.stringify(DEFAULT_DB, null, 2);
    await writeAtomic(DB_PATH, json);
    return DEFAULT_DB;
  }
}

export async function writeDb(
  mutate: (db: Db) => void | Db | Promise<void | Db>,
): Promise<Db> {
  return runExclusive(async () => {
    await fs.mkdir(DB_DIR, { recursive: true });
    const db = await readDb();
    const maybeNext = await mutate(db);
    const next = (maybeNext ?? db) as Db;
    await writeAtomic(DB_PATH, JSON.stringify(next, null, 2));
    return next;
  });
}



