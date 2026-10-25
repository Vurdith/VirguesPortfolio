import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const PASSWORDS = ["second-e2e-password", "first-e2e-password"];

const piece = (src: string, alt = "") => ({ kind: "image", srcType: "url", src, alt });
const PIECES = [
  piece("/og.jpg"),
  piece("/ayanakoji-profile-320.webp"),
  piece("/intro-poster.webp", "Poster piece"),
];

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

// Serial, one shared signed-in page: the admin account is created by admin.spec.ts when the whole
// suite runs, or by this file when it runs alone.
test.describe.configure({ mode: "serial" });

let page: Page;
const createdIds: string[] = [];
const uploaded: string[] = [];

async function signIn(request: APIRequestContext) {
  for (const password of PASSWORDS) {
    if ((await request.post("/api/auth/login", { data: { password } })).ok()) return;
  }
  const setup = await request.post("/api/auth/setup", {
    data: { password: PASSWORDS[1], setupToken: "e2e-setup-token" },
  });
  expect(setup.ok()).toBeTruthy();
}

async function createWork(slug: string, body: Record<string, unknown>) {
  const res = await page.request.post("/api/admin/works", {
    data: { title: slug, slug, tags: ["E2E"], published: true, ...body },
  });
  expect(res.status(), await res.text()).toBe(201);
  createdIds.push(((await res.json()) as { id: string }).id);
}

/**
 * Opens the home page. It is cached (revalidate = 60) and a render that was already in flight can
 * miss a just-created work, so wait until the server's copy lists it; the timed refresh fixes it.
 */
async function enterSite(expectText?: string) {
  if (expectText) {
    await expect
      .poll(async () => (await (await page.request.get("/")).text()).includes(expectText), {
        timeout: 100_000,
        intervals: [1000],
      })
      .toBe(true);
  }
  await page.route("**/intro-snap-*.mp4", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "ENTER SITE" }).click();
}

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  // The work form warns about unsaved changes when it is left.
  page.on("dialog", (dialog) => void dialog.accept());
  await signIn(page.request);
});

test.afterAll(async () => {
  for (const id of createdIds) await page.request.delete(`/api/admin/works/${id}`);
  for (const file of uploaded) await fs.rm(path.join(process.cwd(), "public", file), { force: true });
  await page.close();
});

test("collections validate: legacy works stay valid, pieces are capped and checked", async () => {
  await createWork("legacy-single", { media: piece("/og.jpg") });
  const list = (await (await page.request.get("/api/admin/works")).json()) as {
    works: { slug: string; items?: unknown }[];
  };
  expect(list.works.find((w) => w.slug === "legacy-single")?.items).toBeUndefined();

  const tooMany = await page.request.post("/api/admin/works", {
    data: {
      title: "x",
      slug: "too-many",
      tags: [],
      published: false,
      media: PIECES[0],
      items: Array.from({ length: 13 }, () => PIECES[0]),
    },
  });
  expect(tooMany.status()).toBe(400);

  const emptyPiece = await page.request.post("/api/admin/works", {
    data: {
      title: "x",
      slug: "empty-piece",
      tags: [],
      published: true,
      media: PIECES[0],
      items: [PIECES[0], piece("")],
    },
  });
  expect(emptyPiece.status()).toBe(400);
});

test("a piece can carry an X post link, and only a real one", async () => {
  const withPost = { ...PIECES[0], xUrl: "https://x.com/virgueui/status/1234567890123456789" };
  await createWork("x-post", { media: withPost, items: [withPost, PIECES[1]] });
  const works = ((await (await page.request.get("/api/admin/works")).json()) as { works: { id: string; slug: string; items?: { xUrl?: string }[] }[] }).works;
  const work = works.find((w) => w.slug === "x-post")!;
  expect(work.items?.map((item) => item.xUrl ?? "")).toEqual([withPost.xUrl, ""]);

  for (const xUrl of ["https://example.com/virgueui/status/123456", "https://x.com/virgueui", "javascript:alert(1)"]) {
    const bad = await page.request.patch(`/api/admin/works/${work.id}`, { data: { media: { ...PIECES[0], xUrl } } });
    expect(bad.status(), xUrl).toBe(400);
  }
  for (const xUrl of ["https://vxtwitter.com/lumiereui/status/2108916921328414830", "https://fxtwitter.com/a/status/123456?s=20", "https://mobile.twitter.com/a/status/123456"]) {
    const good = await page.request.patch(`/api/admin/works/${work.id}`, { data: { media: { ...PIECES[0], xUrl } } });
    expect(good.status(), xUrl).toBe(200);
  }
  // Adding a piece to a public work saves as usual: telling subscribers happens afterwards and cannot fail the save.
  const grow = await page.request.patch(`/api/admin/works/${work.id}`, { data: { media: withPost, items: [withPost, PIECES[1], PIECES[2]] } });
  expect(grow.ok()).toBeTruthy();

  await page.goto(`/admin/works/${work.id}/edit`);
  const field = page.getByLabel("Piece 1 X post link");
  await expect(field).toHaveValue(withPost.xUrl);
  await field.fill("not a link");
  await page.getByRole("button", { name: /^SAVE/ }).click();
  await expect(page.getByText("The X post link should look like").first()).toBeVisible();
});

