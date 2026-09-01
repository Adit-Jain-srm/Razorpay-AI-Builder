import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Unit/integration test runner. Node environment (the foundation under test is
// pure server-side logic), deterministic and offline: no network, no real
// timers leaking between tests. E2E specs live in `./e2e` and run under
// Playwright instead, so they are intentionally excluded from `include`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
  resolve: {
    alias: {
      // Mirror the `@/*` path alias from tsconfig so tests import like app code.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
