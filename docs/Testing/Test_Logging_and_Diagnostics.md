# Test Logging and Diagnostics

This document provides a comprehensive guide to the logging systems and automatic diagnostic capture used in our tests.

## Overview

Our testing infrastructure includes three complementary systems:

1. **TestStepLogger** - Real-time console output for test steps
2. **TestResultLogger** - Granular sub-test tracking within Playwright tests
3. **Test Fixtures** - Automatic diagnostic capture (console logs, network failures, page errors)

Together, these systems provide comprehensive visibility into test execution and detailed diagnostics for failures.

---

## TestStepLogger - Real-Time Console Output

### Purpose

`TestStepLogger` provides **real-time console output** as tests run, showing each step as it executes with checkmarks (✓) or crosses (✗).

### Benefits

- **Real-time visibility** - See steps execute live during test runs
- **Immediate failure detection** - Know which step failed without waiting for test completion
- **Console output preservation** - Step logs appear in test reports (Console Output section)
- **Automatic error handling** - Errors caught and logged automatically
- **Step numbering** - Automatic sequential numbering

### Usage

```typescript
import { TestStepLogger } from './utils/test-logger';

test('should complete user flow', async ({ page }) => {
  const logger = new TestStepLogger('User Flow Test');

  await logger.step('Navigate to homepage', async () => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  await logger.step('Click login button', async () => {
    await page.getByTestId(TestId.LOGIN_BUTTON).click();
  });

  await logger.step('Enter credentials', async () => {
    await page.getByTestId(TestId.EMAIL_INPUT).fill('user@example.com');
    await page.getByTestId(TestId.PASSWORD_INPUT).fill('password123');
  });
});
```

### Console Output

**During test execution:**
```
🧪 User Flow Test
   01. Navigate to homepage... ✓
   02. Click login button... ✓
   03. Enter credentials... ✓
```

**If a step fails:**
```
🧪 User Flow Test
   01. Navigate to homepage... ✓
   02. Click login button... ✗
```

### Alternative: Manual Step Logging

For steps that don't fit the async wrapper pattern:

```typescript
const logger = new TestStepLogger('Test Name');
const result = someCondition;
logger.logStep('Check condition', result);
```

### Key Features

- **Uses stderr** - Output appears immediately (not buffered by Playwright)
- **Automatic numbering** - Steps numbered sequentially (01, 02, 03...)
- **Error handling** - Catches and logs errors, then re-throws
- **Success/failure indicators** - ✓ for success, ✗ for failure

---

## TestResultLogger - Granular Sub-Test Tracking

### Purpose

`TestResultLogger` tracks **multiple verification points (sub-tests) within a single Playwright test**, providing granular failure diagnostics beyond standard Playwright capabilities.

### Why Use TestResultLogger?

**Standard Playwright limitations:**
- Single pass/fail per test
- Limited diagnostic context for complex multi-step tests
- No built-in support for tracking verification points within a test

**TestResultLogger benefits:**
- Track 5-10+ verification points in a single test
- Automatic early-exit detection (knows which checks were skipped)
- Rich diagnostic data (screenshots, console errors, network failures, DOM state)
- Human-readable README.md reports
- Sub-test granularity in console output

### When to Use TestResultLogger

**Use TestResultLogger when:**
- Test has 3+ verification points
- Need to track which specific check failed
- Want granular diagnostic data per verification
- Testing complex multi-step flows
- Early exit handling is important

**Use standard Playwright assertions when:**
- Single verification point
- Simple pass/fail test
- No need for sub-test tracking

### Example Comparison

**Standard Playwright assertion:**
```typescript
await expect(page.getByTestId(TestId.BUTTON)).toBeVisible();
```

**With TestResultLogger:**
```typescript
const buttonVisible = await isVisibleByTestId(page, TestId.BUTTON);
await logTestResult(
  logger,
  page,
  'Button Visibility Check',
  formatTestConditions({ page: 'home', userType: 'player' }),
  'Button should be visible',
  buttonVisible,
  'Button visible',
  'Button not found'
);
if (!buttonVisible) {
  throw new Error('Button not visible');
}
```

**The second approach provides:**
- Screenshot on failure
- Error toast detection
- Conditions/expectation/observed in report
- Sub-test tracking

---

## TestResultLogger API Reference

### Constructor

```typescript
constructor(testSuiteName: string = 'default')
```

Creates a new logger instance and auto-registers it with TestLoggerRegistry.

**Example:**
```typescript
const logger = new TestResultLogger('auth');
```

---

### Methods

#### `registerExpectedTest()`

