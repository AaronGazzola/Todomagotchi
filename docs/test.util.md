# Test Utility File Examples

This document provides code examples for common test patterns used in this Playwright + Supabase project.

## Test Structure Example

```typescript
import { test, expect } from "./utils/test-fixtures";
import { TestId } from "../test.types";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.describe("Feature Name Tests", () => {
  test.beforeAll(async () => {
    await cleanupFunction();
  });

  test.afterAll(async () => {
    await cleanupFunction();
    await prisma.$disconnect();
  });

  test("should perform expected behavior", async ({ page, diagnostics }) => {
    await page.goto("/");
    await page.getByTestId(TestId.ELEMENT).click();
    await expect(page.getByTestId(TestId.RESULT)).toBeVisible({
      timeout: 10000,
    });
  });
});
```

**IMPORTANT:** Always import `test` and `expect` from `"./utils/test-fixtures"`, NOT from `"@playwright/test"`. The custom fixtures automatically capture diagnostic data.

## Navigation Patterns

### Direct Navigation

```typescript
await page.goto("/");
await page.goto("/page");
```

### Wait for URL Pattern

```typescript
await page.waitForURL(/\/pattern/, { timeout: 10000 });
await page.waitForURL("/path", {
  timeout: 10000,
  waitUntil: "domcontentloaded",
});
```

### Verify Current URL

```typescript
await expect(page).toHaveURL("/path", { timeout: 10000 });
```

## Element Interaction Patterns

### Fill Input

```typescript
await page.getByTestId(TestId.FORM_NAME).fill(name);
await page.getByTestId(TestId.FORM_EMAIL).fill(email);
```

### Click Button

```typescript
await page.getByTestId(TestId.SUBMIT_BUTTON).click();
await page.getByTestId(TestId.MENU_TRIGGER).click();
```

### Check Visibility

```typescript
await expect(page.getByTestId(TestId.ELEMENT)).toBeVisible({
  timeout: 10000,
});
```

### Wait for Button Visibility (Robust Pattern)

```typescript
import { waitForButtonVisibility } from "@/lib/test.utils";

const signInButtonVisible = await waitForButtonVisibility(
  page,
  TestId.NAV_SIGNIN_BUTTON,
  10000
);
if (!signInButtonVisible) {
  throw new Error("Sign in button not visible");
}
```

### Verify Text Content

```typescript
await expect(page.getByTestId(TestId.TEXT_ELEMENT)).toContainText(
  expectedText,
  { timeout: 10000 }
);
```

### Check Attributes

```typescript
const input = page.getByTestId(TestId.INPUT_FIELD);
await expect(input).toHaveAttribute("required", "");
await expect(input).toHaveAttribute("type", "password");
```

### Check Data Attributes for State

```typescript
const container = page.locator(`[data-testid="${TestId.RESULTS_CONTAINER}"]`);
await expect(container).toHaveAttribute("data-state", "nearby-fallback");
```

## Error Validation Patterns

### Check for Alert/Status Messages

```typescript
await expect(page.locator('role=alert, [role="status"]').first()).toBeVisible({
  timeout: 10000,
});
```

### Verify Toast Notifications

```typescript
await expect(page.getByTestId(TestId.TOAST_SUCCESS)).toBeVisible({
  timeout: 10000,
});

await expect(page.getByTestId(TestId.TOAST_ERROR)).toBeVisible({
  timeout: 10000,
});
```

## Async Handling Patterns

### Wait for Element Before Interaction

```typescript
await expect(page.getByTestId(TestId.INPUT_FIELD)).toBeVisible({
  timeout: 10000,
});
await page.getByTestId(TestId.INPUT_FIELD).fill(value);
```

### Wait for Navigation to Complete

```typescript
await page.getByTestId(TestId.SUBMIT_BUTTON).click();

await page.waitForURL("/destination", {
  timeout: 10000,
  waitUntil: "domcontentloaded",
});

await expect(page.getByTestId(TestId.SUCCESS_INDICATOR)).toBeVisible({
  timeout: 10000,
});
```

### Wait for Dynamic Content

```typescript
await page.getByTestId(TestId.TRIGGER_ELEMENT).click();

await expect(page.getByTestId(TestId.DYNAMIC_CONTENT)).toBeVisible({
  timeout: 10000,
});
```

## Database Cleanup Function Pattern

