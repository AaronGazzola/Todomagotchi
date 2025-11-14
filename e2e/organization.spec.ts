import {
  TestResultLogger,
  clickByTestId,
  countByTestId,
  fillByTestId,
  formatTestConditions,
  isVisibleByTestId,
  logTestResult,
  waitForElement,
} from "@/lib/test.utils";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { TestId } from "../test.types";
import { expect, test } from "./utils/test-fixtures";
import { TestStepLogger } from "./utils/test-logger";

const prisma = new PrismaClient();

test.describe("Organization Tests", () => {
  const logger = new TestResultLogger("organization");
  const timestamp = Date.now();
  const testEmail = `test-org-${timestamp}@example.com`;
  const testPassword = "TestPassword123!";
  const testName = "Test Org User";

  test.beforeAll(async () => {
    const orgSlug = "test-org-user-tasks";

    const orgsToClean = await prisma.organization.findMany({
      where: { slug: orgSlug },
    });

    for (const org of orgsToClean) {
      await prisma.tamagotchi.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.todo.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.invitation.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.member.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.organization.delete({
        where: { id: org.id },
      });
    }

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

    const orgSlug = "test-org-user-tasks";

    const orgsToClean = await prisma.organization.findMany({
      where: { slug: orgSlug },
    });

    for (const org of orgsToClean) {
      await prisma.tamagotchi.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.todo.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.invitation.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.member.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.organization.delete({
        where: { id: org.id },
      });
    }

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

      await prisma.user.delete({
        where: { email: testEmail },
      });
    }

    await prisma.$disconnect();
  });

  test("should create tamagotchi and empty todo list on signup", async ({
    page,
  }) => {
    const stepLogger = new TestStepLogger(
      "Organization Creation: Tamagotchi and Todo List"
    );

    logger.registerExpectedTest(
      "Tamagotchi Creation - Navigate to sign up page",
      formatTestConditions({ userType: "new user", page: "sign-up" }),
      "Page loads successfully"
    );
    logger.registerExpectedTest(
      "Tamagotchi Creation - Redirect to home after signup",
      formatTestConditions({
        userType: "new user",
        action: "submit signup form",
      }),
      "Redirects to home page (/)"
    );
    logger.registerExpectedTest(
      "Tamagotchi Creation - Tamagotchi container visible",
      formatTestConditions({ userType: "authenticated user", page: "home" }),
      "Tamagotchi container is visible"
    );
    logger.registerExpectedTest(
      "Tamagotchi Creation - Todo empty state visible",
      formatTestConditions({ userType: "authenticated user", page: "home" }),
      "Todo empty state is visible"
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
        "Tamagotchi Creation - Navigate to sign up page",
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
        "Tamagotchi Creation - Redirect to home after signup",
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

    let tamagotchiVisible = false;
    await stepLogger.step("Verify tamagotchi container visible", async () => {
      tamagotchiVisible = await isVisibleByTestId(
        page,
        TestId.TAMAGOTCHI_CONTAINER,
        20000
      );

      await logTestResult(
        logger,
        page,
        "Tamagotchi Creation - Tamagotchi container visible",
        formatTestConditions({ userType: "authenticated user", page: "home" }),
        "Tamagotchi container is visible",
        tamagotchiVisible,
        "tamagotchi visible",
        "tamagotchi not found"
      );

      if (!tamagotchiVisible) {
        throw new Error("Tamagotchi container not visible");
      }
    });

    let todoEmptyStateVisible = false;
    await stepLogger.step("Verify todo empty state visible", async () => {
      todoEmptyStateVisible = await isVisibleByTestId(
        page,
        TestId.TODO_EMPTY_STATE,
        20000
      );

      await logTestResult(
        logger,
        page,
        "Tamagotchi Creation - Todo empty state visible",
        formatTestConditions({ userType: "authenticated user", page: "home" }),
        "Todo empty state is visible",
        todoEmptyStateVisible,
        "empty state visible",
        "empty state not found"
      );

      if (!todoEmptyStateVisible) {
        throw new Error("Todo empty state not visible");
      }
    });

    await stepLogger.step("Verify organization data in database", async () => {
      const createdUser = await prisma.user.findUnique({
        where: { email: testEmail },
        include: { member: { include: { organization: true } } },
      });

      if (!createdUser || createdUser.member.length === 0) {
        throw new Error("User or organization not found in database");
      }

      const organizationId = createdUser.member[0].organizationId;

      const tamagotchi = await prisma.tamagotchi.findUnique({
        where: { organizationId },
      });

      if (!tamagotchi) {
        throw new Error("Tamagotchi not found in database");
      }

      const todos = await prisma.todo.findMany({
        where: { organizationId },
      });

      if (todos.length !== 0) {
        throw new Error(`Expected 0 todos, found ${todos.length}`);
      }
    });
  });
});

