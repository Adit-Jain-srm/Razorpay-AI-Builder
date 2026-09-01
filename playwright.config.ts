import { defineConfig, devices } from "@playwright/test";

// End-to-end runner for the golden path (goal -> research -> creative -> landing
// -> lead). Specs live in `./e2e`. Run with `npm run test:e2e` after a one-time
// `npx playwright install`. The dev server is started automatically and reused
// locally so the suite is self-contained.
const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
