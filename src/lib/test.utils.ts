import { Page } from '@playwright/test';
import { TestId } from '@/test.types';
import * as fs from 'fs';
import * as path from 'path';

export interface TestLogEntry {
  testNumber: number;
  testName: string;
  passed: boolean;
  conditions?: string;
  expectation?: string;
  observed?: string;
  screenshotPath?: string;
  errorToast?: string;
  timestamp?: string;
}

function writeLogToFile(testSuiteName: string, logContent: string): void {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logDir = path.join(process.cwd(), 'logs', 'tests', testSuiteName);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logPath = path.join(logDir, `${timestamp}.txt`);
    fs.writeFileSync(logPath, logContent);
  } catch (error) {
    console.error('Failed to write log file:', error);
  }
}

export class TestLoggerRegistry {
  private static instance: TestLoggerRegistry;
  private loggers: TestResultLogger[] = [];

  static getInstance(): TestLoggerRegistry {
    if (!TestLoggerRegistry.instance) {
      TestLoggerRegistry.instance = new TestLoggerRegistry();
    }
    return TestLoggerRegistry.instance;
  }

  register(logger: TestResultLogger): void {
    this.loggers.push(logger);
  }

  getLoggers(): TestResultLogger[] {
    return this.loggers;
  }

  clear(): void {
    this.loggers = [];
  }

  getTotalStats(): { total: number; passed: number; failed: number } {
    let total = 0;
    let passed = 0;
    let failed = 0;

    this.loggers.forEach(logger => {
      const stats = logger.getStats();
      total += stats.total;
      passed += stats.passed;
      failed += stats.failed;
    });

    return { total, passed, failed };
  }

  getAllFailedTests(): TestLogEntry[] {
    const allFailed: TestLogEntry[] = [];
    this.loggers.forEach(logger => {
      allFailed.push(...logger.getFailedTests());
    });
    return allFailed;
  }

  getAggregatedSummary(): string {
    const stats = this.getTotalStats();

    if (stats.total === 0) {
      return '';
    }

    let summary = `\n${stats.total} tests | ${stats.passed} passed | ${stats.failed} failed\n`;

    const allTests: TestLogEntry[] = [];
    this.loggers.forEach(logger => {
      allTests.push(...logger.getAllTests());
    });

    const failedTests = allTests.filter(test => !test.passed);

    if (failedTests.length > 0) {
      summary += `\nFailed Tests:\n`;
      failedTests.forEach((entry) => {
        summary += `\n${entry.testNumber}. ${entry.testName}\n`;
        if (entry.conditions) {
          summary += `   Conditions: ${entry.conditions}\n`;
        }
        if (entry.expectation) {
          summary += `   Expected: ${entry.expectation}\n`;
        }
        if (entry.observed) {
          summary += `   Observed: ${entry.observed}\n`;
        }
        if (entry.screenshotPath) {
          summary += `   Screenshot: ${entry.screenshotPath}\n`;
        }
        if (entry.errorToast) {
          summary += `   Error Toast: ${entry.errorToast}\n`;
        }
      });
    }

    return summary;
  }
}

export class TestResultLogger {
  private logs: TestLogEntry[] = [];
  private testCounter: number = 0;
  private testSuiteName: string;
  private expectedTests: Map<string, { conditions: string; expectation: string }> = new Map();

  constructor(testSuiteName: string = 'default') {
    this.testSuiteName = testSuiteName;
    TestLoggerRegistry.getInstance().register(this);
  }

  registerExpectedTest(testName: string, conditions: string, expectation: string): void {
    this.expectedTests.set(testName, { conditions, expectation });
  }

  finalizeUnreachedTests(): void {
    this.expectedTests.forEach((details, testName) => {
      const alreadyLogged = this.logs.some(log => log.testName === testName);
      if (!alreadyLogged) {
        this.testCounter++;
        const entry: TestLogEntry = {
          testNumber: this.testCounter,
          testName,
          passed: false,
          timestamp: new Date().toISOString(),
          conditions: details.conditions,
          expectation: details.expectation,
          observed: 'Test did not execute - previous assertion failed'
        };
        this.logs.push(entry);
      }
    });
  }

  log(testName: string, conditions: string, expectation: string, observed: string, passed: boolean, screenshotPath?: string, errorToast?: string): void {
    this.testCounter++;
    const timestamp = new Date().toISOString();
    const entry: TestLogEntry = {
      testNumber: this.testCounter,
      testName,
      passed,
      timestamp,
      conditions: passed ? undefined : conditions,
      expectation: passed ? undefined : expectation,
      observed: passed ? undefined : observed,
      screenshotPath: passed ? undefined : screenshotPath,
      errorToast: passed ? undefined : errorToast
    };
    this.logs.push(entry);

    try {
      const dir = path.join(process.cwd(), 'test-results');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const logPath = path.join(dir, 'logger-calls.log');
      fs.appendFileSync(logPath, `Test ${this.testCounter}: ${testName} - ${passed ? 'PASS' : 'FAIL'} (Total logs: ${this.logs.length})\n`);
    } catch (e) {
      console.error('Failed to write logger call log:', e);
    }
  }

