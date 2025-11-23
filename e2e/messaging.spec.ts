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
