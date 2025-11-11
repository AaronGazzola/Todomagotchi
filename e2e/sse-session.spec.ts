import { test, expect } from "./utils/test-fixtures";
import { TestId } from "../test.types";
import { cleanupTestData } from "./utils/test-cleanup";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_PASSWORD = "TestPassword123!";

test.describe("SSE Session Tests", () => {
  test.beforeAll(async () => {
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("should not throw 'No active organization' error when SSE connects after sign-up", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const TEST_USER_EMAIL = `sse-test-${timestamp}@example.com`;
    const TEST_USER_NAME = `SSE Test User ${timestamp}`;
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    const networkErrors: string[] = [];
    page.on("response", async (response) => {
      if (response.status() >= 400) {
        const url = response.url();
        const status = response.status();
        const body = await response.text().catch(() => "");
        networkErrors.push(`${status} ${url}: ${body}`);
      }
    });

    await page.goto("/sign-up");

    await page.getByTestId(TestId.SIGN_UP_NAME).fill(TEST_USER_NAME);
    await page.getByTestId(TestId.SIGN_UP_EMAIL).fill(TEST_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_UP_PASSWORD).fill(TEST_PASSWORD);

    await page.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    await page.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId(TestId.TODO_LIST)).toBeVisible({
      timeout: 15000,
    });

    const sseErrors = networkErrors.filter(
      (err) =>
        err.includes("/api/todos/stream") ||
        err.includes("/api/tamagotchi/stream")
    );

    const activeOrgErrors = networkErrors.filter((err) =>
      err.includes("No active organization")
    );

    if (sseErrors.length > 0) {
      console.log("SSE errors found:", sseErrors);
    }

    if (activeOrgErrors.length > 0) {
      console.log("Active organization errors found:", activeOrgErrors);
    }

    expect(
      activeOrgErrors.length,
      `Found ${activeOrgErrors.length} "No active organization" errors: ${activeOrgErrors.join(", ")}`
    ).toBe(0);

    await cleanupTestData([TEST_USER_EMAIL]);
  });
});
