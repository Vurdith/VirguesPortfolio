import { expect, test, type Page } from "@playwright/test";

/** The intro can't be skipped, so let it fail to load the film and press ENTER SITE. */
async function openHome(page: Page) {
  await page.route("**/intro-loader-*.mp4", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "ENTER SITE" }).click();
}

function watchPage(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    const text = message.text();
    // The Vercel Analytics script only exists on Vercel, so it 404s on a local server.
    const isLocalAnalytics = /_vercel\/insights/.test(text);
    if (message.type() === "error" && !isLocalAnalytics && !/Failed to load resource/.test(text)) problems.push(text);
    if (/Content Security Policy/i.test(text)) problems.push(`CSP: ${text}`);
  });
  return problems;
}

test("home page loads with every section and no console or CSP errors", async ({ page }) => {
  const problems = watchPage(page);
  await openHome(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  for (const id of ["work", "contributions", "offerings", "process", "payment", "reviews", "contact"]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }

  await page.waitForTimeout(1500);
  expect(problems, problems.join(" | ")).toEqual([]);
});

test("security headers are sent", async ({ request }) => {
  const res = await request.get("/");
  const headers = res.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("privacy page renders", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("What I keep");
});

test("the contact section opens the chat with the chosen kind of work", async ({ page }) => {
  const problems = watchPage(page);
  await openHome(page);

  const invite = page.getByRole("navigation", { name: "Start a brief" });
  await invite.scrollIntoViewIfNeeded();
  await expect(invite.getByRole("link")).toHaveCount(5);
  await expect(invite.getByRole("link", { name: /Game UI/ })).toHaveAttribute("href", "/chat?about=game");
  await expect(invite.getByRole("link", { name: /Something else/ })).toHaveAttribute("href", "/chat");
  expect(problems, problems.join(" | ")).toEqual([]);
});

test("a honeypot submission is accepted silently but not stored", async ({ request }) => {
  const res = await request.post("/api/quotes", {
    data: {
      name: "Bot",
      service: "Game UI",
      budget: "Not sure yet",
      deadline: "Flexible",
      details: "Please buy my cheap watches, click this link now for details.",
      email: "bot@example.com",
      company: "Acme",
    },
  });
  expect(res.status()).toBe(201);
});

test("invalid quote requests are rejected", async ({ request }) => {
  const res = await request.post("/api/quotes", { data: { name: "x" } });
  expect(res.status()).toBe(400);
});

test("each page has its own link preview, and the home page's is the animated one", async ({ request }) => {
  const image = async (path: string, tag: string) => new RegExp(`<meta (?:property|name)="${tag}" content="([^"]+)"`).exec(await (await request.get(path)).text())?.[1];
  expect(await image("/", "og:image")).toContain("/og-intro.gif");
  expect(await image("/", "twitter:image")).toContain("/og-intro.gif");
  for (const page of ["chat", "privacy"]) {
    expect(await image(`/${page}`, "og:image")).toContain(`/${page}/opengraph-image`);
    expect(await image(`/${page}`, "twitter:image")).toContain(`/${page}/twitter-image`);
    const res = await request.get(`/${page}/opengraph-image`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  }
});

test("on a phone the header is a menu button that opens a side menu", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.route("**/intro-loader-*.mp4", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "ENTER SITE" }).click();

  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu.getByRole("link")).toHaveCount(7);
  await menu.getByRole("link", { name: /Reviews/ }).click();
  await expect(menu).toHaveCount(0);
  await expect(page).toHaveURL(/#reviews$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await context.close();
});
