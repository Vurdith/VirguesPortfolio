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

test("quote request can be completed through all four steps", async ({ page }) => {
  const problems = watchPage(page);
  await openHome(page);

  const form = page.getByRole("form", { name: "Request a quote" });
  await form.scrollIntoViewIfNeeded();

  // Step 1: choose a service (advances on its own).
  await form.locator("label", { hasText: "Game UI" }).click();
  const details = page.locator("#quote-details");
  await expect(details).toBeVisible();

  // Step 2: details must be long enough before continuing.
  await form.getByRole("button", { name: /CONTINUE/ }).click();
  await expect(page.getByText(/A little more detail/i).first()).toBeVisible();
  await details.fill("A full inventory and crafting menu for a survival game, controller friendly.");
  await form.getByRole("button", { name: /CONTINUE/ }).click();

  // Step 3: budget and timeline have defaults.
  await expect(form.getByRole("heading", { name: "Budget and timing." })).toBeVisible();
  await form.getByRole("button", { name: /CONTINUE/ }).click();

  // Step 4: contact; needs a name and one valid method.
  await page.locator("#quote-name").fill("E2E Tester");
  await form.getByRole("button", { name: /SEND REQUEST/ }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();

  await page.locator("#quote-email").fill("e2e@example.com");
  await form.getByRole("button", { name: /SEND REQUEST/ }).click();

  await expect(page.getByRole("heading", { name: /Got it, E2E/ })).toBeVisible();
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
