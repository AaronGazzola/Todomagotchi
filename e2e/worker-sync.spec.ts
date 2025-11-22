import {
  clickByTestId,
  fillByTestId,
  waitForElement,
} from "@/lib/test.utils";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { TestId } from "../test.types";
import { expect, test } from "./utils/test-fixtures";

const prisma = new PrismaClient();

test.describe("Worker Sync Test", () => {
  test.describe.configure({ mode: 'parallel' });

  const inviterEmail = "simple-inviter@example.com";
  const inviterPassword = "InviterPass123!";
  const inviterName = "Simple Inviter";
  const inviteeEmail = "simple-invitee@example.com";
  const inviteePassword = "InviteePass123!";
  const inviteeName = "Simple Invitee";

  const SYNC_DIR = path.join(process.cwd(), ".test-sync");
  const INVITER_CREATED_FILE = path.join(SYNC_DIR, "inviter-created.txt");
  const INVITEE_CREATED_FILE = path.join(SYNC_DIR, "invitee-created.txt");
  const INVITER_MESSAGE_SENT_FILE = path.join(SYNC_DIR, "inviter-message-sent.txt");
  const INVITEE_MESSAGE_SENT_FILE = path.join(SYNC_DIR, "invitee-message-sent.txt");

  test.beforeAll(async () => {
    if (!fs.existsSync(SYNC_DIR)) {
      fs.mkdirSync(SYNC_DIR, { recursive: true });
    }
    if (fs.existsSync(INVITER_CREATED_FILE)) {
      fs.unlinkSync(INVITER_CREATED_FILE);
    }
    if (fs.existsSync(INVITEE_CREATED_FILE)) {
      fs.unlinkSync(INVITEE_CREATED_FILE);
    }
    if (fs.existsSync(INVITER_MESSAGE_SENT_FILE)) {
      fs.unlinkSync(INVITER_MESSAGE_SENT_FILE);
    }
    if (fs.existsSync(INVITEE_MESSAGE_SENT_FILE)) {
      fs.unlinkSync(INVITEE_MESSAGE_SENT_FILE);
    }

    await Promise.all([cleanupUser(inviterEmail), cleanupUser(inviteeEmail)]);
  });

  test.afterAll(async () => {
    if (fs.existsSync(INVITER_CREATED_FILE)) {
      fs.unlinkSync(INVITER_CREATED_FILE);
    }
    if (fs.existsSync(INVITEE_CREATED_FILE)) {
      fs.unlinkSync(INVITEE_CREATED_FILE);
    }
    if (fs.existsSync(INVITER_MESSAGE_SENT_FILE)) {
      fs.unlinkSync(INVITER_MESSAGE_SENT_FILE);
    }
    if (fs.existsSync(INVITEE_MESSAGE_SENT_FILE)) {
      fs.unlinkSync(INVITEE_MESSAGE_SENT_FILE);
    }
    if (fs.existsSync(SYNC_DIR) && fs.readdirSync(SYNC_DIR).length === 0) {
      fs.rmdirSync(SYNC_DIR);
    }

    await Promise.all([cleanupUser(inviterEmail), cleanupUser(inviteeEmail)]);

    await prisma.$disconnect();
  });

  test("inviter: create account, send message, and verify invitee's reply via live update", async ({
    page,
  }) => {
      console.log("\n✉️ INVITER: Starting flow...");

      console.log("✉️ INVITER: Creating account...");
      await page.goto("/sign-up");
      await expect(page.getByTestId(TestId.SIGN_UP_NAME)).toBeVisible({
        timeout: 30000,
      });

      await fillByTestId(page, TestId.SIGN_UP_NAME, inviterName);
      await fillByTestId(page, TestId.SIGN_UP_EMAIL, inviterEmail);
      await fillByTestId(page, TestId.SIGN_UP_PASSWORD, inviterPassword);
      await clickByTestId(page, TestId.SIGN_UP_SUBMIT);
      await page.waitForURL("/", { timeout: 30000 });

      console.log("✉️ INVITER: Account created, signaling...");
      fs.writeFileSync(INVITER_CREATED_FILE, "created");

      console.log("✉️ INVITER: Waiting for invitee to be created...");
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

      console.log("✉️ INVITER: Invitee ready, expanding messaging component...");
      const expandButton = await waitForElement(
        page,
        TestId.MESSAGE_EXPAND_BUTTON,
        20000
      );

      if (!expandButton) {
        throw new Error("Message expand button not found");
      }

      await clickByTestId(page, TestId.MESSAGE_EXPAND_BUTTON);
      await page.waitForTimeout(500);

      const chatContainer = await waitForElement(
        page,
        TestId.MESSAGE_CHAT_CONTAINER,
        20000
      );

      if (!chatContainer) {
        throw new Error("Chat container did not become visible");
      }

      console.log("✉️ INVITER: Sending message...");
      const inviterMessageText = "Hello from inviter!";
      await fillByTestId(page, TestId.MESSAGE_INPUT, inviterMessageText);
      await clickByTestId(page, TestId.MESSAGE_SEND_BUTTON);
      await page.waitForTimeout(1000);

      const messageCount = await page.getByTestId(TestId.MESSAGE_ITEM).count();
      if (messageCount !== 1) {
        throw new Error(`Expected 1 message, found ${messageCount}`);
      }

      console.log("✉️ INVITER: Message sent successfully, signaling...");
      fs.writeFileSync(INVITER_MESSAGE_SENT_FILE, "created");

      console.log("✉️ INVITER: Waiting for invitee to send reply...");
      const maxWaitTimeForReply = 120000;
      const startTimeForReply = Date.now();

      while (Date.now() - startTimeForReply < maxWaitTimeForReply) {
        if (fs.existsSync(INVITEE_MESSAGE_SENT_FILE)) {
          break;
        }
        await page.waitForTimeout(100);
      }

      if (!fs.existsSync(INVITEE_MESSAGE_SENT_FILE)) {
        throw new Error("Invitee reply not sent after 120s");
      }

      console.log("✉️ INVITER: Waiting for polling to fetch reply (5s refetch interval + buffer)...");
      await page.waitForTimeout(8000);

      console.log("✉️ INVITER: Verifying invitee's reply is visible...");
      const messages = await page.getByTestId(TestId.MESSAGE_ITEM).all();
      const messageTexts = await Promise.all(
        messages.map((m) => m.getByTestId(TestId.MESSAGE_TEXT).textContent())
      );

      const hasReply = messageTexts.some(text => text?.includes("Hi from invitee!"));

      if (!hasReply) {
        throw new Error(`Invitee's reply not visible after live data update. Messages: ${JSON.stringify(messageTexts)}`);
      }

      if (messages.length !== 2) {
        throw new Error(`Expected 2 messages, found ${messages.length}`);
      }

      console.log("✉️ INVITER: Invitee's reply verified successfully!");
      console.log("✉️ INVITER: Polling-based live message updates working successfully!");
  });

  test("invitee: create account, receive message via live update, and send reply", async ({
    page,
  }) => {
    console.log("\n📭 INVITEE: Starting flow...");

    console.log("📭 INVITEE: Waiting for inviter to be created...");
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

    console.log("📭 INVITEE: Creating account...");
    await page.goto("/sign-up");
    await expect(page.getByTestId(TestId.SIGN_UP_NAME)).toBeVisible({
      timeout: 30000,
    });

    await fillByTestId(page, TestId.SIGN_UP_NAME, inviteeName);
    await fillByTestId(page, TestId.SIGN_UP_EMAIL, inviteeEmail);
    await fillByTestId(page, TestId.SIGN_UP_PASSWORD, inviteePassword);
    await clickByTestId(page, TestId.SIGN_UP_SUBMIT);
    await page.waitForURL("/", { timeout: 30000 });

    console.log("📭 INVITEE: Account created, signaling...");
    fs.writeFileSync(INVITEE_CREATED_FILE, "created");

    console.log("📭 INVITEE: Waiting for inviter to send message...");
    const maxWaitTimeForMessage = 120000;
    const startTimeForMessage = Date.now();

    while (Date.now() - startTimeForMessage < maxWaitTimeForMessage) {
      if (fs.existsSync(INVITER_MESSAGE_SENT_FILE)) {
        break;
      }
      await page.waitForTimeout(100);
    }

    if (!fs.existsSync(INVITER_MESSAGE_SENT_FILE)) {
      throw new Error("Inviter message not sent after 120s");
    }

    console.log("📭 INVITEE: Expanding messaging component...");
    const expandButton = await waitForElement(
      page,
      TestId.MESSAGE_EXPAND_BUTTON,
      20000
    );

    if (!expandButton) {
      throw new Error("Message expand button not found");
    }

    await clickByTestId(page, TestId.MESSAGE_EXPAND_BUTTON);
    await page.waitForTimeout(500);

    const chatContainer = await waitForElement(
      page,
      TestId.MESSAGE_CHAT_CONTAINER,
      20000
    );

    if (!chatContainer) {
      throw new Error("Chat container did not become visible");
    }

    console.log("📭 INVITEE: Waiting for polling to fetch message (5s refetch interval + buffer)...");
    await page.waitForTimeout(8000);

    console.log("📭 INVITEE: Verifying inviter's message is visible...");
    const messages = await page.getByTestId(TestId.MESSAGE_ITEM).all();
    const messageTexts = await Promise.all(
      messages.map((m) => m.getByTestId(TestId.MESSAGE_TEXT).textContent())
    );

    const hasInviterMessage = messageTexts.some(text => text?.includes("Hello from inviter!"));

    if (!hasInviterMessage) {
      throw new Error(`Inviter's message not visible after live data update. Messages: ${JSON.stringify(messageTexts)}`);
    }

    if (messages.length !== 1) {
      throw new Error(`Expected 1 message, found ${messages.length}`);
    }

    console.log("📭 INVITEE: Inviter's message verified successfully!");

    console.log("📭 INVITEE: Sending reply...");
    const inviteeMessageText = "Hi from invitee!";
    await fillByTestId(page, TestId.MESSAGE_INPUT, inviteeMessageText);
    await clickByTestId(page, TestId.MESSAGE_SEND_BUTTON);
    await page.waitForTimeout(1000);

    const updatedMessageCount = await page.getByTestId(TestId.MESSAGE_ITEM).count();
    if (updatedMessageCount !== 2) {
      throw new Error(`Expected 2 messages after reply, found ${updatedMessageCount}`);
    }

    console.log("📭 INVITEE: Reply sent successfully, signaling...");
    fs.writeFileSync(INVITEE_MESSAGE_SENT_FILE, "created");

    console.log("📭 INVITEE: Test completed successfully! Polling-based live messaging works!");
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
      await prisma.message.deleteMany({
        where: { organizationId: { in: organizationIds } },
      });
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
    } catch {
    }
  }
}
