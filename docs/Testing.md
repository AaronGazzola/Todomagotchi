# Testing

This document provides guidance for testing in this repository.

## Core Technologies

- **Playwright** - End-to-end testing framework
- **Jest** - Unit testing framework
- **PrismaClient** - Direct database access for setup/teardown
- **TypeScript** - Type-safe test implementation
- **Custom Reporters** - Consolidated and minimal reporters for test output

## General Rules

### Rule 1: Synchronize Test Changes with Documentation

Every time a test is changed, the corresponding test in `docs/Tests.md` **must** be updated to match.

### Rule 2: Always Prefer Data Attributes

Always prefer `data-testid` attributes to select HTML elements in e2e tests. Never use CSS selectors, role selectors, or text content.

### Rule 2a: Never Read Text Content - Only Use Data Attributes

Tests must **never** read text content from elements. All information needed by tests must be exposed through data attributes (`data-testid`, `data-state`, etc.).

### Rule 3: Share Data Attribute Values

Data attribute values **must** be imported into the test and the component from the shared `test.types.ts` file.

### Rule 3a: Use State Data Attributes for Dynamic UI States

Use `data-state` attributes to expose element states for testing (e.g., `data-state="editing"` vs `data-state="viewing"`).

### Rule 4: Always Prefer Timeouts Over Hard-Coded Waits

**GLOBAL TIMEOUT STANDARD: All timeouts in tests must be set to 10 seconds (10000ms).**

### Rule 5: Isolate Test Data

Each test must clean up its own data and not interfere with other tests using `beforeAll` and `afterAll` hooks.

### Rule 6: Use Descriptive Test Names

Test names should describe the behavior being tested, starting with "should".

### Rule 7: Never Take Manual Screenshots

Playwright automatically captures screenshots on failure - never use `page.screenshot()` manually.

### Rule 8: Fail Immediately on First Assertion Failure

Tests must fail fast at the first assertion failure - never collect failures in an array.

### Rule 9: Use Minimum Required Workers

Tests must specify the minimum number of workers required. If a test only needs one worker, explicitly set `workers: 1` in the test configuration. This prevents unnecessary parallelization and ensures predictable test execution.

## Test File Structure

### File Organization

```
project/
├── e2e/
│   ├── feature1.spec.ts
│   ├── feature2.spec.ts
│   └── utils/
│       ├── test-cleanup.ts
│       ├── test-fixtures.ts
│       └── consolidated-reporter.ts
├── __tests__/
│   └── unit-test.test.ts
├── test.types.ts
├── playwright.config.ts
└── docs/
    ├── Testing.md
    ├── test.util.md
    └── Tests.md
```

### Test Types File

All test IDs must be defined in `test.types.ts`:

```typescript
export enum TestId {
  FORM_EMAIL_INPUT = "form-email-input",
  FORM_PASSWORD_INPUT = "form-password-input",
  FORM_SUBMIT_BUTTON = "form-submit-button",
}
```

## Testing Patterns

### Data Attribute System

- `data-testid` - Identifies the element
- `data-state` - Identifies the current state of the element

For detailed examples of test patterns, see [`docs/test.util.md`](test.util.md).

## Test Logging System Architecture

This repository uses a custom test logging infrastructure that provides granular sub-test tracking, automatic failure diagnostics, and comprehensive test reporting beyond standard Playwright capabilities.

### Overview

The logging system consists of three main components:

1. **TestResultLogger** - Tracks multiple verification points (sub-tests) within a single Playwright test
2. **Test Fixtures** - Automatically captures diagnostics (console logs, network failures, page errors)
3. **Reporters** - Generates comprehensive README.md files with detailed failure information

### Why Use Custom Logging?

**Standard Playwright limitations:**

- Single pass/fail per test
- Limited diagnostic context for complex multi-step tests
- No built-in support for tracking verification points within a test

**Custom logging benefits:**

- Track 5-10+ verification points in a single test
- Automatic early-exit detection (knows which checks were skipped)
- Rich diagnostic data (screenshots, console errors, network failures, DOM state)
- Human-readable README.md reports
- Sub-test granularity in console output

### Component Relationships

