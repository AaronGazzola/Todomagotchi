import { test, expect } from "@playwright/test";
import {
  TestResultLogger,
  signIn,
  signUp,
  signOut,
  generateUniqueEmail,
  formatTestConditions,
  logTestResult,
  isVisibleByTestId,
  fillByTestId,
  clickByTestId,
} from "../lib/test.utils";
import { TestId } from "../test.types";
import * as fs from "fs";
import * as path from "path";
import { cleanupTestData } from "./utils/test-cleanup";

test.describe("Authentication Flow Tests", () => {
  const logger = new TestResultLogger();
  const testUserEmails: string[] = [];

  test.afterAll(async () => {
    const testResultsDir = path.join(process.cwd(), "test-results");
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }

    const data = logger.getSerializableData();
    const callTimestamp = Date.now();
    const callPath = path.join(
      testResultsDir,
      `afterall-call-${callTimestamp}.json`
    );

    fs.writeFileSync(
      callPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          callId: callTimestamp,
          stats: data.stats,
          testsCount: data.tests.length,
          tests: data.tests,
        },
        null,
        2
      )
    );

    await cleanupTestData(testUserEmails);
  });

  test("should allow new user to sign up with email and password", async ({
    page,
  }) => {
    const uniqueEmail = generateUniqueEmail("newuser@example.com");
    testUserEmails.push(uniqueEmail);

    await page.goto("/auth");

    await clickByTestId(page, TestId.SIGN_UP_LINK);

    await signUp(page, {
      name: "New User",
      email: uniqueEmail,
      password: "Password123!",
    });

    let redirected = false;
    try {
      await page.waitForURL(/\/(?!auth)/, {
        timeout: 15000,
        waitUntil: "domcontentloaded",
      });
      redirected = true;
    } catch (error) {
      redirected = false;
    }

    await logTestResult(
      logger,
      page,
      "User registration and redirect",
      formatTestConditions({
        action: "sign up",
        email: uniqueEmail,
        page: "/auth",
      }),
      "User account created, redirected to dashboard",
      redirected,
      "User created and redirected successfully",
      "User not redirected or registration failed"
    );

    if (!redirected) {
      throw new Error("Test failed - see summary for details");
    }
  });

  test("should prevent sign up with invalid email format", async ({ page }) => {
    await page.goto("/auth");

    await clickByTestId(page, TestId.SIGN_UP_LINK);

    await fillByTestId(page, TestId.SIGN_UP_NAME, "Test User");
    await fillByTestId(page, TestId.SIGN_UP_EMAIL, "invalidemail");
    await fillByTestId(page, TestId.SIGN_UP_PASSWORD, "Password123!");
    await clickByTestId(page, TestId.SIGN_UP_SUBMIT);

    let errorVisible = false;
    try {
      await expect(page.locator(`[data-testid="${TestId.TOAST_ERROR}"]`)).toBeVisible({
        timeout: 5000,
      });
      errorVisible = await page
        .locator(`[data-testid="${TestId.TOAST_ERROR}"]`)
        .isVisible();
    } catch (error) {
      errorVisible = false;
    }

    await logTestResult(
      logger,
      page,
      "Invalid email validation",
      formatTestConditions({
        action: "sign up",
        email: "invalidemail",
        page: "/auth",
      }),
      "Error message displayed for invalid email",
      errorVisible,
      "Error message displayed",
      "No error message shown"
    );

    if (!errorVisible) {
      throw new Error("Test failed - see summary for details");
    }
  });

  test("should prevent sign up with password less than 8 characters", async ({
    page,
  }) => {
    await page.goto("/auth");

    await clickByTestId(page, TestId.SIGN_UP_LINK);

    await fillByTestId(page, TestId.SIGN_UP_NAME, "Test User");
    await fillByTestId(page, TestId.SIGN_UP_EMAIL, "test@example.com");
    await fillByTestId(page, TestId.SIGN_UP_PASSWORD, "Pass1!");
    await clickByTestId(page, TestId.SIGN_UP_SUBMIT);

    let errorVisible = false;
    try {
      await expect(page.locator(`[data-testid="${TestId.TOAST_ERROR}"]`)).toBeVisible({
        timeout: 5000,
      });
      errorVisible = await page
        .locator(`[data-testid="${TestId.TOAST_ERROR}"]`)
        .isVisible();
    } catch (error) {
      errorVisible = false;
    }

    await logTestResult(
      logger,
      page,
      "Weak password validation",
      formatTestConditions({
        action: "sign up",
        password: "Pass1!",
        page: "/auth",
      }),
      "Error message displayed for weak password",
      errorVisible,
      "Error message displayed",
      "No error message shown"
    );

    if (!errorVisible) {
      throw new Error("Test failed - see summary for details");
    }
  });

  test("should prevent sign up with duplicate email", async ({ page }) => {
    const duplicateEmail = generateUniqueEmail("duplicate@example.com");
    testUserEmails.push(duplicateEmail);

    await page.goto("/auth");

    await clickByTestId(page, TestId.SIGN_UP_LINK);

    await signUp(page, {
      name: "First User",
      email: duplicateEmail,
      password: "Password123!",
    });

    await page.waitForURL(/\/(?!auth)/, {
      timeout: 15000,
      waitUntil: "domcontentloaded",
    });

    await signOut(page);

    await page.waitForURL("/auth", { timeout: 10000 });

    await page.goto("/auth");

    await clickByTestId(page, TestId.SIGN_UP_LINK);

    await signUp(page, {
      name: "Second User",
      email: duplicateEmail,
      password: "Password123!",
    });

    let errorVisible = false;
    try {
      await expect(page.locator(`[data-testid="${TestId.TOAST_ERROR}"]`)).toBeVisible({
        timeout: 5000,
      });
      errorVisible = await page
        .locator(`[data-testid="${TestId.TOAST_ERROR}"]`)
        .isVisible();
    } catch (error) {
      errorVisible = false;
    }

    await logTestResult(
      logger,
      page,
      "Duplicate email validation",
      formatTestConditions({
        action: "sign up",
        email: duplicateEmail,
        page: "/auth",
      }),
      "Error message displayed indicating email already exists",
      errorVisible,
      "Error message displayed",
      "No error message shown"
    );

    if (!errorVisible) {
      throw new Error("Test failed - see summary for details");
    }
  });

  test("should allow existing user to sign in with correct credentials", async ({
    page,
  }) => {
    const testEmail = generateUniqueEmail("signin@example.com");
    testUserEmails.push(testEmail);

    await page.goto("/auth");

    await clickByTestId(page, TestId.SIGN_UP_LINK);

    await signUp(page, {
      name: "Sign In Test User",
      email: testEmail,
      password: "Password123!",
    });

    await page.waitForURL(/\/(?!auth)/, {
      timeout: 15000,
      waitUntil: "domcontentloaded",
    });

    await signOut(page);

    await page.waitForURL("/auth", { timeout: 10000 });

    await page.goto("/auth");

    await signIn(page, testEmail, "Password123!");

    let redirected = false;
    try {
      await page.waitForURL(/\/(?!auth)/, {
        timeout: 15000,
        waitUntil: "domcontentloaded",
      });
      redirected = true;
    } catch (error) {
      redirected = false;
    }

    await logTestResult(
      logger,
      page,
      "User sign in with correct credentials",
      formatTestConditions({
        action: "sign in",
        email: testEmail,
        page: "/auth",
      }),
      "User authenticated, redirected to dashboard",
      redirected,
      "User authenticated and redirected successfully",
      "User not redirected or authentication failed"
    );

    if (!redirected) {
      throw new Error("Test failed - see summary for details");
    }
  });

  test("should prevent sign in with incorrect password", async ({ page }) => {
    const testEmail = generateUniqueEmail("wrongpass@example.com");
    testUserEmails.push(testEmail);

    await page.goto("/auth");

    await clickByTestId(page, TestId.SIGN_UP_LINK);

    await signUp(page, {
      name: "Wrong Password Test",
      email: testEmail,
      password: "Password123!",
    });

    await page.waitForURL(/\/(?!auth)/, {
      timeout: 15000,
      waitUntil: "domcontentloaded",
    });

    await signOut(page);

    await page.waitForURL("/auth", { timeout: 10000 });

    await page.goto("/auth");

    await signIn(page, testEmail, "WrongPassword123!");

    let errorVisible = false;
    try {
      await expect(page.locator(`[data-testid="${TestId.TOAST_ERROR}"]`)).toBeVisible({
        timeout: 5000,
      });
      errorVisible = await page
        .locator(`[data-testid="${TestId.TOAST_ERROR}"]`)
        .isVisible();
    } catch (error) {
      errorVisible = false;
    }

    await logTestResult(
      logger,
      page,
      "Incorrect password validation",
      formatTestConditions({
        action: "sign in",
        email: testEmail,
        password: "WrongPassword123!",
        page: "/auth",
      }),
      "Error message displayed for invalid credentials",
      errorVisible,
      "Error message displayed",
      "No error message shown"
    );

    if (!errorVisible) {
      throw new Error("Test failed - see summary for details");
    }
  });

  test("should prevent sign in with non-existent email", async ({ page }) => {
    await page.goto("/auth");

    await signIn(page, "nonexistent@example.com", "Password123!");

    let errorVisible = false;
    try {
      await expect(page.locator(`[data-testid="${TestId.TOAST_ERROR}"]`)).toBeVisible({
        timeout: 5000,
      });
      errorVisible = await page
        .locator(`[data-testid="${TestId.TOAST_ERROR}"]`)
        .isVisible();
    } catch (error) {
      errorVisible = false;
    }

    await logTestResult(
      logger,
      page,
      "Non-existent email validation",
      formatTestConditions({
        action: "sign in",
        email: "nonexistent@example.com",
        page: "/auth",
      }),
      "Error message displayed for invalid credentials",
      errorVisible,
      "Error message displayed",
      "No error message shown"
    );

    if (!errorVisible) {
      throw new Error("Test failed - see summary for details");
    }
  });

  test("should maintain session across page refreshes", async ({ page }) => {
    const testEmail = generateUniqueEmail("session@example.com");
    testUserEmails.push(testEmail);

    await page.goto("/auth");

    await clickByTestId(page, TestId.SIGN_UP_LINK);

    await signUp(page, {
      name: "Session Test User",
      email: testEmail,
      password: "Password123!",
    });

    await page.waitForURL(/\/(?!auth)/, {
      timeout: 15000,
      waitUntil: "domcontentloaded",
    });

    await page.reload();

    const url = page.url();
    const sessionMaintained = !url.includes("/auth");

    await logTestResult(
      logger,
      page,
      "Session persistence after refresh",
      formatTestConditions({
        action: "page refresh",
        email: testEmail,
      }),
      "User remains authenticated after browser refresh",
      sessionMaintained,
      "Session maintained after refresh",
      "User redirected to auth page"
    );

    if (!sessionMaintained) {
      throw new Error("Test failed - see summary for details");
    }
  });

  test("should sign out authenticated user", async ({ page }) => {
    const testEmail = generateUniqueEmail("signout@example.com");
    testUserEmails.push(testEmail);

    await page.goto("/auth");

    await clickByTestId(page, TestId.SIGN_UP_LINK);

    await signUp(page, {
      name: "Sign Out Test User",
      email: testEmail,
      password: "Password123!",
    });

    await page.waitForURL(/\/(?!auth)/, {
      timeout: 15000,
      waitUntil: "domcontentloaded",
    });

    await signOut(page);

    let redirected = false;
    try {
      await page.waitForURL("/auth", { timeout: 10000 });
      redirected = true;
    } catch (error) {
      redirected = false;
    }

    await logTestResult(
      logger,
      page,
      "User sign out",
      formatTestConditions({
        action: "sign out",
        email: testEmail,
      }),
      "Session cleared, user redirected to auth page",
      redirected,
      "User signed out and redirected successfully",
      "User not redirected or sign out failed"
    );

    if (!redirected) {
      throw new Error("Test failed - see summary for details");
    }
  });

  test("should redirect unauthenticated users to auth page", async ({
    page,
  }) => {
    await page.goto("/");

    let redirected = false;
    try {
      await page.waitForURL("/auth", { timeout: 10000 });
      redirected = true;
    } catch (error) {
      redirected = false;
    }

    await logTestResult(
      logger,
      page,
      "Unauthenticated user redirect",
      formatTestConditions({
        action: "access protected route",
        page: "/",
        authState: "unauthenticated",
      }),
      "Protected routes redirect to /auth when no session",
      redirected,
      "User redirected to auth page",
      "User able to access protected route"
    );

    if (!redirected) {
      throw new Error("Test failed - see summary for details");
    }
  });

  test("should allow authenticated users to access protected routes", async ({
    page,
  }) => {
    const testEmail = generateUniqueEmail("protected@example.com");
    testUserEmails.push(testEmail);

    await page.goto("/auth");

    await clickByTestId(page, TestId.SIGN_UP_LINK);

    await signUp(page, {
      name: "Protected Route Test User",
      email: testEmail,
      password: "Password123!",
    });

    let canAccess = false;
    try {
      await page.waitForURL(/\/(?!auth)/, {
        timeout: 15000,
        waitUntil: "domcontentloaded",
      });
      canAccess = true;
    } catch (error) {
      canAccess = false;
    }

    await logTestResult(
      logger,
      page,
      "Authenticated user access to protected routes",
      formatTestConditions({
        action: "access protected route",
        email: testEmail,
        authState: "authenticated",
      }),
      "Dashboard and app pages accessible with valid session",
      canAccess,
      "User can access protected routes",
      "User cannot access protected routes"
    );

    if (!canAccess) {
      throw new Error("Test failed - see summary for details");
    }
  });
});
