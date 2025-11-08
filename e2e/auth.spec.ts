import { test, expect } from "./utils/test-fixtures";
import { TestId } from "../test.types";
import { cleanupAuthTestUsers } from "./utils/cleanup-auth-users";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_USER_EMAIL = "test-signup@example.com";
const TEST_USER_NAME = "Test Signup User";
const TEST_PASSWORD = "TestPassword123!";
const EXISTING_USER_EMAIL = "e2e-test@example.com";
const EXISTING_USER_PASSWORD = "E2ETestPass123!";

test.describe("Authentication Flow Tests", () => {
  test.beforeAll(async () => {
    await cleanupAuthTestUsers();
  });

  test.afterAll(async () => {
    await cleanupAuthTestUsers();
    await prisma.$disconnect();
  });

  test("should sign up new user and sign out", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId(TestId.SIGN_IN_BUTTON)).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId(TestId.SIGN_IN_BUTTON).click();
    await page.waitForURL(/\/sign-in/, { timeout: 10000 });

    await page.getByTestId(TestId.SIGN_UP_LINK).click();
    await page.waitForURL(/\/sign-up/, { timeout: 10000 });

    await page.getByTestId(TestId.SIGN_UP_NAME).fill(TEST_USER_NAME);
    await page.getByTestId(TestId.SIGN_UP_EMAIL).fill(TEST_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_UP_PASSWORD).fill(TEST_PASSWORD);

    await page.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    await page.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId(TestId.AVATAR_MENU_TRIGGER)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByTestId(TestId.TODO_LIST)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByTestId(TestId.TODO_INPUT)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByTestId(TestId.TAMAGOTCHI_CONTAINER)).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId(TestId.AVATAR_MENU_TRIGGER).click();

    await expect(page.getByTestId(TestId.AVATAR_MENU_CONTENT)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByTestId(TestId.AVATAR_MENU_EMAIL)).toContainText(
      TEST_USER_EMAIL,
      { timeout: 10000 }
    );

    await page.getByTestId(TestId.AVATAR_MENU_SIGN_OUT).click();

    await page.waitForURL(/\/sign-in/, {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId(TestId.SIGN_IN_EMAIL)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should sign in with existing user and sign out", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForURL(/\/sign-in/, { timeout: 10000 });

    await expect(page.getByTestId(TestId.SIGN_IN_EMAIL)).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId(TestId.SIGN_IN_EMAIL).fill(EXISTING_USER_EMAIL);
    await page
      .getByTestId(TestId.SIGN_IN_PASSWORD)
      .fill(EXISTING_USER_PASSWORD);

    await page.getByTestId(TestId.SIGN_IN_SUBMIT).click();

    await page.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId(TestId.AVATAR_MENU_TRIGGER)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByTestId(TestId.TODO_LIST)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByTestId(TestId.TODO_INPUT)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByTestId(TestId.TAMAGOTCHI_CONTAINER)).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId(TestId.AVATAR_MENU_TRIGGER).click();

    await expect(page.getByTestId(TestId.AVATAR_MENU_CONTENT)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByTestId(TestId.AVATAR_MENU_EMAIL)).toContainText(
      EXISTING_USER_EMAIL,
      { timeout: 10000 }
    );

    await page.getByTestId(TestId.AVATAR_MENU_SIGN_OUT).click();

    await page.waitForURL(/\/sign-in/, {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId(TestId.SIGN_IN_EMAIL)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show error when signing up with existing email", async ({
    page,
  }) => {
    await page.goto("/sign-up");

    await page.getByTestId(TestId.SIGN_UP_NAME).fill("Existing User");
    await page.getByTestId(TestId.SIGN_UP_EMAIL).fill(EXISTING_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_UP_PASSWORD).fill(TEST_PASSWORD);

    await page.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    await expect(page.getByTestId(TestId.TOAST_ERROR)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show error when signing in with wrong password", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    await page.getByTestId(TestId.SIGN_IN_EMAIL).fill(EXISTING_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_IN_PASSWORD).fill("WrongPassword123!");

    await page.getByTestId(TestId.SIGN_IN_SUBMIT).click();

    await expect(page.getByTestId(TestId.TOAST_ERROR)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show error when signing in with non-existent email", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    await page
      .getByTestId(TestId.SIGN_IN_EMAIL)
      .fill("nonexistent@example.com");
    await page.getByTestId(TestId.SIGN_IN_PASSWORD).fill(TEST_PASSWORD);

    await page.getByTestId(TestId.SIGN_IN_SUBMIT).click();

    await expect(page.getByTestId(TestId.TOAST_ERROR)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should require all fields for sign up", async ({ page }) => {
    await page.goto("/sign-up");

    await page.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    const nameInput = page.getByTestId(TestId.SIGN_UP_NAME);
    await expect(nameInput).toHaveAttribute("required", "");

    const emailInput = page.getByTestId(TestId.SIGN_UP_EMAIL);
    await expect(emailInput).toHaveAttribute("required", "");

    const passwordInput = page.getByTestId(TestId.SIGN_UP_PASSWORD);
    await expect(passwordInput).toHaveAttribute("required", "");
  });

  test("should require all fields for sign in", async ({ page }) => {
    await page.goto("/sign-in");

    await page.getByTestId(TestId.SIGN_IN_SUBMIT).click();

    const emailInput = page.getByTestId(TestId.SIGN_IN_EMAIL);
    await expect(emailInput).toHaveAttribute("required", "");

    const passwordInput = page.getByTestId(TestId.SIGN_IN_PASSWORD);
    await expect(passwordInput).toHaveAttribute("required", "");
  });

  test("should toggle password visibility on sign up", async ({ page }) => {
    await page.goto("/sign-up");

    const passwordInput = page.getByTestId(TestId.SIGN_UP_PASSWORD);
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByTestId(TestId.SIGN_UP_PASSWORD_TOGGLE).click();

    await expect(passwordInput).toHaveAttribute("type", "text");

    await page.getByTestId(TestId.SIGN_UP_PASSWORD_TOGGLE).click();

    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("should navigate between sign in and sign up pages", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    await expect(page.getByTestId(TestId.SIGN_IN_EMAIL)).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId(TestId.SIGN_UP_LINK).click();
    await page.waitForURL(/\/sign-up/, { timeout: 10000 });

    await expect(page.getByTestId(TestId.SIGN_UP_NAME)).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId(TestId.SIGN_IN_LINK).click();
    await page.waitForURL(/\/sign-in/, { timeout: 10000 });

    await expect(page.getByTestId(TestId.SIGN_IN_EMAIL)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should redirect to home when accessing sign in while authenticated", async ({
    page,
  }) => {
    await page.goto("/sign-up");

    const uniqueEmail = `test-redirect-${Date.now()}@example.com`;

    await page.getByTestId(TestId.SIGN_UP_NAME).fill("Redirect Test User");
    await page.getByTestId(TestId.SIGN_UP_EMAIL).fill(uniqueEmail);
    await page.getByTestId(TestId.SIGN_UP_PASSWORD).fill(TEST_PASSWORD);

    await page.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    await page.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await page.goto("/sign-in");

    await expect(page).toHaveURL("/", { timeout: 10000 });

    await page.getByTestId(TestId.AVATAR_MENU_TRIGGER).click();
    await page.getByTestId(TestId.AVATAR_MENU_SIGN_OUT).click();

    await page.waitForURL(/\/sign-in/, {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await prisma.session.deleteMany({
      where: { user: { email: uniqueEmail } },
    });
    await prisma.member.deleteMany({
      where: { user: { email: uniqueEmail } },
    });
    const redirectTestUser = await prisma.user.findUnique({
      where: { email: uniqueEmail },
      include: { member: { include: { organization: true } } },
    });
    if (redirectTestUser) {
      const orgIds = redirectTestUser.member.map((m) => m.organizationId);
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
      where: { email: uniqueEmail },
    });
  });
});
