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

## Complete Helper Functions Reference

All helper functions from `src/lib/test.utils.ts`:

### Element Interaction Functions

#### getElementByTestId

```typescript
async function getElementByTestId(page: Page, testId: TestId): Promise<Locator>;
```

Returns a Playwright locator for the element with the specified data-testid.

**Parameters:**

- `page` - Playwright Page object
- `testId` - TestId enum value

**Returns:** Locator object

**Example:**

```typescript
const button = await getElementByTestId(page, TestId.SUBMIT_BUTTON);
await expect(button).toBeVisible();
```

#### clickByTestId

```typescript
async function clickByTestId(page: Page, testId: TestId): Promise<void>;
```

Clicks an element identified by data-testid.

**Parameters:**

- `page` - Playwright Page object
- `testId` - TestId enum value

**Example:**

```typescript
await clickByTestId(page, TestId.SUBMIT_BUTTON);
```

#### fillByTestId

```typescript
async function fillByTestId(
  page: Page,
  testId: TestId,
  value: string
): Promise<void>;
```

Fills an input element identified by data-testid with the specified value.

**Parameters:**

- `page` - Playwright Page object
- `testId` - TestId enum value
- `value` - String value to fill

**Example:**

```typescript
await fillByTestId(page, TestId.EMAIL_INPUT, "test@example.com");
```

#### isVisibleByTestId

```typescript
async function isVisibleByTestId(
  page: Page,
  testId: TestId,
  timeout: number = 5000
): Promise<boolean>;
```

Checks if an element identified by data-testid is visible within the timeout period.

**Parameters:**

- `page` - Playwright Page object
- `testId` - TestId enum value
- `timeout` - Maximum wait time in milliseconds (default: 5000)

**Returns:** `true` if visible, `false` if not found or not visible within timeout

**Example:**

```typescript
const buttonVisible = await isVisibleByTestId(
  page,
  TestId.SUBMIT_BUTTON,
  10000
);
if (!buttonVisible) {
  throw new Error("Button not visible");
}
```

#### getTextByTestId

```typescript
async function getTextByTestId(page: Page, testId: TestId): Promise<string>;
```

Retrieves the text content of an element identified by data-testid.

**Parameters:**

- `page` - Playwright Page object
- `testId` - TestId enum value

**Returns:** Text content string, or empty string if element not found

**Example:**

```typescript
const heading = await getTextByTestId(page, TestId.PAGE_HEADING);
expect(heading).toBe("Welcome");
```

#### countByTestId

```typescript
async function countByTestId(page: Page, testId: TestId): Promise<number>;
```

Counts the number of elements with the specified data-testid.

**Parameters:**

- `page` - Playwright Page object
- `testId` - TestId enum value

**Returns:** Number of matching elements, or 0 if none found

**Example:**

```typescript
const cardCount = await countByTestId(page, TestId.PLAYER_CARD);
expect(cardCount).toBeGreaterThanOrEqual(2);
```

### Wait Functions

#### waitForElement

```typescript
async function waitForElement(
  page: Page,
  testId: TestId,
  timeout: number = 5000
): Promise<boolean>;
```

Waits for an element to appear in the DOM.

**Parameters:**

- `page` - Playwright Page object
- `testId` - TestId enum value
- `timeout` - Maximum wait time in milliseconds (default: 5000)

**Returns:** `true` if element appears, `false` if timeout

**Example:**

```typescript
const appeared = await waitForElement(page, TestId.SUCCESS_MESSAGE, 10000);
if (!appeared) {
  throw new Error("Success message did not appear");
}
```

#### waitForButtonVisibility

```typescript
async function waitForButtonVisibility(
  page: Page,
  testId: TestId,
  timeout: number = 10000
): Promise<boolean>;
```

Robust wait function specifically for buttons. Waits for element to be in DOM and visible.

**Parameters:**

- `page` - Playwright Page object
- `testId` - TestId enum value
- `timeout` - Maximum wait time in milliseconds (default: 10000)

**Returns:** `true` if button becomes visible, `false` if timeout

**Why more robust:**

- Waits for element to be in DOM first
- Then checks visibility with isVisibleByTestId
- Two-step verification reduces flakiness

**Example:**

```typescript
const signInButtonVisible = await waitForButtonVisibility(
  page,
  TestId.NAV_SIGNIN_BUTTON,
  10000
);
if (!signInButtonVisible) {
  throw new Error("Sign in button not visible");
}
```

#### waitForElementCount

```typescript
async function waitForElementCount(
  page: Page,
  testId: TestId,
  expectedCount: number,
  timeout: number = 10000
): Promise<boolean>;
```

Waits until exactly the expected number of elements with the specified testId exist.

**Parameters:**

- `page` - Playwright Page object
- `testId` - TestId enum value
- `expectedCount` - Exact number of elements expected
- `timeout` - Maximum wait time in milliseconds (default: 10000)