```
Test Execution Flow:
┌─────────────────────────────────────────────────────────────┐
│ Playwright Test (e2e/auth.spec.ts)                         │
│                                                             │
│  1. logger.registerExpectedTest(...)  ←─ Pre-register      │
│  2. Execute test step                                       │
│  3. Capture result (try/catch)                             │
│  4. logTestResult(logger, ...)        ←─ Log result         │
│  5. Throw error if failed                                   │
│  6. Repeat steps 2-5                                        │
│  7. test.afterAll(() => {                                   │
│       logger.finalizeUnreachedTests() ←─ Mark unreached     │
│       fs.writeFileSync(afterall-call-*.json)               │
│     })                                                      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Test Fixtures (e2e/utils/test-fixtures.ts)                 │
│                                                             │
│  - Automatically captures:                                  │
│    • Console logs (with location)                          │
│    • Page errors (with stack traces)                       │
│    • Network failures (status 400+, response body)         │
│  - Attaches diagnostic-data as JSON to test results        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Consolidated Reporter (e2e/utils/consolidated-reporter.ts) │
│                                                             │
│  1. Reads diagnostic-data attachments                      │
│  2. Reads afterall-call-*.json (TestResultLogger output)   │
│  3. Copies screenshots/traces to TEST_RUN_ID directory      │
│  4. Generates:                                              │
│     - test-report.json (structured data)                   │
│     - README.md (human-readable report)                    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Output: test-results/YYYY-MM-DD_HHMMSS-mmm_testname/       │
│  ├── README.md          ←─ Comprehensive failure analysis  │
│  ├── test-report.json   ←─ Structured test data            │
│  ├── screenshot-1.png   ←─ Failure screenshots             │
│  └── trace.zip          ←─ Debug traces                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐
│  Test Code   │
└──────┬───────┘
       │
       ├─→ logTestResult() ──→ TestResultLogger.log()
       │                             │
       │                             ├─→ Captures screenshot (if failed)
       │                             ├─→ Checks for error toast
       │                             └─→ Stores in logs array
       │
       └─→ test.afterAll() ──→ logger.getSerializableData()
                                      │
                                      └─→ fs.writeFileSync(afterall-call-*.json)

┌──────────────────┐
│  Test Fixtures   │
└─────────┬────────┘
          │
          ├─→ page.on('console') ──→ consoleLogs.push()
          ├─→ page.on('pageerror') ──→ pageErrors.push()
          ├─→ page.on('response') ──→ networkFailures.push() (if 400+)
          │
          └─→ test.info().attach('diagnostic-data', { body: JSON.stringify(...) })

┌──────────────────────────┐
│  Consolidated Reporter   │
└──────────┬───────────────┘
           │
           ├─→ Reads test.info().attachments (diagnostic-data)
           ├─→ Reads afterall-call-*.json files
           ├─→ Extracts user/preferences from test title (hard-coded patterns)
           │
           └─→ Generates README.md with:
                  - Test Setup (user, conditions, expected, observed)
                  - Execution Timeline
                  - Browser Console Errors
                  - Network Failures
                  - DOM State at Failure
                  - Failed Sub-Tests (from TestResultLogger)
                  - Artifacts (screenshots, traces)
```

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

**Example comparison:**

```typescript
await expect(page.getByTestId(TestId.BUTTON)).toBeVisible();

const buttonVisible = await isVisibleByTestId(page, TestId.BUTTON);
await logTestResult(
  logger,
  page,
  "Button Visibility Check",
  formatTestConditions({ page: "home", userType: "player" }),
  "Button should be visible",
  buttonVisible,
  "Button visible",
  "Button not found"
);
if (!buttonVisible) {
  throw new Error("Button not visible");
}
```

The second approach provides:

- Screenshot on failure
- Error toast detection
- Conditions/expectation/observed in report
- Sub-test tracking

### TestResultLogger Usage Guide

#### Complete API Reference

**TestResultLogger Class:**

```typescript
constructor(testSuiteName: string = 'default')
```

Creates a new logger instance and auto-registers it with TestLoggerRegistry.

**Methods:**

```typescript
registerExpectedTest(testName: string, conditions: string, expectation: string): void
```

Pre-registers a test that should execute. Used for early-exit detection. Call this at the START of your test for each verification point, before execution.

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

Records a test result. Conditions/expectation/observed are only stored if `passed = false` (optimization for passed tests).

```typescript
finalizeUnreachedTests(): void
```

