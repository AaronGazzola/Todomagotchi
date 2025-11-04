import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

if (!process.env.TEST_RUN_ID) {
  process.env.TEST_RUN_ID = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace(/T/, "_")
    .split("Z")[0];
}

const outputDir = path.join("test-results", process.env.TEST_RUN_ID);
fs.mkdirSync(outputDir, { recursive: true });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["./e2e/utils/consolidated-reporter.ts"]],
  outputDir: outputDir,
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
