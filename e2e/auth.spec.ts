import {
  TestResultLogger,
  clickByTestId,
  fillByTestId,
  formatTestConditions,
  isVisibleByTestId,
  logTestResult,
} from "@/lib/test.utils";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { TestId } from "../test.types";
import { expect, test } from "./utils/test-fixtures";
import { TestStepLogger } from "./utils/test-logger";

const prisma = new PrismaClient();

test.describe("Authentication Flow", () => {
  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@example.com`;
  const testPassword = "TestPassword123!";
  const testName = "Test User";
  const logger = new TestResultLogger("auth");

  test.beforeAll(async () => {
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { member: { include: { organization: true } } },
    });

    if (user) {
      await prisma.session.deleteMany({
        where: { userId: user.id },
      });

      const organizationIds = user.member.map((m) => m.organizationId);

      if (organizationIds.length > 0) {
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

      await prisma.user.delete({
        where: { email: testEmail },
      });
    }
  });

  test.afterAll(async () => {
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

    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { member: { include: { organization: true } } },
    });

    if (user) {
      await prisma.session.deleteMany({
        where: { userId: user.id },
      });

      const organizationIds = user.member.map((m) => m.organizationId);

      if (organizationIds.length > 0) {
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

      await prisma.user.delete({
        where: { email: testEmail },
      });
    }

    await prisma.$disconnect();
  });

  test("should complete full authentication flow: sign up -> sign out -> sign in", async ({
    page,
    diagnostics,
  }) => {
    const stepLogger = new TestStepLogger(
      "Authentication Flow: sign up -> sign out -> sign in"
    );

    logger.registerExpectedTest(
      "Sign Up - Navigate to sign up page",
      formatTestConditions({ userType: "new user", page: "sign-up" }),
      "Page loads successfully"
    );
    logger.registerExpectedTest(
      "Sign Up - Redirect to home after signup",
      formatTestConditions({
        userType: "new user",
        action: "submit signup form",
      }),
      "Redirects to home page (/)"
    );
    logger.registerExpectedTest(
      "Sign Up - Avatar menu visible",
      formatTestConditions({ userType: "authenticated user", page: "home" }),
      "Avatar menu trigger is visible"
    );
    logger.registerExpectedTest(
      "Sign Up - Email displayed in avatar menu",
      formatTestConditions({
        userType: "authenticated user",
        action: "open avatar menu",
      }),
      "Email address is displayed correctly"
    );
    logger.registerExpectedTest(
      "Sign Out - Redirect to sign in page",
      formatTestConditions({
        userType: "authenticated user",
        action: "click sign out",
      }),
      "Redirects to sign in page (/sign-in)"
    );
    logger.registerExpectedTest(
      "Sign In - Redirect to home after signin",
      formatTestConditions({
        userType: "returning user",
        action: "submit signin form",
      }),
      "Redirects to home page (/)"
    );
    logger.registerExpectedTest(
      "Sign In - Avatar menu visible after signin",
      formatTestConditions({ userType: "authenticated user", page: "home" }),
      "Avatar menu trigger is visible"
    );

    await stepLogger.step("Navigate to sign-up page", async () => {
      await page.goto("/sign-up");
    });

    let navigationSuccess = false;
    await stepLogger.step("Verify sign-up page loaded", async () => {
      try {
        await expect(page.getByTestId(TestId.SIGN_UP_NAME)).toBeVisible({
          timeout: 10000,
        });
        navigationSuccess = true;
      } catch (error) {
        navigationSuccess = false;
      }

      await logTestResult(
        logger,
        page,
        "Sign Up - Navigate to sign up page",
        formatTestConditions({ userType: "new user", page: "sign-up" }),
        "Page loads successfully",
        navigationSuccess,
        "page loaded",
        "page failed to load"
      );

      if (!navigationSuccess) {
        throw new Error("Failed to navigate to sign up page");
      }
    });

    await stepLogger.step("Fill sign-up form", async () => {
      await fillByTestId(page, TestId.SIGN_UP_NAME, testName);
      await fillByTestId(page, TestId.SIGN_UP_EMAIL, testEmail);
      await fillByTestId(page, TestId.SIGN_UP_PASSWORD, testPassword);
    });

    await stepLogger.step("Submit sign-up form", async () => {
      await clickByTestId(page, TestId.SIGN_UP_SUBMIT);
    });

    let redirectedToHome = false;
    await stepLogger.step("Verify redirect to home after signup", async () => {
      try {
        await page.waitForURL("/", { timeout: 20000 });
        redirectedToHome = true;
      } catch (error) {
        redirectedToHome = false;
      }

      await logTestResult(
        logger,
        page,
        "Sign Up - Redirect to home after signup",
        formatTestConditions({
          userType: "new user",
          action: "submit signup form",
        }),
        "Redirects to home page (/)",
        redirectedToHome,
        "redirected to /",
        "redirect failed or timed out"
      );

      if (!redirectedToHome) {
        throw new Error("Failed to redirect to home after signup");
      }
    });

    const avatarVisible = await stepLogger.step(
      "Verify avatar menu visible",
      async () => {
        const visible = await isVisibleByTestId(
          page,
          TestId.AVATAR_MENU_TRIGGER,
          10000
        );

        await logTestResult(
          logger,
          page,
          "Sign Up - Avatar menu visible",
          formatTestConditions({
            userType: "authenticated user",
            page: "home",
          }),
          "Avatar menu trigger is visible",
          visible,
          "avatar visible",
          "avatar not found"
        );

        if (!visible) {
          throw new Error("Avatar menu trigger not visible");
        }

        return visible;
      }
    );

    await stepLogger.step("Open avatar menu", async () => {
      await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);
    });

    let emailCorrect = false;
    await stepLogger.step("Verify email displayed in avatar menu", async () => {
      try {
        const emailDisplay = page.getByTestId(TestId.AVATAR_MENU_EMAIL);
        await expect(emailDisplay).toBeVisible({ timeout: 10000 });
        await expect(emailDisplay).toHaveAttribute("data-email", testEmail);
        emailCorrect = true;
      } catch (error) {
        emailCorrect = false;
      }

      await logTestResult(
        logger,
        page,
        "Sign Up - Email displayed in avatar menu",
        formatTestConditions({
          userType: "authenticated user",
          action: "open avatar menu",
        }),
        "Email address is displayed correctly",
        emailCorrect,
        `email: ${testEmail}`,
        "email not displayed or incorrect"
      );

      if (!emailCorrect) {
        throw new Error("Email not displayed correctly in avatar menu");
      }
    });

    await stepLogger.step("Click sign out", async () => {
      await clickByTestId(page, TestId.AVATAR_MENU_SIGN_OUT);
    });

    let redirectedToSignIn = false;
    await stepLogger.step("Verify redirect to sign-in page", async () => {
      try {
        await page.waitForURL("/sign-in", { timeout: 10000 });
        redirectedToSignIn = true;
      } catch (error) {
        redirectedToSignIn = false;
      }

      await logTestResult(
        logger,
        page,
        "Sign Out - Redirect to sign in page",
        formatTestConditions({
          userType: "authenticated user",
          action: "click sign out",
        }),
        "Redirects to sign in page (/sign-in)",
        redirectedToSignIn,
        "redirected to /sign-in",
        "redirect failed or timed out"
      );

      if (!redirectedToSignIn) {
        throw new Error("Failed to redirect to sign in page after sign out");
      }
    });

    await stepLogger.step("Fill sign-in form", async () => {
      await fillByTestId(page, TestId.SIGN_IN_EMAIL, testEmail);
      await fillByTestId(page, TestId.SIGN_IN_PASSWORD, testPassword);
    });

    await stepLogger.step("Submit sign-in form", async () => {
      await clickByTestId(page, TestId.SIGN_IN_SUBMIT);
    });

    let redirectedBackToHome = false;
    await stepLogger.step("Verify redirect to home after sign-in", async () => {
      try {
        await page.waitForURL("/", { timeout: 20000 });
        redirectedBackToHome = true;
      } catch (error) {
        redirectedBackToHome = false;
      }

      await logTestResult(
        logger,
        page,
        "Sign In - Redirect to home after signin",
        formatTestConditions({
          userType: "returning user",
          action: "submit signin form",
        }),
        "Redirects to home page (/)",
        redirectedBackToHome,
        "redirected to /",
        "redirect failed or timed out"
      );

      if (!redirectedBackToHome) {
        throw new Error("Failed to redirect to home after sign in");
      }
    });

    await stepLogger.step(
      "Verify avatar menu visible after sign-in",
      async () => {
        const avatarVisibleAfterSignIn = await isVisibleByTestId(
          page,
          TestId.AVATAR_MENU_TRIGGER,
          10000
        );

        await logTestResult(
          logger,
          page,
          "Sign In - Avatar menu visible after signin",
          formatTestConditions({
            userType: "authenticated user",
            page: "home",
          }),
          "Avatar menu trigger is visible",
          avatarVisibleAfterSignIn,
          "avatar visible",
          "avatar not found"
        );

        if (!avatarVisibleAfterSignIn) {
          throw new Error("Avatar menu trigger not visible after sign in");
        }
      }
    );
  });
});
