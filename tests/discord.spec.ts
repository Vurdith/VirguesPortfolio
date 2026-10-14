import fs from "node:fs/promises";
import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";

import { MIN_SUBSCRIBERS_SHOWN, readStats } from "@/lib/discordRewards";
import { discordHandleIn } from "@/lib/quoteLimits";

import { DISCORD_STUB_URL, STATS, SUBSCRIBED_HANDLE, type FollowUpCall } from "./stub-discord";

const PASSWORDS = ["second-e2e-password", "first-e2e-password", "reviews-e2e-password"];
const CRON = { authorization: "Bearer e2e-cron-secret" };
const DAY_MS = 24 * 60 * 60 * 1000;
const WORK_SLUG = "discord-latest-work";
const CHATS_FILE = ".e2e/chats.json";
const DB_FILE = ".e2e/db.json";

// 1x1 transparent PNG, served in place of Discord's avatars.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test.describe.configure({ mode: "serial" });

async function signIn(request: APIRequestContext) {
  for (const password of PASSWORDS) {
    if ((await request.post("/api/auth/login", { data: { password } })).ok()) return;
  }
  const setup = await request.post("/api/auth/setup", {
    data: { password: PASSWORDS[1], setupToken: "e2e-setup-token" },
  });
  expect(setup.ok()).toBeTruthy();
}

type StoredThread = { id: string; status: string; updatedAt: string; resolvedAt?: string; followupAt?: string; brief: { contact: string; summary: string } };
type StoredQuote = { id: string; followupAt?: string };

const readChats = async () => JSON.parse(await fs.readFile(CHATS_FILE, "utf8")) as { threads: StoredThread[] };
const readQuotes = async () => (JSON.parse(await fs.readFile(DB_FILE, "utf8")) as { quotes: StoredQuote[] }).quotes;
const followUps = async (request: APIRequestContext) => (await (await request.get(`${DISCORD_STUB_URL}/follow-ups`)).json()) as FollowUpCall[];

let admin: BrowserContext;
let workId = "";

test.beforeAll(async ({ browser }) => {
  admin = await browser.newContext();
  await signIn(admin.request);
  // Publishing a work also refreshes the cached home page, which was built before the stand-in was up.
  const res = await admin.request.post("/api/admin/works", {
    data: { title: "Discord latest work", slug: WORK_SLUG, tags: ["E2E"], published: true, media: { kind: "image", srcType: "url", src: "/og.jpg" } },
  });
  expect(res.status(), await res.text()).toBe(201);
  workId = ((await res.json()) as { id: string }).id;
});

test.afterAll(async () => {
  if (workId) await admin.request.delete(`/api/admin/works/${workId}`);
  await admin.close();
});

test("a Discord handle is only read from a contact that names one", () => {
  expect(discordHandleIn("Discord: e2e_handle")).toBe("e2e_handle");
  expect(discordHandleIn("me@studio.com, @some.one on Discord")).toBe("some.one");
  expect(discordHandleIn("discord id is 872621837572538408")).toBe("872621837572538408");
  expect(discordHandleIn("X: @virgueui / Discord - old_name#1234")).toBe("old_name#1234");
  // Nothing to go on, or more than one candidate: no guess.
  expect(discordHandleIn("Discord")).toBeNull();
  expect(discordHandleIn("me@studio.com")).toBeNull();
  expect(discordHandleIn("some_handle")).toBeNull();
  expect(discordHandleIn("Discord: John Smith")).toBeNull();
  expect(discordHandleIn("discord me@studio.com")).toBeNull();
});

