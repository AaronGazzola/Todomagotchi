import {
  TestResultLogger,
  clickByTestId,
  fillByTestId,
  formatTestConditions,
  isVisibleByTestId,
  logTestResult,
  countByTestId,
} from "@/lib/test.utils";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { TestId } from "../test.types";
import { expect, test } from "./utils/test-fixtures";
import { TestStepLogger } from "./utils/test-logger";

const prisma = new PrismaClient();

test.describe("Todo Permission Tests", () => {
  const timestamp = Date.now();
  const ownerEmail = `owner-${timestamp}@example.com`;
  const memberEmail = `member-${timestamp}@example.com`;
  const testPassword = "TestPassword123!";
  const ownerName = "Test Owner";
  const memberName = "Test Member";
  const logger = new TestResultLogger("todo-permissions");

  let ownerOrganizationId: string | null = null;
  let createdTodoId: string | null = null;

  test.beforeAll(async () => {
    const ownerUser = await prisma.user.findUnique({
      where: { email: ownerEmail },
      include: { member: { include: { organization: true } } },
    });

    if (ownerUser) {
      await prisma.session.deleteMany({ where: { userId: ownerUser.id } });

      const organizationIds = ownerUser.member.map((m) => m.organizationId);
      if (organizationIds.length > 0) {
        await prisma.todo.deleteMany({
          where: { organizationId: { in: organizationIds } },
        });
        await prisma.tamagotchi.deleteMany({
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

      await prisma.user.delete({ where: { email: ownerEmail } });
    }

    const memberUser = await prisma.user.findUnique({
      where: { email: memberEmail },
      include: { member: { include: { organization: true } } },
    });

    if (memberUser) {
      await prisma.session.deleteMany({ where: { userId: memberUser.id } });

      const organizationIds = memberUser.member.map((m) => m.organizationId);
      if (organizationIds.length > 0) {
        await prisma.todo.deleteMany({
          where: { organizationId: { in: organizationIds } },
        });
        await prisma.tamagotchi.deleteMany({
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

      await prisma.user.delete({ where: { email: memberEmail } });
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

    const ownerUser = await prisma.user.findUnique({
      where: { email: ownerEmail },
      include: { member: { include: { organization: true } } },
    });

    if (ownerUser) {
      await prisma.session.deleteMany({ where: { userId: ownerUser.id } });

      const organizationIds = ownerUser.member.map((m) => m.organizationId);
      if (organizationIds.length > 0) {
        await prisma.todo.deleteMany({
          where: { organizationId: { in: organizationIds } },
        });
        await prisma.tamagotchi.deleteMany({
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

      await prisma.user.delete({ where: { email: ownerEmail } });
    }

    const memberUser = await prisma.user.findUnique({
      where: { email: memberEmail },
      include: { member: { include: { organization: true } } },
    });

    if (memberUser) {
      await prisma.session.deleteMany({ where: { userId: memberUser.id } });

      const organizationIds = memberUser.member.map((m) => m.organizationId);
      if (organizationIds.length > 0) {
        await prisma.todo.deleteMany({
          where: { organizationId: { in: organizationIds } },
        });
        await prisma.tamagotchi.deleteMany({
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

      await prisma.user.delete({ where: { email: memberEmail } });
    }

    await prisma.$disconnect();
  });

  test("should allow owner to create and delete todos, member can only toggle", async ({
    page,
    context,
  }) => {
    const stepLogger = new TestStepLogger("Todo Permission Flow");

    logger.registerExpectedTest(
      "Owner Signup - Successful",
      formatTestConditions({ userType: "owner", action: "signup" }),
      "Owner user can sign up successfully"
    );
    logger.registerExpectedTest(
      "Owner Create Todo - Successful",
      formatTestConditions({ userType: "owner", action: "create todo" }),
      "Owner can create todo"
    );
    logger.registerExpectedTest(
      "Owner Delete Todo - Successful",
      formatTestConditions({ userType: "owner", action: "delete todo" }),
      "Owner can delete todo"
    );
    logger.registerExpectedTest(
      "Owner Send Invitation - Successful",
      formatTestConditions({ userType: "owner", action: "send invitation" }),
      "Owner can send invitation to member"
    );
    logger.registerExpectedTest(
      "Member Signup - Successful",
      formatTestConditions({ userType: "member", action: "signup" }),
      "Member user can sign up successfully"
    );
    logger.registerExpectedTest(
      "Member Accept Invitation - Successful",
      formatTestConditions({ userType: "member", action: "accept invitation" }),
      "Member can accept invitation"
    );
    logger.registerExpectedTest(
      "Member Cannot Create - UI Hidden",
      formatTestConditions({ userType: "member", permission: "create" }),
      "Member cannot see create todo input/button"
    );
    logger.registerExpectedTest(
      "Member Cannot Delete - UI Hidden",
      formatTestConditions({ userType: "member", permission: "delete" }),
      "Member cannot see delete button on todos"
    );
    logger.registerExpectedTest(
      "Member Can Toggle - Successful",
      formatTestConditions({ userType: "member", permission: "update" }),
      "Member can toggle todo completion"
    );

    await stepLogger.step("Owner: Sign up", async () => {
      await page.goto("/sign-up");
      await fillByTestId(page, TestId.SIGN_UP_NAME, ownerName);
      await fillByTestId(page, TestId.SIGN_UP_EMAIL, ownerEmail);
      await fillByTestId(page, TestId.SIGN_UP_PASSWORD, testPassword);
      await clickByTestId(page, TestId.SIGN_UP_SUBMIT);
      await page.waitForURL("/", { timeout: 60000 });
    });

    let signupSuccess = false;
    await stepLogger.step("Owner: Verify signup and get organization ID", async () => {
      const user = await prisma.user.findUnique({
        where: { email: ownerEmail },
        include: { member: { include: { organization: true } } },
      });

      if (user && user.member.length > 0) {
        signupSuccess = true;
        ownerOrganizationId = user.member[0].organizationId;

        const member = await prisma.member.findFirst({
          where: {
            userId: user.id,
            organizationId: ownerOrganizationId,
          },
        });

        if (member?.role === "owner") {
          signupSuccess = true;
        } else {
          signupSuccess = false;
        }
      }

      await logTestResult(
        logger,
        page,
        "Owner Signup - Successful",
        formatTestConditions({ userType: "owner", action: "signup" }),
        "Owner user can sign up successfully",
        signupSuccess,
        `owner signed up with role: ${signupSuccess ? "owner" : "not owner"}`,
        "owner signup failed"
      );

      if (!signupSuccess) {
        throw new Error("Owner signup failed");
      }
    });

    await stepLogger.step("Owner: Create todo", async () => {
      await fillByTestId(page, TestId.TODO_INPUT, "Test todo for permissions");
      await clickByTestId(page, TestId.TODO_ADD_BUTTON);
      await page.waitForTimeout(1000);
    });

    let todoCreated = false;
    await stepLogger.step("Owner: Verify todo created", async () => {
      const isVisible = await isVisibleByTestId(page, TestId.TODO_ITEM, 10000);

      if (isVisible && ownerOrganizationId) {
        const todos = await prisma.todo.findMany({
          where: { organizationId: ownerOrganizationId },
        });

        if (todos.length > 0) {
          todoCreated = true;
          createdTodoId = todos[0].id;
        }
      }

      await logTestResult(
        logger,
        page,
        "Owner Create Todo - Successful",
        formatTestConditions({ userType: "owner", action: "create todo" }),
        "Owner can create todo",
        todoCreated,
        "todo created successfully",
        "todo creation failed"
      );

      if (!todoCreated) {
        throw new Error("Owner failed to create todo");
      }
    });

    await stepLogger.step("Owner: Delete todo", async () => {
      const todoItem = page.getByTestId(TestId.TODO_ITEM).first();
      await todoItem.hover();
      await page.waitForTimeout(500);
      const deleteButton = todoItem.getByTestId(
        `${TestId.TODO_DELETE_BUTTON}-${createdTodoId}`
      );
      await deleteButton.click();
      await page.waitForTimeout(1000);
    });

    let todoDeleted = false;
    await stepLogger.step("Owner: Verify todo deleted", async () => {
      const count = await countByTestId(page, TestId.TODO_ITEM);

      if (count === 0 && ownerOrganizationId) {
        const todos = await prisma.todo.findMany({
          where: { organizationId: ownerOrganizationId },
        });

        todoDeleted = todos.length === 0;
      }

      await logTestResult(
        logger,
        page,
        "Owner Delete Todo - Successful",
        formatTestConditions({ userType: "owner", action: "delete todo" }),
        "Owner can delete todo",
        todoDeleted,
        "todo deleted successfully",
        "todo deletion failed"
      );

      if (!todoDeleted) {
        throw new Error("Owner failed to delete todo");
      }
    });

    await stepLogger.step("Owner: Send invitation to member", async () => {
      await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);
      await clickByTestId(page, TestId.INVITE_USERS_BUTTON);
      await page.waitForTimeout(500);
      await fillByTestId(page, TestId.INVITE_EMAIL_INPUT, memberEmail);
      await clickByTestId(page, TestId.INVITE_SEND_BUTTON);
      await page.waitForTimeout(2000);
    });

    let invitationSent = false;
    await stepLogger.step("Owner: Verify invitation sent", async () => {
      if (ownerOrganizationId) {
        const invitation = await prisma.invitation.findFirst({
          where: {
            organizationId: ownerOrganizationId,
            email: memberEmail,
          },
        });

        invitationSent = invitation !== null;
      }

      await logTestResult(
        logger,
        page,
        "Owner Send Invitation - Successful",
        formatTestConditions({ userType: "owner", action: "send invitation" }),
        "Owner can send invitation to member",
        invitationSent,
        "invitation sent successfully",
        "invitation send failed"
      );

      if (!invitationSent) {
        throw new Error("Owner failed to send invitation");
      }
    });

    await stepLogger.step("Owner: Sign out", async () => {
      await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);
      await clickByTestId(page, TestId.AVATAR_MENU_SIGN_OUT);
      await page.waitForTimeout(2000);
    });

    const memberPage = await context.newPage();

    await stepLogger.step("Member: Sign up", async () => {
      await memberPage.goto("/sign-up");
      await fillByTestId(memberPage, TestId.SIGN_UP_NAME, memberName);
      await fillByTestId(memberPage, TestId.SIGN_UP_EMAIL, memberEmail);
      await fillByTestId(memberPage, TestId.SIGN_UP_PASSWORD, testPassword);
      await clickByTestId(memberPage, TestId.SIGN_UP_SUBMIT);
      await memberPage.waitForURL("/", { timeout: 60000 });
    });

    let memberSignupSuccess = false;
    await stepLogger.step("Member: Verify signup", async () => {
      const user = await prisma.user.findUnique({
        where: { email: memberEmail },
      });

      memberSignupSuccess = user !== null;

      await logTestResult(
        logger,
        memberPage,
        "Member Signup - Successful",
        formatTestConditions({ userType: "member", action: "signup" }),
        "Member user can sign up successfully",
        memberSignupSuccess,
        "member signed up successfully",
        "member signup failed"
      );

      if (!memberSignupSuccess) {
        throw new Error("Member signup failed");
      }
    });

    await stepLogger.step("Member: Accept invitation", async () => {
      const invitationVisible = await isVisibleByTestId(
        memberPage,
        TestId.INVITATION_ACCEPT_BUTTON,
        10000
      );

      if (invitationVisible) {
        await clickByTestId(memberPage, TestId.INVITATION_ACCEPT_BUTTON);
        await memberPage.waitForTimeout(2000);
      }
    });

    let invitationAccepted = false;
    await stepLogger.step("Member: Verify invitation accepted and role", async () => {
      const user = await prisma.user.findUnique({
        where: { email: memberEmail },
        include: { member: true },
      });

      if (user && ownerOrganizationId) {
        const member = await prisma.member.findFirst({
          where: {
            userId: user.id,
            organizationId: ownerOrganizationId,
          },
        });

        invitationAccepted = member !== null && member.role === "member";
      }

      await logTestResult(
        logger,
        memberPage,
        "Member Accept Invitation - Successful",
        formatTestConditions({
          userType: "member",
          action: "accept invitation",
        }),
        "Member can accept invitation",
        invitationAccepted,
        `invitation accepted with role: ${invitationAccepted ? "member" : "not member"}`,
        "invitation accept failed"
      );

      if (!invitationAccepted) {
        throw new Error("Member failed to accept invitation");
      }
    });

    await stepLogger.step("Member: Switch to owner's organization", async () => {
      await clickByTestId(memberPage, TestId.AVATAR_MENU_TRIGGER);
      const orgSelect = memberPage.getByTestId(TestId.AVATAR_MENU_ORG_SELECT);
      await orgSelect.selectOption({ value: ownerOrganizationId! });
      await memberPage.waitForTimeout(2000);
    });

    await stepLogger.step("Owner: Create todo for member to test", async () => {
      await page.goto("/");
      await page.waitForTimeout(1000);
      await fillByTestId(page, TestId.TODO_INPUT, "Todo for member test");
      await clickByTestId(page, TestId.TODO_ADD_BUTTON);
      await page.waitForTimeout(2000);
    });

    let ownerCreatedTestTodo = false;
    await stepLogger.step("Owner: Verify test todo created", async () => {
      if (ownerOrganizationId) {
        const todos = await prisma.todo.findMany({
          where: { organizationId: ownerOrganizationId },
        });

        if (todos.length > 0) {
          ownerCreatedTestTodo = true;
          createdTodoId = todos[0].id;
        }
      }

      if (!ownerCreatedTestTodo) {
        throw new Error("Owner failed to create test todo");
      }
    });

    await stepLogger.step("Member: Refresh to see todo", async () => {
      await memberPage.reload();
      await memberPage.waitForTimeout(3000);
    });

    let createInputHidden = false;
    await stepLogger.step("Member: Verify create input/button is hidden", async () => {
      const inputVisible = await isVisibleByTestId(
        memberPage,
        TestId.TODO_INPUT,
        2000
      );
      const buttonVisible = await isVisibleByTestId(
        memberPage,
        TestId.TODO_ADD_BUTTON,
        2000
      );

      createInputHidden = !inputVisible && !buttonVisible;

      await logTestResult(
        logger,
        memberPage,
        "Member Cannot Create - UI Hidden",
        formatTestConditions({ userType: "member", permission: "create" }),
        "Member cannot see create todo input/button",
        createInputHidden,
        "create input and button are hidden",
        "create input or button is visible"
      );

      if (!createInputHidden) {
        throw new Error("Member can see create input/button (should be hidden)");
      }
    });

    let deleteButtonHidden = false;
    await stepLogger.step("Member: Verify delete button is hidden", async () => {
      const todoItem = memberPage.getByTestId(TestId.TODO_ITEM).first();
      await todoItem.hover();
      await memberPage.waitForTimeout(500);

      const deleteButtonVisible = await isVisibleByTestId(
        memberPage,
        `${TestId.TODO_DELETE_BUTTON}-${createdTodoId}`,
        2000
      );

      deleteButtonHidden = !deleteButtonVisible;

      await logTestResult(
        logger,
        memberPage,
        "Member Cannot Delete - UI Hidden",
        formatTestConditions({ userType: "member", permission: "delete" }),
        "Member cannot see delete button on todos",
        deleteButtonHidden,
        "delete button is hidden",
        "delete button is visible"
      );

      if (!deleteButtonHidden) {
        throw new Error("Member can see delete button (should be hidden)");
      }
    });

    await stepLogger.step("Member: Toggle todo", async () => {
      const checkbox = memberPage.getByTestId(
        `${TestId.TODO_CHECKBOX}-${createdTodoId}`
      );
      await checkbox.click();
      await memberPage.waitForTimeout(1000);
    });

    let todoToggled = false;
    await stepLogger.step("Member: Verify todo toggled", async () => {
      if (createdTodoId) {
        const todo = await prisma.todo.findUnique({
          where: { id: createdTodoId },
        });

        todoToggled = todo?.completed === true;
      }

      await logTestResult(
        logger,
        memberPage,
        "Member Can Toggle - Successful",
        formatTestConditions({ userType: "member", permission: "update" }),
        "Member can toggle todo completion",
        todoToggled,
        "todo toggled successfully",
        "todo toggle failed"
      );

      if (!todoToggled) {
        throw new Error("Member failed to toggle todo");
      }
    });

    await memberPage.close();
  });
});
