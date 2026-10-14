import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const STUB_PORT = PORT + 100;

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
      // The assistant talks to a local stand-in, never to OpenRouter.
      OPENROUTER_API_KEY: "e2e-key",
      OPENROUTER_BASE_URL: `http://127.0.0.1:${STUB_PORT}/v1`,
      // The Discord subscription service is a local stand-in too (tests/stub-discord.ts).
      DISCORD_NOTIFY_URL: `http://127.0.0.1:${STUB_PORT + 1}`,
      DISCORD_ANNOUNCE_SECRET: "e2e-announce-secret",
      CRON_SECRET: "e2e-cron-secret",
    },
  },
});
