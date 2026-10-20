import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";
const baseURL = process.env.BASE_URL || "http://127.0.0.1:3100";
process.env.E2E_SEED_TOKEN ||= randomBytes(32).toString("hex");
export default defineConfig({
  testDir: "./tests/e2e/specs",
  fullyParallel: !process.env.CI,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  expect: { timeout: 8000 },
  use: {
    baseURL,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/e2e.xml" }],
    ["list"],
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${new URL(baseURL).port || 3100}`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        env: {
          NEXT_DIST_DIR: ".next-e2e",
          APP_ORIGIN: new URL(baseURL).origin,
          E2E_TEST_MODE: process.env.E2E_DATABASE_ENABLED === "1" ? "1" : "0",
          E2E_SEED_TOKEN: process.env.E2E_SEED_TOKEN,
        },
      },
});