```typescript
async function cleanupTestData() {
  await prisma.childRecord.deleteMany({
    where: {
      parent: {
        email: {
          in: [TEST_EMAIL],
        },
      },
    },
  });

  await prisma.session.deleteMany({
    where: {
      user: {
        email: {
          in: [TEST_EMAIL],
        },
      },
    },
  });

  const testUser = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
    include: { relatedRecords: true },
  });

  if (testUser) {
    const recordIds = testUser.relatedRecords.map((r) => r.id);

    await prisma.dependentRecord.deleteMany({
      where: { parentId: { in: recordIds } },
    });

    await prisma.relatedRecord.deleteMany({
      where: { id: { in: recordIds } },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [TEST_EMAIL],
      },
    },
  });
}
```

**Cleanup Order:**

1. Child records that reference parent records
2. Session records associated with users
3. Query to find related records
4. Dependent records that reference related entities
5. Related records
6. Parent records

## Test Constants

```typescript
const TEST_EMAIL = "test@example.com";
const TEST_NAME = "Test User";
const TEST_VALUE = "test-value";
```

For unique values per test run:

```typescript
const uniqueId = `test-${Date.now()}@example.com`;
```

## Component with Data Attributes Example

```tsx
import { TestId } from "@/test.types";

export const SubscriptionCard = ({
  title,
  price,
  isPremium,
}: {
  title: string;
  price: number;
  isPremium: boolean;
}) => {
  return (
    <Card
      data-testid={
        isPremium
          ? TestId.SUBSCRIPTION_PREMIUM_CARD
          : TestId.SUBSCRIPTION_FREE_CARD
      }
    >
      <h3
        data-testid={
          isPremium
            ? TestId.SUBSCRIPTION_PREMIUM_TITLE
            : TestId.SUBSCRIPTION_FREE_TITLE
        }
      >
        {title}
      </h3>
      <p
        data-testid={
          isPremium
            ? TestId.SUBSCRIPTION_PREMIUM_PRICE
            : TestId.SUBSCRIPTION_FREE_PRICE
        }
      >
        ${price}
      </p>
      <Button
        data-testid={
          isPremium
            ? TestId.SUBSCRIPTION_PREMIUM_BUTTON
            : TestId.SUBSCRIPTION_FREE_BUTTON
        }
      >
        Subscribe
      </Button>
    </Card>
  );
};
```

## Component with State Data Attributes Example

```tsx
import { TestId } from "@/test.types";
import { useState } from "react";

export function MyComponent() {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      data-testid={TestId.FORM_CONTAINER}
      data-state={isEditing ? "editing" : "viewing"}
    >
      <Button
        data-testid={TestId.EDIT_BUTTON}
        data-state={isEditing ? "editing" : "viewing"}
        onClick={() => setIsEditing(!isEditing)}
      >
        {isEditing ? "Cancel" : "Edit"}
      </Button>
      {isEditing ? <EditForm /> : <ViewContent />}
    </div>
  );
}
```

## Test with State Data Attributes Example

```typescript
import { TestId } from "../test.types";

test("should toggle edit mode", async ({ page }) => {
  await page.goto("/page");

  const formContainer = page.locator(
    `[data-testid="${TestId.FORM_CONTAINER}"][data-state="viewing"]`
  );
  await expect(formContainer).toBeVisible({ timeout: 10000 });

  await page.getByTestId(TestId.EDIT_BUTTON).click();

  const editingContainer = page.locator(
    `[data-testid="${TestId.FORM_CONTAINER}"][data-state="editing"]`
  );
  await expect(editingContainer).toBeVisible({ timeout: 10000 });
});
```

## Test Utility Function with State Example

```typescript
export async function waitForFormState(
  page: Page,
  isEditing: boolean,
  timeout: number = 10000
): Promise<boolean> {
  try {
    const expectedState = isEditing ? "editing" : "viewing";
    await page.waitForSelector(
      `[data-testid="${TestId.FORM_CONTAINER}"][data-state="${expectedState}"]`,
      { timeout, state: "visible" }
    );
    return true;
  } catch {
    return false;
  }
}
```

## TestResultLogger Pattern

For tests with multiple verification points:

