import { Page } from "@playwright/test";
import { TestId } from "../test.types";

interface TestResult {
  description: string;
  conditions: string;
  expected: string;
  observed: string;
  passed: boolean;
  screenshot?: string;
  errorToast?: string;
}

export class TestResultLogger {
  private tests: TestResult[] = [];
  private passedCount = 0;
  private failedCount = 0;

  log(
    description: string,
    conditions: string,
    expected: string,
    observed: string,
    passed: boolean,
    screenshot?: string,
    errorToast?: string
  ): void {
    if (passed) {
      this.passedCount++;
    } else {
      this.failedCount++;
      this.tests.push({
        description,
        conditions,
        expected,
        observed,
        passed,
        screenshot,
        errorToast,
      });
    }
  }

  getSerializableData() {
    return {
      stats: {
        passed: this.passedCount,
        failed: this.failedCount,
        total: this.passedCount + this.failedCount,
      },
      tests: this.tests,
    };
  }
}

export function formatTestConditions(conditions: Record<string, any>): string {
  return Object.entries(conditions)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

export async function getElementByTestId(page: Page, testId: TestId) {
  return page.locator(`[data-testid="${testId}"]`);
}

export async function clickByTestId(page: Page, testId: TestId): Promise<void> {
  await page.locator(`[data-testid="${testId}"]`).click();
}

export async function fillByTestId(
  page: Page,
  testId: TestId,
  value: string
): Promise<void> {
  await page.locator(`[data-testid="${testId}"]`).fill(value);
}

export async function isVisibleByTestId(
  page: Page,
  testId: TestId,
  timeout: number = 5000
): Promise<boolean> {
  try {
    const element = page.locator(`[data-testid="${testId}"]`);
    await element.waitFor({ state: "visible", timeout });
    return await element.isVisible();
  } catch {
    return false;
  }
}

export async function getTextByTestId(
  page: Page,
  testId: TestId
): Promise<string | null> {
  try {
    return await page.locator(`[data-testid="${testId}"]`).textContent();
  } catch {
    return null;
  }
}

export async function countByTestId(page: Page, testId: TestId): Promise<number> {
  return await page.locator(`[data-testid="${testId}"]`).count();
}

export async function waitForElement(
  page: Page,
  testId: TestId,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page
      .locator(`[data-testid="${testId}"]`)
      .waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

export async function signIn(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await fillByTestId(page, TestId.SIGN_IN_EMAIL, email);
  await fillByTestId(page, TestId.SIGN_IN_PASSWORD, password);
  await clickByTestId(page, TestId.SIGN_IN_SUBMIT);
}

export async function signUp(
  page: Page,
  data: { email: string; password: string; name: string }
): Promise<void> {
  await fillByTestId(page, TestId.SIGN_UP_NAME, data.name);
  await fillByTestId(page, TestId.SIGN_UP_EMAIL, data.email);
  await fillByTestId(page, TestId.SIGN_UP_PASSWORD, data.password);
  await clickByTestId(page, TestId.SIGN_UP_SUBMIT);
}

export async function signOut(page: Page): Promise<void> {
  await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);
  await clickByTestId(page, TestId.AVATAR_MENU_SIGN_OUT);
}

export function generateUniqueEmail(baseEmail: string): string {
  const timestamp = Date.now();
  const [name, domain] = baseEmail.split("@");
  return `${name}+${timestamp}@${domain}`;
}

export async function logTestResult(
  logger: TestResultLogger,
  page: Page,
  description: string,
  conditions: string,
  expected: string,
  passed: boolean,
  successObserved: string,
  failureObserved: string
): Promise<void> {
  let screenshot: string | undefined;
  let errorToast: string | undefined;

  if (!passed) {
    screenshot = `test-results/failures/${description
      .toLowerCase()
      .replace(/\s+/g, "-")}-${Date.now()}.png`;
    await page.screenshot({ path: screenshot, fullPage: true });

    const toastError = page.locator(`[data-testid="${TestId.TOAST_ERROR}"]`);
    if (await toastError.isVisible().catch(() => false)) {
      errorToast = (await toastError.textContent()) || undefined;
    }
  }

  logger.log(
    description,
    conditions,
    expected,
    passed ? successObserved : failureObserved,
    passed,
    screenshot,
    errorToast
  );
}
