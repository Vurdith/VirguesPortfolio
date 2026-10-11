import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);

// Tests run against a production build (so the real CSP and headers apply) with a throwaway
// database, never the developer's data/db.json.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 45_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Uses the Chrome already on the machine; set PW_CHANNEL="" to use Playwright's own Chromium.
    channel: process.env.PW_CHANNEL ?? "chrome",
    reducedMotion: "reduce",
  },
  globalSetup: "./tests/global-setup.ts",
  webServer: {
    command: `npx next build --webpack && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_DIST_DIR: ".next-test",
      DB_PATH: "./.e2e/db.json",
      ADMIN_SETUP_TOKEN: "e2e-setup-token",
      ADMIN_AUTH_SECRET: "e2e-auth-secret",
    },
  },
});