**Returns:** `true` if exact count reached, `false` if timeout

**Example:**

```typescript
const exactlyThree = await waitForElementCount(
  page,
  TestId.PLAYER_CARD,
  3,
  10000
);
if (!exactlyThree) {
  throw new Error("Expected exactly 3 player cards");
}
```

#### waitForMinimumElementCount

```typescript
async function waitForMinimumElementCount(
  page: Page,
  testId: TestId,
  minimumCount: number,
  timeout: number = 10000
): Promise<boolean>;
```

Waits until at least the minimum number of elements with the specified testId exist.

**Parameters:**

- `page` - Playwright Page object
- `testId` - TestId enum value
- `minimumCount` - Minimum number of elements required
- `timeout` - Maximum wait time in milliseconds (default: 10000)

**Returns:** `true` if minimum count reached, `false` if timeout

**Example:**

```typescript
const atLeastTwo = await waitForMinimumElementCount(
  page,
  TestId.PLAYER_CARD,
  2,
  10000
);
if (!atLeastTwo) {
  throw new Error("Expected at least 2 player cards");
}
```

#### waitForLoadingComplete

```typescript
async function waitForLoadingComplete(
  page: Page,
  timeout: number = 10000
): Promise<boolean>;
```

Waits for all loading indicators to disappear. Combines multiple strategies for robust loading detection.

**Parameters:**

- `page` - Playwright Page object
- `timeout` - Maximum wait time in milliseconds (default: 10000)

**Returns:** Always returns `true` (errors are caught internally)

**How it works:**

1. Waits for `networkidle` state (up to 5s)
2. Waits for elements with `data-testid*="loading"` to be hidden
3. Waits for all loading elements to be non-visible via checkVisibility()

**Example:**

```typescript
await page.goto("/dashboard");
await waitForLoadingComplete(page, 10000);

const contentVisible = await isVisibleByTestId(page, TestId.DASHBOARD_CONTENT);
expect(contentVisible).toBe(true);
```

#### waitForPreferencesFormEditMode

```typescript
async function waitForPreferencesFormEditMode(
  page: Page,
  isEditMode: boolean,
  timeout: number = 5000
): Promise<boolean>;
```

Custom state waiter for preferences form. Waits for form to enter editing or viewing state.

**Parameters:**

- `page` - Playwright Page object
- `isEditMode` - `true` for editing state, `false` for viewing state
- `timeout` - Maximum wait time in milliseconds (default: 5000)

**Returns:** `true` if state reached, `false` if timeout

**Example:**

```typescript
await clickByTestId(page, TestId.EDIT_PREFERENCES_BUTTON);
const inEditMode = await waitForPreferencesFormEditMode(page, true, 10000);
if (!inEditMode) {
  throw new Error("Form did not enter edit mode");
}
```

**State-based selector:**

```
[data-testid="${TestId.FIND_PARTNERS_PREFERENCES_FORM_STATE}"][data-state="editing"]
[data-testid="${TestId.FIND_PARTNERS_PREFERENCES_FORM_STATE}"][data-state="viewing"]
```

### Screenshot & Diagnostic Functions

#### captureFailureScreenshot

```typescript
async function captureFailureScreenshot(
  page: Page | null,
  testName: string
): Promise<string | undefined>;
```

Captures a full-page screenshot on test failure.

**Parameters:**

- `page` - Playwright Page object (or null to skip)
- `testName` - Name of the test (used in filename)

**Returns:** Screenshot path, or `undefined` if page is null

**Filename format:** `test-results/failures/{sanitized-testname}-{timestamp}.png`

**Example:**

```typescript
const screenshotPath = await captureFailureScreenshot(
  page,
  "Player Signup - Button visible"
);
```

**Note:** Typically called automatically by `logTestResult()`. Manual use only needed for custom scenarios.

#### checkForErrorToast

```typescript
async function checkForErrorToast(
  page: Page | null,
  timeout: number = 3000
): Promise<string | null>;
```

Searches for toast/alert messages on the page.

**Parameters:**

- `page` - Playwright Page object (or null to skip)
- `timeout` - Maximum wait time in milliseconds (default: 3000)

**Returns:** Toast text content, or `null` if no toast found

**Selectors searched (in order):**

```
[data-testid="toast-error"]
[data-testid="toast-success"]
[data-testid="toast-info"]
[role="status"]
[role="alert"]
```

**Example:**

```typescript
const toast = await checkForErrorToast(page, 5000);
if (toast) {
  console.log("Toast message:", toast);
}
```

**Note:** Typically called automatically by `logTestResult()`.

### Auth Helper Functions

#### generateUniqueEmail

```typescript
function generateUniqueEmail(baseEmail: string): string;
```

Generates a unique email by adding timestamp to the local part.