```typescript
registerExpectedTest(testName: string, conditions: string, expectation: string): void
```

Pre-registers a test that should execute. Used for early-exit detection.

**When to call:** At the START of your test for each verification point, before execution.

**Example:**
```typescript
logger.registerExpectedTest(
  'Signup - Create Account visible',
  formatTestConditions({ userType: 'new player', action: 'clicked signup link' }),
  'Create Account text visible'
);
```

---

#### `log()`

```typescript
log(
  testName: string,
  conditions: string,
  expectation: string,
  observed: string,
  passed: boolean,
  screenshotPath?: string,
  errorToast?: string
): void
```

Records a test result.

**Parameters:**
- `testName` - Unique name for this verification point
- `conditions` - Test conditions (e.g., "userType=player, page=home")
- `expectation` - What should happen (e.g., "Button should be visible")
- `observed` - What actually happened (e.g., "Button visible" or "Button not found")
- `passed` - `true` if test passed, `false` if failed
- `screenshotPath` - Optional path to failure screenshot
- `errorToast` - Optional error message from toast notification

**Optimization:** Conditions/expectation/observed are only stored if `passed = false`.

**Example:**
```typescript
logger.log(
  'Signup - Create Account visible',
  'userType=new player, action=clicked signup link',
  'Create Account text visible',
  'visible',
  true
);
```

---

#### `finalizeUnreachedTests()`

```typescript
finalizeUnreachedTests(): void
```

Marks all registered but unexecuted tests as failures with observed = "Test did not execute - previous assertion failed".

**CRITICAL:** **MUST** be called in `test.afterAll()`.

**Example:**
```typescript
test.afterAll(async () => {
  logger.finalizeUnreachedTests();
  // Write logger data to JSON
});
```

---

#### `getStats()`

```typescript
getStats(): { total: number; passed: number; failed: number }
```

Returns test statistics (only counts first failure, consistent with early-exit behavior).

**Example:**
```typescript
const stats = logger.getStats();
console.log(`Total: ${stats.total}, Passed: ${stats.passed}, Failed: ${stats.failed}`);
```

---

#### `getSummary()`

```typescript
getSummary(): string
```

Returns formatted summary string with first failed test details.

**Example:**
```typescript
const summary = logger.getSummary();
console.log(summary);
```

**Output:**
```
Test Suite: auth
Total: 3, Passed: 1, Failed: 2

First Failed Test:
  Name: Signup - Create Account visible
  Conditions: userType=new player, action=clicked signup link
  Expected: Create Account text visible
  Observed: not found
```

---

#### `getSerializableData()`

```typescript
getSerializableData(): { stats, tests, testSuiteName }
```

Returns JSON-serializable data for writing to `afterall-call-*.json` files.

**Example:**
```typescript
const data = logger.getSerializableData();
fs.writeFileSync('test-results/afterall-call-123456789.json', JSON.stringify(data, null, 2));
```

---

## Helper Functions

### `formatTestConditions()`

```typescript
formatTestConditions(conditions: Record<string, string | number | boolean>): string
```

Converts object to "key=value, key=value" format.

**Example:**
```typescript
formatTestConditions({
  userType: 'player',
  page: 'home',
  authState: 'authenticated',
});
// Returns: "userType=player, page=home, authState=authenticated"
```

---

### `logTestResult()`

```typescript
async logTestResult(
  logger: TestResultLogger,
  page: Page | null,
  testName: string,
  conditions: string,
  expectation: string,
  passed: boolean,
  observedSuccess: string,
  observedFailure: string
): Promise<void>
```

Convenience wrapper that:
1. Selects observed message based on passed/failed
2. Captures screenshot on failure (calls `captureFailureScreenshot`)
3. Checks for error toast on failure (calls `checkForErrorToast`)
4. Calls `logger.log()` with all data

**Example:**
```typescript
await logTestResult(
  logger,
  page,
  'Signup - Create Account visible',
  formatTestConditions({ userType: 'new player', action: 'clicked signup link' }),
  'Create Account text visible',
  createAccountVisible,
  'visible',
  'not found'
);
```

---

## Step-by-Step Workflow

### 1. Create Logger in test.describe

```typescript
import { TestResultLogger, formatTestConditions, logTestResult } from '@/lib/test.utils';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Feature Tests', () => {
  const logger = new TestResultLogger('feature-name');
});
```

---

### 2. Set Up afterAll Hook

