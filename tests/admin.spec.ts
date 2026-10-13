import { expect, test } from "@playwright/test";

const PASSWORD = "first-e2e-password";
const NEW_PASSWORD = "second-e2e-password";

// Serial: each step relies on the account created by the one before.
test.describe.configure({ mode: "serial" });

test("admin routes are protected", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);

  const res = await page.request.get("/api/admin/quotes");
  expect(res.status()).toBe(401);
});

test("first-run setup needs the setup token", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByPlaceholder("10+ characters").fill(PASSWORD);
  await page.getByPlaceholder("Required in production").fill("wrong-token");
  await page.getByRole("button", { name: /SET PASSWORD/ }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByText("Invalid setup token.")).toBeVisible();
});

test("setup, then the dashboard and quotes list load", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByPlaceholder("10+ characters").fill(PASSWORD);
  await page.getByPlaceholder("Required in production").fill("e2e-setup-token");
  await page.getByRole("button", { name: /SET PASSWORD/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/admin/quotes");
  await expect(page.getByText("E2E Tester").or(page.getByText(/no quote/i)).first()).toBeVisible();
});

test("password can be changed and the old one stops working", async ({ page, browser }) => {
  await page.goto("/admin/login");
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "SIGN IN" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByLabel("CURRENT PASSWORD").fill("not-the-password");
  await page.getByLabel("NEW PASSWORD").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: /CHANGE PASSWORD/ }).click();
  await expect(page.getByText("Current password is wrong.")).toBeVisible();

  await page.getByLabel("CURRENT PASSWORD").fill(PASSWORD);
  await page.getByRole("button", { name: /CHANGE PASSWORD/ }).click();
  await expect(page.getByText(/Password changed/)).toBeVisible();

  // Still signed in here, but a fresh browser must use the new password.
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  const oldLogin = await otherPage.request.post("/api/auth/login", { data: { password: PASSWORD } });
  expect(oldLogin.status()).toBe(401);
  const newLogin = await otherPage.request.post("/api/auth/login", { data: { password: NEW_PASSWORD } });
  expect(newLogin.status()).toBe(200);
  await other.close();
});

test("on a phone the admin sections, the site link and log out are in a side menu", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const password of ["second-e2e-password", "first-e2e-password", "reviews-e2e-password"]) {
    if ((await context.request.post("/api/auth/login", { data: { password } })).ok()) break;
  }
  const page = await context.newPage();
  await page.goto("/admin/works");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu.getByRole("link", { name: "View site" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Log out" })).toBeVisible();
  await menu.getByRole("link", { name: /Reviews/ }).click();
  await expect(page).toHaveURL(/\/admin\/reviews$/);
  await expect(menu).toHaveCount(0);
  await context.close();
});