**Parameters:**

- `baseEmail` - Base email like "test@example.com"

**Returns:** Unique email like "test+1731328496789@example.com"

**Example:**

```typescript
const uniqueEmail = generateUniqueEmail("test@example.com");
```

#### signUpPlayer

```typescript
async function signUpPlayer(page: Page, user: AuthTestUser): Promise<void>;
```

Complete player signup flow helper.

**Parameters:**

- `page` - Playwright Page object
- `user` - User object with email, password, fullName, location, skillLevel, utrRating

**Example:**

```typescript
await signUpPlayer(page, {
  email: "player@example.com",
  password: "Test123!",
  fullName: "Test Player",
  location: "Sydney NSW",
  skillLevel: "intermediate",
  utrRating: "8.5",
});
```

#### signIn

```typescript
async function signIn(
  page: Page,
  email: string,
  password: string
): Promise<void>;
```

Complete sign-in flow helper.

**Parameters:**

- `page` - Playwright Page object
- `email` - User email
- `password` - User password

**Example:**

```typescript
await signIn(page, "test@example.com", "Test123!");
```

#### signOut

```typescript
async function signOut(page: Page): Promise<void>;
```

Complete sign-out flow helper.

**Parameters:**

- `page` - Playwright Page object

**Example:**

```typescript
await signOut(page);
```

### TestResultLogger Helper Functions

#### formatTestConditions

```typescript
function formatTestConditions(
  conditions: Record<string, string | number | boolean>
): string;
```

Converts conditions object to formatted string.

**Parameters:**

- `conditions` - Object with key-value pairs

**Returns:** String in format "key=value, key=value, ..."

**Example:**

```typescript
const conditions = formatTestConditions({
  userType: "player",
  authState: "authenticated",
  page: "home",
});
```

#### logTestResult

```typescript
async function logTestResult(
  logger: TestResultLogger,
  page: Page | null,
  testName: string,
  conditions: string,
  expectation: string,
  passed: boolean,
  observedSuccess: string,
  observedFailure: string
): Promise<void>;
```

Convenience wrapper for logging test results with automatic screenshot and toast capture.

**Parameters:**

- `logger` - TestResultLogger instance
- `page` - Playwright Page object (or null)
- `testName` - Name of the verification
- `conditions` - Test conditions string (from formatTestConditions)
- `expectation` - What should happen
- `passed` - Whether the test passed
- `observedSuccess` - Message if passed
- `observedFailure` - Message if failed

**Automatic actions on failure:**

1. Captures full-page screenshot
2. Checks for error toast
3. Logs result with all data

**Example:**

```typescript
const buttonVisible = await isVisibleByTestId(page, TestId.SUBMIT_BUTTON);

await logTestResult(
  logger,
  page,
  "Submit Button Visibility",
  formatTestConditions({ userType: "player", page: "signup" }),
  "Submit button should be visible",
  buttonVisible,
  "Button visible",
  "Button not found"
);

if (!buttonVisible) {
  throw new Error("Submit button not visible");
}
```

## State-Based Testing Patterns

### Creating Custom State Waiters

Pattern for creating state-specific wait functions:

```typescript
export async function waitForCustomState(
  page: Page,
  stateValue: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(
      `[data-testid="${TestId.COMPONENT}"][data-state="${stateValue}"]`,
      { timeout, state: "visible" }
    );
    return true;
  } catch {
    return false;
  }
}
```

**Usage:**

```typescript
await waitForCustomState(page, "loading", 5000);
await waitForCustomState(page, "success", 5000);
```

### Best Practices for data-state Attributes

**1. Use clear, consistent state names:**

```typescript
data-state="loading"    ✓
data-state="loaded"     ✓
data-state="error"      ✓

data-state="state1"     ✗ (unclear)
data-state="true"       ✗ (use specific names)
```

**2. Expose state on container element:**

```tsx
<div
  data-testid={TestId.FORM_CONTAINER}
  data-state={isEditing ? "editing" : "viewing"}
>
  {content}
</div>
```

**3. Create helper for common states:**

```typescript
type FormState = "viewing" | "editing" | "saving" | "error";

export async function waitForFormState(
  page: Page,
  state: FormState,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(
      `[data-testid="${TestId.FORM_CONTAINER}"][data-state="${state}"]`,
      { timeout, state: "visible" }
    );
    return true;
  } catch {
    return false;
  }
}
```

**4. Test all state transitions:**

```typescript
test("should transition through all states", async ({ page }) => {
  await expect(page.locator(`[data-state="viewing"]`)).toBeVisible();

  await clickByTestId(page, TestId.EDIT_BUTTON);
  await waitForFormState(page, "editing");

  await clickByTestId(page, TestId.SAVE_BUTTON);
  await waitForFormState(page, "saving");
  await waitForFormState(page, "viewing", 10000);
});
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