```typescript
test.afterAll(async () => {
  logger.finalizeUnreachedTests();

  const summary = logger.getSummary();
  if (summary) {
    console.log('\n📊 Test Logger Summary:');
    console.log(summary);
  }

  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  const data = logger.getSerializableData();
  const callTimestamp = Date.now();
  const callPath = path.join(testResultsDir, `afterall-call-${callTimestamp}.json`);

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
```

---

### 3. Register Expected Tests at the START

```typescript
test('should complete signup flow', async ({ page }) => {
  logger.registerExpectedTest(
    'Signup - Create Account visible',
    formatTestConditions({ userType: 'new player', action: 'clicked signup link' }),
    'Create Account text visible'
  );
  logger.registerExpectedTest(
    'Signup - Redirect to home',
    formatTestConditions({ userType: 'new player', action: 'submitted form' }),
    'Redirects to home (/)'
  );
  logger.registerExpectedTest(
    'Signup - Sign out button visible',
    formatTestConditions({ userType: 'player', authState: 'authenticated' }),
    'Sign Out button visible'
  );
});
```

---

### 4. Execute Test Steps and Log Results

```typescript
await page.goto('/auth');
await clickByTestId(page, TestId.AUTH_SIGNUP_LINK);

let createAccountVisible = false;
try {
  await expect(
    await getElementByTestId(page, TestId.AUTH_CREATE_ACCOUNT_HEADING)
  ).toBeVisible({ timeout: 20000 });
  createAccountVisible = await isVisibleByTestId(page, TestId.AUTH_CREATE_ACCOUNT_HEADING);
} catch (error) {
  createAccountVisible = false;
}

await logTestResult(
  logger,
  page,
  'Signup - Create Account visible',
  formatTestConditions({ userType: 'new player', action: 'clicked signup link' }),
  'Create Account text visible',
  createAccountVisible,
  'visible',
  'not found'
);

if (!createAccountVisible) {
  throw new Error('Create Account not visible');
}
```

---

### 5. Repeat for Each Verification Point

Continue the pattern for all registered tests.

---

## Early Exit Handling Pattern

The key to proper early-exit detection:

1. **Register ALL expected tests at the start** (before ANY execution)
2. **Log results as you execute**
3. **Throw error immediately on first failure**
4. **Call `finalizeUnreachedTests()` in afterAll**

**Example:**

```typescript
test('should have early exit detection', async ({ page }) => {
  // STEP 1: Register all tests at the start
  logger.registerExpectedTest('Check 1', 'conditions', 'expectation');
  logger.registerExpectedTest('Check 2', 'conditions', 'expectation');
  logger.registerExpectedTest('Check 3', 'conditions', 'expectation');

  // STEP 2: Execute and log results
  let check1Passed = false;
  try {
    await someAssertion1();
    check1Passed = true;
  } catch (error) {
    check1Passed = false;
  }

  await logTestResult(logger, page, 'Check 1', 'conditions', 'expectation', check1Passed, 'pass', 'fail');

  // STEP 3: Fail immediately
  if (!check1Passed) {
    throw new Error('Check 1 failed');
  }

  // Check 2 and Check 3 never execute if Check 1 fails
});
```

**Result if Check 1 fails:**
```
✓ Check 1 - Passed
✗ Check 2 - Observed: "Test did not execute - previous assertion failed"
✗ Check 3 - Observed: "Test did not execute - previous assertion failed"
```

This provides clear visibility into which checks were skipped due to early exit.

---

## Screenshot and Toast Capture

### Automatic (via logTestResult)

```typescript
await logTestResult(logger, page, testName, conditions, expectation, passed, observedSuccess, observedFailure);
```

Automatically captures:
- **Full-page screenshot** (saved to `test-results/failures/testname-timestamp.png`)
- **Error toast text** (searches for `[role="status"]`, `[role="alert"]`, and specific testIds)

---

### Manual Screenshot

```typescript
import { captureFailureScreenshot } from '@/lib/test.utils';

const screenshotPath = await captureFailureScreenshot(page, 'custom-test-name');
logger.log(testName, conditions, expectation, observed, false, screenshotPath);
```

---

### Toast Detection Selectors

The `logTestResult` function automatically checks for error toasts using these selectors:

```typescript
[data-testid="toast-error"]
[data-testid="toast-success"]
[data-testid="toast-info"]
[role="status"]
[role="alert"]
```

**Example Toast:**
```typescript
<div role="alert" data-testid="toast-error">
  Email is required
</div>
```

**Captured in report:**
```
Error Toast: Email is required
```

---

## JSON Output Format

The `afterall-call-{timestamp}.json` file structure:

```json
{
  "timestamp": "2025-11-11T12:34:56.789Z",
  "callId": 1731328496789,
  "stats": {
    "total": 1,
    "passed": 0,
    "failed": 1
  },
  "testsCount": 3,
  "tests": [
    {
      "testNumber": 1,
      "testName": "Signup - Create Account visible",
      "passed": false,
      "timestamp": "2025-11-11T12:34:56.789Z",
      "conditions": "userType=new player, action=clicked signup link",
      "expectation": "Create Account text visible",
      "observed": "not found",
      "screenshotPath": "test-results/failures/signup-create-account-1731328496789.png",
      "errorToast": "Email is required"
    },
    {
      "testNumber": 2,
      "testName": "Signup - Redirect to home",
      "passed": false,
      "timestamp": "2025-11-11T12:34:57.123Z",
      "conditions": "userType=new player, action=submitted form",
      "expectation": "Redirects to home (/)",
      "observed": "Test did not execute - previous assertion failed"
    }
  ],
  "testSuiteName": "auth"
}
```

**Note:** Only failed test details are included (conditions, expectation, observed). Passed tests are minimal to reduce file size.

---

## Integration with Reporters

The consolidated reporter reads `afterall-call-*.json` files and includes them in the README.md under "Failed Sub-Tests" section:

```markdown
## Failed Sub-Tests

### 1. Signup - Create Account visible

**Conditions:** userType=new player, action=clicked signup link
**Expected:** Create Account text visible
**Observed:** not found
**Screenshot:** signup-create-account-1731328496789.png
**Error Toast:** Email is required
```

See [Reporters_and_Reports.md](./Reporters_and_Reports.md) for complete reporter documentation.

---

## Test Fixtures and Diagnostics

### Why Custom test/expect Imports?

**CRITICAL RULE:** Always import `test` and `expect` from `"./utils/test-fixtures"`, NOT from `"@playwright/test"`.

```typescript
import { test, expect } from './utils/test-fixtures'; // ✅ Correct
import { test, expect } from '@playwright/test';      // ❌ Wrong
```

### Why This Is Required

The custom fixtures extend Playwright's test fixture with **automatic diagnostic capture**:

- Diagnostics are attached to test results
- Consumed by the consolidated reporter
- Included in README.md reports

### What Breaks Without Custom Fixtures

- ❌ No automatic console log capture
- ❌ No network failure tracking
- ❌ No page error tracking
- ❌ README.md "Browser Console Errors" section will be empty
- ❌ README.md "Network Failures" section will be empty

---

## Automatic Diagnostic Capture

The `test-fixtures.ts` file automatically captures:

### 1. Console Logs

```typescript
page.on('console', async (msg) => {
  consoleLogs.push({
    type: msg.type(),
    text: msg.text(),
    timestamp: new Date().toISOString(),
    location: msg.location() || undefined,
  });
});
```

**Captures:**
- ALL console messages (log, warn, error, info, debug)
- Message type and text
- Timestamp
- Source location (file:line:column)

---

### 2. Page Errors

```typescript
page.on('pageerror', (error) => {
  pageErrors.push({
    message: error.message,
    stack: error.stack || undefined,
    timestamp: new Date().toISOString(),
  });
});
```

**Captures:**
- Uncaught JavaScript errors
- Stack traces
- Timestamps

---

### 3. Network Failures

```typescript
page.on('response', async (response) => {
  if (response.status() >= 400) {
    let responseBody: string | undefined;
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('application/json')) {
        responseBody = JSON.stringify(await response.json(), null, 2);
      } else if (contentType.includes('text/')) {
        responseBody = await response.text();
      }
    } catch (e) {
      responseBody = undefined;
    }

    networkFailures.push({
      url: response.url(),
      method: response.request().method() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      status: response.status(),
      statusText: response.statusText(),
      responseBody,
      timestamp: new Date().toISOString(),
    });
  }
});
```

**Captures:**
- HTTP responses with status 400+
- URL, method, status, status text
- Response body (parsed JSON or text)
- Timestamp

---

## Diagnostic Data Structure

```typescript
interface DiagnosticData {
  consoleLogs: Array<{
    type: 'log' | 'warn' | 'error' | 'info' | 'debug';
    text: string;
    timestamp: string;
    location?: { url: string; lineNumber: number; columnNumber: number };
  }>;
  pageErrors: Array<{
    message: string;
    stack?: string;
    timestamp: string;
  }>;
  networkFailures: Array<{
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    status: number;
    statusText: string;
    responseBody?: string;
    timestamp: string;
  }>;
  testContext?: {
    user?: string;
    conditions?: string;
    expectation?: string;
    observed?: string;
  };
}
```

