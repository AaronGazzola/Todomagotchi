import { test, expect } from "./utils/test-fixtures";
import { TestId } from "../test.types";
import { cleanupTestData } from "./utils/test-cleanup";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USER_A_EMAIL = `test-invite-user-a-${Date.now()}@example.com`;
const USER_A_NAME = "Test User A";
const USER_A_PASSWORD = "TestPassword123!";

const USER_B_EMAIL = `test-invite-user-b-${Date.now()}@example.com`;
const USER_B_NAME = "Test User B";
const USER_B_PASSWORD = "TestPassword123!";

const ORG_A_NAME = "Organization A";

test.describe("Organization Invitation Flow", () => {
  test.beforeAll(async () => {
    await cleanupTestData([USER_A_EMAIL, USER_B_EMAIL]);
  });

  test.afterAll(async () => {
    await cleanupTestData([USER_A_EMAIL, USER_B_EMAIL]);
    await prisma.$disconnect();
  });

  test("should complete full invitation flow with real-time updates and org switching", async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await pageA.goto("/sign-up");
    await pageA.getByTestId(TestId.SIGN_UP_NAME).fill(USER_A_NAME);
    await pageA.getByTestId(TestId.SIGN_UP_EMAIL).fill(USER_A_EMAIL);
    await pageA.getByTestId(TestId.SIGN_UP_PASSWORD).fill(USER_A_PASSWORD);
    await pageA.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    await pageA.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(pageA.getByTestId(TestId.AVATAR_MENU_TRIGGER)).toBeVisible({
      timeout: 10000,
    });

    await pageA.getByTestId(TestId.AVATAR_MENU_TRIGGER).click();

    await expect(pageA.getByTestId(TestId.AVATAR_MENU_CONTENT)).toBeVisible({
      timeout: 10000,
    });

    const orgSelect = pageA.getByTestId(TestId.AVATAR_MENU_ORG_SELECT);
    await expect(orgSelect.locator("option")).toHaveCount(2, { timeout: 10000 });
    const orgAId = await orgSelect.inputValue();

    await pageA.getByTestId(TestId.INVITE_USERS_BUTTON).click();

    await expect(pageA.getByTestId(TestId.INVITE_DIALOG)).toBeVisible({
      timeout: 10000,
    });

    await pageA.getByTestId(TestId.INVITE_EMAIL_INPUT).fill(USER_B_EMAIL);

    await pageA.getByTestId(TestId.INVITE_ROLE_SELECT).selectOption("member");

    await pageA.getByTestId(TestId.INVITE_SEND_BUTTON).click();

    await expect(pageA.getByTestId(TestId.TOAST_SUCCESS)).toBeVisible({
      timeout: 10000,
    });

    await pageB.goto("/sign-up");
    await pageB.getByTestId(TestId.SIGN_UP_NAME).fill(USER_B_NAME);
    await pageB.getByTestId(TestId.SIGN_UP_EMAIL).fill(USER_B_EMAIL);
    await pageB.getByTestId(TestId.SIGN_UP_PASSWORD).fill(USER_B_PASSWORD);
    await pageB.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    await pageB.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(pageB.getByTestId(TestId.INVITATION_TOAST)).toBeVisible({
      timeout: 10000,
    });

    const invitationToast = pageB.getByTestId(TestId.INVITATION_TOAST);
    await expect(invitationToast).toHaveAttribute("data-org-name", ORG_A_NAME, { timeout: 10000 });
    await expect(invitationToast).toHaveAttribute("data-role", "member", { timeout: 10000 });

    await pageB.getByTestId(TestId.INVITATION_ACCEPT_BUTTON).click();

    await expect(pageB.getByTestId(TestId.TOAST_SUCCESS)).toBeVisible({
      timeout: 10000,
    });

    await pageB.getByTestId(TestId.AVATAR_MENU_TRIGGER).click();

    await expect(pageB.getByTestId(TestId.AVATAR_MENU_CONTENT)).toBeVisible({
      timeout: 10000,
    });

    const orgSelectB = pageB.getByTestId(TestId.AVATAR_MENU_ORG_SELECT);
    await expect(orgSelectB.locator("option")).toHaveCount(3, { timeout: 10000 });

    await orgSelectB.selectOption(orgAId);

    await expect(pageB.getByTestId(TestId.TOAST_SUCCESS)).toBeVisible({
      timeout: 10000,
    });

    await pageA.getByTestId(TestId.TODO_INPUT).fill("User A Todo in Org A");
    await pageA.getByTestId(TestId.TODO_ADD_BUTTON).click();

    await expect(
      pageA.getByTestId(TestId.TODO_ITEM).filter({ hasText: "User A Todo in Org A" })
    ).toBeVisible({ timeout: 10000 });

    await pageB.reload();
    await pageB.waitForLoadState("domcontentloaded");

    await expect(
      pageB.getByTestId(TestId.TODO_ITEM).filter({ hasText: "User A Todo in Org A" })
    ).toBeVisible({ timeout: 10000 });

    await pageB.getByTestId(TestId.AVATAR_MENU_TRIGGER).click();
    const userBOrgSelect = pageB.getByTestId(TestId.AVATAR_MENU_ORG_SELECT);
    await expect(userBOrgSelect.locator("option")).toHaveCount(3, { timeout: 10000 });
    const userBOrgId = await userBOrgSelect.locator("option").nth(0).getAttribute("value");

    if (userBOrgId && userBOrgId !== orgAId) {
      await userBOrgSelect.selectOption(userBOrgId);

      await expect(pageB.getByTestId(TestId.TOAST_SUCCESS)).toBeVisible({
        timeout: 10000,
      });

      await pageB.reload();
      await pageB.waitForLoadState("domcontentloaded");

      const todoItems = pageB.getByTestId(TestId.TODO_ITEM);
      const count = await todoItems.count();

      if (count > 0) {
        const userATodo = todoItems.filter({ hasText: "User A Todo in Org A" });
        await expect(userATodo).toHaveCount(0);
      }
    }

    await contextA.close();
    await contextB.close();
  });

  test("should allow user to decline invitation", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const uniqueUserAEmail = `decline-test-a-${Date.now()}@example.com`;
    const uniqueUserBEmail = `decline-test-b-${Date.now()}@example.com`;

    await pageA.goto("/sign-up");
    await pageA.getByTestId(TestId.SIGN_UP_NAME).fill("Decline Test User A");
    await pageA.getByTestId(TestId.SIGN_UP_EMAIL).fill(uniqueUserAEmail);
    await pageA.getByTestId(TestId.SIGN_UP_PASSWORD).fill(USER_A_PASSWORD);
    await pageA.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    await pageA.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await pageA.getByTestId(TestId.AVATAR_MENU_TRIGGER).click();
    const orgSelectA = pageA.getByTestId(TestId.AVATAR_MENU_ORG_SELECT);
    await expect(orgSelectA.locator("option")).toHaveCount(2, { timeout: 10000 });
    await pageA.getByTestId(TestId.INVITE_USERS_BUTTON).click();
    await pageA.getByTestId(TestId.INVITE_EMAIL_INPUT).fill(uniqueUserBEmail);
    await pageA.getByTestId(TestId.INVITE_SEND_BUTTON).click();

    await expect(pageA.getByTestId(TestId.TOAST_SUCCESS)).toBeVisible({
      timeout: 10000,
    });

    await pageB.goto("/sign-up");
    await pageB.getByTestId(TestId.SIGN_UP_NAME).fill("Decline Test User B");
    await pageB.getByTestId(TestId.SIGN_UP_EMAIL).fill(uniqueUserBEmail);
    await pageB.getByTestId(TestId.SIGN_UP_PASSWORD).fill(USER_B_PASSWORD);
    await pageB.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    await pageB.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(pageB.getByTestId(TestId.INVITATION_TOAST)).toBeVisible({
      timeout: 10000,
    });

    await pageB.getByTestId(TestId.INVITATION_DECLINE_BUTTON).click();

    const invitationToast = pageB.getByTestId(TestId.INVITATION_TOAST);
    await expect(invitationToast).not.toBeVisible({ timeout: 10000 });

    await pageB.getByTestId(TestId.AVATAR_MENU_TRIGGER).click();
    const orgSelectB = pageB.getByTestId(TestId.AVATAR_MENU_ORG_SELECT);
    const optionsCount = await orgSelectB.locator("option").count();
    expect(optionsCount).toBe(2);

    await contextA.close();
    await contextB.close();

    await cleanupTestData([uniqueUserAEmail, uniqueUserBEmail]);
  });
});
