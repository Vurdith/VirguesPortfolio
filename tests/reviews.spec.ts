import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

// A 1x1 PNG, enough to pass the real-bytes check and be re-encoded.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const KNOWN_PASSWORDS = ["second-e2e-password", "first-e2e-password", "reviews-e2e-password"];

// Each API call gets its own "client" so the in-memory rate limits never trip across tests.
let ipCounter = 0;
const freshIp = () => ({ "x-forwarded-for": `10.20.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}` });

test.describe.configure({ mode: "serial" });

let admin: BrowserContext;
/** What the reviewer's browser stored, so a later test can act as the same person. */
let reviewerTokens = "{}";

/** Signs in with whichever password the earlier specs left behind, or runs first-time setup. */
async function signIn(request: APIRequestContext) {
  for (const password of KNOWN_PASSWORDS) {
    const res = await request.post("/api/auth/login", { data: { password } });
    if (res.ok()) return;
  }
  const res = await request.post("/api/auth/setup", {
    data: { password: "reviews-e2e-password", setupToken: "e2e-setup-token" },
  });
  expect(res.ok()).toBeTruthy();
}

test.beforeAll(async ({ browser }) => {
  admin = await browser.newContext();
  await signIn(admin.request);
});

test.afterAll(async () => {
  await admin.close();
});

async function openHome(page: Page) {
  await page.route("**/intro-loader-*.mp4", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "ENTER SITE" }).click();
}

/** The home page is cached for up to a minute, so wait for a just-approved review to show up. */
async function openHomeWithReview(page: Page, name: string) {
  await openHome(page);
  const card = page.getByRole("button", { name: new RegExp(`thread for ${name}`) });
  for (let attempt = 0; attempt < 4 && !(await card.count()); attempt++) {
    await page.waitForTimeout(1500);
    await openHome(page);
  }
  return card;
}

async function upload(request: APIRequestContext, buffer: Buffer, name = "a.png", mimeType = "image/png") {
  return request.post("/api/reviews/upload", {
    headers: freshIp(),
    multipart: { file: { name, mimeType, buffer } },
  });
}

async function patchReview(id: string, status: string) {
  const res = await admin.request.patch(`/api/admin/reviews/${id}`, { data: { status } });
  expect(res.ok()).toBeTruthy();
}

type ApiReview = {
  id: string;
  name: string;
  replies?: { id: string; author: string; status: string; text: string }[];
};
async function adminReviews() {
  return ((await (await admin.request.get("/api/admin/reviews")).json()) as { reviews: ApiReview[] }).reviews;
}
const findByName = async (name: string) => (await adminReviews()).find((r) => r.name === name);

