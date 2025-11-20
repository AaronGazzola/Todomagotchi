import { clickByTestId, fillByTestId, waitForElement } from "@/lib/test.utils";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { TestId } from "../test.types";
import { expect, test } from "./utils/test-fixtures";

const prisma = new PrismaClient();

test.describe("Live Data Test", () => {
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
  const TODO_CREATED_FILE = path.join(SYNC_DIR, "todo-created.txt");

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
    if (fs.existsSync(TODO_CREATED_FILE)) {
      fs.unlinkSync(TODO_CREATED_FILE);
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
    if (fs.existsSync(TODO_CREATED_FILE)) {
      fs.unlinkSync(TODO_CREATED_FILE);
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

      console.log("✉️ INVITER: Waiting for invitee SSE connection...");
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

      console.log("✉️ INVITER: Waiting for invitee to create a todo...");
      const maxWaitTimeForTodo = 120000;
      const startTimeForTodo = Date.now();

      while (Date.now() - startTimeForTodo < maxWaitTimeForTodo) {
        if (fs.existsSync(TODO_CREATED_FILE)) {
          break;
        }
        await page.waitForTimeout(100);
      }

      if (!fs.existsSync(TODO_CREATED_FILE)) {
        throw new Error("Todo not created by invitee after 120s");
      }

      console.log("✉️ INVITER: Waiting for live data update...");
      await page.waitForTimeout(3000);

      console.log("✉️ INVITER: Verifying todo is visible...");
      const todoItem = await waitForElement(page, TestId.TODO_ITEM, 30000);

      if (!todoItem) {
        throw new Error("Todo item not visible after live data update");
      }

      console.log("✉️ INVITER: Todo verified successfully!");

      console.log("✉️ INVITER: Verifying tamagotchi age increased...");
      const tamagotchi = page.getByTestId(TestId.TAMAGOTCHI_CONTAINER);
      const age = await tamagotchi.getAttribute("data-age");
      const ageNumber = parseInt(age || "0", 10);

      if (ageNumber === 0) {
        throw new Error(`Tamagotchi age is still 0, expected > 0. Got: ${age}`);
      }

      console.log(`✉️ INVITER: Tamagotchi age verified: ${age}`);
      console.log("✉️ INVITER: Live data updates working successfully!");
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

      console.log(
        "📭 INVITEE: Waiting for user data and SSE initialization..."
      );
      await page.waitForTimeout(2000);

      console.log("📭 INVITEE: Verifying SSE connection...");
      const connected = await page.waitForFunction(
        () => {
          const es = (window as unknown as { __eventSource?: EventSource }).__eventSource;
          return es?.readyState === 1;
        },
        { timeout: 30000 }
      );

      if (!connected) {
        throw new Error("SSE connection not established within 10s");
      }

      console.log("📭 INVITEE: SSE connected, signaling readiness...");
      if (!fs.existsSync(SYNC_DIR)) {
        fs.mkdirSync(SYNC_DIR, { recursive: true });
      }
      fs.writeFileSync(SSE_READY_FILE, "ready");

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

      await page.waitForSelector(
        `[data-testid="${TestId.INVITATION_TOAST}"]`,
        { state: "hidden", timeout: 30000 }
      );

      console.log("📭 INVITEE: Invitation accepted!");

      console.log("📭 INVITEE: Opening avatar menu to select organization...");
      await page.waitForTimeout(2000);
      await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);

      console.log("📭 INVITEE: Waiting for organization to appear in selector...");
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

      console.log(`📭 INVITEE: Available organizations: ${orgSelectOptions.join(", ")}`);

      if (!hasOrg) {
        throw new Error(`Organization ${orgName} not found in selector after 30s. Available: ${orgSelectOptions.join(", ")}`);
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
        throw new Error(`Organization not selected. Expected: ${orgId}, Got: ${currentOrgId}`);
      }

      console.log("📭 INVITEE: Organization verified as selected!");

      console.log("📭 INVITEE: Verifying organization-specific Tamagotchi data is present...");
      const maxWaitForTamagotchiData = 30000;
      const startTimeForTamagotchiData = Date.now();
      let tamagotchiAge = await tamagotchi.getAttribute("data-age");

      while (Date.now() - startTimeForTamagotchiData < maxWaitForTamagotchiData) {
        tamagotchiAge = await tamagotchi.getAttribute("data-age");
        if (tamagotchiAge !== null) {
          break;
        }
        await page.waitForTimeout(500);
      }

      if (tamagotchiAge === null) {
        throw new Error("Tamagotchi data not loaded for selected organization");
      }

      console.log(`📭 INVITEE: Tamagotchi data verified (age: ${tamagotchiAge})`);

      console.log("📭 INVITEE: Creating a todo...");
      await fillByTestId(page, TestId.TODO_INPUT, "Test todo from invitee");
      await clickByTestId(page, TestId.TODO_ADD_BUTTON);

      await page.waitForTimeout(2000);

      const todoItem = await waitForElement(page, TestId.TODO_ITEM, 30000);

      if (!todoItem) {
        throw new Error("Todo item not created");
      }

      console.log("📭 INVITEE: Todo created successfully!");

      fs.writeFileSync(TODO_CREATED_FILE, "created");

      console.log("📭 INVITEE: Test completed successfully! Real-time invitation and data sync works!");
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
