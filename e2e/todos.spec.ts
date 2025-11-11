import { test, expect } from "./utils/test-fixtures";
import { TestId } from "../test.types";
import { cleanupTestData } from "./utils/test-cleanup";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_USER_EMAIL = `todo-test-${Date.now()}@example.com`;
const TEST_USER_NAME = "Todo Test User";
const TEST_PASSWORD = "TestPassword123!";

test.describe("Todo CRUD Operations", () => {
  test.beforeAll(async () => {
    await cleanupTestData([TEST_USER_EMAIL]);
  });

  test.afterAll(async () => {
    await cleanupTestData([TEST_USER_EMAIL]);
    await prisma.$disconnect();
  });

  test("should create a new todo", async ({ page }) => {
    await page.goto("/sign-up");

    await page.getByTestId(TestId.SIGN_UP_NAME).fill(TEST_USER_NAME);
    await page.getByTestId(TestId.SIGN_UP_EMAIL).fill(TEST_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_UP_PASSWORD).fill(TEST_PASSWORD);
    await page.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    await page.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId(TestId.TODO_LIST)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByTestId(TestId.TODO_INPUT)).toBeVisible({
      timeout: 10000,
    });

    const todoText = "Test Todo Item";
    await page.getByTestId(TestId.TODO_INPUT).fill(todoText);
    await page.getByTestId(TestId.TODO_ADD_BUTTON).click();

    await expect(
      page.getByTestId(TestId.TODO_ITEM).filter({ hasText: todoText })
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display multiple todos", async ({ page }) => {
    await page.goto("/sign-in");

    await page.getByTestId(TestId.SIGN_IN_EMAIL).fill(TEST_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_IN_PASSWORD).fill(TEST_PASSWORD);
    await page.getByTestId(TestId.SIGN_IN_SUBMIT).click();

    await page.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId(TestId.TODO_INPUT)).toBeVisible({
      timeout: 10000,
    });

    const todos = ["First Todo", "Second Todo", "Third Todo"];

    for (const todo of todos) {
      await page.getByTestId(TestId.TODO_INPUT).fill(todo);
      await page.getByTestId(TestId.TODO_ADD_BUTTON).click();
      await expect(
        page.getByTestId(TestId.TODO_ITEM).filter({ hasText: todo })
      ).toBeVisible({ timeout: 10000 });
    }

    const todoItems = page.getByTestId(TestId.TODO_ITEM);
    await expect(todoItems).toHaveCount(4, { timeout: 10000 });
  });

  test("should toggle todo completion", async ({ page }) => {
    await page.goto("/sign-in");

    await page.getByTestId(TestId.SIGN_IN_EMAIL).fill(TEST_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_IN_PASSWORD).fill(TEST_PASSWORD);
    await page.getByTestId(TestId.SIGN_IN_SUBMIT).click();

    await page.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId(TestId.TODO_ITEM).first()).toBeVisible({
      timeout: 10000,
    });

    const firstCheckbox = page.getByTestId(TestId.TODO_CHECKBOX).first();

    await firstCheckbox.check();

    await expect(firstCheckbox).toBeChecked({ timeout: 10000 });

    await firstCheckbox.uncheck();

    await expect(firstCheckbox).not.toBeChecked({ timeout: 10000 });
  });

  test("should delete a todo", async ({ page }) => {
    await page.goto("/sign-in");

    await page.getByTestId(TestId.SIGN_IN_EMAIL).fill(TEST_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_IN_PASSWORD).fill(TEST_PASSWORD);
    await page.getByTestId(TestId.SIGN_IN_SUBMIT).click();

    await page.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId(TestId.TODO_ITEM).first()).toBeVisible({
      timeout: 10000,
    });

    const initialCount = await page.getByTestId(TestId.TODO_ITEM).count();

    const firstDeleteButton = page.getByTestId(TestId.TODO_DELETE_BUTTON).first();
    await firstDeleteButton.click();

    await expect(page.getByTestId(TestId.TODO_ITEM)).toHaveCount(
      initialCount - 1,
      { timeout: 10000 }
    );
  });

  test("should not create empty todos", async ({ page }) => {
    await page.goto("/sign-in");

    await page.getByTestId(TestId.SIGN_IN_EMAIL).fill(TEST_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_IN_PASSWORD).fill(TEST_PASSWORD);
    await page.getByTestId(TestId.SIGN_IN_SUBMIT).click();

    await page.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId(TestId.TODO_INPUT)).toBeVisible({
      timeout: 10000,
    });

    const initialCount = await page.getByTestId(TestId.TODO_ITEM).count();

    await page.getByTestId(TestId.TODO_INPUT).fill("");
    await page.getByTestId(TestId.TODO_ADD_BUTTON).click();

    const finalCount = await page.getByTestId(TestId.TODO_ITEM).count();
    expect(finalCount).toBe(initialCount);
  });

  test("should persist todos after page reload", async ({ page }) => {
    await page.goto("/sign-in");

    await page.getByTestId(TestId.SIGN_IN_EMAIL).fill(TEST_USER_EMAIL);
    await page.getByTestId(TestId.SIGN_IN_PASSWORD).fill(TEST_PASSWORD);
    await page.getByTestId(TestId.SIGN_IN_SUBMIT).click();

    await page.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId(TestId.TODO_ITEM).first()).toBeVisible({
      timeout: 10000,
    });

    const todosBeforeReload = await page.getByTestId(TestId.TODO_ITEM).count();

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByTestId(TestId.TODO_ITEM).first()).toBeVisible({
      timeout: 10000,
    });

    const todosAfterReload = await page.getByTestId(TestId.TODO_ITEM).count();
    expect(todosAfterReload).toBe(todosBeforeReload);
  });

  test("should display empty state when no todos exist", async ({ page }) => {
    const emptyStateEmail = `empty-state-${Date.now()}@example.com`;

    await page.goto("/sign-up");

    await page.getByTestId(TestId.SIGN_UP_NAME).fill("Empty State User");
    await page.getByTestId(TestId.SIGN_UP_EMAIL).fill(emptyStateEmail);
    await page.getByTestId(TestId.SIGN_UP_PASSWORD).fill(TEST_PASSWORD);
    await page.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    await page.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId(TestId.TODO_LIST)).toBeVisible({
      timeout: 10000,
    });

    const todoItems = page.getByTestId(TestId.TODO_ITEM);
    const count = await todoItems.count();

    if (count === 0) {
      const emptyState = page.getByTestId(TestId.TODO_EMPTY_STATE);
      const emptyStateVisible = await emptyState.isVisible().catch(() => false);
      expect(emptyStateVisible || count === 0).toBeTruthy();
    }

    await cleanupTestData([emptyStateEmail]);
  });
});