test("uploads are validated from the real bytes", async ({ request }) => {
  const ok = await upload(request, PNG);
  expect(ok.status()).toBe(201);
  const body = (await ok.json()) as { id: string; url: string };
  expect(body.id).toMatch(/^[0-9a-f-]{36}\.webp$/);
  expect((await request.get(body.url)).headers()["content-type"]).toBe("image/webp");

  // Text posing as an image, and an SVG posing as a PNG.
  expect((await upload(request, Buffer.from("just some text, not an image"), "x.png")).status()).toBe(415);
  expect((await upload(request, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'), "x.png")).status()).toBe(415);
  // GIF header with garbage after it.
  expect((await upload(request, Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(64, 7)]), "x.gif", "image/gif")).status()).toBe(415);
  // Over 5MB.
  expect((await upload(request, Buffer.concat([PNG, Buffer.alloc(5.5 * 1024 * 1024)]))).status()).toBe(413);
  // Not multipart at all.
  const raw = await request.post("/api/reviews/upload", { headers: freshIp(), data: { file: "x" } });
  expect(raw.status()).toBe(415);
});

test("a review needs real, uploaded images and valid fields", async ({ request }) => {
  const base = { name: "Bad Input", rating: 5, text: "Perfectly fine review text." };
  const post = (extra: object) => request.post("/api/reviews", { headers: freshIp(), data: { ...base, ...extra } });

  expect((await post({ attachments: ["../../etc/passwd"] })).status()).toBe(400);
  expect((await post({ attachments: ["http://evil.example/x.webp"] })).status()).toBe(400);
  expect((await post({ attachments: ["00000000-0000-4000-8000-000000000000.webp"] })).status()).toBe(400);
  const five = Array.from({ length: 5 }, () => "00000000-0000-4000-8000-000000000000.webp");
  expect((await post({ attachments: five })).status()).toBe(400);
  expect((await post({ rating: 9 })).status()).toBe(400);
  expect((await post({ text: "short" })).status()).toBe(400);
  expect(await findByName("Bad Input")).toBeUndefined();
});

test("a honeypot review is accepted silently but not stored", async ({ request }) => {
  const res = await request.post("/api/reviews", {
    headers: freshIp(),
    data: { name: "Review Bot", rating: 5, text: "Buy cheap watches at my store today.", company: "Acme" },
  });
  expect(res.status()).toBe(201);
  expect(await findByName("Review Bot")).toBeUndefined();
});

test("the review form validates inline, accepts an image, and confirms", async ({ page }) => {
  await openHome(page);
  await page.getByRole("button", { name: /LEAVE A REVIEW/ }).click();
  const dialog = page.getByRole("dialog", { name: "Leave a review." });
  await expect(dialog).toBeVisible();

  // Empty submit shows what is missing instead of staying silent.
  await dialog.getByRole("button", { name: /SUBMIT/ }).click();
  await expect(dialog.getByText("Add your name.")).toBeVisible();
  await expect(dialog.getByText("Choose a rating.")).toBeVisible();

  await dialog.getByLabel("NAME").fill("E2E Reviewer");
  // Keyboard rating: the first arrow picks one star, three more reach four.
  await dialog.getByRole("radio", { name: /^1 star/ }).focus();
  await page.keyboard.press("ArrowRight", { delay: 20 });
  await page.keyboard.press("ArrowRight", { delay: 20 });
  await page.keyboard.press("ArrowRight", { delay: 20 });
  await page.keyboard.press("ArrowRight", { delay: 20 });
  await expect(dialog.getByRole("radio", { name: /^4 stars/ })).toBeChecked();

  await dialog.getByLabel("MESSAGE").fill("Clean work and fast replies, would hire again.");
  await expect(dialog.getByText(/^46\/420$/)).toBeVisible();

  // The picker refuses a wrong type client-side...
  await dialog.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
  await expect(dialog.getByText(/Use a JPG, PNG, WebP or GIF/)).toBeVisible();
  // ...and uploads a real image.
  await dialog.locator('input[type="file"]').setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: PNG });
  await expect(dialog.getByRole("button", { name: /^Remove shot\.png/ })).toBeVisible();
  await expect(dialog.getByText("1/4")).toBeVisible();

  await dialog.getByRole("button", { name: /SUBMIT/ }).click();
  await expect(dialog.getByText("Thanks — it'll appear once approved.")).toBeVisible();

  // Focus moves to DONE; Escape closes the dialog.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Unapproved: not in the public list.
  const publicList = (await (await page.request.get("/api/reviews")).json()) as { reviews: ApiReview[] };
  expect(publicList.reviews.some((r) => r.name === "E2E Reviewer")).toBe(false);
  const stored = await findByName("E2E Reviewer");
  expect(stored).toBeTruthy();
  // The reviewer's key is in this browser, never in the data the admin or public gets back.
  reviewerTokens = await page.evaluate(() => localStorage.getItem("ui:reviewTokens") ?? "{}");
  expect(Object.keys(JSON.parse(reviewerTokens))).toContain(stored!.id);
  expect(JSON.stringify(await adminReviews())).not.toMatch(/tokenHash|ipHash/);
});

test("replies are refused without the reviewer's token", async ({ request }) => {
  const review = (await findByName("E2E Reviewer"))!;
  await patchReview(review.id, "approved");

  const reply = (data: object) => request.post(`/api/reviews/${review.id}/replies`, { headers: freshIp(), data });
  expect((await reply({ text: "No token at all." })).status()).toBe(400);
  expect((await reply({ text: "Guessed token.", token: "x".repeat(43) })).status()).toBe(403);

  // Pending reviews do not even reveal themselves.
  const pending = await request.post("/api/reviews", {
    headers: freshIp(),
    data: { name: "Still Pending", rating: 3, text: "Waiting in the queue for approval." },
  });
  const { id, token } = (await pending.json()) as { id: string; token: string };
  expect((await request.get(`/api/reviews/${id}`)).status()).toBe(404);
  const early = await request.post(`/api/reviews/${id}/replies`, { headers: freshIp(), data: { text: "Too early.", token } });
  expect(early.status()).toBe(404);
});