  getSummary(): string {
    const stats = this.getStats();
    const failedTests = this.logs.filter(e => !e.passed);

    if (failedTests.length === 0) {
      return '';
    }

    let summary = `\n${stats.total} tests | ${stats.passed} passed | ${stats.failed} failed\n`;
    summary += `\nFailed Assertions:\n`;

    failedTests.forEach((failedTest) => {
      summary += `\n${failedTest.testNumber}. ${failedTest.testName}\n`;

      if (failedTest.conditions) {
        summary += `   Conditions: ${failedTest.conditions}\n`;
      }
      if (failedTest.expectation) {
        summary += `   Expected: ${failedTest.expectation}\n`;
      }
      if (failedTest.observed) {
        summary += `   Observed: ${failedTest.observed}\n`;
      }
      if (failedTest.screenshotPath) {
        summary += `   Screenshot: ${failedTest.screenshotPath}\n`;
      }
      if (failedTest.errorToast) {
        summary += `   Error Toast: ${failedTest.errorToast}\n`;
      }
    });

    return summary;
  }

  printSummary(): void {
    const summary = this.getSummary();
    if (summary) {
      process.stdout.write(summary);
    }
  }

  getStats(): { total: number; passed: number; failed: number } {
    const passed = this.logs.filter(e => e.passed).length;
    const failed = this.logs.filter(e => !e.passed).length;
    return {
      total: this.logs.length,
      passed,
      failed
    };
  }

  getFailedTests(): TestLogEntry[] {
    return this.logs.filter(e => !e.passed);
  }

  getAllTests(): TestLogEntry[] {
    return this.logs;
  }

  getSerializableData(): { stats: { total: number; passed: number; failed: number }; tests: TestLogEntry[]; testSuiteName: string } {
    return {
      stats: this.getStats(),
      tests: this.logs,
      testSuiteName: this.testSuiteName
    };
  }

  writeLogsToFile(): void {
    const summary = this.getSummary();
    if (summary) {
      writeLogToFile(this.testSuiteName, summary);
    }

    const detailedLog = this.buildDetailedLog();
    writeLogToFile(this.testSuiteName, detailedLog);
  }

  private buildDetailedLog(): string {
    let log = `Test Suite: ${this.testSuiteName}\n`;
    log += `Execution Time: ${new Date().toISOString()}\n`;
    log += `${'='.repeat(80)}\n\n`;

    const stats = this.getStats();
    log += `Total Tests: ${stats.total}\n`;
    log += `Passed: ${stats.passed}\n`;
    log += `Failed: ${stats.failed}\n\n`;
    log += `${'='.repeat(80)}\n\n`;

    this.logs.forEach((entry) => {
      log += `Test #${entry.testNumber}: ${entry.testName}\n`;
      log += `Status: ${entry.passed ? 'PASSED ✓' : 'FAILED ✗'}\n`;
      if (entry.timestamp) {
        log += `Timestamp: ${entry.timestamp}\n`;
      }
      if (entry.conditions) {
        log += `Conditions: ${entry.conditions}\n`;
      }
      if (entry.expectation) {
        log += `Expected: ${entry.expectation}\n`;
      }
      if (entry.observed) {
        log += `Observed: ${entry.observed}\n`;
      }
      if (entry.screenshotPath) {
        log += `Screenshot: ${entry.screenshotPath}\n`;
      }
      if (entry.errorToast) {
        log += `Error Toast: ${entry.errorToast}\n`;
      }
      log += `${'-'.repeat(80)}\n\n`;
    });

    return log;
  }

  reset(): void {
    this.logs = [];
    this.testCounter = 0;
  }
}

export async function getElementByTestId(page: Page, testId: TestId): Promise<ReturnType<Page['locator']>> {
  return page.locator(`[data-testid="${testId}"]`);
}

export async function clickByTestId(page: Page, testId: TestId): Promise<void> {
  await page.click(`[data-testid="${testId}"]`);
}

export async function fillByTestId(page: Page, testId: TestId, value: string): Promise<void> {
  await page.fill(`[data-testid="${testId}"]`, value);
}

export async function isVisibleByTestId(page: Page, testId: TestId, timeout: number = 10000): Promise<boolean> {
  try {
    const element = page.locator(`[data-testid="${testId}"]`);
    return await element.isVisible({ timeout });
  } catch {
    return false;
  }
}

export async function getTextByTestId(page: Page, testId: TestId): Promise<string> {
  try {
    const element = page.locator(`[data-testid="${testId}"]`);
    const text = await element.textContent({ timeout: 10000 });
    return text || '';
  } catch {
    return '';
  }
}

export async function countByTestId(page: Page, testId: TestId): Promise<number> {
  try {
    const elements = page.locator(`[data-testid="${testId}"]`);
    return await elements.count();
  } catch {
    return 0;
  }
}

