import { clickByTestId, fillByTestId, waitForElement } from "@/lib/test.utils";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { TestId } from "../test.types";
import { expect, test } from "./utils/test-fixtures";

const prisma = new PrismaClient();

test.describe("Live Data Test", () => {
  test.describe.configure({ mode: "parallel" });

  const inviterEmail = "simple-inviter@example.com";
  const inviterPassword = "InviterPass123!";
  const inviterName = "Simple Inviter";
  const inviteeEmail = "simple-invitee@example.com";
  const inviteePassword = "InviteePass123!";
  const inviteeName = "Simple Invitee";

  const SYNC_DIR = path.join(process.cwd(), ".test-sync");
  const INVITER_CREATED_FILE = path.join(SYNC_DIR, "inviter-created.txt");
  const INVITEE_CREATED_FILE = path.join(SYNC_DIR, "invitee-created.txt");
  const ORG_SELECTED_FILE = path.join(SYNC_DIR, "org-selected.txt");
  const INVITEE_SENT_MESSAGE_FILE = path.join(
    SYNC_DIR,
    "invitee-sent-message.txt"
  );
  const INVITER_REPLIED_FILE = path.join(SYNC_DIR, "inviter-replied.txt");

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
    if (fs.existsSync(ORG_SELECTED_FILE)) {
      fs.unlinkSync(ORG_SELECTED_FILE);
    }
    if (fs.existsSync(INVITEE_SENT_MESSAGE_FILE)) {
      fs.unlinkSync(INVITEE_SENT_MESSAGE_FILE);
    }
    if (fs.existsSync(INVITER_REPLIED_FILE)) {
      fs.unlinkSync(INVITER_REPLIED_FILE);
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
    if (fs.existsSync(ORG_SELECTED_FILE)) {
      fs.unlinkSync(ORG_SELECTED_FILE);
    }
    if (fs.existsSync(INVITEE_SENT_MESSAGE_FILE)) {
      fs.unlinkSync(INVITEE_SENT_MESSAGE_FILE);
    }
    if (fs.existsSync(INVITER_REPLIED_FILE)) {
      fs.unlinkSync(INVITER_REPLIED_FILE);
    }
    if (fs.existsSync(SYNC_DIR) && fs.readdirSync(SYNC_DIR).length === 0) {
      fs.rmdirSync(SYNC_DIR);
    }

    await Promise.all([cleanupUser(inviterEmail), cleanupUser(inviteeEmail)]);

    await prisma.$disconnect();
  });

  test("inviter: create account, send invitation, and verify live data updates", async ({
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

    console.log("✉️ INVITER: Opening invite dialog...");
    await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);
    await clickByTestId(page, TestId.INVITE_USERS_BUTTON);
    await waitForElement(page, TestId.INVITE_DIALOG, 30000);

    console.log("✉️ INVITER: Sending invitation...");
    await fillByTestId(page, TestId.INVITE_EMAIL_INPUT, inviteeEmail);
    await clickByTestId(page, TestId.INVITE_SEND_BUTTON);

    await page.waitForSelector('[data-testid="toast-success"]', {
      state: "visible",
      timeout: 30000,
    });

    console.log("✉️ INVITER: Invitation sent successfully!");

    console.log("✉️ INVITER: Waiting for invitee to select organization...");
    const maxWaitForOrgSelect = 120000;
    const startTimeForOrgSelect = Date.now();

    while (Date.now() - startTimeForOrgSelect < maxWaitForOrgSelect) {
      if (fs.existsSync(ORG_SELECTED_FILE)) {
        break;
      }
      await page.waitForTimeout(100);
    }

    if (!fs.existsSync(ORG_SELECTED_FILE)) {
      throw new Error("Invitee did not select organization after 120s");
    }

    console.log("✉️ INVITER: Invitee selected organization successfully!");

    console.log("✉️ INVITER: Expanding messaging component...");
    await clickByTestId(page, TestId.MESSAGE_EXPAND_BUTTON);
    const messageComponent = page.getByTestId(TestId.MESSAGE_COMPONENT);
    await expect(messageComponent).toHaveAttribute("data-state", "expanded");

    console.log("✉️ INVITER: Sending first message...");
    await fillByTestId(page, TestId.MESSAGE_INPUT, "Hello from inviter!");
    await clickByTestId(page, TestId.MESSAGE_SEND_BUTTON);

    console.log("✉️ INVITER: Verifying message appears in chat...");
    const maxWaitForMessage = 20000;
    const startTimeForMessage = Date.now();
    let messageAppeared = false;

    while (Date.now() - startTimeForMessage < maxWaitForMessage) {
      const messages = await page
        .getByTestId(TestId.MESSAGE_TEXT)
        .allTextContents();
      if (messages.some((msg) => msg.includes("Hello from inviter!"))) {
        messageAppeared = true;
        break;
      }
      await page.waitForTimeout(500);
    }

    if (!messageAppeared) {
      throw new Error("Inviter's message did not appear after 20s");
    }

    console.log("✉️ INVITER: Message sent successfully!");

    console.log("✉️ INVITER: Waiting for invitee to send a message...");
    const maxWaitForInviteeMessage = 60000;
    const startTimeForInviteeMessage = Date.now();

    while (Date.now() - startTimeForInviteeMessage < maxWaitForInviteeMessage) {
      if (fs.existsSync(INVITEE_SENT_MESSAGE_FILE)) {
        break;
      }
      await page.waitForTimeout(100);
    }

    if (!fs.existsSync(INVITEE_SENT_MESSAGE_FILE)) {
      throw new Error("Invitee did not send message after 60s");
    }

    console.log("✉️ INVITER: Waiting for invitee's message to appear...");
    const maxWaitForInviteeMessageDisplay = 20000;
    const startTimeForInviteeMessageDisplay = Date.now();
    let inviteeMessageAppeared = false;

    while (
      Date.now() - startTimeForInviteeMessageDisplay <
      maxWaitForInviteeMessageDisplay
    ) {
      const messages = await page
        .getByTestId(TestId.MESSAGE_TEXT)
        .allTextContents();
      if (
        messages.some((msg) => msg.includes("Hi inviter, I got your message!"))
      ) {
        inviteeMessageAppeared = true;
        break;
      }
      await page.waitForTimeout(500);
    }

    if (!inviteeMessageAppeared) {
      throw new Error("Invitee's message did not appear after 20s");
    }

    console.log("✉️ INVITER: Invitee's message received successfully!");

    console.log("✉️ INVITER: Sending reply...");
    await fillByTestId(page, TestId.MESSAGE_INPUT, "Got your message!");
    await clickByTestId(page, TestId.MESSAGE_SEND_BUTTON);

    console.log("✉️ INVITER: Verifying reply appears in chat...");
    const maxWaitForReply = 20000;
    const startTimeForReply = Date.now();
    let replyAppeared = false;

    while (Date.now() - startTimeForReply < maxWaitForReply) {
      const messages = await page
        .getByTestId(TestId.MESSAGE_TEXT)
        .allTextContents();
      if (messages.some((msg) => msg.includes("Got your message!"))) {
        replyAppeared = true;
        break;
      }
      await page.waitForTimeout(500);
    }

    if (!replyAppeared) {
      throw new Error("Inviter's reply did not appear after 20s");
    }

    console.log("✉️ INVITER: Reply sent successfully, signaling invitee...");
    fs.writeFileSync(INVITER_REPLIED_FILE, "replied");
  });

  test("invitee: create account, receive invitation, accept, and create todo", async ({
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

    console.log("📭 INVITEE: Waiting for invitation toast...");
    const invitationReceived = await waitForElement(
      page,
      TestId.INVITATION_TOAST,
      30000
    );

    if (!invitationReceived) {
      throw new Error("Invitation toast did not appear within 120s");
    }

    console.log("📭 INVITEE: Invitation received successfully!");

    const toast = page.getByTestId(TestId.INVITATION_TOAST);
    const orgName = await toast.getAttribute("data-org-name");
    const orgId = await toast.getAttribute("data-organization-id");

    console.log(`📭 INVITEE: Received invitation from org: ${orgName}`);
    console.log(`📭 INVITEE: Organization ID: ${orgId}`);

    if (!orgName || orgName.trim() === "") {
      throw new Error("Organization name is empty or missing in toast");
    }

    if (!orgId || orgId.trim() === "") {
      throw new Error("Organization ID is empty or missing in toast");
    }

    console.log("📭 INVITEE: Accepting invitation...");
    await clickByTestId(page, TestId.INVITATION_ACCEPT_BUTTON);

    await page.waitForSelector(`[data-testid="${TestId.INVITATION_TOAST}"]`, {
      state: "hidden",
      timeout: 30000,
    });

    console.log("📭 INVITEE: Invitation accepted!");

    console.log("📭 INVITEE: Opening avatar menu to select organization...");
    await page.waitForTimeout(2000);
    await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);

    console.log(
      "📭 INVITEE: Waiting for organization to appear in selector..."
    );
    const orgSelect = page.getByTestId(TestId.AVATAR_MENU_ORG_SELECT);
    await orgSelect.waitFor({ state: "visible", timeout: 30000 });

    const maxWaitForOrg = 30000;
    const startTimeForOrg = Date.now();
    let hasOrg = false;
    let orgSelectOptions: string[] = [];

    while (Date.now() - startTimeForOrg < maxWaitForOrg) {
      orgSelectOptions = await orgSelect.locator("option").allTextContents();
      hasOrg = orgSelectOptions.some((opt) => opt.includes(orgName || ""));
      if (hasOrg) {
        break;
      }
      await page.waitForTimeout(500);
    }

    console.log(
      `📭 INVITEE: Available organizations: ${orgSelectOptions.join(", ")}`
    );

    if (!hasOrg) {
      throw new Error(
        `Organization ${orgName} not found in selector after 30s. Available: ${orgSelectOptions.join(
          ", "
        )}`
      );
    }

    console.log(`📭 INVITEE: Found organization ${orgName}, selecting it...`);
    await orgSelect.selectOption({ value: orgId || "" });

    console.log("📭 INVITEE: Closing avatar menu...");
    await page.keyboard.press("Escape");

    console.log("📭 INVITEE: Verifying organization is selected...");
    const tamagotchi = page.getByTestId(TestId.TAMAGOTCHI_CONTAINER);

    const maxWaitForOrgSelection = 30000;
    const startTimeForOrgSelection = Date.now();
    let currentOrgId = await tamagotchi.getAttribute("data-organization-id");

    while (Date.now() - startTimeForOrgSelection < maxWaitForOrgSelection) {
      currentOrgId = await tamagotchi.getAttribute("data-organization-id");
      if (currentOrgId === orgId) {
        break;
      }
      await page.waitForTimeout(500);
    }

    if (currentOrgId !== orgId) {
      throw new Error(
        `Organization not selected. Expected: ${orgId}, Got: ${currentOrgId}`
      );
    }

    console.log("📭 INVITEE: Organization verified as selected!");
    fs.writeFileSync(ORG_SELECTED_FILE, "selected");
    console.log("📭 INVITEE: Signaled organization selection to inviter!");

    console.log("📭 INVITEE: Expanding messaging component...");
    await clickByTestId(page, TestId.MESSAGE_EXPAND_BUTTON);
    const messageComponent = page.getByTestId(TestId.MESSAGE_COMPONENT);
    await expect(messageComponent).toHaveAttribute("data-state", "expanded");

    console.log("📭 INVITEE: Waiting for inviter's message to appear...");
    const maxWaitForInviterMessage = 15000;
    const startTimeForInviterMessage = Date.now();
    let inviterMessageAppeared = false;

    while (
      Date.now() - startTimeForInviterMessage <
      maxWaitForInviterMessage
    ) {
      const messages = await page
        .getByTestId(TestId.MESSAGE_TEXT)
        .allTextContents();
      if (messages.some((msg) => msg.includes("Hello from inviter!"))) {
        inviterMessageAppeared = true;
        break;
      }
      await page.waitForTimeout(500);
    }

    if (!inviterMessageAppeared) {
      throw new Error("Inviter's message did not appear after 15s");
    }

    console.log("📭 INVITEE: Inviter's message received successfully!");

    console.log("📭 INVITEE: Verifying message has inviter's user ID...");
    const messageItems = page.getByTestId(TestId.MESSAGE_ITEM);
    const messageCount = await messageItems.count();
    let foundInviterMessage = false;

    for (let i = 0; i < messageCount; i++) {
      const messageText = await messageItems
        .nth(i)
        .getByTestId(TestId.MESSAGE_TEXT)
        .textContent();
      if (messageText?.includes("Hello from inviter!")) {
        const userId = await messageItems.nth(i).getAttribute("data-user-id");
        if (userId) {
          console.log(`📭 INVITEE: Found inviter's message with user ID: ${userId}`);
          foundInviterMessage = true;
          break;
        }
      }
    }

    if (!foundInviterMessage) {
      throw new Error("Could not verify inviter's user ID on message");
    }

    console.log("📭 INVITEE: Sending reply...");
    await fillByTestId(
      page,
      TestId.MESSAGE_INPUT,
      "Hi inviter, I got your message!"
    );
    await clickByTestId(page, TestId.MESSAGE_SEND_BUTTON);

    console.log("📭 INVITEE: Verifying reply appears in chat...");
    const maxWaitForReply = 20000;
    const startTimeForReply = Date.now();
    let replyAppeared = false;

    while (Date.now() - startTimeForReply < maxWaitForReply) {
      const messages = await page
        .getByTestId(TestId.MESSAGE_TEXT)
        .allTextContents();
      if (messages.some((msg) => msg.includes("Hi inviter, I got your message!"))) {
        replyAppeared = true;
        break;
      }
      await page.waitForTimeout(500);
    }

    if (!replyAppeared) {
      throw new Error("Invitee's reply did not appear after 20s");
    }

    console.log("📭 INVITEE: Reply sent successfully, signaling inviter...");
    fs.writeFileSync(INVITEE_SENT_MESSAGE_FILE, "sent");

    console.log("📭 INVITEE: Waiting for inviter's reply...");
    const maxWaitForInviterReply = 60000;
    const startTimeForInviterReply = Date.now();

    while (Date.now() - startTimeForInviterReply < maxWaitForInviterReply) {
      if (fs.existsSync(INVITER_REPLIED_FILE)) {
        break;
      }
      await page.waitForTimeout(100);
    }

    if (!fs.existsSync(INVITER_REPLIED_FILE)) {
      throw new Error("Inviter did not reply after 60s");
    }

    console.log("📭 INVITEE: Waiting for inviter's reply to appear in chat...");
    const maxWaitForInviterReplyDisplay = 15000;
    const startTimeForInviterReplyDisplay = Date.now();
    let inviterReplyAppeared = false;

    while (
      Date.now() - startTimeForInviterReplyDisplay <
      maxWaitForInviterReplyDisplay
    ) {
      const messages = await page
        .getByTestId(TestId.MESSAGE_TEXT)
        .allTextContents();
      if (messages.some((msg) => msg.includes("Got your message!"))) {
        inviterReplyAppeared = true;
        break;
      }
      await page.waitForTimeout(500);
    }

    if (!inviterReplyAppeared) {
      throw new Error("Inviter's reply did not appear after 15s");
    }

    console.log("📭 INVITEE: Inviter's reply received successfully!");

    console.log("📭 INVITEE: Switching back to personal organization...");
    await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);

    console.log("📭 INVITEE: Finding personal organization...");
    const orgSelect2 = page.getByTestId(TestId.AVATAR_MENU_ORG_SELECT);
    await orgSelect2.waitFor({ state: "visible", timeout: 30000 });

    const allOrgOptions = await orgSelect2.locator("option").all();
    let personalOrgId = "";

    for (const option of allOrgOptions) {
      const value = await option.getAttribute("value");
      if (value && value !== orgId) {
        personalOrgId = value;
        const text = await option.textContent();
        console.log(`📭 INVITEE: Found personal org: ${text} (${value})`);
        break;
      }
    }

    if (!personalOrgId) {
      throw new Error("Could not find personal organization");
    }

    console.log("📭 INVITEE: Selecting personal organization...");
    await orgSelect2.selectOption({ value: personalOrgId });

    console.log("📭 INVITEE: Closing avatar menu...");
    await page.keyboard.press("Escape");

    console.log("📭 INVITEE: Verifying organization switch...");
    const maxWaitForOrgSwitch = 30000;
    const startTimeForOrgSwitch = Date.now();
    let orgSwitched = false;

    while (Date.now() - startTimeForOrgSwitch < maxWaitForOrgSwitch) {
      const currentOrgId2 = await tamagotchi.getAttribute(
        "data-organization-id"
      );
      if (currentOrgId2 === personalOrgId) {
        orgSwitched = true;
        break;
      }
      await page.waitForTimeout(500);
    }

    if (!orgSwitched) {
      throw new Error(
        `Organization not switched. Expected: ${personalOrgId}, Got: ${await tamagotchi.getAttribute(
          "data-organization-id"
        )}`
      );
    }

    console.log("📭 INVITEE: Organization switched successfully!");

    console.log(
      "📭 INVITEE: Verifying messages from shared org are no longer visible..."
    );
    await page.waitForTimeout(6000);

    const messagesAfterSwitch = await page
      .getByTestId(TestId.MESSAGE_TEXT)
      .allTextContents();

    const hasInviterMessage = messagesAfterSwitch.some((msg) =>
      msg.includes("Hello from inviter!")
    );
    const hasInviteeMessage = messagesAfterSwitch.some((msg) =>
      msg.includes("Hi inviter, I got your message!")
    );
    const hasInviterReply = messagesAfterSwitch.some((msg) =>
      msg.includes("Got your message!")
    );

    if (hasInviterMessage || hasInviteeMessage || hasInviterReply) {
      throw new Error(
        `Messages from shared org should not be visible in personal org. Found: ${messagesAfterSwitch.join(
          ", "
        )}`
      );
    }

    console.log(
      "📭 INVITEE: Confirmed messages are not visible in personal org!"
    );
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
    } catch (error) {}
  }
}
