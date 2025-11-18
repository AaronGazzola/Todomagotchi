import { clickByTestId, fillByTestId, waitForElement } from "@/lib/test.utils";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { TestId } from "../test.types";
import { expect, test } from "./utils/test-fixtures";

const prisma = new PrismaClient();

test.describe("Simple Invitation Test", () => {
  test.describe.configure({ mode: 'parallel' });

  const inviterEmail = "simple-inviter@example.com";
  const inviterPassword = "InviterPass123!";
  const inviterName = "Simple Inviter";
  const inviteeEmail = "simple-invitee@example.com";
  const inviteePassword = "InviteePass123!";
  const inviteeName = "Simple Invitee";

  const SYNC_DIR = path.join(process.cwd(), ".test-sync");
  const SSE_READY_FILE = path.join(SYNC_DIR, "sse-ready-simple.txt");
  const INVITER_CREATED_FILE = path.join(SYNC_DIR, "inviter-created.txt");
  const INVITEE_CREATED_FILE = path.join(SYNC_DIR, "invitee-created.txt");

  test.beforeAll(async () => {
    if (!fs.existsSync(SYNC_DIR)) {
      fs.mkdirSync(SYNC_DIR, { recursive: true });
    }
    if (fs.existsSync(SSE_READY_FILE)) {
      fs.unlinkSync(SSE_READY_FILE);
    }
    if (fs.existsSync(INVITER_CREATED_FILE)) {
      fs.unlinkSync(INVITER_CREATED_FILE);
    }
    if (fs.existsSync(INVITEE_CREATED_FILE)) {
      fs.unlinkSync(INVITEE_CREATED_FILE);
    }

    await Promise.all([cleanupUser(inviterEmail), cleanupUser(inviteeEmail)]);
  });

  test.afterAll(async () => {
    if (fs.existsSync(SSE_READY_FILE)) {
      fs.unlinkSync(SSE_READY_FILE);
    }
    if (fs.existsSync(INVITER_CREATED_FILE)) {
      fs.unlinkSync(INVITER_CREATED_FILE);
    }
    if (fs.existsSync(INVITEE_CREATED_FILE)) {
      fs.unlinkSync(INVITEE_CREATED_FILE);
    }
    if (fs.existsSync(SYNC_DIR) && fs.readdirSync(SYNC_DIR).length === 0) {
      fs.rmdirSync(SYNC_DIR);
    }

    await Promise.all([cleanupUser(inviterEmail), cleanupUser(inviteeEmail)]);

    await prisma.$disconnect();
  });

  test("inviter: create account and send invitation", async ({
    page,
  }) => {
      console.log("\n👤 INVITER: Starting flow...");

      console.log("👤 INVITER: Creating account...");
      await page.goto("/sign-up");
      await expect(page.getByTestId(TestId.SIGN_UP_NAME)).toBeVisible({
        timeout: 60000,
      });

      await fillByTestId(page, TestId.SIGN_UP_NAME, inviterName);
      await fillByTestId(page, TestId.SIGN_UP_EMAIL, inviterEmail);
      await fillByTestId(page, TestId.SIGN_UP_PASSWORD, inviterPassword);
      await clickByTestId(page, TestId.SIGN_UP_SUBMIT);
      await page.waitForURL("/", { timeout: 60000 });

      console.log("👤 INVITER: Account created, signaling...");
      fs.writeFileSync(INVITER_CREATED_FILE, "created");

      console.log("👤 INVITER: Waiting for invitee to be created...");
      const maxWaitTime = 60000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        if (fs.existsSync(INVITEE_CREATED_FILE)) {
          break;
        }
        await page.waitForTimeout(100);
      }

      if (!fs.existsSync(INVITEE_CREATED_FILE)) {
        throw new Error("Invitee account not created after 60s");
      }

      console.log("👤 INVITER: Waiting for invitee SSE connection...");
      const maxWaitTimeForSSE = 30000;
      const startTimeForSSE = Date.now();

      while (Date.now() - startTimeForSSE < maxWaitTimeForSSE) {
        if (fs.existsSync(SSE_READY_FILE)) {
          break;
        }
        await page.waitForTimeout(100);
      }

      if (!fs.existsSync(SSE_READY_FILE)) {
        throw new Error(
          "Invitee SSE connection not ready after 30s - sync file not created"
        );
      }

      console.log("👤 INVITER: Opening invite dialog...");
      await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);
      await clickByTestId(page, TestId.INVITE_USERS_BUTTON);
      await waitForElement(page, TestId.INVITE_DIALOG, 60000);

      console.log("👤 INVITER: Sending invitation...");
      await fillByTestId(page, TestId.INVITE_EMAIL_INPUT, inviteeEmail);
      await clickByTestId(page, TestId.INVITE_SEND_BUTTON);

      await page.waitForSelector('[data-testid="toast-success"]', {
        state: "visible",
        timeout: 60000,
      });

      console.log("👤 INVITER: Invitation sent successfully!");
  });

  test("invitee: create account and receive invitation", async ({
    page,
  }) => {
      console.log("\n👥 INVITEE: Starting flow...");

      console.log("👥 INVITEE: Waiting for inviter to be created...");
      const maxWaitTime = 60000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        if (fs.existsSync(INVITER_CREATED_FILE)) {
          break;
        }
        await page.waitForTimeout(100);
      }

      if (!fs.existsSync(INVITER_CREATED_FILE)) {
        throw new Error("Inviter account not created after 60s");
      }

      console.log("👥 INVITEE: Creating account...");
      await page.goto("/sign-up");
      await expect(page.getByTestId(TestId.SIGN_UP_NAME)).toBeVisible({
        timeout: 60000,
      });

      await fillByTestId(page, TestId.SIGN_UP_NAME, inviteeName);
      await fillByTestId(page, TestId.SIGN_UP_EMAIL, inviteeEmail);
      await fillByTestId(page, TestId.SIGN_UP_PASSWORD, inviteePassword);
      await clickByTestId(page, TestId.SIGN_UP_SUBMIT);
      await page.waitForURL("/", { timeout: 60000 });

      console.log("👥 INVITEE: Account created, signaling...");
      fs.writeFileSync(INVITEE_CREATED_FILE, "created");

      console.log(
        "👥 INVITEE: Waiting for user data and SSE initialization..."
      );
      await page.waitForTimeout(2000);

      console.log("👥 INVITEE: Verifying SSE connection...");
      const connected = await page.waitForFunction(
        () => {
          const es = (window as unknown as { __eventSource?: EventSource }).__eventSource;
          return es?.readyState === 1;
        },
        { timeout: 10000 }
      );

      if (!connected) {
        throw new Error("SSE connection not established within 10s");
      }

      console.log("👥 INVITEE: SSE connected, signaling readiness...");
      if (!fs.existsSync(SYNC_DIR)) {
        fs.mkdirSync(SYNC_DIR, { recursive: true });
      }
      fs.writeFileSync(SSE_READY_FILE, "ready");

      console.log("👥 INVITEE: Waiting for invitation toast...");
      const invitationReceived = await waitForElement(
        page,
        TestId.INVITATION_TOAST,
        120000
      );

      if (!invitationReceived) {
        throw new Error("Invitation toast did not appear within 120s");
      }

      console.log("👥 INVITEE: Invitation received successfully!");

      const toast = page.getByTestId(TestId.INVITATION_TOAST);
      const orgName = await toast.getAttribute("data-org-name");
      const orgId = await toast.getAttribute("data-organization-id");

      console.log(`👥 INVITEE: Received invitation from org: ${orgName}`);
      console.log(`👥 INVITEE: Organization ID: ${orgId}`);

      if (!orgName || orgName.trim() === "") {
        throw new Error("Organization name is empty or missing in toast");
      }

      if (!orgId || orgId.trim() === "") {
        throw new Error("Organization ID is empty or missing in toast");
      }

      console.log("👥 INVITEE: Test completed successfully! Real-time invitation delivery works!");
  });
});

async function cleanupUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { member: { include: { organization: true } } },
  });

  if (user) {
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    const organizationIds = user.member.map((m) => m.organizationId);

    if (organizationIds.length > 0) {
      await prisma.tamagotchi.deleteMany({
        where: { organizationId: { in: organizationIds } },
      });
      await prisma.todo.deleteMany({
        where: { organizationId: { in: organizationIds } },
      });
      await prisma.invitation.deleteMany({
        where: { organizationId: { in: organizationIds } },
      });
      await prisma.member.deleteMany({
        where: { organizationId: { in: organizationIds } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: organizationIds } },
      });
    }

    try {
      await prisma.user.delete({
        where: { email },
      });
    } catch (error) {
    }
  }
}
