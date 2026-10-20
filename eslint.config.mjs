import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["tests/e2e/fixtures/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off", "no-empty-pattern": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next*/**",
    "coverage/**",
    "docs/coverage/**",
    "playwright-report/**",
    "test-results/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