Marks all registered but unexecuted tests as failures with observed = "Test did not execute - previous assertion failed". **MUST** be called in `test.afterAll()`.

```typescript
getStats(): { total: number; passed: number; failed: number }
```

Returns test statistics (only counts first failure, consistent with early-exit behavior).

```typescript
getSummary(): string
```

Returns formatted summary string with first failed test details.

```typescript
getSerializableData(): { stats, tests, testSuiteName }
```

Returns JSON-serializable data for writing to afterall-call-\*.json files.

**Helper Functions:**

```typescript
formatTestConditions(conditions: Record<string, string | number | boolean>): string
```

Converts object to "key=value, key=value" format.

Example:

```typescript
formatTestConditions({
  userType: "player",
  page: "home",
  authState: "authenticated",
});
```

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

#### Step-by-Step Workflow

**1. Create logger in test.describe:**

```typescript
import {
  TestResultLogger,
  formatTestConditions,
  logTestResult,
} from "@/lib/test.utils";
import * as fs from "fs";
import * as path from "path";

test.describe("Feature Tests", () => {
  const logger = new TestResultLogger("feature-name");
});
```

**2. Set up afterAll hook:**

```typescript
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
});
```

**3. In each test, register expected tests at the START:**

```typescript
test("should complete signup flow", async ({ page }) => {
  logger.registerExpectedTest(
    "Signup - Create Account visible",
    formatTestConditions({
      userType: "new player",
      action: "clicked signup link",
    }),
    "Create Account text visible"
  );
  logger.registerExpectedTest(
    "Signup - Redirect to home",
    formatTestConditions({ userType: "new player", action: "submitted form" }),
    "Redirects to home (/)"
  );
  logger.registerExpectedTest(
    "Signup - Sign out button visible",
    formatTestConditions({ userType: "player", authState: "authenticated" }),
    "Sign Out button visible"
  );
});
```

**4. Execute test steps and log results:**

```typescript
await page.goto("/auth");
await clickByTestId(page, TestId.AUTH_SIGNUP_LINK);

let createAccountVisible = false;
try {
  await expect(
    await getElementByTestId(page, TestId.AUTH_CREATE_ACCOUNT_HEADING)
  ).toBeVisible({ timeout: 10000 });
  createAccountVisible = await isVisibleByTestId(
    page,
    TestId.AUTH_CREATE_ACCOUNT_HEADING
  );
} catch (error) {
  createAccountVisible = false;
}

await logTestResult(
  logger,
  page,
  "Signup - Create Account visible",
  formatTestConditions({
    userType: "new player",
    action: "clicked signup link",
  }),
  "Create Account text visible",
  createAccountVisible,
  "visible",
  "not found"
);

if (!createAccountVisible) {
  throw new Error("Create Account not visible");
}
```

**5. Repeat for each verification point**

#### Early Exit Handling Pattern

The key to proper early-exit detection:

1. **Register ALL expected tests at the start** (before ANY execution)
2. **Log results as you execute**
3. **Throw error immediately on first failure**
4. **Call `finalizeUnreachedTests()` in afterAll**

```typescript
test("should have early exit detection", async ({ page }) => {
  logger.registerExpectedTest("Check 1", "conditions", "expectation");
  logger.registerExpectedTest("Check 2", "conditions", "expectation");
  logger.registerExpectedTest("Check 3", "conditions", "expectation");

  let check1Passed = false;
  try {
    await someAssertion1();
    check1Passed = true;
  } catch (error) {
    check1Passed = false;
  }

  await logTestResult(
    logger,
    page,
    "Check 1",
    "conditions",
    "expectation",
    check1Passed,
    "pass",
    "fail"
  );

  if (!check1Passed) {
    throw new Error("Check 1 failed");
  }
});
```

If Check 1 fails and throws, the test exits early. Check 2 and Check 3 never execute. In `afterAll`, `finalizeUnreachedTests()` will mark them as:

```
✗ Check 2 - Observed: "Test did not execute - previous assertion failed"
✗ Check 3 - Observed: "Test did not execute - previous assertion failed"
```

This provides clear visibility into which checks were skipped.

#### Screenshot & Toast Capture

**Automatic (via logTestResult):**

```typescript
await logTestResult(logger, page, ...);
```

Automatically captures:

