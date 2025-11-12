import { defineConfig, devices } from "@playwright/test";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

const getPortFromUrl = (url: string | undefined): number => {
  if (!url) return 3000;
  const match = url.match(/:(\d+)/);
  return match ? parseInt(match[1], 10) : 3000;
};

const port = getPortFromUrl(process.env.BETTER_AUTH_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60000,
  reporter: "list",
  outputDir: process.env.TEST_RUN_ID
    ? path.join("test-results", process.env.TEST_RUN_ID)
    : "test-results/default",
  use: {
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
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
    port,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
