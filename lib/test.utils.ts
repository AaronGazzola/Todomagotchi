import { Page, Locator } from "@playwright/test";
import { TestId } from "@/test.types";
import * as fs from "fs";
import * as path from "path";

export interface DiagnosticData {
  consoleLogs: Array<{
    type: string;
    text: string;
    timestamp: number;
    location?: string;
  }>;
  pageErrors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
  }>;
  networkFailures: Array<{
    url: string;
    method: string;
    status: number;
    statusText: string;
    responseBody?: string;
    timestamp: number;
  }>;
}

export class TestResultLogger {
  private logs: Array<{
    testNumber: number;
    testName: string;
    passed: boolean;
    timestamp: string;
    conditions?: string;
    expectation?: string;
    observed?: string;
    screenshotPath?: string;
    errorToast?: string;
    consoleErrors?: Array<{ type: string; text: string; location?: string }>;
    pageErrors?: Array<{ message: string; stack?: string }>;
    networkFailures?: Array<{ url: string; method: string; status: number; statusText: string; responseBody?: string }>;
  }> = [];

  private expectedTests: Map<
    string,
    { conditions: string; expectation: string }
  > = new Map();

  private testCounter = 0;
  private firstFailureIndex: number | null = null;

  constructor(private testSuiteName: string = "default") {}

  registerExpectedTest(
    testName: string,
    conditions: string,
    expectation: string
  ): void {
    this.expectedTests.set(testName, { conditions, expectation });
  }

  log(
    testName: string,
    conditions: string,
    expectation: string,
    observed: string,
    passed: boolean,
    screenshotPath?: string,
    errorToast?: string,
    diagnostics?: DiagnosticData
  ): void {
    this.testCounter++;

    if (!passed && this.firstFailureIndex === null) {
      this.firstFailureIndex = this.testCounter;
    }

    const consoleErrors = !passed && diagnostics
      ? diagnostics.consoleLogs
          .filter((log) => log.type === "error" || log.type === "warning")
          .map(({ type, text, location }) => ({ type, text, location }))
      : undefined;

    const pageErrors = !passed && diagnostics
      ? diagnostics.pageErrors.map(({ message, stack }) => ({ message, stack }))
      : undefined;

    const networkFailures = !passed && diagnostics
      ? diagnostics.networkFailures.map(({ url, method, status, statusText, responseBody }) => ({
          url,
          method,
          status,
          statusText,
          responseBody,
        }))
      : undefined;

    this.logs.push({
      testNumber: this.testCounter,
      testName,
      passed,
      timestamp: new Date().toISOString(),
      conditions: passed ? undefined : conditions,
      expectation: passed ? undefined : expectation,
      observed: passed ? undefined : observed,
      screenshotPath: passed ? undefined : screenshotPath,
      errorToast: passed ? undefined : errorToast,
      consoleErrors: consoleErrors?.length ? consoleErrors : undefined,
      pageErrors: pageErrors?.length ? pageErrors : undefined,
      networkFailures: networkFailures?.length ? networkFailures : undefined,
    });

    this.expectedTests.delete(testName);
  }

  finalizeUnreachedTests(): void {
    for (const [testName, { conditions, expectation }] of this.expectedTests) {
      this.testCounter++;
      this.logs.push({
        testNumber: this.testCounter,
        testName,
        passed: false,
        timestamp: new Date().toISOString(),
        conditions,
        expectation,
        observed: "Test did not execute - previous assertion failed",
      });
    }
    this.expectedTests.clear();
  }

  getStats(): { total: number; passed: number; failed: number } {
    const failedCount = this.firstFailureIndex !== null ? 1 : 0;
    const passedCount = this.firstFailureIndex !== null
      ? this.firstFailureIndex - 1
      : this.logs.filter((log) => log.passed).length;

    return {
      total: failedCount > 0 ? 1 : this.logs.length,
      passed: passedCount,
      failed: failedCount,
    };
  }

  getSummary(): string {
    const stats = this.getStats();
    if (stats.failed === 0) {
      return "";
    }

    const firstFailure = this.logs.find((log) => !log.passed);
    if (!firstFailure) {
      return "";
    }

    const consoleErrorsStr = firstFailure.consoleErrors?.length
      ? `  Console Errors:\n${firstFailure.consoleErrors.map((e) => `    - [${e.type}] ${e.text}${e.location ? ` (${e.location})` : ""}`).join("\n")}`
      : "";

    const pageErrorsStr = firstFailure.pageErrors?.length
      ? `  Page Errors:\n${firstFailure.pageErrors.map((e) => `    - ${e.message}`).join("\n")}`
      : "";

    const networkFailuresStr = firstFailure.networkFailures?.length
      ? `  Network Failures:\n${firstFailure.networkFailures.map((e) => `    - ${e.method} ${e.url} -> ${e.status} ${e.statusText}${e.responseBody ? `\n      Response: ${e.responseBody.substring(0, 200)}` : ""}`).join("\n")}`
      : "";

    return `
Test Suite: ${this.testSuiteName}
Total: ${stats.total} | Passed: ${stats.passed} | Failed: ${stats.failed}

First Failed Test:
  ${firstFailure.testNumber}. ${firstFailure.testName}
  Conditions: ${firstFailure.conditions || "N/A"}
  Expected: ${firstFailure.expectation || "N/A"}
  Observed: ${firstFailure.observed || "N/A"}
${firstFailure.screenshotPath ? `  Screenshot: ${firstFailure.screenshotPath}` : ""}
${firstFailure.errorToast ? `  Error Toast: ${firstFailure.errorToast}` : ""}
${consoleErrorsStr}
${pageErrorsStr}
${networkFailuresStr}
`.trim();
  }