- Full-page screenshot (saved to `test-results/failures/testname-timestamp.png`)
- Error toast text (searches for `[role="status"]`, `[role="alert"]`, and specific testIds)

**Manual screenshot:**

```typescript
import { captureFailureScreenshot } from "@/lib/test.utils";

const screenshotPath = await captureFailureScreenshot(page, "custom-test-name");
logger.log(testName, conditions, expectation, observed, false, screenshotPath);
```

**Toast detection selectors:**

```typescript
[data-testid="toast-error"]
[data-testid="toast-success"]
[data-testid="toast-info"]
[role="status"]
[role="alert"]
```

#### JSON Output Format

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

**Note:** Only failed test details are included (conditions, expectation, observed). Passed tests are minimal.

#### Integration with Reporters

The consolidated reporter reads these JSON files and includes them in the README.md under "Failed Sub-Tests" section:

```markdown
## Failed Sub-Tests

### 1. Signup - Create Account visible

**Conditions:** userType=new player, action=clicked signup link
**Expected:** Create Account text visible
**Observed:** not found
**Screenshot:** signup-create-account-1731328496789.png
**Error Toast:** Email is required
```

### Test Fixtures & Diagnostics

#### Why Custom test/expect Imports?

**CRITICAL RULE:** Always import `test` and `expect` from `"./utils/test-fixtures"`, NOT from `"@playwright/test"`.

```typescript
import { test, expect } from "./utils/test-fixtures";
```

**Why this is required:**

- The custom fixtures extend Playwright's test fixture with automatic diagnostic capture
- Diagnostics are attached to test results and consumed by the consolidated reporter
- Without custom fixtures, README.md will miss console logs, network failures, and page errors

**What breaks if you import from @playwright/test:**

- No automatic console log capture
- No network failure tracking
- No page error tracking
- README.md "Browser Console Errors" section will be empty
- README.md "Network Failures" section will be empty

#### Automatic Diagnostic Capture

The test-fixtures.ts file automatically captures:

**1. Console Logs:**

```typescript
page.on("console", async (msg) => {
  consoleLogs.push({
    type: msg.type(),
    text: msg.text(),
    timestamp: new Date().toISOString(),
    location: msg.location() || undefined,
  });
});
```

Captures ALL console messages (log, warn, error, info, debug) with:

- Message type and text
- Timestamp
- Source location (file:line:column)

**2. Page Errors:**

```typescript
page.on("pageerror", (error) => {
  pageErrors.push({
    message: error.message,
    stack: error.stack || undefined,
    timestamp: new Date().toISOString(),
  });
});
```

Captures uncaught JavaScript errors with stack traces.

**3. Network Failures:**

```typescript
page.on("response", async (response) => {
  if (response.status() >= 400) {
    let responseBody: string | undefined;
    try {
      const contentType = response.headers()["content-type"] || "";
      if (contentType.includes("application/json")) {
        responseBody = JSON.stringify(await response.json(), null, 2);
      } else if (contentType.includes("text/")) {
        responseBody = await response.text();
      }
    } catch (e) {
      responseBody = undefined;
    }

    networkFailures.push({
      url: response.url(),
      method: response.request().method() as
        | "GET"
        | "POST"
        | "PUT"
        | "DELETE"
        | "PATCH",
      status: response.status(),
      statusText: response.statusText(),
      responseBody,
      timestamp: new Date().toISOString(),
    });
  }
});
```

Captures HTTP responses with status 400+ including:

- URL, method, status, status text
- Response body (parsed JSON or text)
- Timestamp

#### Diagnostic Data Structure

