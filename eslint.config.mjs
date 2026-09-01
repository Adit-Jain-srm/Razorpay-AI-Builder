import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The OpenBB Python reference repo must never be linted.
    "Reference-repo/**",
    // Cursor config, skills, and docs are not part of the Next.js app.
    ".cursor/**",
    "Docs/**",
  ]),
]);

export default eslintConfig;
