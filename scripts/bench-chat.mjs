// Runs one scripted haggling conversation against a locally running site, so models can be compared.
//
//   OPENROUTER_API_KEY=... OPENROUTER_MODEL=qwen/qwen3.7-flash npm run dev     (one terminal)
//   node scripts/bench-chat.mjs http://localhost:3000                          (another)
//
// It prints every reply with its length, the price on the table after each turn, and the total cost,
// and writes the transcript to bench-<model>.txt. Run it once per model and read the transcripts.
import fs from "node:fs";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
const headers = { "content-type": "application/json", "x-forwarded-for": ip };
const jar = [];

const call = async (path, body) => {
  const res = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: { ...headers, cookie: jar.join("; ") },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const cookie of res.headers.getSetCookie?.() ?? []) jar.push(cookie.split(";")[0]);
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
};

const CUSTOMER = [
  "Hey, I need UI for my Roblox obby game. Main menu, shop, settings and a HUD.",
  "It's colourful and cartoony, mostly kids and teens. Mobile and PC.",
  "Shop has gamepasses and cosmetics. Settings is just sound and graphics.",
  "I like the look of Blox Fruits menus but I don't want a copy. Cleaner.",
  "How much would that cost?",
  "That's expensive. My friend said he'd do it for a lot less.",
  "I only have about half of that. Can you do better?",
  "Still too much for me honestly. What's your best price?",
  "What if I order all 4 screens and pay up front?",
  "Ok. Deadline is about 3 weeks. I'm Sam, sam@example.com.",
  "That's everything.",
];

const started = await call("/api/chat/start", {});
if (!started.ok) {
  console.error("Could not start a chat:", started.status, started.data?.error);
  process.exit(1);
}

const out = [];
let words = 0;
let replies = 0;
let failures = 0;
for (const message of CUSTOMER) {
  const res = await call("/api/chat/message", { message, images: [] });
  out.push(`CUSTOMER: ${message}`);
  if (!res.ok) {
    failures += 1;
    out.push(`  !! ${res.status} ${res.data?.error ?? ""}`);
    console.log(`CUSTOMER: ${message}\n  !! ${res.status} ${res.data?.error ?? ""}\n`);
    continue;
  }
  const reply = res.data.thread.messages.at(-1).content;
  const n = reply.split(/\s+/).filter(Boolean).length;
  words += n;
  replies += 1;
  out.push(`AI (${n} words): ${reply}`);
  console.log(`CUSTOMER: ${message}\nAI (${n} words): ${reply}\n`);
  if (res.data.thread.ended) break;
}

const view = await call("/api/chat");
const summary = `${replies} replies, ${failures} failed, ${replies ? Math.round(words / replies) : 0} words per reply on average`;
console.log(summary);
console.log("Cost and the final price are in Admin > Briefs. Transcript saved.");

const model = process.env.OPENROUTER_MODEL || "default";
const file = `bench-${model.replace(/[^a-z0-9.]+/gi, "-")}.txt`;
fs.writeFileSync(file, `${model}\n${summary}\n\n${out.join("\n\n")}\n`);
void view;
