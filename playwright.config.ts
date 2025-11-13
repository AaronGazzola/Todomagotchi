import { defineConfig, devices } from "@playwright/test";

process.env.DOTENVX_QUIET = "true";

import dotenv from "dotenv";

const isSummaryMode = process.env.TEST_SUMMARY_ONLY === "true";
const outputMode = process.env.TEST_OUTPUT || "summary";
const isVerbose = process.env.TEST_VERBOSE === "true";
const enableTrace = process.env.TEST_TRACE === "true";

const originalConsoleLog = console.log;
console.log = () => {};
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
console.log = originalConsoleLog;

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3001";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: undefined,
  reporter: [["list"], ["./e2e/utils/consolidated-reporter.ts"]],
  outputDir: process.env.TEST_RUN_ID
    ? `test-results/${process.env.TEST_RUN_ID}/artifacts`
    : "test-results/temp/artifacts",
  quiet: false,
  globalSetup: "./e2e/utils/global-setup.ts",
  use: {
    baseURL,
    trace: enableTrace ? "on" : "on-first-retry",
    screenshot: "only-on-failure",
    video: enableTrace ? "on" : "off",
    actionTimeout: 10000,
    navigationTimeout: 10000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
