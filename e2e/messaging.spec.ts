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

test.describe("Messaging Live Updates", () => {
  test.describe.configure({ mode: 'parallel' });

  const senderEmail = "messaging-sender@example.com";
  const senderPassword = "SenderPass123!";
  const senderName = "Messaging Sender";
  const receiverEmail = "messaging-receiver@example.com";
  const receiverPassword = "ReceiverPass123!";
  const receiverName = "Messaging Receiver";

  const SYNC_DIR = path.join(process.cwd(), ".test-sync");
  const SENDER_CREATED_FILE = path.join(SYNC_DIR, "sender-created.txt");
  const RECEIVER_CREATED_FILE = path.join(SYNC_DIR, "receiver-created.txt");
  const SENDER_MESSAGE_SENT_FILE = path.join(SYNC_DIR, "sender-message-sent.txt");
  const RECEIVER_MESSAGE_SENT_FILE = path.join(SYNC_DIR, "receiver-message-sent.txt");

  test.beforeAll(async () => {
    if (!fs.existsSync(SYNC_DIR)) {
      fs.mkdirSync(SYNC_DIR, { recursive: true });
    }
    if (fs.existsSync(SENDER_CREATED_FILE)) {
      fs.unlinkSync(SENDER_CREATED_FILE);
    }
    if (fs.existsSync(RECEIVER_CREATED_FILE)) {
      fs.unlinkSync(RECEIVER_CREATED_FILE);
    }
    if (fs.existsSync(SENDER_MESSAGE_SENT_FILE)) {
      fs.unlinkSync(SENDER_MESSAGE_SENT_FILE);
    }
    if (fs.existsSync(RECEIVER_MESSAGE_SENT_FILE)) {
      fs.unlinkSync(RECEIVER_MESSAGE_SENT_FILE);
    }

    await Promise.all([cleanupUser(senderEmail), cleanupUser(receiverEmail)]);
  });

  test.afterAll(async () => {
    if (fs.existsSync(SENDER_CREATED_FILE)) {
      fs.unlinkSync(SENDER_CREATED_FILE);
    }
    if (fs.existsSync(RECEIVER_CREATED_FILE)) {
      fs.unlinkSync(RECEIVER_CREATED_FILE);
    }
    if (fs.existsSync(SENDER_MESSAGE_SENT_FILE)) {
      fs.unlinkSync(SENDER_MESSAGE_SENT_FILE);
    }
    if (fs.existsSync(RECEIVER_MESSAGE_SENT_FILE)) {
      fs.unlinkSync(RECEIVER_MESSAGE_SENT_FILE);
    }
    if (fs.existsSync(SYNC_DIR) && fs.readdirSync(SYNC_DIR).length === 0) {
      fs.rmdirSync(SYNC_DIR);
    }

    await Promise.all([cleanupUser(senderEmail), cleanupUser(receiverEmail)]);

    await prisma.$disconnect();
  });

  test("sender: create account, send message, and verify receiver's reply via live update", async ({
    page,
  }) => {
      console.log("\n📤 SENDER: Starting flow...");

      console.log("📤 SENDER: Creating account...");
      await page.goto("/sign-up");
      await expect(page.getByTestId(TestId.SIGN_UP_NAME)).toBeVisible({
        timeout: 30000,
      });

      await fillByTestId(page, TestId.SIGN_UP_NAME, senderName);
      await fillByTestId(page, TestId.SIGN_UP_EMAIL, senderEmail);
      await fillByTestId(page, TestId.SIGN_UP_PASSWORD, senderPassword);
      await clickByTestId(page, TestId.SIGN_UP_SUBMIT);
      await page.waitForURL("/", { timeout: 30000 });

      console.log("📤 SENDER: Account created, signaling...");
      fs.writeFileSync(SENDER_CREATED_FILE, "created");

      console.log("📤 SENDER: Waiting for receiver to be created...");
      const maxWaitTime = 60000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        if (fs.existsSync(RECEIVER_CREATED_FILE)) {
          break;
        }
        await page.waitForTimeout(100);
      }

      if (!fs.existsSync(RECEIVER_CREATED_FILE)) {
        throw new Error("Receiver account not created after 60s");
      }

      console.log("📤 SENDER: Receiver ready, expanding messaging component...");
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

      console.log("📤 SENDER: Sending message...");
      const senderMessageText = "Hello from sender!";
      await fillByTestId(page, TestId.MESSAGE_INPUT, senderMessageText);
      await clickByTestId(page, TestId.MESSAGE_SEND_BUTTON);
      await page.waitForTimeout(1000);

      const messageCount = await page.getByTestId(TestId.MESSAGE_ITEM).count();
      if (messageCount !== 1) {
        throw new Error(`Expected 1 message, found ${messageCount}`);
      }

      console.log("📤 SENDER: Message sent successfully, signaling...");
      fs.writeFileSync(SENDER_MESSAGE_SENT_FILE, "created");

      console.log("📤 SENDER: Waiting for receiver to send reply...");
      const maxWaitTimeForReply = 120000;
      const startTimeForReply = Date.now();

      while (Date.now() - startTimeForReply < maxWaitTimeForReply) {
        if (fs.existsSync(RECEIVER_MESSAGE_SENT_FILE)) {
          break;
        }
        await page.waitForTimeout(100);
      }

      if (!fs.existsSync(RECEIVER_MESSAGE_SENT_FILE)) {
        throw new Error("Receiver reply not sent after 120s");
      }

      console.log("📤 SENDER: Waiting for polling to fetch reply (5s refetch interval + buffer)...");
      await page.waitForTimeout(8000);

      console.log("📤 SENDER: Verifying receiver's reply is visible...");
      const messages = await page.getByTestId(TestId.MESSAGE_ITEM).all();
      const messageTexts = await Promise.all(
        messages.map((m) => m.getByTestId(TestId.MESSAGE_TEXT).textContent())
      );

      const hasReply = messageTexts.some(text => text?.includes("Hi from receiver!"));

      if (!hasReply) {
        throw new Error(`Receiver's reply not visible after live data update. Messages: ${JSON.stringify(messageTexts)}`);
      }

      if (messages.length !== 2) {
        throw new Error(`Expected 2 messages, found ${messages.length}`);
      }

      console.log("📤 SENDER: Receiver's reply verified successfully!");
      console.log("📤 SENDER: Polling-based live message updates working successfully!");
  });

  test("receiver: create account, receive message via live update, and send reply", async ({
    page,
  }) => {
    console.log("\n📥 RECEIVER: Starting flow...");

    console.log("📥 RECEIVER: Waiting for sender to be created...");
    const maxWaitTime = 60000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      if (fs.existsSync(SENDER_CREATED_FILE)) {
        break;
      }
      await page.waitForTimeout(100);
    }

    if (!fs.existsSync(SENDER_CREATED_FILE)) {
      throw new Error("Sender account not created after 60s");
    }

    console.log("📥 RECEIVER: Creating account...");
    await page.goto("/sign-up");
    await expect(page.getByTestId(TestId.SIGN_UP_NAME)).toBeVisible({
      timeout: 30000,
    });

    await fillByTestId(page, TestId.SIGN_UP_NAME, receiverName);
    await fillByTestId(page, TestId.SIGN_UP_EMAIL, receiverEmail);
    await fillByTestId(page, TestId.SIGN_UP_PASSWORD, receiverPassword);
    await clickByTestId(page, TestId.SIGN_UP_SUBMIT);
    await page.waitForURL("/", { timeout: 30000 });

    console.log("📥 RECEIVER: Account created, signaling...");
    fs.writeFileSync(RECEIVER_CREATED_FILE, "created");

    console.log("📥 RECEIVER: Waiting for sender to send message...");
    const maxWaitTimeForMessage = 120000;
    const startTimeForMessage = Date.now();

    while (Date.now() - startTimeForMessage < maxWaitTimeForMessage) {
      if (fs.existsSync(SENDER_MESSAGE_SENT_FILE)) {
        break;
      }
      await page.waitForTimeout(100);
    }

    if (!fs.existsSync(SENDER_MESSAGE_SENT_FILE)) {
      throw new Error("Sender message not sent after 120s");
    }

    console.log("📥 RECEIVER: Expanding messaging component...");
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

    console.log("📥 RECEIVER: Waiting for polling to fetch message (5s refetch interval + buffer)...");
    await page.waitForTimeout(8000);

    console.log("📥 RECEIVER: Verifying sender's message is visible...");
    const messages = await page.getByTestId(TestId.MESSAGE_ITEM).all();
    const messageTexts = await Promise.all(
      messages.map((m) => m.getByTestId(TestId.MESSAGE_TEXT).textContent())
    );

    const hasSenderMessage = messageTexts.some(text => text?.includes("Hello from sender!"));

    if (!hasSenderMessage) {
      throw new Error(`Sender's message not visible after live data update. Messages: ${JSON.stringify(messageTexts)}`);
    }

    if (messages.length !== 1) {
      throw new Error(`Expected 1 message, found ${messages.length}`);
    }

    console.log("📥 RECEIVER: Sender's message verified successfully!");

    console.log("📥 RECEIVER: Sending reply...");
    const receiverMessageText = "Hi from receiver!";
    await fillByTestId(page, TestId.MESSAGE_INPUT, receiverMessageText);
    await clickByTestId(page, TestId.MESSAGE_SEND_BUTTON);
    await page.waitForTimeout(1000);

    const updatedMessageCount = await page.getByTestId(TestId.MESSAGE_ITEM).count();
    if (updatedMessageCount !== 2) {
      throw new Error(`Expected 2 messages after reply, found ${updatedMessageCount}`);
    }

    console.log("📥 RECEIVER: Reply sent successfully, signaling...");
    fs.writeFileSync(RECEIVER_MESSAGE_SENT_FILE, "created");

    console.log("📥 RECEIVER: Test completed successfully! Polling-based live messaging works!");
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
    } catch (error) {
    }
  }
}