test("the cover mirrors the first piece, and a patch can shrink a collection back", async () => {
  await createWork("mirror", { media: PIECES[2], items: [PIECES[1], PIECES[0]] });
  const works = (
    (await (await page.request.get("/api/admin/works")).json()) as {
      works: { id: string; slug: string; media: { src: string }; items?: { src: string }[] }[];
    }
  ).works;
  const work = works.find((w) => w.slug === "mirror")!;
  expect(work.media.src).toBe(PIECES[1].src);
  expect(work.items?.map((i) => i.src)).toEqual([PIECES[1].src, PIECES[0].src]);

  const shrink = await page.request.patch(`/api/admin/works/${work.id}`, {
    data: { media: PIECES[0], items: [PIECES[0]] },
  });
  expect(shrink.ok()).toBeTruthy();
  const after = (
    (await (await page.request.get(`/api/admin/works/${work.id}`)).json()) as {
      work: { media: { src: string }; items?: unknown };
    }
  ).work;
  expect(after.media.src).toBe(PIECES[0].src);
  expect(after.items).toBeUndefined();
});

test("the work form validates inline, then saves a collection built from URLs and an upload", async () => {
  await page.goto("/admin/works/new");
  await page.getByRole("button", { name: /^SAVE/ }).click();
  await expect(page.getByText("A title is required.")).toBeVisible();
  await expect(page.locator("#wf-title")).toBeFocused();

  await page.locator("#wf-title").fill("Form Collection");
  await expect(page.locator("#wf-slug")).toHaveValue("form-collection");

  await page.getByRole("button", { name: "+ ADD URL" }).click();
  await page.getByLabel("Image, GIF or video URL").fill("not a url");
  await page.getByRole("button", { name: "ADD PIECE" }).click();
  await expect(page.getByText(/Enter a full https/)).toBeVisible();
  for (const src of [PIECES[0].src, PIECES[1].src]) {
    await page.getByLabel("Image, GIF or video URL").fill(src);
    await page.getByRole("button", { name: "ADD PIECE" }).click();
  }

  await page
    .getByTestId("piece-file-input")
    .setInputFiles({ name: "px.png", mimeType: "image/png", buffer: PNG });
  const source = page.getByText(/^\/uploads\/image_.+\.webp$/);
  await expect(source).toBeVisible();
  uploaded.push((await source.textContent())!);
  await expect(page.getByText(/^03 \/ 12 PIECES/)).toBeVisible();

  // The upload is last; move it earlier, then check the order.
  await page.getByRole("button", { name: "Move piece 3 earlier" }).click();
  await expect(page.getByRole("button", { name: /^Piece 2,/ })).toBeVisible();
  await page.getByRole("button", { name: "Remove piece 3" }).click();
  await expect(page.getByText(/^02 \/ 12 PIECES/)).toBeVisible();

  await page.getByRole("switch", { name: /DRAFT/ }).click();
  await page.getByRole("button", { name: /^SAVE/ }).click();
  await expect(page).toHaveURL(/\/admin\/works$/);
  await expect(page.getByText("2 PIECES · UPDATED").first()).toBeVisible();

  const list = (await (await page.request.get("/api/admin/works")).json()) as {
    works: { id: string; slug: string; items?: unknown[] }[];
  };
  const saved = list.works.find((w) => w.slug === "form-collection")!;
  createdIds.push(saved.id);
  expect(saved.items).toHaveLength(2);
});

test("a duplicate slug is reported on the slug field", async () => {
  await page.goto("/admin/works/new");
  await page.locator("#wf-title").fill("Duplicate");
  await page.locator("#wf-slug").fill("legacy-single");
  await page.getByRole("button", { name: /^SAVE/ }).click();
  await expect(page.getByText("Slug already exists.")).toBeVisible();
});

test("gallery marks collection cards and the viewer steps through the pieces", async () => {
  test.setTimeout(150_000);
  await createWork("deck-e2e", { title: "Deck E2E", media: PIECES[0], items: PIECES });
  await createWork("solo-e2e", { title: "Solo E2E", media: PIECES[1] });

  await enterSite("Deck E2E");
  const deck = page.locator('a[data-pieces="3"]', { hasText: "Deck E2E" });
  await deck.scrollIntoViewIfNeeded();
  await expect(deck).toContainText("3 PIECES");
  await expect(deck.locator(".deck-layer")).toHaveCount(2);
  const solo = page.locator("a", { hasText: "Solo E2E" });
  await expect(solo).toHaveCount(1);
  await expect(solo).not.toHaveAttribute("data-pieces", /.*/);

  // The deck floats continuously, so Playwright's stability check would never settle.
  await deck.click({ force: true });
  const dialog = page.getByRole("dialog", { name: "Deck E2E" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("1 / 3")).toBeVisible();

  await dialog.getByRole("button", { name: "Next piece" }).click();
  await expect(dialog.getByText("2 / 3")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("3 / 3")).toBeVisible();
  await expect(dialog.getByRole("img", { name: "Poster piece" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("1 / 3")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByText("3 / 3")).toBeVisible();
  await dialog.getByRole("button", { name: "Show piece 2" }).click();
  await expect(dialog.getByText("2 / 3")).toBeVisible();
  await expect(dialog.getByText("Piece 2 of 3")).toBeAttached();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("single-piece works open without any piece controls", async () => {
  test.setTimeout(150_000);
  await enterSite("Solo E2E");
  const solo = page.locator("a", { hasText: "Solo E2E" });
  await solo.scrollIntoViewIfNeeded();
  await solo.click();
  const dialog = page.getByRole("dialog", { name: "Solo E2E" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Next piece" })).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("the work page has the same controls, keyboard and swipe", async () => {
  await page.goto("/work/deck-e2e");
  await expect(page.getByText("1 / 3")).toBeVisible();
  await page.getByRole("button", { name: "Next piece" }).click();
  await expect(page.getByText("2 / 3")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("1 / 3")).toBeVisible();

  const image = page.getByRole("img", { name: /Deck E2E, piece 1 of 3/ });
  const box = (await image.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, y, { steps: 6 });
  await page.mouse.move(box.x + box.width * 0.2, y, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByText("2 / 3")).toBeVisible();
});