test("stats from the service are cleaned before they are shown", () => {
  expect(readStats(null)).toBeNull();
  expect(readStats("down for maintenance")).toBeNull();
  expect(readStats([])).toBeNull();
  expect(readStats({})).toEqual({ subscribers: 0, invites: 0, wall: [], drops: [], rewards: [] });

  const stats = readStats({
    subscribers: "many",
    invites: 7.9,
    wall: [
      { name: "  Kept  ", avatar: "https://cdn.discordapp.com/avatars/1/a.png", invites: 2, rank: "Gold" },
      { name: "Elsewhere", avatar: "https://example.com/a.png", invites: -4 },
      { avatar: "https://cdn.discordapp.com/avatars/1/a.png" },
      "nonsense",
      ...Array.from({ length: 40 }, (_, i) => ({ name: `Filler ${i}` })),
    ],
    drops: [{ title: "Icon pack", at: "2026-10-01T10:00:00.000Z", url: "https://example.com/secret.zip" }, { description: "no title" }],
    rewards: [{ title: "5% voucher", cost: 3, detail: "Off your next order." }, { title: "Free", cost: 0 }, { cost: 5 }],
  })!;
  expect(stats.subscribers).toBe(0);
  expect(stats.invites).toBe(7);
  expect(stats.wall).toHaveLength(24);
  expect(stats.wall[0]).toEqual({ name: "Kept", avatar: "https://cdn.discordapp.com/avatars/1/a.png", invites: 2, rank: "Gold" });
  expect(stats.wall[1]).toEqual({ name: "Elsewhere", avatar: "", invites: 0, rank: "" });
  expect(stats.drops).toEqual([{ title: "Icon pack", at: "2026-10-01T10:00:00.000Z" }]);
  expect(stats.rewards).toEqual([{ title: "5% voucher", cost: 3, detail: "Off your next order." }]);
});

test("the home page shows the subscriber count, the rewards, the wall and the drops", async ({ page }) => {
  expect(STATS.subscribers).toBeGreaterThanOrEqual(MIN_SUBSCRIBERS_SHOWN);
  await page.route("https://cdn.discordapp.com/**", (route) => route.fulfill({ contentType: "image/png", body: PNG }));
  // The page is cached, so wait for the copy made after the work was published.
  await expect
    .poll(async () => (await (await page.request.get("/")).text()).includes('id="rewards"'), { timeout: 100_000, intervals: [1000] })
    .toBe(true);
  await page.route("**/intro-loader-*.mp4", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "ENTER SITE" }).click();

  const section = page.locator("#rewards");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText("128 developers get Virguê’s work in their Discord.")).toBeVisible();
  await expect(section.getByRole("link", { name: /SUBSCRIBE ON DISCORD/ })).toHaveAttribute("href", `${DISCORD_STUB_URL}/api/subscribe`);

  // The rewards come from the service, cheapest first, in place of the built-in ones.
  const rewards = section.locator("li", { hasText: /POINT/ });
  await expect(rewards).toHaveCount(3);
  await expect(rewards.nth(1)).toContainText("4 POINTS");
  await expect(rewards.nth(1)).toContainText("Icon recolour");
  await expect(section.getByText("15% voucher")).toHaveCount(0);

  // An entry without a name is left out; an avatar that is not Discord's becomes an initial.
  const wall = section.locator("ol > li");
  await expect(wall).toHaveCount(3);
  await expect(wall.nth(0)).toContainText("Top Inviter");
  await expect(wall.nth(0)).toContainText("GOLD");
  await expect(wall.nth(0)).toContainText("12 INVITES");
  await expect(wall.nth(1)).toContainText("1 INVITE");
  const avatar = wall.nth(0).locator("img");
  await expect(avatar).toHaveAttribute("src", "https://cdn.discordapp.com/embed/avatars/0.png");
  await expect(avatar).toHaveAttribute("loading", "lazy");
  await expect(avatar).toHaveAttribute("referrerpolicy", "no-referrer");
  await expect(avatar).toHaveAttribute("width", "40");
  await expect(wall.nth(2).locator("img")).toHaveCount(0);

  await expect(section.getByText("Inventory icon pack")).toBeVisible();
  await expect(section.getByText("HUD starter kit")).toBeVisible();
  // Only titles: no descriptions and nothing to download.
  await expect(section.getByText("Forty icons.")).toHaveCount(0);
});

