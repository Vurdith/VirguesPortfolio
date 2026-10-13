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