export interface AuthTestUser {
  email: string;
  password: string;
  fullName: string;
  location: string;
  skillLevel?: string;
  utrRating?: string;
}

export function generateUniqueEmail(baseEmail: string): string {
  const timestamp = Date.now();
  const [localPart, domain] = baseEmail.split('@');
  return `${localPart}+${timestamp}@${domain}`;
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/sign-in');
  await fillByTestId(page, TestId.SIGN_IN_EMAIL, email);
  await fillByTestId(page, TestId.SIGN_IN_PASSWORD, password);
  await clickByTestId(page, TestId.SIGN_IN_SUBMIT);
  await page.waitForURL('/', { timeout: 10000 });
}

export async function signOut(page: Page): Promise<void> {
  await clickByTestId(page, TestId.AVATAR_MENU_TRIGGER);
  await clickByTestId(page, TestId.AVATAR_MENU_SIGN_OUT);
  await page.waitForURL(/\/sign-in/, { timeout: 10000 });
}

export function formatTestConditions(conditions: Record<string, string | number | boolean>): string {
  return Object.entries(conditions)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

export async function waitForElement(page: Page, testId: TestId, timeout: number = 10000): Promise<boolean> {
  try {
    await page.waitForSelector(`[data-testid="${testId}"]`, { timeout });
    return true;
  } catch {
    return false;
  }
}

export async function captureFailureScreenshot(page: Page | null, testName: string): Promise<string | undefined> {
  if (!page) {
    return undefined;
  }
  const timestamp = Date.now();
  const sanitizedName = testName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const screenshotPath = `test-results/failures/${sanitizedName}-${timestamp}.png`;

  const dir = path.join(process.cwd(), 'test-results', 'failures');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function checkForErrorToast(page: Page | null, timeout: number = 3000): Promise<string | null> {
  if (!page) {
    return null;
  }
  try {
    const toast = page.locator('[data-testid="toast-error"]')
      .or(page.locator('[data-testid="toast-success"]'))
      .or(page.locator('[data-testid="toast-info"]'))
      .or(page.locator('[role="status"]'))
      .or(page.locator('[role="alert"]'))
      .first();
    const isVisible = await toast.isVisible({ timeout });
    if (isVisible) {
      const text = await toast.textContent();
      return text || 'Toast visible but no text content';
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
  observedFailure: string
): Promise<void> {
  try {
    const dir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const logPath = path.join(dir, 'logtestresult-calls.log');
    fs.appendFileSync(logPath, `logTestResult called: ${testName}\n`);
  } catch (e) {
    console.error('Failed to write logTestResult call log:', e);
  }

  const observed = passed ? observedSuccess : observedFailure;
  let screenshotPath: string | undefined;
  let errorToast: string | undefined;

  if (!passed) {
    screenshotPath = await captureFailureScreenshot(page, testName);
    const toastMessage = await checkForErrorToast(page);
    if (toastMessage) {
      errorToast = toastMessage;
    }
  }

  logger.log(
    testName,
    conditions,
    expectation,
    observed,
    passed,
    screenshotPath,
    errorToast
  );

  try {
    const logPath = path.join(process.cwd(), 'test-results', 'logtestresult-calls.log');
    fs.appendFileSync(logPath, `  -> logger.log() completed\n`);
  } catch (e) {
    console.error('Failed to write logger completion log:', e);
  }
}

export async function waitForElementCount(page: Page, testId: TestId, expectedCount: number, timeout: number = 10000): Promise<boolean> {
  try {
    await page.waitForFunction(
      ({ testId, expectedCount }) => {
        const elements = document.querySelectorAll(`[data-testid="${testId}"]`);
        return elements.length === expectedCount;
      },
      { testId, expectedCount },
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

export async function waitForMinimumElementCount(page: Page, testId: TestId, minimumCount: number, timeout: number = 10000): Promise<boolean> {
  try {
    await page.waitForFunction(
      ({ testId, minimumCount }) => {
        const elements = document.querySelectorAll(`[data-testid="${testId}"]`);
        return elements.length >= minimumCount;
      },
      { testId, minimumCount },
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

export async function waitForLoadingComplete(page: Page, timeout: number = 10000): Promise<boolean> {
  try {
    await page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 5000) });
  } catch (error) {
    void error;
  }

  try {
    await page.waitForSelector('[data-testid*="loading"]', { state: 'hidden', timeout: 5000 });
  } catch (error) {
    void error;
  }

  try {
    await page.waitForFunction(
      () => {
        const loadingElements = document.querySelectorAll('[data-testid*="loading"]');
        return loadingElements.length === 0 || Array.from(loadingElements).every(el => !el.checkVisibility());
      },
      {},
      { timeout: 2000 }
    );
  } catch (error) {
    void error;
  }

  return true;
}

export async function waitForButtonVisibility(page: Page, testId: TestId, timeout: number = 10000): Promise<boolean> {
  try {
    await (await getElementByTestId(page, testId)).waitFor({ state: 'visible', timeout });
    return await isVisibleByTestId(page, testId);
  } catch (error) {
    return false;
  }
}