  getSerializableData(): {
    stats: { total: number; passed: number; failed: number };
    tests: typeof this.logs;
    testSuiteName: string;
  } {
    return {
      stats: this.getStats(),
      tests: this.logs,
      testSuiteName: this.testSuiteName,
    };
  }
}

export function formatTestConditions(
  conditions: Record<string, string | number | boolean>
): string {
  return Object.entries(conditions)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

export async function captureFailureScreenshot(
  page: Page | null,
  testName: string
): Promise<string | undefined> {
  if (!page) return undefined;

  const timestamp = Date.now();
  const sanitizedName = testName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const screenshotDir = path.join(process.cwd(), "test-results", "failures");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const screenshotPath = path.join(
    screenshotDir,
    `${sanitizedName}-${timestamp}.png`
  );

  await page.screenshot({ path: screenshotPath, fullPage: true });

  return screenshotPath;
}

export async function checkForErrorToast(
  page: Page | null,
  timeout: number = 3000
): Promise<string | null> {
  if (!page) return null;

  try {
    const selectors = [
      '[data-testid="toast-error"]',
      '[data-testid="toast-success"]',
      '[data-testid="toast-info"]',
      '[role="status"]',
      '[role="alert"]',
    ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        await element.waitFor({ state: "visible", timeout: timeout / selectors.length });
        const text = await element.textContent();
        if (text) return text.trim();
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function logTestResult(
  logger: TestResultLogger,
  page: Page | null,
  testName: string,
  conditions: string,
  expectation: string,
  passed: boolean,
  observedSuccess: string,
  observedFailure: string,
  diagnostics?: DiagnosticData
): Promise<void> {
  const observed = passed ? observedSuccess : observedFailure;
  const screenshotPath = !passed
    ? await captureFailureScreenshot(page, testName)
    : undefined;
  const errorToast = !passed ? await checkForErrorToast(page) : undefined;

  logger.log(
    testName,
    conditions,
    expectation,
    observed,
    passed,
    screenshotPath,
    errorToast,
    diagnostics
  );
}

export async function getElementByTestId(
  page: Page,
  testId: TestId
): Promise<Locator> {
  return page.getByTestId(testId);
}

export async function clickByTestId(page: Page, testId: TestId): Promise<void> {
  await page.getByTestId(testId).click();
}

export async function fillByTestId(
  page: Page,
  testId: TestId,
  value: string
): Promise<void> {
  await page.getByTestId(testId).fill(value);
}

export async function isVisibleByTestId(
  page: Page,
  testId: TestId,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.getByTestId(testId).waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

export async function getTextByTestId(
  page: Page,
  testId: TestId
): Promise<string> {
  try {
    const text = await page.getByTestId(testId).textContent();
    return text || "";
  } catch {
    return "";
  }
}

export async function countByTestId(page: Page, testId: TestId): Promise<number> {
  try {
    return await page.getByTestId(testId).count();
  } catch {
    return 0;
  }
}

export async function waitForElement(
  page: Page,
  testId: TestId,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.getByTestId(testId).waitFor({ state: "attached", timeout });
    return true;
  } catch {
    return false;
  }
}

export async function waitForButtonVisibility(
  page: Page,
  testId: TestId,
  timeout: number = 10000
): Promise<boolean> {
  try {
    await page.getByTestId(testId).waitFor({ state: "attached", timeout: timeout / 2 });
    return await isVisibleByTestId(page, testId, timeout / 2);
  } catch {
    return false;
  }
}

export async function waitForElementCount(
  page: Page,
  testId: TestId,
  expectedCount: number,
  timeout: number = 10000
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const count = await countByTestId(page, testId);
    if (count === expectedCount) {
      return true;
    }
    await page.waitForTimeout(100);
  }
  return false;
}

export async function waitForMinimumElementCount(
  page: Page,
  testId: TestId,
  minimumCount: number,
  timeout: number = 10000
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const count = await countByTestId(page, testId);
    if (count >= minimumCount) {
      return true;
    }
    await page.waitForTimeout(100);
  }
  return false;
}

export async function waitForLoadingComplete(
  page: Page,
  timeout: number = 10000
): Promise<boolean> {
  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    await page
      .locator('[data-testid*="loading"]')
      .first()
      .waitFor({ state: "hidden", timeout: timeout })
      .catch(() => {});

    await page
      .evaluate(() => {
        const loadingElements = Array.from(
          document.querySelectorAll('[data-testid*="loading"]')
        );
        return loadingElements.every((el) => !el.checkVisibility());
      })
      .catch(() => {});

    return true;
  } catch {
    return true;
  }
}

export function generateUniqueEmail(baseEmail: string): string {
  const timestamp = Date.now();
  const [localPart, domain] = baseEmail.split("@");
  return `${localPart}+${timestamp}@${domain}`;
}
