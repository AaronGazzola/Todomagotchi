import { test, expect } from "./utils/test-fixtures";
import { TestId } from "../test.types";
import { cleanupAuthTestUsers } from "./utils/cleanup-auth-users";
import { cleanupTestData } from "./utils/test-cleanup";
import { PrismaClient } from "@prisma/client";
import {
  TestResultLogger,
  formatTestConditions,
  logTestResult,
} from "../src/lib/test.utils";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const TEST_USER_EMAIL = "test-signup@example.com";
const TEST_USER_NAME = "Test Signup User";
const TEST_PASSWORD = "TestPassword123!";
const EXISTING_USER_EMAIL = "e2e-test@example.com";
const EXISTING_USER_PASSWORD = "E2ETestPass123!";

test.describe("Authentication Flow Tests", () => {
  const logger = new TestResultLogger("auth");

  test.beforeAll(async () => {
    await cleanupAuthTestUsers();
  });

  test.afterAll(async () => {
    await cleanupAuthTestUsers();
    await prisma.$disconnect();

    logger.finalizeUnreachedTests();

    const summary = logger.getSummary();
    if (summary) {
      console.log("\n📊 Test Logger Summary:");
      console.log(summary);
    }

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
          testSuiteName: data.testSuiteName,
        },
        null,
        2
      )
    );
  });

  test("should sign up new user and sign out", async ({ page }) => {
    logger.registerExpectedTest(
      "Signup - Navigate to signup form",
      formatTestConditions({ userType: "unauthenticated" }),
      "Sign in button visible and navigation to signup page succeeds"
    );
    logger.registerExpectedTest(
      "Signup - Submit form and redirect",
      formatTestConditions({ userEmail: TEST_USER_EMAIL }),
      "Form submission succeeds and redirects to home page"
    );
    logger.registerExpectedTest(
      "Signup - Authenticated UI visible",
      formatTestConditions({ userType: "authenticated", page: "home" }),
      "Avatar menu, todo list, todo input, and tamagotchi container all visible"
    );
    logger.registerExpectedTest(
      "Signup - Avatar menu shows correct email",
      formatTestConditions({ userEmail: TEST_USER_EMAIL }),
      "Avatar menu opens and displays correct user email"
    );
    logger.registerExpectedTest(
      "Signup - Sign out redirects to sign-in",
      formatTestConditions({ action: "clicked sign out" }),
      "Sign out succeeds and redirects to sign-in page"
    );

    await page.goto("/");

    let navigationToSignup = false;
    try {
      await expect(page.getByTestId(TestId.SIGN_IN_BUTTON)).toBeVisible({
        timeout: 10000,
      });
      await page.getByTestId(TestId.SIGN_IN_BUTTON).click();
      await page.waitForURL(/\/sign-in/, { timeout: 10000 });
      await page.getByTestId(TestId.SIGN_UP_LINK).click();
      await page.waitForURL(/\/sign-up/, { timeout: 10000 });
      navigationToSignup = true;
    } catch (error) {
      navigationToSignup = false;
    }

    await logTestResult(
      logger,
      page,
      "Signup - Navigate to signup form",
      formatTestConditions({ userType: "unauthenticated" }),
      "Sign in button visible and navigation to signup page succeeds",
      navigationToSignup,
      "navigated to /sign-up",
      "navigation failed"
    );

    if (!navigationToSignup) {
      throw new Error("Navigation to signup page failed");
    }

    await page.getByTestId(TestId.SIGN_UP_NAME).fill(TEST_USER_NAME);
    await page.getByTestId(TestId.SIGN_UP_EMAIL).fill(TEST_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_UP_PASSWORD).fill(TEST_PASSWORD);

    await page.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    let redirectedToHome = false;
    try {
      await page.waitForURL("/", {
        timeout: 10000,
        waitUntil: "domcontentloaded",
      });
      redirectedToHome = true;
    } catch (error) {
      redirectedToHome = false;
    }

    await logTestResult(
      logger,
      page,
      "Signup - Submit form and redirect",
      formatTestConditions({ userEmail: TEST_USER_EMAIL }),
      "Form submission succeeds and redirects to home page",
      redirectedToHome,
      "redirected to /",
      "redirect failed"
    );

    if (!redirectedToHome) {
      throw new Error("Redirect to home page failed");
    }

    let authenticatedUIVisible = false;
    try {
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
      authenticatedUIVisible = true;
    } catch (error) {
      authenticatedUIVisible = false;
    }

    await logTestResult(
      logger,
      page,
      "Signup - Authenticated UI visible",
      formatTestConditions({ userType: "authenticated", page: "home" }),
      "Avatar menu, todo list, todo input, and tamagotchi container all visible",
      authenticatedUIVisible,
      "all UI elements visible",
      "some UI elements not found"
    );

    if (!authenticatedUIVisible) {
      throw new Error("Authenticated UI elements not visible");
    }

    await page.getByTestId(TestId.AVATAR_MENU_TRIGGER).click();

    let avatarMenuCorrect = false;
    try {
      await expect(page.getByTestId(TestId.AVATAR_MENU_CONTENT)).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByTestId(TestId.AVATAR_MENU_EMAIL)).toHaveAttribute(
        "data-email",
        TEST_USER_EMAIL,
        { timeout: 10000 }
      );
      avatarMenuCorrect = true;
    } catch (error) {
      avatarMenuCorrect = false;
    }

    await logTestResult(
      logger,
      page,
      "Signup - Avatar menu shows correct email",
      formatTestConditions({ userEmail: TEST_USER_EMAIL }),
      "Avatar menu opens and displays correct user email",
      avatarMenuCorrect,
      "email matches",
      "menu not visible or email mismatch"
    );

    if (!avatarMenuCorrect) {
      throw new Error("Avatar menu validation failed");
    }

    await page.getByTestId(TestId.AVATAR_MENU_SIGN_OUT).click();

    let signOutSuccessful = false;
    try {
      await page.waitForURL(/\/sign-in/, {
        timeout: 10000,
        waitUntil: "domcontentloaded",
      });
      await expect(page.getByTestId(TestId.SIGN_IN_EMAIL)).toBeVisible({
        timeout: 10000,
      });
      signOutSuccessful = true;
    } catch (error) {
      signOutSuccessful = false;
    }

    await logTestResult(
      logger,
      page,
      "Signup - Sign out redirects to sign-in",
      formatTestConditions({ action: "clicked sign out" }),
      "Sign out succeeds and redirects to sign-in page",
      signOutSuccessful,
      "redirected to /sign-in",
      "redirect failed"
    );

    if (!signOutSuccessful) {
      throw new Error("Sign out redirect failed");
    }
  });

  test("should sign in with existing user and sign out", async ({ page }) => {
    logger.registerExpectedTest(
      "Signin - Submit form and redirect",
      formatTestConditions({ userEmail: EXISTING_USER_EMAIL }),
      "Sign in form submission succeeds and redirects to home page"
    );
    logger.registerExpectedTest(
      "Signin - Authenticated UI visible",
      formatTestConditions({ userType: "authenticated", page: "home" }),
      "Avatar menu, todo list, todo input, and tamagotchi container all visible"
    );
    logger.registerExpectedTest(
      "Signin - Avatar menu shows correct email",
      formatTestConditions({ userEmail: EXISTING_USER_EMAIL }),
      "Avatar menu opens and displays correct user email"
    );
    logger.registerExpectedTest(
      "Signin - Sign out redirects to sign-in",
      formatTestConditions({ action: "clicked sign out" }),
      "Sign out succeeds and redirects to sign-in page"
    );

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

    let redirectedToHome = false;
    try {
      await page.waitForURL("/", {
        timeout: 10000,
        waitUntil: "domcontentloaded",
      });
      redirectedToHome = true;
    } catch (error) {
      redirectedToHome = false;
    }

    await logTestResult(
      logger,
      page,
      "Signin - Submit form and redirect",
      formatTestConditions({ userEmail: EXISTING_USER_EMAIL }),
      "Sign in form submission succeeds and redirects to home page",
      redirectedToHome,
      "redirected to /",
      "redirect failed"
    );

    if (!redirectedToHome) {
      throw new Error("Redirect to home page failed");
    }

    let authenticatedUIVisible = false;
    try {
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
      authenticatedUIVisible = true;
    } catch (error) {
      authenticatedUIVisible = false;
    }

    await logTestResult(
      logger,
      page,
      "Signin - Authenticated UI visible",
      formatTestConditions({ userType: "authenticated", page: "home" }),
      "Avatar menu, todo list, todo input, and tamagotchi container all visible",
      authenticatedUIVisible,
      "all UI elements visible",
      "some UI elements not found"
    );

    if (!authenticatedUIVisible) {
      throw new Error("Authenticated UI elements not visible");
    }

    await page.getByTestId(TestId.AVATAR_MENU_TRIGGER).click();

    let avatarMenuCorrect = false;
    try {
      await expect(page.getByTestId(TestId.AVATAR_MENU_CONTENT)).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByTestId(TestId.AVATAR_MENU_EMAIL)).toHaveAttribute(
        "data-email",
        EXISTING_USER_EMAIL,
        { timeout: 10000 }
      );
      avatarMenuCorrect = true;
    } catch (error) {
      avatarMenuCorrect = false;
    }

    await logTestResult(
      logger,
      page,
      "Signin - Avatar menu shows correct email",
      formatTestConditions({ userEmail: EXISTING_USER_EMAIL }),
      "Avatar menu opens and displays correct user email",
      avatarMenuCorrect,
      "email matches",
      "menu not visible or email mismatch"
    );

    if (!avatarMenuCorrect) {
      throw new Error("Avatar menu validation failed");
    }

    await page.getByTestId(TestId.AVATAR_MENU_SIGN_OUT).click();

    let signOutSuccessful = false;
    try {
      await page.waitForURL(/\/sign-in/, {
        timeout: 10000,
        waitUntil: "domcontentloaded",
      });
      await expect(page.getByTestId(TestId.SIGN_IN_EMAIL)).toBeVisible({
        timeout: 10000,
      });
      signOutSuccessful = true;
    } catch (error) {
      signOutSuccessful = false;
    }

    await logTestResult(
      logger,
      page,
      "Signin - Sign out redirects to sign-in",
      formatTestConditions({ action: "clicked sign out" }),
      "Sign out succeeds and redirects to sign-in page",
      signOutSuccessful,
      "redirected to /sign-in",
      "redirect failed"
    );

    if (!signOutSuccessful) {
      throw new Error("Sign out redirect failed");
    }
  });

  test("should show error when signing up with existing email", async ({
    page,
  }) => {
    logger.registerExpectedTest(
      "Error - Duplicate email signup",
      formatTestConditions({ userEmail: EXISTING_USER_EMAIL }),
      "Error toast displayed when signing up with existing email"
    );

    await page.goto("/sign-up");

    await page.getByTestId(TestId.SIGN_UP_NAME).fill("Existing User");
    await page.getByTestId(TestId.SIGN_UP_EMAIL).fill(EXISTING_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_UP_PASSWORD).fill(TEST_PASSWORD);

    await page.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    let errorToastVisible = false;
    try {
      await expect(page.getByTestId(TestId.TOAST_ERROR)).toBeVisible({
        timeout: 10000,
      });
      errorToastVisible = true;
    } catch (error) {
      errorToastVisible = false;
    }

    await logTestResult(
      logger,
      page,
      "Error - Duplicate email signup",
      formatTestConditions({ userEmail: EXISTING_USER_EMAIL }),
      "Error toast displayed when signing up with existing email",
      errorToastVisible,
      "error toast visible",
      "error toast not found"
    );

    if (!errorToastVisible) {
      throw new Error("Error toast not visible");
    }
  });

  test("should show error when signing in with wrong password", async ({
    page,
  }) => {
    logger.registerExpectedTest(
      "Error - Wrong password signin",
      formatTestConditions({ userEmail: EXISTING_USER_EMAIL }),
      "Error toast displayed when signing in with wrong password"
    );

    await page.goto("/sign-in");

    await page.getByTestId(TestId.SIGN_IN_EMAIL).fill(EXISTING_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_IN_PASSWORD).fill("WrongPassword123!");

    await page.getByTestId(TestId.SIGN_IN_SUBMIT).click();

    let errorToastVisible = false;
    try {
      await expect(page.getByTestId(TestId.TOAST_ERROR)).toBeVisible({
        timeout: 10000,
      });
      errorToastVisible = true;
    } catch (error) {
      errorToastVisible = false;
    }

    await logTestResult(
      logger,
      page,
      "Error - Wrong password signin",
      formatTestConditions({ userEmail: EXISTING_USER_EMAIL }),
      "Error toast displayed when signing in with wrong password",
      errorToastVisible,
      "error toast visible",
      "error toast not found"
    );

    if (!errorToastVisible) {
      throw new Error("Error toast not visible");
    }
  });

  test("should show error when signing in with non-existent email", async ({
    page,
  }) => {
    logger.registerExpectedTest(
      "Error - Non-existent email signin",
      formatTestConditions({ userEmail: "nonexistent@example.com" }),
      "Error toast displayed when signing in with non-existent email"
    );

    await page.goto("/sign-in");

    await page
      .getByTestId(TestId.SIGN_IN_EMAIL)
      .fill("nonexistent@example.com");
    await page.getByTestId(TestId.SIGN_IN_PASSWORD).fill(TEST_PASSWORD);

    await page.getByTestId(TestId.SIGN_IN_SUBMIT).click();

    let errorToastVisible = false;
    try {
      await expect(page.getByTestId(TestId.TOAST_ERROR)).toBeVisible({
        timeout: 10000,
      });
      errorToastVisible = true;
    } catch (error) {
      errorToastVisible = false;
    }

    await logTestResult(
      logger,
      page,
      "Error - Non-existent email signin",
      formatTestConditions({ userEmail: "nonexistent@example.com" }),
      "Error toast displayed when signing in with non-existent email",
      errorToastVisible,
      "error toast visible",
      "error toast not found"
    );

    if (!errorToastVisible) {
      throw new Error("Error toast not visible");
    }
  });

  test("should require all fields for sign up", async ({ page }) => {
    logger.registerExpectedTest(
      "Validation - Signup required fields",
      formatTestConditions({ page: "sign-up" }),
      "All signup fields have required attribute"
    );

    await page.goto("/sign-up");

    await page.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    let allFieldsRequired = false;
    try {
      const nameInput = page.getByTestId(TestId.SIGN_UP_NAME);
      await expect(nameInput).toHaveAttribute("required", "");

      const emailInput = page.getByTestId(TestId.SIGN_UP_EMAIL);
      await expect(emailInput).toHaveAttribute("required", "");

      const passwordInput = page.getByTestId(TestId.SIGN_UP_PASSWORD);
      await expect(passwordInput).toHaveAttribute("required", "");

      allFieldsRequired = true;
    } catch (error) {
      allFieldsRequired = false;
    }

    await logTestResult(
      logger,
      page,
      "Validation - Signup required fields",
      formatTestConditions({ page: "sign-up" }),
      "All signup fields have required attribute",
      allFieldsRequired,
      "all fields required",
      "some fields missing required attribute"
    );

    if (!allFieldsRequired) {
      throw new Error("Not all signup fields have required attribute");
    }
  });

  test("should require all fields for sign in", async ({ page }) => {
    logger.registerExpectedTest(
      "Validation - Signin required fields",
      formatTestConditions({ page: "sign-in" }),
      "All signin fields have required attribute"
    );

    await page.goto("/sign-in");

    await page.getByTestId(TestId.SIGN_IN_SUBMIT).click();

    let allFieldsRequired = false;
    try {
      const emailInput = page.getByTestId(TestId.SIGN_IN_EMAIL);
      await expect(emailInput).toHaveAttribute("required", "");

      const passwordInput = page.getByTestId(TestId.SIGN_IN_PASSWORD);
      await expect(passwordInput).toHaveAttribute("required", "");

      allFieldsRequired = true;
    } catch (error) {
      allFieldsRequired = false;
    }

    await logTestResult(
      logger,
      page,
      "Validation - Signin required fields",
      formatTestConditions({ page: "sign-in" }),
      "All signin fields have required attribute",
      allFieldsRequired,
      "all fields required",
      "some fields missing required attribute"
    );

    if (!allFieldsRequired) {
      throw new Error("Not all signin fields have required attribute");
    }
  });

  test("should toggle password visibility on sign up", async ({ page }) => {
    logger.registerExpectedTest(
      "Password Toggle - Initial state",
      formatTestConditions({ page: "sign-up" }),
      "Password input type is 'password'"
    );
    logger.registerExpectedTest(
      "Password Toggle - First toggle",
      formatTestConditions({ action: "clicked toggle button" }),
      "Password input type changes to 'text'"
    );
    logger.registerExpectedTest(
      "Password Toggle - Second toggle",
      formatTestConditions({ action: "clicked toggle button again" }),
      "Password input type changes back to 'password'"
    );

    await page.goto("/sign-up");

    const passwordInput = page.getByTestId(TestId.SIGN_UP_PASSWORD);

    let initialStateCorrect = false;
    try {
      await expect(passwordInput).toHaveAttribute("type", "password");
      initialStateCorrect = true;
    } catch (error) {
      initialStateCorrect = false;
    }

    await logTestResult(
      logger,
      page,
      "Password Toggle - Initial state",
      formatTestConditions({ page: "sign-up" }),
      "Password input type is 'password'",
      initialStateCorrect,
      "type is 'password'",
      "type is not 'password'"
    );

    if (!initialStateCorrect) {
      throw new Error("Initial password state incorrect");
    }

    await page.getByTestId(TestId.SIGN_UP_PASSWORD_TOGGLE).click();

    let firstToggleCorrect = false;
    try {
      await expect(passwordInput).toHaveAttribute("type", "text");
      firstToggleCorrect = true;
    } catch (error) {
      firstToggleCorrect = false;
    }

    await logTestResult(
      logger,
      page,
      "Password Toggle - First toggle",
      formatTestConditions({ action: "clicked toggle button" }),
      "Password input type changes to 'text'",
      firstToggleCorrect,
      "type is 'text'",
      "type did not change to 'text'"
    );

    if (!firstToggleCorrect) {
      throw new Error("First toggle failed");
    }

    await page.getByTestId(TestId.SIGN_UP_PASSWORD_TOGGLE).click();

    let secondToggleCorrect = false;
    try {
      await expect(passwordInput).toHaveAttribute("type", "password");
      secondToggleCorrect = true;
    } catch (error) {
      secondToggleCorrect = false;
    }

    await logTestResult(
      logger,
      page,
      "Password Toggle - Second toggle",
      formatTestConditions({ action: "clicked toggle button again" }),
      "Password input type changes back to 'password'",
      secondToggleCorrect,
      "type is 'password'",
      "type did not change back to 'password'"
    );

    if (!secondToggleCorrect) {
      throw new Error("Second toggle failed");
    }
  });

  test("should navigate between sign in and sign up pages", async ({
    page,
  }) => {
    logger.registerExpectedTest(
      "Navigation - Sign-in page loads",
      formatTestConditions({ page: "sign-in" }),
      "Sign in email field visible"
    );
    logger.registerExpectedTest(
      "Navigation - Navigate to sign-up",
      formatTestConditions({ action: "clicked sign up link" }),
      "Sign up page loads with name field visible"
    );
    logger.registerExpectedTest(
      "Navigation - Navigate back to sign-in",
      formatTestConditions({ action: "clicked sign in link" }),
      "Sign in page loads with email field visible"
    );

    await page.goto("/sign-in");

    let signInPageLoaded = false;
    try {
      await expect(page.getByTestId(TestId.SIGN_IN_EMAIL)).toBeVisible({
        timeout: 10000,
      });
      signInPageLoaded = true;
    } catch (error) {
      signInPageLoaded = false;
    }

    await logTestResult(
      logger,
      page,
      "Navigation - Sign-in page loads",
      formatTestConditions({ page: "sign-in" }),
      "Sign in email field visible",
      signInPageLoaded,
      "email field visible",
      "email field not found"
    );

    if (!signInPageLoaded) {
      throw new Error("Sign-in page failed to load");
    }

    await page.getByTestId(TestId.SIGN_UP_LINK).click();

    let signUpPageLoaded = false;
    try {
      await page.waitForURL(/\/sign-up/, { timeout: 10000 });
      await expect(page.getByTestId(TestId.SIGN_UP_NAME)).toBeVisible({
        timeout: 10000,
      });
      signUpPageLoaded = true;
    } catch (error) {
      signUpPageLoaded = false;
    }

    await logTestResult(
      logger,
      page,
      "Navigation - Navigate to sign-up",
      formatTestConditions({ action: "clicked sign up link" }),
      "Sign up page loads with name field visible",
      signUpPageLoaded,
      "navigated to /sign-up",
      "navigation failed"
    );

    if (!signUpPageLoaded) {
      throw new Error("Navigation to sign-up failed");
    }

    await page.getByTestId(TestId.SIGN_IN_LINK).click();

    let backToSignIn = false;
    try {
      await page.waitForURL(/\/sign-in/, { timeout: 10000 });
      await expect(page.getByTestId(TestId.SIGN_IN_EMAIL)).toBeVisible({
        timeout: 10000,
      });
      backToSignIn = true;
    } catch (error) {
      backToSignIn = false;
    }

    await logTestResult(
      logger,
      page,
      "Navigation - Navigate back to sign-in",
      formatTestConditions({ action: "clicked sign in link" }),
      "Sign in page loads with email field visible",
      backToSignIn,
      "navigated to /sign-in",
      "navigation failed"
    );

    if (!backToSignIn) {
      throw new Error("Navigation back to sign-in failed");
    }
  });

  test("should redirect to home when accessing sign in while authenticated", async ({
    page,
  }) => {
    const uniqueEmail = `test-redirect-${Date.now()}@example.com`;

    logger.registerExpectedTest(
      "Redirect - Sign up and redirect to home",
      formatTestConditions({ userEmail: uniqueEmail }),
      "Sign up succeeds and redirects to home page"
    );
    logger.registerExpectedTest(
      "Redirect - Access sign-in while authenticated",
      formatTestConditions({ userType: "authenticated" }),
      "Accessing /sign-in redirects to home"
    );
    logger.registerExpectedTest(
      "Redirect - Sign out successful",
      formatTestConditions({ action: "clicked sign out" }),
      "Sign out succeeds and redirects to sign-in page"
    );

    await page.goto("/sign-up");

    await page.getByTestId(TestId.SIGN_UP_NAME).fill("Redirect Test User");
    await page.getByTestId(TestId.SIGN_UP_EMAIL).fill(uniqueEmail);
    await page.getByTestId(TestId.SIGN_UP_PASSWORD).fill(TEST_PASSWORD);

    await page.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    let redirectedToHome = false;
    try {
      await page.waitForURL("/", {
        timeout: 10000,
        waitUntil: "domcontentloaded",
      });
      redirectedToHome = true;
    } catch (error) {
      redirectedToHome = false;
    }

    await logTestResult(
      logger,
      page,
      "Redirect - Sign up and redirect to home",
      formatTestConditions({ userEmail: uniqueEmail }),
      "Sign up succeeds and redirects to home page",
      redirectedToHome,
      "redirected to /",
      "redirect failed"
    );

    if (!redirectedToHome) {
      throw new Error("Redirect to home page failed");
    }

    await page.goto("/sign-in");

    let redirectedFromSignIn = false;
    try {
      await expect(page).toHaveURL("/", { timeout: 10000 });
      redirectedFromSignIn = true;
    } catch (error) {
      redirectedFromSignIn = false;
    }

    await logTestResult(
      logger,
      page,
      "Redirect - Access sign-in while authenticated",
      formatTestConditions({ userType: "authenticated" }),
      "Accessing /sign-in redirects to home",
      redirectedFromSignIn,
      "redirected to /",
      "stayed on /sign-in"
    );

    if (!redirectedFromSignIn) {
      throw new Error("Redirect from sign-in failed");
    }

    await page.getByTestId(TestId.AVATAR_MENU_TRIGGER).click();
    await page.getByTestId(TestId.AVATAR_MENU_SIGN_OUT).click();

    let signOutSuccessful = false;
    try {
      await page.waitForURL(/\/sign-in/, {
        timeout: 10000,
        waitUntil: "domcontentloaded",
      });
      signOutSuccessful = true;
    } catch (error) {
      signOutSuccessful = false;
    }

    await logTestResult(
      logger,
      page,
      "Redirect - Sign out successful",
      formatTestConditions({ action: "clicked sign out" }),
      "Sign out succeeds and redirects to sign-in page",
      signOutSuccessful,
      "redirected to /sign-in",
      "redirect failed"
    );

    if (!signOutSuccessful) {
      throw new Error("Sign out redirect failed");
    }

    await cleanupTestData([uniqueEmail]);
  });
});