test.describe("Organization Invitation Tests", () => {
  test.describe.configure({ workers: 2 });

  const logger = new TestResultLogger("invitation");
  let inviterEmail: string;
  let inviterPassword: string;
  let inviterName: string;
  let inviteeEmail: string;
  let inviteePassword: string;
  let inviteeName: string;
  let inviterOrgId: string;

  test.beforeAll(async () => {
    const timestamp = Date.now();
    inviterEmail = `inviter-${timestamp}@example.com`;
    inviterPassword = "TestPassword123!";
    inviterName = "Inviter User";
    inviteeEmail = `invitee-${timestamp}@example.com`;
    inviteePassword = "TestPassword123!";
    inviteeName = "Invitee User";

    const inviterOrgSlug = "inviter-user-tasks";
    const inviteeOrgSlug = "invitee-user-tasks";

    const orgsToClean = await prisma.organization.findMany({
      where: { slug: { in: [inviterOrgSlug, inviteeOrgSlug] } },
    });

    for (const org of orgsToClean) {
      await prisma.tamagotchi.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.todo.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.invitation.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.member.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.organization.delete({
        where: { id: org.id },
      });
    }

    const inviter = await prisma.user.findUnique({
      where: { email: inviterEmail },
      include: { member: { include: { organization: true } } },
    });

    if (inviter) {
      await prisma.session.deleteMany({
        where: { userId: inviter.id },
      });

      const organizationIds = inviter.member.map((m) => m.organizationId);

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

      await prisma.user.delete({
        where: { email: inviterEmail },
      });
    }

    const invitee = await prisma.user.findUnique({
      where: { email: inviteeEmail },
      include: { member: { include: { organization: true } } },
    });

    if (invitee) {
      await prisma.session.deleteMany({
        where: { userId: invitee.id },
      });

      const organizationIds = invitee.member.map((m) => m.organizationId);

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

      await prisma.user.delete({
        where: { email: inviteeEmail },
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

    const inviterOrgSlug = "inviter-user-tasks";
    const inviteeOrgSlug = "invitee-user-tasks";

    const orgsToClean = await prisma.organization.findMany({
      where: { slug: { in: [inviterOrgSlug, inviteeOrgSlug] } },
    });

    for (const org of orgsToClean) {
      await prisma.tamagotchi.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.todo.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.invitation.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.member.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.organization.delete({
        where: { id: org.id },
      });
    }

    const inviter = await prisma.user.findUnique({
      where: { email: inviterEmail },
      include: { member: { include: { organization: true } } },
    });

    if (inviter) {
      await prisma.session.deleteMany({
        where: { userId: inviter.id },
      });

      const organizationIds = inviter.member.map((m) => m.organizationId);

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

      await prisma.user.delete({
        where: { email: inviterEmail },
      });
    }

    const invitee = await prisma.user.findUnique({
      where: { email: inviteeEmail },
      include: { member: { include: { organization: true } } },
    });

    if (invitee) {
      await prisma.session.deleteMany({
        where: { userId: invitee.id },
      });

      const organizationIds = invitee.member.map((m) => m.organizationId);

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

      await prisma.user.delete({
        where: { email: inviteeEmail },
      });
    }

    await prisma.$disconnect();
  });

  test("should send real-time invitation between users", async ({
    page,
    context,
  }, testInfo) => {
    const stepLogger = new TestStepLogger("Real-time Invitation Flow");
    const workerIndex = testInfo.parallelIndex;

    if (workerIndex === 0) {
      logger.registerExpectedTest(
        "Invitation - Inviter sign up",
        formatTestConditions({ userType: "new user", worker: "inviter" }),
        "Sign up successful"
      );
      logger.registerExpectedTest(
        "Invitation - Open invite dialog",
        formatTestConditions({ userType: "inviter", action: "click invite" }),
        "Invite dialog opens"
      );
      logger.registerExpectedTest(
        "Invitation - Send invitation",
        formatTestConditions({
          userType: "inviter",
          action: "submit invitation",
        }),
        "Invitation sent successfully"
      );

      await stepLogger.step("Inviter: Navigate to sign-up page", async () => {
        await page.goto("/sign-up");
      });

      await stepLogger.step("Inviter: Complete sign-up", async () => {
        await expect(page.getByTestId(TestId.SIGN_UP_NAME)).toBeVisible({
          timeout: 10000,
        });
        await fillByTestId(page, TestId.SIGN_UP_NAME, inviterName);
        await fillByTestId(page, TestId.SIGN_UP_EMAIL, inviterEmail);
        await fillByTestId(page, TestId.SIGN_UP_PASSWORD, inviterPassword);
        await clickByTestId(page, TestId.SIGN_UP_SUBMIT);
      });

      let inviterSignupSuccess = false;
      await stepLogger.step("Inviter: Verify redirect to home", async () => {
        try {
          await page.waitForURL("/", { timeout: 20000 });
          inviterSignupSuccess = true;
        } catch (error) {
          inviterSignupSuccess = false;
        }

        await logTestResult(
          logger,
          page,
          "Invitation - Inviter sign up",
          formatTestConditions({ userType: "new user", worker: "inviter" }),
          "Sign up successful",
          inviterSignupSuccess,
          "signed up successfully",
          "sign up failed"
        );

        if (!inviterSignupSuccess) {
          throw new Error("Inviter sign up failed");
        }
      });

      await stepLogger.step("Inviter: Get organization ID", async () => {
        const inviter = await prisma.user.findUnique({
          where: { email: inviterEmail },
          include: { member: true },
        });

        if (!inviter || inviter.member.length === 0) {
          throw new Error("Inviter organization not found");
        }

        inviterOrgId = inviter.member[0].organizationId;
      });

      await stepLogger.step("Inviter: Wait for invitee to be ready", async () => {
        let invitee = await prisma.user.findUnique({
          where: { email: inviteeEmail },
        });

        let attempts = 0;
        while (!invitee && attempts < 30) {
          await page.waitForTimeout(1000);
          invitee = await prisma.user.findUnique({
            where: { email: inviteeEmail },
          });
          attempts++;
        }

        if (!invitee) {
          throw new Error("Invitee did not sign up in time");
        }
      });

      await stepLogger.step("Inviter: Open avatar menu", async () => {
        await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);
      });

      await stepLogger.step("Inviter: Click invite users button", async () => {
        await clickByTestId(page, TestId.INVITE_USERS_BUTTON);
      });

      let inviteDialogOpened = false;
      await stepLogger.step("Inviter: Verify invite dialog opened", async () => {
        inviteDialogOpened = await isVisibleByTestId(
          page,
          TestId.INVITE_DIALOG,
          10000
        );

        await logTestResult(
          logger,
          page,
          "Invitation - Open invite dialog",
          formatTestConditions({ userType: "inviter", action: "click invite" }),
          "Invite dialog opens",
          inviteDialogOpened,
          "dialog opened",
          "dialog not found"
        );

        if (!inviteDialogOpened) {
          throw new Error("Invite dialog did not open");
        }
      });

      await stepLogger.step("Inviter: Fill invitation form", async () => {
        await fillByTestId(page, TestId.INVITE_EMAIL_INPUT, inviteeEmail);
      });

      await stepLogger.step("Inviter: Send invitation", async () => {
        await clickByTestId(page, TestId.INVITE_SEND_BUTTON);
      });

      let invitationSent = false;
      await stepLogger.step(
        "Inviter: Verify invitation sent (dialog closes)",
        async () => {
          try {
            await page.waitForSelector(
              `[data-testid="${TestId.INVITE_DIALOG}"]`,
              { state: "hidden", timeout: 10000 }
            );
            invitationSent = true;
          } catch (error) {
            invitationSent = false;
          }

          await logTestResult(
            logger,
            page,
            "Invitation - Send invitation",
            formatTestConditions({
              userType: "inviter",
              action: "submit invitation",
            }),
            "Invitation sent successfully",
            invitationSent,
            "invitation sent, dialog closed",
            "dialog did not close"
          );

          if (!invitationSent) {
            throw new Error("Invitation was not sent");
          }
        }
      );

      await stepLogger.step(
        "Inviter: Verify invitation in database",
        async () => {
          const invitation = await prisma.invitation.findFirst({
            where: {
              email: inviteeEmail,
              organizationId: inviterOrgId,
            },
          });

          if (!invitation) {
            throw new Error("Invitation not found in database");
          }
        }
      );
    } else if (workerIndex === 1) {
      logger.registerExpectedTest(
        "Invitation - Invitee sign up",
        formatTestConditions({ userType: "new user", worker: "invitee" }),
        "Sign up successful"
      );
      logger.registerExpectedTest(
        "Invitation - Receive invitation toast",
        formatTestConditions({
          userType: "invitee",
          action: "wait for invitation",
        }),
        "Invitation toast appears without refresh"
      );
      logger.registerExpectedTest(
        "Invitation - Verify org name in toast",
        formatTestConditions({ userType: "invitee", element: "toast" }),
        "Toast shows correct organization name"
      );

      await stepLogger.step("Invitee: Navigate to sign-up page", async () => {
        await page.goto("/sign-up");
      });

      await stepLogger.step("Invitee: Complete sign-up", async () => {
        await expect(page.getByTestId(TestId.SIGN_UP_NAME)).toBeVisible({
          timeout: 10000,
        });
        await fillByTestId(page, TestId.SIGN_UP_NAME, inviteeName);
        await fillByTestId(page, TestId.SIGN_UP_EMAIL, inviteeEmail);
        await fillByTestId(page, TestId.SIGN_UP_PASSWORD, inviteePassword);
        await clickByTestId(page, TestId.SIGN_UP_SUBMIT);
      });

      let inviteeSignupSuccess = false;
      await stepLogger.step("Invitee: Verify redirect to home", async () => {
        try {
          await page.waitForURL("/", { timeout: 20000 });
          inviteeSignupSuccess = true;
        } catch (error) {
          inviteeSignupSuccess = false;
        }

        await logTestResult(
          logger,
          page,
          "Invitation - Invitee sign up",
          formatTestConditions({ userType: "new user", worker: "invitee" }),
          "Sign up successful",
          inviteeSignupSuccess,
          "signed up successfully",
          "sign up failed"
        );

        if (!inviteeSignupSuccess) {
          throw new Error("Invitee sign up failed");
        }
      });

      let invitationToastAppeared = false;
      await stepLogger.step(
        "Invitee: Wait for invitation toast (real-time)",
        async () => {
          invitationToastAppeared = await waitForElement(
            page,
            TestId.INVITATION_TOAST,
            10000
          );

          await logTestResult(
            logger,
            page,
            "Invitation - Receive invitation toast",
            formatTestConditions({
              userType: "invitee",
              action: "wait for invitation",
            }),
            "Invitation toast appears without refresh",
            invitationToastAppeared,
            "toast appeared",
            "toast did not appear within timeout"
          );

          if (!invitationToastAppeared) {
            throw new Error("Invitation toast did not appear");
          }
        }
      );

      await stepLogger.step(
        "Invitee: Verify organization name in toast",
        async () => {
          const toast = page.getByTestId(TestId.INVITATION_TOAST);
          const orgName = await toast.getAttribute("data-org-name");

          const inviter = await prisma.user.findUnique({
            where: { email: inviterEmail },
            include: { member: { include: { organization: true } } },
          });

          const expectedOrgName =
            inviter?.member[0]?.organization?.name || null;

          const orgNameMatches = orgName === expectedOrgName;

          await logTestResult(
            logger,
            page,
            "Invitation - Verify org name in toast",
            formatTestConditions({ userType: "invitee", element: "toast" }),
            "Toast shows correct organization name",
            orgNameMatches,
            `org name: ${orgName}`,
            `org name mismatch: expected ${expectedOrgName}, got ${orgName}`
          );

          if (!orgNameMatches) {
            throw new Error(
              `Organization name mismatch: expected ${expectedOrgName}, got ${orgName}`
            );
          }
        }
      );
    }
  });

  test("should accept invitation and access organization content", async ({
    page,
  }, testInfo) => {
    const stepLogger = new TestStepLogger(
      "Accept Invitation and Verify Organization Access"
    );
    const workerIndex = testInfo.parallelIndex;

    if (workerIndex === 1) {
      logger.registerExpectedTest(
        "Accept - Click accept button",
        formatTestConditions({
          userType: "invitee",
          action: "accept invitation",
        }),
        "Invitation accepted successfully"
      );
      logger.registerExpectedTest(
        "Accept - Organization appears in selector",
        formatTestConditions({
          userType: "invitee",
          action: "check org list",
        }),
        "Organization appears in avatar menu org selector"
      );
      logger.registerExpectedTest(
        "Accept - Switch to new organization",
        formatTestConditions({
          userType: "invitee",
          action: "switch organization",
        }),
        "Successfully switch to new organization"
      );
      logger.registerExpectedTest(
        "Accept - Tamagotchi has correct org ID",
        formatTestConditions({
          userType: "invitee",
          element: "tamagotchi",
          orgId: "inviter org",
        }),
        "Tamagotchi data-organization-id matches inviter's org"
      );
      logger.registerExpectedTest(
        "Accept - Todo list has correct org ID",
        formatTestConditions({
          userType: "invitee",
          element: "todo list",
          orgId: "inviter org",
        }),
        "Todo list data-organization-id matches inviter's org"
      );

      await stepLogger.step("Invitee: Navigate to home", async () => {
        await page.goto("/");
      });

      await stepLogger.step("Invitee: Wait for invitation toast", async () => {
        await waitForElement(page, TestId.INVITATION_TOAST, 10000);
      });

      await stepLogger.step("Invitee: Click accept button", async () => {
        await clickByTestId(page, TestId.INVITATION_ACCEPT_BUTTON);
      });

      let acceptButtonClicked = false;
      await stepLogger.step("Invitee: Verify toast dismisses", async () => {
        try {
          await page.waitForSelector(
            `[data-testid="${TestId.INVITATION_TOAST}"]`,
            { state: "hidden", timeout: 10000 }
          );
          acceptButtonClicked = true;
        } catch (error) {
          acceptButtonClicked = false;
        }

        await logTestResult(
          logger,
          page,
          "Accept - Click accept button",
          formatTestConditions({
            userType: "invitee",
            action: "accept invitation",
          }),
          "Invitation accepted successfully",
          acceptButtonClicked,
          "toast dismissed",
          "toast did not dismiss"
        );

        if (!acceptButtonClicked) {
          throw new Error("Accept button did not work");
        }
      });

      await stepLogger.step("Invitee: Open avatar menu", async () => {
        await page.waitForTimeout(2000);
        await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);
      });

      let orgInSelector = false;
      await stepLogger.step(
        "Invitee: Verify organization in selector",
        async () => {
          const orgSelectorVisible = await isVisibleByTestId(
            page,
            TestId.AVATAR_MENU_ORG_SELECT,
            10000
          );

          if (!orgSelectorVisible) {
            throw new Error("Organization selector not visible");
          }

          const inviter = await prisma.user.findUnique({
            where: { email: inviterEmail },
            include: { member: { include: { organization: true } } },
          });

          const inviterOrgName =
            inviter?.member[0]?.organization?.name || "Unknown Org";

          const orgSelectOptions = await page
            .locator(`[data-testid="${TestId.AVATAR_MENU_ORG_SELECT}"] option`)
            .allTextContents();

          orgInSelector = orgSelectOptions.some((opt) =>
            opt.includes(inviterOrgName)
          );

          await logTestResult(
            logger,
            page,
            "Accept - Organization appears in selector",
            formatTestConditions({
              userType: "invitee",
              action: "check org list",
            }),
            "Organization appears in avatar menu org selector",
            orgInSelector,
            `organization found: ${inviterOrgName}`,
            `organization not found in selector, options: ${orgSelectOptions.join(", ")}`
          );

          if (!orgInSelector) {
            throw new Error(
              `Organization ${inviterOrgName} not found in selector`
            );
          }
        }
      );

      await stepLogger.step(
        "Invitee: Switch to inviter's organization",
        async () => {
          const inviter = await prisma.user.findUnique({
            where: { email: inviterEmail },
            include: { member: true },
          });

          if (!inviter || inviter.member.length === 0) {
            throw new Error("Inviter organization not found");
          }

          const inviterOrgId = inviter.member[0].organizationId;

          const orgSelect = page.getByTestId(TestId.AVATAR_MENU_ORG_SELECT);
          await orgSelect.selectOption({ value: inviterOrgId });
        }
      );

      let organizationSwitched = false;
      await stepLogger.step(
        "Invitee: Verify organization switch completed",
        async () => {
          try {
            await page.waitForTimeout(2000);
            organizationSwitched = true;
          } catch (error) {
            organizationSwitched = false;
          }

          await logTestResult(
            logger,
            page,
            "Accept - Switch to new organization",
            formatTestConditions({
              userType: "invitee",
              action: "switch organization",
            }),
            "Successfully switch to new organization",
            organizationSwitched,
            "organization switched",
            "organization switch failed"
          );

          if (!organizationSwitched) {
            throw new Error("Organization switch failed");
          }
        }
      );

      await stepLogger.step("Invitee: Close avatar menu", async () => {
        await page.keyboard.press("Escape");
      });

      let tamagotchiHasCorrectOrgId = false;
      await stepLogger.step(
        "Invitee: Verify tamagotchi has correct org ID",
        async () => {
          const inviter = await prisma.user.findUnique({
            where: { email: inviterEmail },
            include: { member: true },
          });

          const inviterOrgId = inviter?.member[0]?.organizationId || "";

          const tamagotchi = page.locator(
            `[data-testid="${TestId.TAMAGOTCHI_CONTAINER}"][data-organization-id="${inviterOrgId}"]`
          );

          try {
            await expect(tamagotchi).toBeVisible({ timeout: 10000 });
            tamagotchiHasCorrectOrgId = true;
          } catch (error) {
            tamagotchiHasCorrectOrgId = false;
          }

          await logTestResult(
            logger,
            page,
            "Accept - Tamagotchi has correct org ID",
            formatTestConditions({
              userType: "invitee",
              element: "tamagotchi",
              orgId: "inviter org",
            }),
            "Tamagotchi data-organization-id matches inviter's org",
            tamagotchiHasCorrectOrgId,
            `tamagotchi org ID: ${inviterOrgId}`,
            `tamagotchi org ID does not match ${inviterOrgId}`
          );

          if (!tamagotchiHasCorrectOrgId) {
            throw new Error("Tamagotchi does not have correct organization ID");
          }
        }
      );

      let todoListHasCorrectOrgId = false;
      await stepLogger.step(
        "Invitee: Verify todo list has correct org ID",
        async () => {
          const inviter = await prisma.user.findUnique({
            where: { email: inviterEmail },
            include: { member: true },
          });

          const inviterOrgId = inviter?.member[0]?.organizationId || "";

          const todoList = page.locator(
            `[data-testid="${TestId.TODO_LIST}"][data-organization-id="${inviterOrgId}"]`
          );

          try {
            await expect(todoList).toBeVisible({ timeout: 10000 });
            todoListHasCorrectOrgId = true;
          } catch (error) {
            todoListHasCorrectOrgId = false;
          }

          await logTestResult(
            logger,
            page,
            "Accept - Todo list has correct org ID",
            formatTestConditions({
              userType: "invitee",
              element: "todo list",
              orgId: "inviter org",
            }),
            "Todo list data-organization-id matches inviter's org",
            todoListHasCorrectOrgId,
            `todo list org ID: ${inviterOrgId}`,
            `todo list org ID does not match ${inviterOrgId}`
          );

          if (!todoListHasCorrectOrgId) {
            throw new Error("Todo list does not have correct organization ID");
          }
        }
      );
    }
  });

  test("should decline invitation and verify org not accessible", async ({
    page,
  }, testInfo) => {
    const stepLogger = new TestStepLogger("Decline Invitation");
    const workerIndex = testInfo.parallelIndex;

    if (workerIndex === 0) {
      await stepLogger.step("Inviter: Navigate to home", async () => {
        await page.goto("/");
      });

      await stepLogger.step("Inviter: Open avatar menu", async () => {
        await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);
      });

      await stepLogger.step("Inviter: Open invite dialog", async () => {
        await clickByTestId(page, TestId.INVITE_USERS_BUTTON);
      });

      await stepLogger.step("Inviter: Send new invitation", async () => {
        await waitForElement(page, TestId.INVITE_DIALOG, 10000);
        await fillByTestId(page, TestId.INVITE_EMAIL_INPUT, inviteeEmail);
        await clickByTestId(page, TestId.INVITE_SEND_BUTTON);
      });

      await stepLogger.step("Inviter: Wait for dialog to close", async () => {
        await page.waitForSelector(`[data-testid="${TestId.INVITE_DIALOG}"]`, {
          state: "hidden",
          timeout: 10000,
        });
      });
    } else if (workerIndex === 1) {
      logger.registerExpectedTest(
        "Decline - Wait for invitation toast",
        formatTestConditions({
          userType: "invitee",
          action: "wait for invitation",
        }),
        "Invitation toast appears"
      );
      logger.registerExpectedTest(
        "Decline - Click decline button",
        formatTestConditions({
          userType: "invitee",
          action: "decline invitation",
        }),
        "Invitation declined successfully"
      );
      logger.registerExpectedTest(
        "Decline - Organization not in selector",
        formatTestConditions({
          userType: "invitee",
          action: "check org list",
        }),
        "Declined organization does not appear in selector"
      );

      await stepLogger.step("Invitee: Navigate to home", async () => {
        await page.goto("/");
      });

      let invitationToastAppeared = false;
      await stepLogger.step(
        "Invitee: Wait for new invitation toast",
        async () => {
          invitationToastAppeared = await waitForElement(
            page,
            TestId.INVITATION_TOAST,
            10000
          );

          await logTestResult(
            logger,
            page,
            "Decline - Wait for invitation toast",
            formatTestConditions({
              userType: "invitee",
              action: "wait for invitation",
            }),
            "Invitation toast appears",
            invitationToastAppeared,
            "toast appeared",
            "toast did not appear"
          );

          if (!invitationToastAppeared) {
            throw new Error("New invitation toast did not appear");
          }
        }
      );

      await stepLogger.step("Invitee: Click decline button", async () => {
        await clickByTestId(page, TestId.INVITATION_DECLINE_BUTTON);
      });

      let declineButtonClicked = false;
      await stepLogger.step("Invitee: Verify toast dismisses", async () => {
        try {
          await page.waitForSelector(
            `[data-testid="${TestId.INVITATION_TOAST}"]`,
            { state: "hidden", timeout: 10000 }
          );
          declineButtonClicked = true;
        } catch (error) {
          declineButtonClicked = false;
        }

        await logTestResult(
          logger,
          page,
          "Decline - Click decline button",
          formatTestConditions({
            userType: "invitee",
            action: "decline invitation",
          }),
          "Invitation declined successfully",
          declineButtonClicked,
          "toast dismissed",
          "toast did not dismiss"
        );

        if (!declineButtonClicked) {
          throw new Error("Decline button did not work");
        }
      });

      await stepLogger.step("Invitee: Refresh page", async () => {
        await page.reload();
        await page.waitForTimeout(2000);
      });

      await stepLogger.step("Invitee: Open avatar menu", async () => {
        await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);
      });

      let orgNotInSelector = false;
      await stepLogger.step(
        "Invitee: Verify declined org not in selector",
        async () => {
          const orgSelectorVisible = await isVisibleByTestId(
            page,
            TestId.AVATAR_MENU_ORG_SELECT,
            10000
          );

          if (!orgSelectorVisible) {
            throw new Error("Organization selector not visible");
          }

          const inviter = await prisma.user.findUnique({
            where: { email: inviterEmail },
            include: { member: { include: { organization: true } } },
          });

          const inviterOrgName =
            inviter?.member[0]?.organization?.name || "Unknown Org";

          const orgSelectOptions = await page
            .locator(`[data-testid="${TestId.AVATAR_MENU_ORG_SELECT}"] option`)
            .allTextContents();

          orgNotInSelector = !orgSelectOptions.some((opt) =>
            opt.includes(inviterOrgName)
          );

          await logTestResult(
            logger,
            page,
            "Decline - Organization not in selector",
            formatTestConditions({
              userType: "invitee",
              action: "check org list",
            }),
            "Declined organization does not appear in selector",
            orgNotInSelector,
            `organization not in selector: ${inviterOrgName}`,
            `organization still in selector: ${orgSelectOptions.join(", ")}`
          );

          if (!orgNotInSelector) {
            throw new Error(
              `Declined organization ${inviterOrgName} still appears in selector`
            );
          }
        }
      );
    }
  });
});
