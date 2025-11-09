import { test, expect } from "./utils/test-fixtures";
import { TestId } from "../test.types";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_PASSWORD = "TestPassword123!";

test.describe("SSE Session Tests", () => {
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

    await prisma.session.deleteMany({
      where: { user: { email: TEST_USER_EMAIL } },
    });
    await prisma.member.deleteMany({
      where: { user: { email: TEST_USER_EMAIL } },
    });
    const user = await prisma.user.findUnique({
      where: { email: TEST_USER_EMAIL },
      include: { member: { include: { organization: true } } },
    });
    if (user) {
      const orgIds = user.member.map((m) => m.organizationId);
      await prisma.todo.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await prisma.tamagotchi.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: orgIds } },
      });
    }
    await prisma.user.deleteMany({
      where: { email: TEST_USER_EMAIL },
    });
  });
});
