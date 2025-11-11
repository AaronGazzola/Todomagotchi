import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

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
  reporter: [["./e2e/utils/consolidated-reporter.ts"]],
  outputDir: outputDir,
  use: {
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "invitations",
      testMatch: "**/invitations.spec.ts",
      use: { ...devices["Desktop Chrome"] },
      workers: 2,
    },
    {
      name: "other-tests",
      testIgnore: "**/invitations.spec.ts",
      use: { ...devices["Desktop Chrome"] },
      workers: 1,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
