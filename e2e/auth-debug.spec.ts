import { test, expect } from "./utils/test-fixtures";
import { TestId } from "../test.types";
import { cleanupAuthTestUsers } from "./utils/cleanup-auth-users";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_USER_EMAIL = "test-debug@example.com";
const TEST_USER_NAME = "Test Debug User";
const TEST_PASSWORD = "TestPassword123!";

test.describe("Auth Debug Tests", () => {
  test.beforeAll(async () => {
    await cleanupAuthTestUsers();
  });

  test.afterAll(async () => {
    await cleanupAuthTestUsers();
    await prisma.$disconnect();
  });

  test("diagnose session state after sign up", async ({ page, baseURL }) => {
    console.log("Base URL from config:", baseURL);
    console.log("BETTER_AUTH_URL env:", process.env.BETTER_AUTH_URL);

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

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth") && response.status() === 200
    );

    await page.getByTestId(TestId.SIGN_UP_SUBMIT).click();

    const authResponse = await responsePromise;
    console.log("Auth response URL:", authResponse.url());
    console.log("Auth response status:", authResponse.status());
    console.log("Auth response headers:", authResponse.headers());

    const cookiesAfterAuth = await page.context().cookies();
    console.log("Cookies after auth response:", cookiesAfterAuth);

    const allRequests: any[] = [];
    const allResponses: any[] = [];

    page.on("request", (request) => {
      allRequests.push({
        url: request.url(),
        method: request.method(),
      });
    });

    page.on("response", async (response) => {
      const responseData: any = {
        url: response.url(),
        status: response.status(),
      };

      if (response.url().includes("/api/auth/get-session")) {
        try {
          const body = await response.json();
          responseData.body = body;
        } catch (e) {
          responseData.bodyError = String(e);
        }
      }

      allResponses.push(responseData);
    });

    await page.waitForURL("/", {
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });

    console.log("=== DIAGNOSTIC START ===");
    console.log("URL after navigation:", page.url());

    await page.waitForTimeout(2000);

    const authRequests = allRequests.filter((r) => r.url.includes("/api/auth"));
    const authResponses = allResponses.filter((r) => r.url.includes("/api/auth"));

    console.log("Auth API requests after navigation:", authRequests);
    console.log("Auth API responses after navigation:", JSON.stringify(authResponses, null, 2));

    const sessionData = await page.evaluate(() => {
      const cookies = document.cookie;
      return {
        hasCookies: cookies.length > 0,
        cookies: cookies,
      };
    });
    console.log("Session cookies:", sessionData);

    const localStorageData = await page.evaluate(() => {
      return {
        keys: Object.keys(localStorage),
        data: JSON.stringify(localStorage),
      };
    });
    console.log("LocalStorage:", localStorageData);

    await page.waitForTimeout(1000);

    const hasActiveOrgInDOM = await page.evaluate(() => {
      const html = document.body.innerHTML;
      return {
        hasTodoList: html.includes('data-testid="todo-list"'),
        hasTamagotchi: html.includes('data-testid="tamagotchi-container"'),
        hasTodoInput: html.includes('data-testid="todo-input"'),
        bodyLength: html.length,
        bodyPreview: html.substring(0, 500),
      };
    });
    console.log("DOM state after 1s:", hasActiveOrgInDOM);

    const reactState = await page.evaluate(() => {
      const root = document.querySelector("#__next") || document.body;
      return {
        hasReactRoot: !!root,
        childrenCount: root.children.length,
      };
    });
    console.log("React root state:", reactState);

    await page.waitForTimeout(2000);

    const hasActiveOrgInDOM2 = await page.evaluate(() => {
      const html = document.body.innerHTML;
      return {
        hasTodoList: html.includes('data-testid="todo-list"'),
        hasTamagotchi: html.includes('data-testid="tamagotchi-container"'),
        hasTodoInput: html.includes('data-testid="todo-input"'),
      };
    });
    console.log("DOM state after 3s total:", hasActiveOrgInDOM2);

    const apiCallLogs = await page.evaluate(() => {
      return (window as any).__API_CALLS__ || "No API calls tracked";
    });
    console.log("API calls:", apiCallLogs);

    console.log("=== DIAGNOSTIC END ===");

    const todoListVisible = await page
      .getByTestId(TestId.TODO_LIST)
      .isVisible()
      .catch(() => false);
    const avatarVisible = await page
      .getByTestId(TestId.AVATAR_MENU_TRIGGER)
      .isVisible()
      .catch(() => false);

    console.log("Element visibility:", {
      todoList: todoListVisible,
      avatar: avatarVisible,
    });

    if (!todoListVisible) {
      await page.screenshot({ path: "test-results/debug-screenshot.png" });
      console.log("Screenshot saved to test-results/debug-screenshot.png");
    }

    await expect(page.getByTestId(TestId.TODO_LIST)).toBeVisible({
      timeout: 15000,
    });
  });
});
