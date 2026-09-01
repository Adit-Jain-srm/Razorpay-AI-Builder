import { expect, test } from "@playwright/test";

/**
 * Golden-path E2E seed. Later phases extend this into the full demo flow
 * (goal -> research -> persona -> creative -> landing -> lead). For the
 * foundation it asserts the public login surface renders, which needs no
 * Supabase/Azure credentials because `proxy.ts` no-ops when Supabase is
 * unconfigured.
 *
 * Run with `npm run test:e2e` (one-time setup: `npx playwright install`).
 */
test("login page renders the email field", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
});