test("a finished brief offers Discord updates, and a week later gets one follow-up", async ({ browser, request }) => {
  const ip = "10.77.0.1";
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
  const post = (path: string, data: unknown) => context.request.post(path, { data, headers: { "x-forwarded-for": ip } });
  const say = async (message: string) => (await (await post("/api/chat/message", { message, images: [] })).json()) as { thread: { ended: boolean } | null };

  await post("/api/chat/start", {});
  // While the chat is open there is nothing about Discord in it.
  const page = await context.newPage();
  await page.goto("/chat");
  await expect(page.getByPlaceholder("Type your message")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Discord updates" })).toHaveCount(0);

  for (const text of ["one", "two", "three", "four"]) await say(`discord-contact ${text}`);
  await say("discord-contact ready to wrap up");
  expect((await say("discord-contact that is everything")).thread?.ended).toBe(true);

  await page.reload();
  await expect(page.getByText(/Your brief is with Virguê/)).toBeVisible();
  const prompt = page.getByRole("complementary", { name: "Discord updates" });
  await expect(prompt).toContainText("Get Virguê’s new work in your Discord");
  await expect(prompt).toContainText("free drops and invite rewards");
  await expect(prompt.getByRole("link", { name: "SUBSCRIBE" })).toHaveAttribute("href", `${DISCORD_STUB_URL}/api/subscribe`);
  await expect(page.getByPlaceholder("Type your message")).toHaveCount(0);
  await page.close();
  await context.close();

  // The summary is written just after the last reply; wait for it so nothing else is still saving.
  const mine = (threads: StoredThread[]) => threads.find((thread) => thread.status === "resolved" && thread.brief.contact === `Discord: ${SUBSCRIBED_HANDLE}`)!;
  await expect.poll(async () => mine((await readChats()).threads)?.brief.summary ?? "", { timeout: 15_000 }).toContain("SUMMARY STUB");

  // Too soon: nobody is messaged the day they finish.
  const before = (await followUps(request)).length;
  const early = await request.get("/api/cron/chats", { headers: CRON });
  expect(await early.json()).toMatchObject({ followedUp: 0 });
  expect(await followUps(request)).toHaveLength(before);

  // Make the brief eight days old, and add quote requests: one due, one far too old, one with no Discord handle.
  const ago = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();
  const chats = await readChats();
  const thread = mine(chats.threads);
  thread.resolvedAt = thread.updatedAt = ago(8);
  await fs.writeFile(CHATS_FILE, JSON.stringify(chats), "utf8");

  const quote = (id: string, days: number, contact: Record<string, string>) => ({
    id,
    name: "Quote Tester",
    ...contact,
    service: "Game UI",
    budget: "Not sure yet",
    deadline: "Flexible",
    details: "A quote request written for the follow-up test.",
    status: "new",
    createdAt: ago(days),
  });
  const db = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as { quotes: unknown[] };
  db.quotes.unshift(quote("q_due", 9, { discord: "not_subscribed" }), quote("q_old", 40, { discord: "long_ago" }), quote("q_email", 9, { email: "quote@example.com" }));
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");

  const swept = await request.get("/api/cron/chats", { headers: CRON });
  expect(swept.status()).toBe(200);
  // Only the subscriber was messaged; the other answer is "not sent", which is not an error.
  expect(await swept.json()).toMatchObject({ followedUp: 1 });

  const calls = (await followUps(request)).slice(before);
  expect(calls.map((call) => call.key)).toEqual(["quote:q_due", `brief:${thread.id}`]);
  expect(calls[0]).toMatchObject({ discord: "not_subscribed", name: "Quote Tester", about: "Game UI" });
  expect(calls[1]).toMatchObject({
    discord: SUBSCRIBED_HANDLE,
    name: "E2E Tester",
    about: "Survival game inventory",
    work: { title: "Discord latest work", url: `https://virgue.work/work/${WORK_SLUG}`, image: "https://virgue.work/og.jpg" },
  });

  // Both attempts are recorded, whatever the answer, and the others are untouched.
  expect(mine((await readChats()).threads).followupAt).toBeTruthy();
  const quotes = await readQuotes();
  expect(quotes.find((stored) => stored.id === "q_due")?.followupAt).toBeTruthy();
  expect(quotes.find((stored) => stored.id === "q_old")?.followupAt).toBeUndefined();
  expect(quotes.find((stored) => stored.id === "q_email")?.followupAt).toBeUndefined();

  // The next sweep asks for nothing.
  expect(await (await request.get("/api/cron/chats", { headers: CRON })).json()).toMatchObject({ followedUp: 0 });
  expect(await followUps(request)).toHaveLength(before + 2);

  // Tidy up, so the quotes do not show in other tests' admin pages.
  const after = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as { quotes: StoredQuote[] };
  after.quotes = after.quotes.filter((stored) => !["q_due", "q_old", "q_email"].includes(stored.id));
  await fs.writeFile(DB_FILE, JSON.stringify(after, null, 2), "utf8");
});