```typescript
interface DiagnosticData {
  consoleLogs: Array<{
    type: "log" | "warn" | "error" | "info" | "debug";
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
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
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

#### How Diagnostics are Attached

On test failure, the fixture automatically attaches diagnostic data:

```typescript
await test.info().attach("diagnostic-data", {
  body: JSON.stringify(diagnosticData, null, 2),
  contentType: "application/json",
});
```

The consolidated reporter reads this attachment and includes it in README.md.

#### Performance Considerations

**Overhead:**

- Console log capture: Minimal (in-memory array push)
- Network failure capture: Low (only captures 400+ responses, parses body lazily)
- Page error capture: Minimal

**Memory:**

- Diagnostics stored in memory during test execution
- Cleared after each test
- Large response bodies may increase memory usage

**Recommendations:**

- Diagnostics are lightweight for typical tests
- If test involves 1000+ console logs or large response bodies, consider filtering
- No action needed for normal test scenarios

### Reporter Architecture

#### Consolidated Reporter Deep Dive

The consolidated reporter (`e2e/utils/consolidated-reporter.ts`) is a custom Playwright reporter that generates comprehensive test reports.

**Key Features:**

1. TEST_RUN_ID synchronization
2. Dual output format (JSON + README.md)
3. Automatic artifact copying
4. Hard-coded extractor patterns
5. Summary mode support

#### TEST_RUN_ID Synchronization System

**Format:** `YYYY-MM-DD_HHMMSS-mmm_testname`

Example: `2025-11-11_12-34-56-789_auth.spec`

**How it works:**

1. Reporter generates TEST_RUN_ID in `onBegin()`:

```typescript
const timestamp = new Date()
  .toISOString()
  .replace(/T/, "_")
  .replace(/:/g, "-")
  .replace(/\..+/, "")
  .split("Z")[0];
const milliseconds = new Date().getMilliseconds().toString().padStart(3, "0");
const testFileName =
  suite.allTests()[0]?.location.file.split("/").pop()?.replace(".ts", "") ||
  "unknown";
const testRunId = `${timestamp.split(".")[0]}-${milliseconds}_${testFileName}`;
```

2. Sets environment variable:

```typescript
process.env.TEST_RUN_ID = testRunId;
```

3. Playwright config reads TEST_RUN_ID for output directory:

```typescript
outputDir: process.env.TEST_RUN_ID
  ? `test-results/${process.env.TEST_RUN_ID}`
  : 'test-results/default',
```

**Result:** Single directory contains:

- Screenshots
- Traces
- Videos
- README.md
- test-report.json

#### Dual Output Format

**1. test-report.json:**

Complete structured data for programmatic consumption:

```json
{
  "testSuiteName": "Auth Tests",
  "startTime": "2025-11-11T12:34:56.789Z",
  "endTime": "2025-11-11T12:35:12.345Z",
  "duration": 15556,
  "summary": {
    "total": 3,
    "passed": 2,
    "failed": 1,
    "skipped": 0
  },
  "tests": [
    {
      "title": "should complete player signup",
      "status": "failed",
      "duration": 5123,
      "error": "Button not visible",
      "errorStack": "Error: Button not visible\n  at...",
      "screenshots": ["screenshot-1.png"],
      "traces": ["trace.zip"],
      "videos": []
    }
  ]
}
```

**2. README.md:**

Human-readable report with sections:

- Summary
- Failed Tests (with comprehensive diagnostics)
- Failed Sub-Tests (from TestResultLogger)
- All Tests (status list)

See `docs/test.util.md` lines 507-584 for complete README.md example.

#### Hard-coded Extractors

The reporter includes hard-coded functions to extract test metadata from test titles. This is a **known maintenance burden** but provides rich context in reports.

**Extractor Functions:**

```typescript
function extractUser(test: TestCase): string | undefined;
```

Searches test title for email patterns like `email=${email}` or hardcoded test user emails.

**Supported patterns:**

- `email=test@example.com`
- `beginner.singles.casual.male.2000@test.com` (finds in title)

**Returns:** Email string or undefined

```typescript
function extractPreferences(test: TestCase): string | undefined;
```

Searches test title for preference patterns.

**Supported patterns:**

- `skill=beginner`
- `play=singles`
- `session=casual`
- `postcode=2000`

**Returns:** Comma-separated string like "skill=beginner, play=singles" or undefined

```typescript
function extractExpected(test: TestCase, result: TestResult): string;
```

Maps test title keywords to expected outcomes.

**Examples:**

- Title contains "should display player cards" → Expected: "Display player cards"
- Title contains "should show error" → Expected: "Display error message"

**Returns:** Expected outcome string

```typescript
function extractObserved(
  test: TestCase,
  result: TestResult,
  status: string
): string;
```

Generates observed outcome based on status and error message.

**Logic:**

- If passed: Extracts success message from title
- If failed: Parses error message for specific failure details

**Returns:** Observed outcome string

**Maintenance Notes:**

To add support for new test title patterns:

1. Update `extractUser()` to recognize new email patterns
2. Update `extractPreferences()` to recognize new preference keys
3. Update `extractExpected()` keyword mapping
4. Update `extractObserved()` error message parsing

**Location in code:** `e2e/utils/consolidated-reporter.ts` lines ~100-250

**Future Enhancement:** Consider replacing hard-coded extractors with test metadata:

```typescript
test("should display cards", async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: "user", description: "test@example.com" });
  testInfo.annotations.push({
    type: "conditions",
    description: "skill=beginner",
  });
});
```

#### Artifact Handling

The reporter automatically copies artifacts to the output directory:

**1. Screenshots:**

```typescript
const screenshotAttachments = result.attachments.filter((a) =>
  a.contentType.startsWith("image/")
);
for (const screenshot of screenshotAttachments) {
  const screenshotName = path.basename(screenshot.path!);
  fs.copyFileSync(screenshot.path!, path.join(outputDir, screenshotName));
}
```

**2. Traces:**

```typescript
const traceAttachments = result.attachments.filter((a) =>
  a.name?.includes("trace")
);
for (const trace of traceAttachments) {
  const traceName = path.basename(trace.path!);
  fs.copyFileSync(trace.path!, path.join(outputDir, traceName));
}
```

**3. Videos:**

```typescript
const video = result.attachments.find((a) => a.name === "video");
if (video?.path) {
  fs.copyFileSync(video.path, path.join(outputDir, "video.webm"));
}
```

**File Naming:**

- Screenshots: `screenshot-1.png`, `screenshot-2.png`, ...
- Traces: `trace.zip`
- Videos: `video.webm`

#### Summary Mode (TEST_SUMMARY_ONLY)

When `TEST_SUMMARY_ONLY=true` environment variable is set:

**Behavior:**

1. Suppresses verbose Playwright output
2. Prints formatted one-line-per-test output:

```
Running 6 tests using 1 worker

  ✓  1 …lete full player flow: signup -> signout -> signin (5.0s)
  ✓  2 … › should show error for invalid login credentials (1.2s)
  ✗  3 … › should update UI after signout (TIMEOUT after 30.0s)