```typescript
import {
  TestResultLogger,
  logTestResult,
  formatTestConditions,
} from "@/lib/test.utils";
import * as fs from "fs";
import * as path from "path";

test.describe("Feature Tests", () => {
  const logger = new TestResultLogger("feature-name");

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

  test("should perform multiple checks", async ({ page }) => {
    const failures: string[] = [];

    logger.registerExpectedTest(
      "Check 1 - Element visible",
      formatTestConditions({ userType: "player", page: "home" }),
      "Element should be visible"
    );
    logger.registerExpectedTest(
      "Check 2 - Correct text",
      formatTestConditions({ userType: "player", page: "home" }),
      "Element should have correct text"
    );

    let elementVisible = false;
    try {
      await expect(page.getByTestId(TestId.ELEMENT)).toBeVisible({
        timeout: 10000,
      });
      elementVisible = true;
    } catch (error) {
      elementVisible = false;
    }

    await logTestResult(
      logger,
      page,
      "Check 1 - Element visible",
      formatTestConditions({ userType: "player", page: "home" }),
      "Element should be visible",
      elementVisible,
      "visible",
      "not found"
    );

    if (!elementVisible) {
      failures.push("Element not visible");
    }

    const elementText = await page.getByTestId(TestId.ELEMENT).textContent();
    const hasCorrectText = elementText === "Expected Text";

    await logTestResult(
      logger,
      page,
      "Check 2 - Correct text",
      formatTestConditions({ userType: "player", page: "home" }),
      "Element should have correct text",
      hasCorrectText,
      `text: ${elementText}`,
      `incorrect text: ${elementText}`
    );

    if (!hasCorrectText) {
      failures.push("Element has incorrect text");
    }

    if (failures.length > 0) {
      throw new Error(`Test failed: ${failures.join("; ")}`);
    }
  });
});
```

**Benefits:**

- Detailed failure info showing exactly which check failed
- Console output summary appears in README
- Logged Sub-Tests section in README with conditions, expectations, observations
- Automatic screenshot capture for failed checks
- Early exit handling with `registerExpectedTest()` + `finalizeUnreachedTests()`

## Test Report Generation Script

The `scripts/generate-test-report.ts` script consolidates test results:

**Features:**

- Parses test results from all test suites
- Generates consolidated report at `docs/test-reports/{timestamp}.md`
- Includes summary statistics and individual test results
- Supports both Playwright and Jest test results
- Cleanup mode removes old test results (keeps only latest per suite)

**Usage:**

```bash
npm run test:report           # Generate report
npm run test:report:cleanup   # Generate report and cleanup old results
```

**Report Structure:**

1. Summary section with overall statistics
2. Test Status Overview with icons
3. Detailed results for each test suite
4. Links to test result directories

## README.md Diagnostic Output Example

When a test fails, the README.md includes:

```md
### should display player cards with essential information

**File:** e2e/find-partners.spec.ts
**Duration:** 30151ms
**Status:** TIMEOUT

**Test Setup:**

- **User:** beginner.singles.casual.male.2000@test.com
- **Conditions:** skill=beginner, play=singles, session=casual, postcode=2000
- **Expected:** Display at least 2 player cards with names and skill levels
- **Observed:** Player cards did not appear within timeout period

**Execution Timeline:**

1. ✓ Navigate to /find-partners (1234ms)
2. ✓ Sign in as test user (2567ms)
3. ✓ Wait for preferences form (456ms)
4. ✗ Wait for player cards to appear (TIMEOUT at 10000ms) - locator.waitFor: Timeout 10000ms exceeded

**Error Message:**
```

Test timeout of 30000ms exceeded.

```

**Stack Trace:**
```

Error: Test timeout of 30000ms exceeded.
at Timeout.\_onTimeout (/path/to/test.ts:542:15)
at setPreferences (/path/to/test.ts:210:10)

```

**Browser Console Errors:**
```

[ERROR] Failed to fetch: GET /api/find-partners 500
Location: https://example.com/app.js:123
[ERROR] Uncaught TypeError: Cannot read property 'name' of undefined
Location: https://example.com/components/PlayerCard.js:45

```

**Network Failures:**

- **GET** https://api.example.com/find-partners
  - Status: 500 Internal Server Error
  - Response:
```

{
"error": "Database connection failed",
"details": "Connection timeout after 5000ms"
}

```

**DOM State at Failure:**

```

PlayersList [data-testid="players-list"][data-state="loading"]
LoadingSpinner [data-testid="loading-spinner"]
Text: "Finding players near you..."

````

**Artifacts:**

**Screenshots:**
- ![test-failed-1.png](test-failed-1.png)

**Trace Files:**
- trace.zip
  ```bash
  npx playwright show-trace test-results/2025-11-07_04-15-21-441_find-partners.spec/trace.zip
````

```

This comprehensive diagnostic output provides all the information needed to debug test failures without checking multiple files.
```