test("approved review opens as a thread with its image; replies are moderated", async ({ page, browser }) => {
  const review = (await findByName("E2E Reviewer"))!;

  // The owner replies; it is public straight away.
  const owner = await admin.request.post(`/api/admin/reviews/${review.id}/replies`, { data: { text: "Thank you, it was a pleasure." } });
  expect(owner.status()).toBe(201);

  await page.addInitScript((saved) => localStorage.setItem("ui:reviewTokens", saved), reviewerTokens);
  await (await openHomeWithReview(page, "E2E Reviewer")).click();
  const thread = page.getByRole("dialog", { name: "E2E Reviewer" });
  await expect(thread).toBeVisible();
  await expect(thread.getByText("Clean work and fast replies, would hire again.")).toBeVisible();
  await expect(thread.getByText("Thank you, it was a pleasure.")).toBeVisible();
  await expect(thread.getByText("OWNER", { exact: true })).toBeVisible();

  // Attachment thumbnail opens a lightbox, and Escape closes only the lightbox.
  const thumb = thread.getByRole("button", { name: "Open image 1 of 1" });
  await expect(thumb.locator("img")).toHaveJSProperty("complete", true);
  await thumb.click();
  const lightbox = page.getByRole("dialog", { name: /Image 1 of 1/ });
  await expect(lightbox).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
  await expect(thread).toBeVisible();

  // The original reviewer (token in this browser) replies; it waits for approval.
  await thread.getByRole("button", { name: /WRITE A REPLY/ }).click();
  await thread.getByLabel("REPLY", { exact: true }).fill("One more thing: the icons were great.");
  await thread.locator('input[type="file"]').setInputFiles({ name: "extra.png", mimeType: "image/png", buffer: PNG });
  await expect(thread.getByRole("button", { name: /^Remove extra\.png/ })).toBeVisible();
  await thread.getByRole("button", { name: /^REPLY/ }).last().click();
  await expect(thread.getByText("One more thing: the icons were great.")).toBeVisible();
  await expect(thread.getByText("AWAITING APPROVAL")).toBeVisible();

  // A stranger sees the owner reply but neither the pending reply nor its image.
  const stranger = await browser.newContext();
  const open = (await (await stranger.request.get(`/api/reviews/${review.id}`)).json()) as {
    review: { replies: { text: string; attachments?: unknown[] }[] };
  };
  expect(open.review.replies.map((r) => r.text)).toEqual(["Thank you, it was a pleasure."]);
  expect(JSON.stringify(open)).not.toMatch(/tokenHash|ipHash|"token"/);

  // Admin approves the reply: now everyone sees it, image included.
  const stored = (await findByName("E2E Reviewer"))!;
  const pendingReply = stored.replies!.find((r) => r.author === "client")!;
  expect(pendingReply.status).toBe("pending");
  const approve = await admin.request.patch(`/api/admin/reviews/${review.id}/replies/${pendingReply.id}`, { data: { status: "approved" } });
  expect(approve.ok()).toBeTruthy();

  const after = (await (await stranger.request.get(`/api/reviews/${review.id}`)).json()) as {
    review: { replies: { text: string; attachments?: unknown[] }[] };
  };
  expect(after.review.replies.map((r) => r.text)).toEqual(["Thank you, it was a pleasure.", "One more thing: the icons were great."]);
  expect(after.review.replies[1].attachments).toHaveLength(1);
  await stranger.close();
});

test("rejecting a review hides it, its thread and its images from the public", async ({ request }) => {
  const review = (await findByName("E2E Reviewer"))!;
  await patchReview(review.id, "rejected");
  expect((await request.get(`/api/reviews/${review.id}`)).status()).toBe(404);
  const list = (await (await request.get("/api/reviews")).json()) as { reviews: ApiReview[] };
  expect(list.reviews.some((r) => r.id === review.id)).toBe(false);
  await patchReview(review.id, "approved");
});

test("moderation page: filter tabs with counts, approve, reply as owner, delete", async () => {
  // A fresh pending review to work on.
  const created = await admin.request.post("/api/reviews", {
    headers: freshIp(),
    data: { name: "Queue Item", rating: 2, text: "Needs a decision from the owner." },
  });
  expect(created.status()).toBe(201);

  const page = await admin.newPage();
  await page.goto("/admin/reviews");
  const pendingTab = page.getByRole("tab", { name: /PENDING/ });
  await expect(pendingTab).toHaveAttribute("aria-selected", "true");
  const card = page.getByRole("article", { name: "Review by Queue Item" });
  await expect(card).toBeVisible();

  // Keyboard on the tablist.
  await pendingTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /APPROVED/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(pendingTab).toHaveAttribute("aria-selected", "true");

  await card.getByRole("button", { name: "APPROVE", exact: true }).click();
  await expect(card).toBeHidden();

  await page.getByRole("tab", { name: /^APPROVED/ }).click();
  const approved = page.getByRole("article", { name: "Review by Queue Item" });
  await approved.getByRole("button", { name: /THREAD/ }).click();
  await approved.getByLabel("REPLY AS OWNER").fill("Thanks for the honest feedback.");
  await approved.getByRole("button", { name: "POST REPLY" }).click();
  await expect(approved.getByText("Thanks for the honest feedback.")).toBeVisible();
  expect((await findByName("Queue Item"))!.replies).toHaveLength(1);

  page.once("dialog", (d) => void d.accept());
  await approved.getByRole("button", { name: "DELETE", exact: true }).first().click();
  await expect(approved).toBeHidden();
  expect(await findByName("Queue Item")).toBeUndefined();

  // The server agrees after a reload (the changes were not just optimistic).
  await page.reload();
  await expect(page.getByRole("article", { name: "Review by Queue Item" })).toHaveCount(0);
  await page.close();
});

test("admin review endpoints need a session", async ({ request }) => {
  expect((await request.get("/api/admin/reviews")).status()).toBe(401);
  expect((await request.patch("/api/admin/reviews/x", { data: { status: "approved" } })).status()).toBe(401);
  expect((await request.post("/api/admin/reviews/x/replies", { data: { text: "hi there" } })).status()).toBe(401);
  expect((await request.delete("/api/admin/reviews/x/replies/y")).status()).toBe(401);
  expect((await request.delete("/api/admin/reviews/x/attachments/y")).status()).toBe(401);
});