```

3. Includes TestResultLogger summary at end

**How it works:**

```typescript
if (process.env.TEST_SUMMARY_ONLY === "true") {
  const status = result.status === "passed" ? "✓" : "✗";
  const duration = (result.duration / 1000).toFixed(1);
  const title = test.title.slice(0, 40);
  console.log(`  ${status}  ${testNumber} …${title} (${duration}s)`);
}
```

**When to use:**

- CI/CD pipelines (cleaner output)
- Local development (less noise)
- Debugging specific tests

**How to enable:**

```bash
TEST_SUMMARY_ONLY=true npm run test:e2e
```

#### Minimal Reporter vs Consolidated Reporter

**Consolidated Reporter:**

- Full README.md generation
- Includes all diagnostic data
- Copies artifacts
- Hard-coded extractors
- Used for: Standard test runs, CI/CD, comprehensive reports

**Minimal Reporter:**

- Sub-test summary only
- Reads afterall-call-\*.json files
- Prints aggregated sub-test results
- Cleanup mode (deletes JSON files after reading)
- Used for: Quick sub-test overview, debugging TestResultLogger

**Configuration (playwright.config.ts):**

```typescript
reporter: [
  ['./e2e/utils/consolidated-reporter.ts'],
],
```

To switch to minimal reporter:

```typescript
reporter: [
  ['./e2e/utils/minimal-reporter.ts'],
],
```

**Minimal reporter output example:**

```
Sub-Test Results:

  ✓ 001 …Player Signup - Create Account visible
  ✓ 002 …Player Signup - Redirect to home
  ✗ 003 …Player Signup - Sign out button visible
  ✗ 004 …Player Signout - Redirect to home (Test did not execute)

4 sub-tests | 2 passed | 2 failed

Failed Assertions:
  003. Player Signup - Sign out button visible
    Conditions: userType=player, authState=authenticated
    Expected: Sign Out button visible
    Observed: not found