---

## How Diagnostics Are Attached

On test failure, the fixture automatically attaches diagnostic data:

```typescript
await test.info().attach('diagnostic-data', {
  body: JSON.stringify(diagnosticData, null, 2),
  contentType: 'application/json',
});
```

The consolidated reporter reads this attachment and includes it in README.md.

---

## Performance Considerations

### Overhead

- **Console log capture:** Minimal (in-memory array push)
- **Network failure capture:** Low (only captures 400+ responses, parses body lazily)
- **Page error capture:** Minimal

### Memory

- Diagnostics stored in memory during test execution
- Cleared after each test
- Large response bodies may increase memory usage

### Recommendations

- Diagnostics are lightweight for typical tests
- If test involves 1000+ console logs or large response bodies, consider filtering
- No action needed for normal test scenarios

---

## Complete Example

```typescript
import { test, expect } from './utils/test-fixtures';
import { supawright } from 'supawright';
import { TestResultLogger, formatTestConditions, logTestResult } from '@/lib/test.utils';
import { TestStepLogger } from './utils/test-logger';
import { TestId } from '@/test.types';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Auth Tests', () => {
  const resultLogger = new TestResultLogger('auth');

  test.afterAll(async () => {
    resultLogger.finalizeUnreachedTests();

    const summary = resultLogger.getSummary();
    if (summary) {
      console.log('\n📊 Test Logger Summary:');
      console.log(summary);
    }

    const testResultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }

    const data = resultLogger.getSerializableData();
    const callTimestamp = Date.now();
    const callPath = path.join(testResultsDir, `afterall-call-${callTimestamp}.json`);

    fs.writeFileSync(callPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      callId: callTimestamp,
      stats: data.stats,
      testsCount: data.tests.length,
      tests: data.tests,
      testSuiteName: data.testSuiteName,
    }, null, 2));
  });

  test('should complete signup flow', async ({ page }) => {
    const stepLogger = new TestStepLogger('Signup Flow');

    // Register expected tests
    resultLogger.registerExpectedTest(
      'Signup - Create Account visible',
      formatTestConditions({ userType: 'new player', action: 'clicked signup link' }),
      'Create Account text visible'
    );
    resultLogger.registerExpectedTest(
      'Signup - Redirect to home',
      formatTestConditions({ userType: 'new player', action: 'submitted form' }),
      'Redirects to home (/)'
    );

    // Create test user
    await stepLogger.step('Create test user with Supawright', async () => {
      const user = await supawright.auth.createUser({
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        email_confirm: true,
      });
    });

    // Navigate to auth page
    await stepLogger.step('Navigate to auth page', async () => {
      await page.goto('/auth');
    });

    // Click signup link
    await stepLogger.step('Click signup link', async () => {
      await page.getByTestId(TestId.AUTH_SIGNUP_LINK).click();
    });

    // Verify Create Account heading
    let createAccountVisible = false;
    try {
      await expect(page.getByTestId(TestId.AUTH_CREATE_ACCOUNT_HEADING)).toBeVisible({ timeout: 20000 });
      createAccountVisible = true;
    } catch (error) {
      createAccountVisible = false;
    }

    await logTestResult(
      resultLogger,
      page,
      'Signup - Create Account visible',
      formatTestConditions({ userType: 'new player', action: 'clicked signup link' }),
      'Create Account text visible',
      createAccountVisible,
      'visible',
      'not found'
    );

    if (!createAccountVisible) {
      throw new Error('Create Account not visible');
    }

    // Continue with remaining tests...
  });
});
```

---

## Summary

Our logging and diagnostics systems provide:

1. **TestStepLogger** - Real-time console output with step-by-step visibility
2. **TestResultLogger** - Granular sub-test tracking with early-exit detection
3. **Test Fixtures** - Automatic diagnostic capture (console, network, errors)

**Key Takeaways:**
- ✅ Use TestStepLogger for real-time step visibility
- ✅ Use TestResultLogger for complex multi-step tests (3+ verification points)
- ✅ Always import test/expect from `./utils/test-fixtures`
- ✅ Register expected tests at the START (before execution)
- ✅ Call `finalizeUnreachedTests()` in afterAll
- ✅ Fail immediately on first assertion failure
- ✅ Let automatic diagnostics capture console/network/error data

**Next Steps:**
- Read [Reporters_and_Reports.md](./Reporters_and_Reports.md) to understand how logged data is consumed
- Review [Writing_Tests.md](./Writing_Tests.md) for practical examples

---

**Last Updated:** 2025-11-23
