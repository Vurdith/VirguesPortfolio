import fs from "node:fs/promises";
import path from "node:path";

import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { createMutex } from "@/lib/db/mutex";

import type { ChatThread } from "./types";

// Conversations live apart from the portfolio database: every message rewrites its thread, and that
// should not mean reading every work, review and quote each time.
const COLLECTION = "chats";
const META_COLLECTION = "chatMeta";
const FILE_PATH = path.join(
  path.dirname(process.env.DB_PATH || path.join(process.cwd(), "data", "db.json")),
  "chats.json",
);

type FileData = { threads: ChatThread[]; days: Record<string, number> };

const runExclusive = createMutex();

function chats() {
  return getFirebaseDb().collection("portfolio").doc("main").collection(COLLECTION);
}
function meta() {
  return getFirebaseDb().collection("portfolio").doc("main").collection(META_COLLECTION);
}

async function readFile(): Promise<FileData> {
  try {
    const data = JSON.parse(await fs.readFile(FILE_PATH, "utf8")) as Partial<FileData>;
    return { threads: data.threads ?? [], days: data.days ?? {} };
  } catch {
    return { threads: [], days: {} };
  }
}
async function writeFile(data: FileData) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data), "utf8");
}

const newest = (a: ChatThread, b: ChatThread) => b.updatedAt.localeCompare(a.updatedAt);

export async function getThread(id: string): Promise<ChatThread | null> {
  if (hasFirebaseAdminConfig()) {
    const doc = await chats().doc(id).get();
    return doc.exists ? (doc.data() as ChatThread) : null;
  }
  return (await readFile()).threads.find((thread) => thread.id === id) ?? null;
}

export async function saveThread(thread: ChatThread): Promise<void> {
  if (hasFirebaseAdminConfig()) {
    // Firestore rejects undefined values, so fields cleared to undefined are dropped here.
    await chats().doc(thread.id).set(JSON.parse(JSON.stringify(thread)));
    return;
  }
  await runExclusive(async () => {
    const data = await readFile();
    const index = data.threads.findIndex((existing) => existing.id === thread.id);
    if (index === -1) data.threads.unshift(thread);
    else data.threads[index] = thread;
    await writeFile(data);
  });
}

/**
 * Adds one uploaded image to a conversation without rewriting the rest of it. Several images are
 * uploaded at once, and saving the whole conversation from each upload let them overwrite one another.
 */
export async function addUpload(id: string, imageId: string): Promise<void> {
  if (hasFirebaseAdminConfig()) {
    await chats().doc(id).update({ uploads: FieldValue.arrayUnion(imageId) });
    return;
  }
  await runExclusive(async () => {
    const data = await readFile();
    const thread = data.threads.find((existing) => existing.id === id);
    if (!thread) throw new Error("Conversation not found.");
    if (!thread.uploads.includes(imageId)) thread.uploads.push(imageId);
    await writeFile(data);
  });
}

/** The visitor's most recent conversation, whatever its state. */
export async function latestThreadFor(ownerHash: string): Promise<ChatThread | null> {
  if (hasFirebaseAdminConfig()) {
    const snapshot = await chats().where("ownerHash", "==", ownerHash).get();
    return snapshot.docs.map((doc) => doc.data() as ChatThread).sort(newest)[0] ?? null;
  }
  return (await readFile()).threads.filter((thread) => thread.ownerHash === ownerHash).sort(newest)[0] ?? null;
}

export async function listThreads(): Promise<ChatThread[]> {
  if (hasFirebaseAdminConfig()) {
    const snapshot = await chats().get();
    return snapshot.docs.map((doc) => doc.data() as ChatThread).sort(newest);
  }
  return (await readFile()).threads.sort(newest);
}

/** Conversations touched after `since`. One cheap query, so the admin page can poll it often. */
export async function listThreadsSince(since: string): Promise<ChatThread[]> {
  if (hasFirebaseAdminConfig()) {
    const snapshot = await chats().where("updatedAt", ">", since).get();
    return snapshot.docs.map((doc) => doc.data() as ChatThread).sort(newest);
  }
  return (await readFile()).threads.filter((thread) => thread.updatedAt > since).sort(newest);
}

export async function deleteThread(id: string): Promise<ChatThread | null> {
  const existing = await getThread(id);
  if (!existing) return null;
  if (hasFirebaseAdminConfig()) {
    await chats().doc(id).delete();
  } else {
    await runExclusive(async () => {
      const data = await readFile();
      data.threads = data.threads.filter((thread) => thread.id !== id);
      await writeFile(data);
    });
  }
  return existing;
}

/** Counts one assistant turn against today's budget and returns the new total. */
export async function countTurnToday(): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  if (hasFirebaseAdminConfig()) {
    const ref = meta().doc(day);
    const db = getFirebaseDb();
    return db.runTransaction(async (transaction) => {
      const current = ((await transaction.get(ref)).data()?.turns as number | undefined) ?? 0;
      transaction.set(ref, { turns: current + 1 });
      return current + 1;
    });
  }
  return runExclusive(async () => {
    const data = await readFile();
    data.days[day] = (data.days[day] ?? 0) + 1;
    for (const key of Object.keys(data.days)) if (key < day) delete data.days[key];
    await writeFile(data);
    return data.days[day];
  });
}