```

## Database Testing

### Database Seeding

**Command:** `npm run seed`

- Seeds database with test data required for e2e tests
- Creates test user accounts (players and coaches)
- Must be run once before running e2e tests

**Critical Rules for Seed Scripts:**

1. Seed scripts are ONLY run after complete database reset
2. Use `insert()` operations, NOT `upsert()`
3. Every operation must check for errors and throw immediately
4. All seed data MUST be sourced from `scripts/seed-data.ts`

### Direct PrismaClient Usage

Tests use direct PrismaClient instantiation:

```typescript
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
```

**Important:** Create one instance per test file, disconnect only in `test.afterAll()`.

### Cleanup Patterns

For reusable cleanup functions, see `e2e/utils/test-cleanup.ts`. For test-specific cleanup, follow cascade deletion patterns in [`docs/test.util.md`](test.util.md).

## Test Execution

### Running Tests

**All tests:**

```bash
npm run test:e2e
```

**Specific suite:**

```bash
npm run test:e2e:partners
npm run test:e2e:auth
```

**Headed mode (visible browser):**

```bash
npm run test:e2e:partners:headed
```

**Trace mode (full debugging):**

```bash
npm run test:e2e:partners:trace
```

### Test Execution Modes

- **Standard Mode (Default):** Headless, screenshots on failure, traces on first retry
- **Headed Mode (`:headed`):** Browser window visible, screenshots on failure
- **Trace Mode (`:trace`):** Full trace + video for ALL tests, best for debugging

### Viewing Trace Files

```bash
npx playwright show-trace test-results/{timestamp}_testname.spec/artifacts/trace.zip
```

## Test Results and Reporting

### Test Report Generation

**Command:** `npm run test:report`

Generates a consolidated test report from all test results.

**Command:** `npm run test:report:cleanup`

Generates report and cleans up old test results (keeps only latest per suite).

### Output Directory Structure

```
test-results/
└── {TEST_RUN_ID}/              # e.g., "2024-11-06_143022-789_auth.spec"
    ├── test-report.json        # Complete structured test data
    ├── README.md               # Human-readable summary
    ├── screenshot-1.png        # Failure screenshots (if any)
    └── trace-1.zip             # Debug traces (if any)
```

### TEST_RUN_ID Generation

Format: `YYYY-MM-DD_HHMMSS-mmm_testname`

Single directory per test run, synchronized between Playwright and consolidated reporter.

### test-report.json Format

Contains complete test data with:

- Summary statistics (total, passed, failed, skipped, duration)
- Individual test results with status, duration, errors
- Conditional fields (error, errorStack, screenshots, traces, videos)

### README.md Format

Human-readable summary with:

1. Header (timestamp, duration)
2. Summary (test counts with emoji indicators)
3. Failed Tests (with full diagnostic data)
4. All Tests (status list)

**Diagnostic Data for Failed Tests:**

- Test title, file path, duration
- Error message and stack trace
- Test setup (conditions, expected, observed)
- Execution timeline (step-by-step with durations)
- Browser console errors
- Network failures
- DOM state at failure
- Screenshots and trace files

For detailed reporting examples, see [`docs/test.util.md`](test.util.md).

## Configuration

### Environment Variables

Required in `.env` and `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_MAPBOX_PUBLIC_TOKEN`
- `STRIPE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Playwright Configuration

- **Base URL:** `http://localhost:3000`
- **Test Directory:** `./e2e`
- **Workers:** 1 in CI, `undefined` (optimal) locally
- **Retries:** 2 in CI, 0 locally
- **Screenshots:** Only on failure
- **Traces:** On first retry (standard mode) or all tests (trace mode)
- **Timeout:** 120000ms (2 minutes) for both test execution and web server startup

### Worker Configuration

The default configuration uses:

```typescript
workers: process.env.CI ? 1 : undefined;
```

Individual tests can override this by specifying workers in their configuration:

```typescript
test.describe.configure({ workers: 1 });

test("should execute with single worker", async ({ page }) => {
  // Test implementation
});
```

Use `workers: 1` when:

- Tests modify shared state (database, files, etc.)
- Tests require sequential execution
- Tests have race condition concerns
- Tests are already isolated and parallelization adds no benefit

## Test Documentation

All test cases are documented in [`docs/Tests.md`](Tests.md) with:

- Test Index (numbered list with links and commands)
- Test sections for each feature
- Pass conditions for each test case

## Example Patterns

For complete code examples of:

- Test structure and setup
- Navigation patterns
- Element interaction patterns
- Error validation patterns
- Async handling patterns
- Cleanup functions
- Diagnostic data capture
- TestResultLogger usage

See [`docs/test.util.md`](test.util.md).
