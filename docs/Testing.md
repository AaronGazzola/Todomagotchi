# Testing Pattern and Strategy

This document provides comprehensive instructions for writing tests using a universal testing methodology.

## Table of Contents

1. [Testing Architecture](#testing-architecture)
2. [Testing Rules](#testing-rules)
3. [Data Attribute System](#data-attribute-system)
4. [Database Testing Patterns](#database-testing-patterns)
5. [Test Implementation Patterns](#test-implementation-patterns)
6. [Test Execution](#test-execution)
7. [Test Results and Reporting](#test-results-and-reporting)
8. [Adding New Tests](#adding-new-tests)
9. [Tests.md Documentation Format](#testsmd-documentation-format)

## Testing Architecture

### Core Technologies

- **Playwright** - End-to-end testing framework
- **PrismaClient** - Direct database access for setup/teardown
- **TypeScript** - Type-safe test implementation
- **Custom Reporters** - Consolidated and minimal reporters for test output

### File Structure

```
project/
├── e2e/
│   ├── feature1.spec.ts
│   ├── feature2.spec.ts
│   └── utils/
│       ├── test-cleanup.ts
│       └── consolidated-reporter.ts
├── test.types.ts
├── playwright.config.ts
└── docs/
    ├── Testing.md
    └── Tests.md
```

### Playwright Configuration

Key configuration patterns:

- **Test Directory:** `./e2e`
- **Execution:** Fully parallel
- **Retries:** 2 in CI, 0 locally
- **Workers:** 1 in CI, optimal locally
- **Screenshots:** Only on failure
- **Traces:** On first retry
- **Reporters:** List + Consolidated reporter
- **Output:** Timestamped directories

## Testing Rules

### Rule 1: Synchronize Test Changes with Documentation

Every time a test is changed, the corresponding test in `docs/Tests.md` **must** be updated to match.

**Example:**

```typescript
test("should perform expected action", async ({ page }) => {
  ...
});
```

Must have corresponding entry in Tests.md:

```md
- should perform expected action
  ✓ Expected result description
```

### Rule 2: Always Prefer Data Attributes

Always prefer `data-testid` attributes to select HTML elements in e2e tests.

**Correct:**

```typescript
await page.getByTestId(TestId.ELEMENT_ID).fill(value);
```

**Incorrect:**

```typescript
await page.locator('input[type="email"]').fill(value);
await page.getByRole("textbox", { name: "Label" }).fill(value);
await page.locator(".css-class").fill(value);
```

**Exception:** Use role-based selectors only for generic elements like alerts:

```typescript
await expect(page.locator('role=alert, [role="status"]').first()).toBeVisible();
```

### Rule 2a: Never Read Text Content - Only Use Data Attributes

Tests must **never** read text content from elements to make assertions or verify behavior. All information needed by tests must be exposed through data attributes (`data-testid`, `data-state`, etc.).

**Why:** Text content is:

- Subject to frequent UI/UX changes
- Fragile and breaks tests unnecessarily
- Not reliable for determining application state
- May change with localization/internationalization

**Correct - Using data attributes:**

```typescript
const playersList = page.locator(`[data-testid="${TestId.PLAYERS_LIST}"]`);
const listState = await playersList.getAttribute("data-state");
const isShowingFallback = listState === "nearby-fallback";

await expect(playersList).toHaveAttribute("data-state", "nearby-fallback");
```

**Incorrect - Reading text content:**

```typescript
const message = page.locator(`[data-testid="${TestId.MESSAGE}"]`);
const messageText = await message.textContent();
const hasCorrectMessage = messageText?.includes("No players found") ?? false;
```

**How to Verify Different UI States:**

Instead of checking message text, add `data-state` attributes to elements:

```typescript
<div
  data-testid={TestId.RESULTS_CONTAINER}
  data-state={
    hasExactMatches
      ? "exact-matches"
      : hasNearbyMatches
      ? "nearby-fallback"
      : "no-matches"
  }
>
  {/* UI content with messages */}
</div>
```

Then test the state:

```typescript
const container = page.locator(`[data-testid="${TestId.RESULTS_CONTAINER}"]`);
await expect(container).toHaveAttribute("data-state", "nearby-fallback");
```

**Acceptable Exception:** Visual regression testing with screenshots where the actual rendered UI is being verified, not parsed.

### Rule 3: Share Data Attribute Values

Data attribute values **must** be imported into the test and the component from the shared `test.types.ts` file.

**In Component:**

```typescript
import { TestId } from "@/test.types";

export function MyComponent() {
  return (
    <form>
      <Input
        data-testid={TestId.INPUT_FIELD}
        type="email"
      />
      <Button data-testid={TestId.SUBMIT_BUTTON}>Submit</Button>
    </form>
  );
}
```

**In Test:**

```typescript
import { TestId } from "../test.types";

test("should submit form", async ({ page }) => {
  await page.getByTestId(TestId.INPUT_FIELD).fill("value");
  await page.getByTestId(TestId.SUBMIT_BUTTON).click();
});
```

### Rule 3a: Use State Data Attributes for Dynamic UI States

When an element has different states that need to be tested (e.g., edit mode vs view mode, expanded vs collapsed), use the `data-state` attribute in addition to `data-testid`.

**Pattern:**

- `data-testid` identifies the element
- `data-state` identifies the current state of the element

**In Component:**

```typescript
import { TestId } from "@/test.types";

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

**In Test:**

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

**In Test Utilities:**

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

**Benefits:**

- Eliminates reliance on dynamic text content (which may change with UI updates)
- Provides explicit state verification in tests
- More reliable than text-based selectors
- Works across different languages/localizations
- Makes test intent clear and self-documenting

### Rule 4: Always Prefer Timeouts Over Hard-Coded Waits

Always prefer explicit timeout parameters over hard-coded wait periods.

**GLOBAL TIMEOUT STANDARD: All timeouts in tests must be set to 10 seconds (10000ms).**

**Correct:**

```typescript
await expect(page.getByTestId(TestId.ELEMENT)).toBeVisible({
  timeout: 10000,
});

await page.waitForURL("/path", {
  timeout: 10000,
  waitUntil: "domcontentloaded",
});
```

**Incorrect:**

```typescript
await page.waitForTimeout(5000);
await new Promise((resolve) => setTimeout(resolve, 5000));
```

**Timeout Guidelines:**

- **All Operations:** 10 seconds (10000ms) - NO EXCEPTIONS
  - UI Elements visibility checks
  - Navigation and URL changes
  - Complex operations
  - Database operations
  - Element text content checks
  - All other asynchronous operations

### Rule 5: Isolate Test Data

Each test must clean up its own data and not interfere with other tests.

**Pattern:**

```typescript
test.beforeAll(async () => {
  await cleanupTestData();
});

test.afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});
```

### Rule 6: Use Descriptive Test Names

Test names should describe the behavior being tested, starting with "should".

**Correct:**

```typescript
test("should create new record with valid data", async ({ page }) => {
  ...
});

test("should show error with invalid input", async ({ page }) => {
  ...
});
```

**Incorrect:**

```typescript
test("creation", async ({ page }) => {
  ...
});

test("test feature", async ({ page }) => {
  ...
});
```

### Rule 7: Never Take Manual Screenshots

Tests must **never** manually capture screenshots using `page.screenshot()`. Playwright automatically captures screenshots on failure based on the configuration (`screenshot: 'only-on-failure'` in `playwright.config.ts`).

**Why:**

- Manual screenshots clutter test results directories
- Automatic screenshots capture actual failure state
- Manual screenshots happen at arbitrary points, not at failure
- Creates inconsistent test output

**Incorrect:**

```typescript
await page.screenshot({ path: "debug.png" });
throw new Error("Something failed");
```

**Correct:**

```typescript
throw new Error("Something failed");
```

Playwright will automatically capture a screenshot when the test fails, saving it to the test results directory with proper naming and organization.

### Rule 8: Fail Immediately on First Assertion Failure

When a test case fails, the whole test suite must immediately fail and not continue. Tests must **never** collect failures in an array and continue execution.

**Why:**

- Faster feedback - test stops at first failure point
- Clearer debugging - exact failure point is obvious
- Simpler test output - only one failure to analyze
- More maintainable - less code and complexity
- Prevents cascading failures from obscuring root cause

**Incorrect - Collecting failures:**

```typescript
test("should perform multiple checks", async ({ page }) => {
  const failures: string[] = [];

  const isVisible = await page.getByTestId(TestId.ELEMENT).isVisible();
  if (!isVisible) {
    failures.push("Element not visible");
  }

  const hasText =
    (await page.getByTestId(TestId.ELEMENT).textContent()) === "Expected";
  if (!hasText) {
    failures.push("Element has wrong text");
  }

  if (failures.length > 0) {
    throw new Error(`Test failed: ${failures.join("; ")}`);
  }
});
```

**Correct - Failing immediately:**

```typescript
test("should perform multiple checks", async ({ page }) => {
  const isVisible = await page.getByTestId(TestId.ELEMENT).isVisible();
  if (!isVisible) {
    throw new Error("Element not visible");
  }

  const hasText =
    (await page.getByTestId(TestId.ELEMENT).textContent()) === "Expected";
  if (!hasText) {
    throw new Error("Element has wrong text");
  }
});
```

**Alternative with expect (recommended):**

```typescript
test("should perform multiple checks", async ({ page }) => {
  await expect(page.getByTestId(TestId.ELEMENT)).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId(TestId.ELEMENT)).toHaveText("Expected", {
    timeout: 10000,
  });
});
```

**Benefits:**

- Test stops immediately at the point of failure
- Screenshots capture the exact state when first assertion failed
- Error message is specific to the actual failure
- No need to parse through multiple failure messages
- Diagnostic data (console logs, network failures) is relevant to the single failure point

## Data Attribute System

### TestId Enum

**File:** `test.types.ts`

The `TestId` enum contains all data-testid values used throughout the application.

**Example Structure:**

```typescript
export enum TestId {
  FORM_EMAIL_INPUT = "form-email-input",
  FORM_PASSWORD_INPUT = "form-password-input",
  FORM_SUBMIT_BUTTON = "form-submit-button",
  MENU_TRIGGER = "menu-trigger",
  MENU_CONTENT = "menu-content",
  ITEM_CHECKBOX = "item-checkbox",
  ITEM_DELETE_BUTTON = "item-delete-button",
  TOAST_SUCCESS = "toast-success",
  TOAST_ERROR = "toast-error",
}
```

### Adding New TestId Values

When adding new interactive elements that need testing:

1. Add the TestId value to `test.types.ts`:

```typescript
export enum TestId {
  ...
  NEW_ELEMENT = "new-element",
}
```

2. Apply the data-testid in the component:

```typescript
import { TestId } from "@/test.types";

<button data-testid={TestId.NEW_ELEMENT}>Click Me</button>;
```

3. Use it in tests:

```typescript
import { TestId } from "../test.types";

await page.getByTestId(TestId.NEW_ELEMENT).click();
```

## Database Testing Patterns

### Database Seeding Requirements

**Critical Rules for Seed Scripts:**

1. **Fresh Database Assumption**

   - Seed scripts are ONLY run after a complete database reset
   - Scripts must use `insert()` operations, NOT `upsert()`
   - Database is guaranteed to be empty when seed runs

2. **Fail-Fast Error Handling**

   - Every database operation must check for errors
   - Any error must immediately throw and halt the entire seed process
   - No partial seeding is acceptable - all or nothing

3. **Error Checking Pattern**

   ```typescript
   const { error } = await supabase.from("table").insert(data);
   if (error) {
     console.error(`Failed to create record for ${identifier}`);
     throw error;
   }
   ```

4. **Never Suppress Errors**

   - Do NOT catch errors silently
   - Do NOT continue execution after an error
   - Do NOT use try-catch blocks to hide failures
   - Let errors propagate to fail the seed script

5. **Verification**

   - Seed script must exit with non-zero code on any failure
   - Check console output for error messages
   - Database should be in consistent state (all data or no data)

6. **Single Source of Truth**
   - ALL seed data MUST be sourced from `scripts/seed-data.ts`
   - Test files MUST import PLAYER_DATA, COACH_DATA, etc. from seed-data.ts
   - NEVER create hardcoded seed data arrays in test files
   - Cleanup functions MUST also source from seed-data.ts
   - This ensures profile data (UTR, gender, etc.) matches preference data

**Why These Rules:**

- Tests expect specific seed data to exist
- Partial seeding causes cryptic test failures
- Failing fast reveals configuration issues immediately
- Insert-only is safer and clearer than upsert after reset
- Single source of truth prevents mismatches between tables

### Direct PrismaClient Usage

Tests use direct PrismaClient instantiation for database access:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
```

**Important:**

- Create one PrismaClient instance per test file (not per test)
- Call `prisma.$disconnect()` only in `test.afterAll()` hook
- Do not disconnect in individual tests or beforeAll

### Centralized Test Utilities

**File:** `e2e/utils/test-cleanup.ts`

Reusable cleanup functions for common test scenarios:

**`cleanupTestData(userEmails: string[])`**

Deletes test data for multiple users in one operation:

```typescript
import { cleanupTestData } from "./e2e/utils/test-cleanup";

await cleanupTestData(["user1@example.com", "user2@example.com"]);
```

**What it does:**

1. Finds all users by email array
2. Finds all member records for those users
3. Deletes todos for all related organizations
4. Deletes invitations by email OR inviter ID
5. Batch operation for efficiency

**`resetTamagotchiState(organizationId: string)`**

Resets a tamagotchi to initial state:

```typescript
import { resetTamagotchiState } from "./e2e/utils/test-cleanup";

await resetTamagotchiState(orgId);
```

**Resets to:**

- hunger: 7
- happiness: 100
- wasteCount: 0
- age: 0
- feedCount: 0
- All timestamps to current date

**When to Use Utilities vs Inline Cleanup:**

Use centralized utilities when:

- Cleaning up common test data (users, standard records)
- Need batch operations across multiple tests
- Reset patterns are reusable

Use inline cleanup when:

- Test creates unique data with `Date.now()` identifiers
- Complex cascade specific to one test
- Test-specific cleanup logic required

### Cleanup Function Pattern

Cleanup functions follow a cascade deletion pattern to handle foreign key relationships:

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

### Cleanup Order

The order matters due to foreign key constraints. Delete in this order:

1. **Child records** that reference parent records
2. **Session records** associated with users
3. Query to find related records
4. **Dependent records** that reference related entities
5. **Related records**
6. **Parent records**

### Test Lifecycle Hooks

```typescript
test.describe("Feature Tests", () => {
  test.beforeAll(async () => {
    await cleanupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  test("should perform expected action", async ({ page }) => {
    ...
  });
});
```

### Test-Specific Cleanup

For tests that create unique data, clean up inline:

```typescript
test("should handle unique test case", async ({ page }) => {
  const uniqueIdentifier = `test-${Date.now()}@example.com`;

  await prisma.session.deleteMany({
    where: { user: { email: uniqueIdentifier } },
  });

  const testRecord = await prisma.user.findUnique({
    where: { email: uniqueIdentifier },
    include: { relatedRecords: true },
  });

  if (testRecord) {
    const ids = testRecord.relatedRecords.map((r) => r.id);
    await prisma.dependentRecord.deleteMany({
      where: { parentId: { in: ids } },
    });
    await prisma.relatedRecord.deleteMany({
      where: { id: { in: ids } },
    });
  }

  await prisma.user.deleteMany({
    where: { email: uniqueIdentifier },
  });
});
```

## Diagnostic Data Capture

### Automatic Diagnostic Collection

The test infrastructure automatically captures comprehensive diagnostic data for every test using custom Playwright fixtures (`e2e/utils/test-fixtures.ts`). This data is collected in real-time during test execution and included in test reports for failed tests.

### What Gets Captured

**1. Browser Console Logs**

- All console messages (log, warn, error, info)
- Source location (file and line number)
- Timestamp for each message
- Automatically filtered to show errors and warnings first in reports

**2. Page Errors**

- JavaScript exceptions and errors
- Full stack traces
- Timestamp when error occurred
- Unhandled promise rejections

**3. Network Failures**

- Failed HTTP requests (status >= 400)
- Request method and URL
- Status code and status text
- Response body (for JSON and text responses)
- Timestamp for each request

**4. Test Execution Steps**

- Step-by-step timeline of test actions
- Duration for each step
- Which step failed (if applicable)
- Nested sub-steps for complex operations

**5. Test Context**

- User information (from reporter extraction methods)
- Test conditions and preferences
- Expected vs observed behavior
- Custom metadata

**6. DOM State**

- Accessibility tree snapshots
- Element visibility states
- Data attribute values
- Component states at failure point

### Using Diagnostic Data

The `diagnostics` fixture is automatically available in every test:

```typescript
test("should perform action", async ({ page, diagnostics }) => {
  diagnostics.consoleLogs; // Array of console messages
  diagnostics.pageErrors; // Array of page errors
  diagnostics.networkFailures; // Array of failed requests
  diagnostics.testContext; // Test metadata
});
```

**Note:** You typically don't need to access the `diagnostics` fixture directly. It's automatically attached to test results and included in the reporter output for failed tests.

### How It Works

1. **Test Fixtures** (`test-fixtures.ts`) extend Playwright's base test
2. **Event Listeners** are attached to the page object:
   - `page.on('console', ...)` - Captures console output
   - `page.on('pageerror', ...)` - Captures page errors
   - `page.on('response', ...)` - Captures network failures
3. **Data Collection** happens automatically during test execution
4. **Attachment** to TestInfo occurs only for failed tests
5. **Reporter Extraction** (`consolidated-reporter.ts`) reads diagnostic data
6. **README Generation** includes all diagnostic information

### Viewing Diagnostic Data

**In test-report.json:**

```json
{
  "title": "should display player cards",
  "status": "failed",
  "consoleLogs": [...],
  "pageErrors": [...],
  "networkFailures": [...],
  "steps": [...]
}
```

**In README.md:**
All diagnostic data is formatted into human-readable sections with code blocks, timestamps, and clear headers.

**In Trace Files:**
Use `npx playwright show-trace {file}.zip` for interactive debugging with full timeline, network requests, and DOM snapshots.

## Test Implementation Patterns

### Test Structure

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

**IMPORTANT:** Always import `test` and `expect` from `"./utils/test-fixtures"`, NOT from `"@playwright/test"`. The custom fixtures automatically capture diagnostic data including browser console logs, page errors, and network failures.

### Navigation Patterns

**Direct Navigation:**

```typescript
await page.goto("/");
await page.goto("/page");
```

**Wait for URL Pattern:**

```typescript
await page.waitForURL(/\/pattern/, { timeout: 10000 });
await page.waitForURL("/path", {
  timeout: 10000,
  waitUntil: "domcontentloaded",
});
```

**Verify Current URL:**

```typescript
await expect(page).toHaveURL("/path", { timeout: 10000 });
```

### Element Interaction Patterns

**Fill Input:**

```typescript
await page.getByTestId(TestId.FORM_NAME).fill(name);
await page.getByTestId(TestId.FORM_EMAIL).fill(email);
```

**Click Button:**

```typescript
await page.getByTestId(TestId.SUBMIT_BUTTON).click();
await page.getByTestId(TestId.MENU_TRIGGER).click();
```

**Check Visibility:**

```typescript
await expect(page.getByTestId(TestId.ELEMENT)).toBeVisible({
  timeout: 10000,
});
```

**Wait for Button Visibility (Robust Pattern):**

For auth state-dependent buttons (Sign In/Sign Out), use the `waitForButtonVisibility` helper which combines `waitFor` with `isVisible`:

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

**Why this pattern:**

- Combines `element.waitFor()` + `isVisible()` for more reliable checks
- Handles auth state transitions where UI updates asynchronously
- Returns boolean for easy conditional logic
- Prevents false negatives from DOM state timing issues

**Verify Text Content:**

```typescript
await expect(page.getByTestId(TestId.TEXT_ELEMENT)).toContainText(
  expectedText,
  { timeout: 10000 }
);
```

**Check Attributes:**

```typescript
const input = page.getByTestId(TestId.INPUT_FIELD);
await expect(input).toHaveAttribute("required", "");
await expect(input).toHaveAttribute("type", "password");
```

### Error Validation Patterns

**Check for Alert/Status Messages:**

```typescript
await expect(page.locator('role=alert, [role="status"]').first()).toBeVisible({
  timeout: 10000,
});
```

**Verify Toast Notifications:**

```typescript
await expect(page.getByTestId(TestId.TOAST_SUCCESS)).toBeVisible({
  timeout: 10000,
});

await expect(page.getByTestId(TestId.TOAST_ERROR)).toBeVisible({
  timeout: 10000,
});
```

### Async Handling Patterns

**Wait for Element Before Interaction:**

```typescript
await expect(page.getByTestId(TestId.INPUT_FIELD)).toBeVisible({
  timeout: 10000,
});
await page.getByTestId(TestId.INPUT_FIELD).fill(value);
```

**Wait for Navigation to Complete:**

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

**Wait for Dynamic Content:**

```typescript
await page.getByTestId(TestId.TRIGGER_ELEMENT).click();

await expect(page.getByTestId(TestId.DYNAMIC_CONTENT)).toBeVisible({
  timeout: 10000,
});
```

### Test Constants

Define test data at the top of the test file:

```typescript
const TEST_EMAIL = "test@example.com";
const TEST_NAME = "Test User";
const TEST_VALUE = "test-value";
```

For unique values per test run:

```typescript
const uniqueId = `test-${Date.now()}@example.com`;
```

## Test Execution

### npm Scripts

**Run All Tests:**

```bash
npm run test
```

**Run Specific Test Suites:**

```bash
npm run test:e2e:feature1
npm run test:e2e:feature2
npm run test:unit:feature
```

**Run with UI (Headed Mode):**

```bash
npm run test:headed
npm run test:e2e:feature:headed
```

**Run with Trace Mode:**

```bash
npm run test:e2e:feature:trace
```

### Test Execution Modes

**Standard Mode (Default):**

- Headless browser execution
- Screenshots captured on failure
- Traces captured on first retry only
- No video recording
- Fastest execution

**Headed Mode (`:headed`):**

- Browser window visible during test execution
- Useful for watching tests run in real-time
- Screenshots captured on failure
- Traces captured on first retry only
- No video recording
- Example: `npm run test:e2e:auth:headed`

**Trace Mode (`:trace`):**

- Headless browser execution
- Full Playwright trace captured for ALL tests (not just retries)
- Video recording enabled for ALL tests
- Screenshots captured on failure
- Best for post-mortem debugging of complex issues
- Generates `.zip` trace files viewable with `npx playwright show-trace`
- Example: `npm run test:e2e:auth:trace`

**When to Use Each Mode:**

- **Standard:** Normal test execution and CI/CD pipelines
- **Headed:** Quick visual debugging, seeing UI interactions in real-time
- **Trace:** Deep debugging when tests fail or hang, provides complete timeline of actions, network requests, and DOM changes

**Viewing Trace Files:**

After running a test in trace mode:

```bash
npm run test:e2e:auth:trace
```

The trace file will be in the test results directory. To view it:

```bash
npx playwright show-trace test-results/{timestamp}_auth.spec/artifacts/trace.zip
```

Or find it in the README.md under the "Failed Tests" section, which lists all available trace files.

The trace viewer provides:

- Timeline of all test actions
- Network request/response details
- DOM snapshots at each step
- Console logs and errors
- Visual screenshots at each action
- Exact location where test hung or failed

### Test Output

**Dual Reporter System:**

Two reporters run in parallel during test execution:

1. **List Reporter** - Real-time console output showing test progress
2. **Consolidated Reporter** - Generates detailed reports and manages artifacts

**Test Status Classification:**

The consolidated reporter classifies test results as follows:

- **Passed:** Test completed successfully with all assertions passing
- **Failed:** Test failed due to assertion failures, errors, or timeouts
- **Skipped:** Test was intentionally skipped (not run)

**Important:** Any test that times out is classified as **failed**, not skipped. Timeouts indicate the test could not complete within the expected time and represent a failure condition.

**Artifact Configuration:**

Standard mode:

- **Screenshots:** Only on failure
- **Traces:** Only on first retry
- **Videos:** Disabled

Trace mode (`:trace`):

- **Screenshots:** Only on failure
- **Traces:** Captured for ALL tests
- **Videos:** Captured for ALL tests

### CI vs Local Execution

**CI Environment:**

- 2 retries on failure
- 1 worker (sequential execution)
- Requires fresh server (no reuse)
- Forbids `.only` in tests
- 120 second server startup timeout

**Local Development:**

- 0 retries
- Optimal workers (parallel execution)
- Reuses existing server
- Allows `.only` for focused testing
- 120 second server startup timeout

## Test Results and Reporting

### Output Directory Structure

Each test run creates a unique timestamped directory:

```
test-results/
└── {TEST_RUN_ID}/              <- e.g., "2024-11-06_143022-789"
    ├── test-report.json        <- Complete structured test data
    ├── README.md               <- Human-readable summary
    ├── screenshot-1.png        <- Failure screenshots (if any)
    ├── trace-1.zip             <- Debug traces (if any)
    └── ...other-artifacts
```

### TEST_RUN_ID Generation

The TEST_RUN_ID is automatically generated by the consolidated reporter at test startup and includes both timestamp and test filename(s):

```typescript
const testFiles = new Set<string>();
suite.allTests().forEach((test) => {
  const relativePath = path.relative(process.cwd(), test.location.file);
  const fileName = path.basename(relativePath, path.extname(relativePath));
  testFiles.add(fileName);
});

const fileNames = Array.from(testFiles).join("-");

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace(/T/, "_")
  .split("Z")[0];

const testRunId = process.env.TEST_RUN_ID || `${timestamp}_${fileNames}`;

if (!process.env.TEST_RUN_ID) {
  process.env.TEST_RUN_ID = testRunId;
}
```

**Format:** `YYYY-MM-DD_HHMMSS-mmm_testname` (e.g., `2024-11-06_143022-789_auth.spec`)

**Override:** Set `TEST_RUN_ID` environment variable before running tests to use a custom directory name.

**Single Directory Guarantee:**

The system ensures only ONE directory is created per test run through environment variable synchronization:

1. **Consolidated reporter** generates the testRunId (including timestamp and filename) and sets `process.env.TEST_RUN_ID`
2. **Playwright config** reads from `process.env.TEST_RUN_ID` for its `outputDir`
3. Both systems use the exact same testRunId value

This ensures:

- Only ONE directory is created per test run
- Directory name includes both timestamp and test filename for easy identification
- All artifacts (screenshots, traces, reports) are consolidated in the same location
- No duplicate or orphaned directories are created
- Perfect synchronization between Playwright's output and custom reporter output

**Implementation:**

In `consolidated-reporter.ts`:

```typescript
onBegin(config: FullConfig, suite: Suite) {
  const testFiles = new Set<string>();
  suite.allTests().forEach(test => {
    const fileName = path.basename(test.location.file, path.extname(test.location.file));
    testFiles.add(fileName);
  });

  const fileNames = Array.from(testFiles).join('-');
  const timestamp = new Date().toISOString()...;
  const testRunId = process.env.TEST_RUN_ID || `${timestamp}_${fileNames}`;

  if (!process.env.TEST_RUN_ID) {
    process.env.TEST_RUN_ID = testRunId;
  }

  this.outputDir = path.join(process.cwd(), "test-results", testRunId);
}
```

In `playwright.config.ts`:

```typescript
outputDir: process.env.TEST_RUN_ID
  ? `test-results/${process.env.TEST_RUN_ID}/artifacts`
  : "test-results/temp/artifacts";
```

**Benefits of this approach:**

1. **Reporter runs first:** The consolidated reporter's `onBegin()` method is called before Playwright needs to create artifact directories
2. **Filename inclusion:** Directory names clearly indicate which test file was run (e.g., `auth.spec`, `checkout.spec`)
3. **No timestamp desynchronization:** Single point of testRunId generation prevents multiple directory creation
4. **Easy identification:** Human-readable directory names make it simple to find test results

### test-report.json Format

The consolidated reporter generates a JSON file with complete test data:

```json
{
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "skipped": 0,
    "duration": 12543,
    "timestamp": "2024-11-06T14:30:22.789Z",
    "outputDirectory": "test-results/2024-11-06_143022-789"
  },
  "tests": [
    {
      "title": "should perform expected action",
      "file": "e2e/feature.spec.ts",
      "status": "passed",
      "duration": 2134
    },
    {
      "title": "should handle error case",
      "file": "e2e/feature.spec.ts",
      "status": "failed",
      "duration": 1876,
      "error": "Error message here",
      "errorStack": "Error: Error message here\n    at Object.<anonymous> (/path/to/test.ts:123:45)\n    at helperFunction (/path/to/test.ts:210:10)",
      "screenshots": ["screenshot-1.png"],
      "traces": ["trace-1.zip"]
    }
  ]
}
```

**Status Field Values:**

- `"passed"`: Test completed successfully
- `"failed"`: Test failed due to assertion failure, error, or timeout
- `"skipped"`: Test was intentionally skipped

**Note:** Tests that time out will have `"status": "failed"` and an error message containing "timeout" or "exceeded".

**Conditional Fields:**

- `error`: Only present if test failed (contains error message)
- `errorStack`: Only present if test failed (contains complete stack trace with file paths and line numbers)
- `screenshots`: Only present if screenshots were captured (on failure)
- `videos`: Only present if videos were recorded (trace mode only)
- `traces`: Only present if traces were captured (on first retry in standard mode, or for all tests in trace mode)
- `stdout`: Present for all tests that have console output (not limited to failures)
- `stderr`: Present for all tests that have stderr output (not limited to failures)

### README.md Format

The README provides a comprehensive human-readable summary with all available diagnostic information for failed tests:

**1. Header:**

- Timestamp
- Total duration

**2. Summary:**

- Test counts (passed, failed, skipped, total) with emoji indicators

**3. Failed Tests (if any):**

For each failed test, the following information is included:

- **Test title** - The descriptive name of the failed test
- **File path** - Relative path to the test file
- **Duration** - How long the test ran before failing (in milliseconds)
- **Error Message** - The primary error message (in code block format)
- **Stack Trace** - Complete stack trace showing the exact line where the failure occurred
- **Screenshots** - List of captured screenshots (only on failure)
- **Traces** - List of debug traces (on first retry in standard mode, or for all tests in trace mode)
- **Videos** - List of video recordings (only in trace mode)

**Example:**

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

````

**4. All Tests:**

- Status icon (✅ passed / ❌ failed / ⏭️ skipped)
- Test title
- Duration

**Diagnostic Data Priority:**

The README includes ALL available diagnostic data for failed tests, ensuring that developers have complete information to diagnose issues without needing to check multiple files. This includes:

1. **Error messages** - What went wrong (high-level)
2. **Stack traces** - Exactly where it went wrong (file and line number)
3. **Screenshots** - Visual state when the failure occurred
4. **Traces** - Playwright trace files for step-by-step debugging (viewable with `npx playwright show-trace`)
5. **Videos** - Video recordings of test execution (only in trace mode)
6. **Duration** - Whether timeout-related or immediate failure

**Using Trace Files from README:**

When a test fails and trace files are captured, the README will list them in the "Failed Tests" section. To view a trace:

```bash
npx playwright show-trace test-results/{timestamp}_testname.spec/artifacts/trace.zip
````

This opens an interactive viewer showing the complete timeline of the test execution, making it easy to identify where and why the test failed or hung

This comprehensive approach eliminates the need to cross-reference multiple log files or run additional commands to understand test failures.

### Artifact Management

**How Artifacts are Processed:**

1. **During Test Execution:**

   - Playwright captures screenshots/traces based on configuration
   - Attachments are temporarily stored by Playwright

2. **On Test End:**

   - Consolidated reporter categorizes attachments by file extension:
     - `.png` → screenshots
     - `.webm` → videos
     - `.zip` → traces
   - Files are copied to the output directory
   - Only filenames are stored in test results (not full paths)

3. **On Test Completion:**
   - JSON report includes artifact filenames in test objects
   - README links to artifact filenames
   - All artifacts are in the same directory as reports

## Adding New Tests

### Step-by-Step Checklist

1. **Create Test File**

   - Location: `e2e/{feature}.spec.ts`

2. **Add TestId Values**

   - Update `test.types.ts`
   - Add all interactive elements for the feature

   ```typescript
   export enum TestId {
     ...
     FEATURE_INPUT = "feature-input",
     FEATURE_BUTTON = "feature-button",
   }
   ```

3. **Apply Data Attributes in Components**

   ```typescript
   import { TestId } from "@/test.types";

   <Input data-testid={TestId.FEATURE_INPUT} />
   <Button data-testid={TestId.FEATURE_BUTTON}>Save</Button>
   ```

4. **Write Cleanup Function**

   ```typescript
   async function cleanupFeatureData() {
     await prisma.record.deleteMany({
       where: {
         identifier: {
           in: [TEST_IDENTIFIER],
         },
       },
     });
   }
   ```

5. **Implement Test Suite**

   ```typescript
   import { test, expect } from "@playwright/test";
   import { TestId } from "../test.types";
   import { PrismaClient } from "@prisma/client";

   const prisma = new PrismaClient();

   test.describe("Feature Tests", () => {
     test.beforeAll(async () => {
       await cleanupFeatureData();
     });

     test.afterAll(async () => {
       await cleanupFeatureData();
       await prisma.$disconnect();
     });

     test("should perform action", async ({ page }) => {
       await page.goto("/page");
       await page.getByTestId(TestId.FEATURE_INPUT).fill("value");
       await page.getByTestId(TestId.FEATURE_BUTTON).click();
       await expect(page.getByTestId(TestId.TOAST_SUCCESS)).toBeVisible({
         timeout: 10000,
       });
     });
   });
   ```

6. **Document Tests in Tests.md**

   - Add test section following the format below
   - Document each test case with pass conditions

7. **Add npm Script**

   - Update `package.json`:

   ```json
   "test:e2e:feature": "playwright test e2e/feature.spec.ts"
   ```

8. **Run Tests**
   ```bash
   npm run test:e2e:feature
   ```

## Tests.md Documentation Format

The `docs/Tests.md` file documents all tests in the repository. Each test case should be listed in a single line with an indented line below showing the pass condition.

### Test Index

Numbered list with links to test sections, including:

- Section name with anchor link
- File path as a clickable link
- npm run command for that specific test file

**Format:**

```md
## Test Index

1. [Feature Tests](#1-feature-tests) - [e2e/feature.spec.ts](../e2e/feature.spec.ts) - `npm run test:e2e:feature`
2. [Component Tests](#2-component-tests) - [e2e/component.spec.ts](../e2e/component.spec.ts) - `npm run test:e2e:component`
```

### Test Section Format

Each test section should follow this structure:

```md
## 1. Feature Tests

**File:** `e2e/feature.spec.ts`
**Command:** `npm run test:e2e:feature`

Tests the feature functionality covering creation, modification, and deletion.

### Creation Flow

- should create new record with valid data
  ✓ Record created in database with expected fields

- should validate required fields
  ✓ Error message appears for missing fields

- should reject duplicate entries
  ✓ Error toast appears indicating duplicate exists

### Modification Flow

- should update record with valid changes
  ✓ Record updated in database, success notification shown

- should reject invalid modifications
  ✓ Error toast appears with validation message
```

### Documentation Maintenance

**Rule:** Every test change requires a corresponding update in `docs/Tests.md`.

**Examples of changes requiring documentation updates:**

- Adding a new test case
- Modifying test behavior
- Changing test assertions
- Updating test names
- Adding new test suites

**Process:**

1. Make test changes in `e2e/{feature}.spec.ts`
2. Update corresponding section in `docs/Tests.md`
3. Ensure test name and pass condition match
4. Verify Test Index is up to date
5. Run tests to confirm behavior matches documentation

## Test Result Logging and Diagnostics

### TestResultLogger Pattern

For tests with multiple verification points, use `TestResultLogger` to capture detailed sub-test results that appear in the README.

**Basic Setup:**

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
    // Finalize unreached tests (mark as failed if test exited early)
    logger.finalizeUnreachedTests();

    // Output summary to console (appears in README Console Output section)
    const summary = logger.getSummary();
    if (summary) {
      console.log("\n📊 Test Logger Summary:");
      console.log(summary);
    }

    // Write JSON file for consolidated reporter
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
});
```

**Logging Test Results:**

```typescript
test("should perform multiple checks", async ({ page }) => {
  const failures: string[] = [];

  // Register expected tests (shown if test exits early)
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

  // Perform check 1
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

  // Perform check 2
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

  // Fail with descriptive message
  if (failures.length > 0) {
    throw new Error(`Test failed: ${failures.join("; ")}`);
  }
});
```

**Benefits:**

- **Detailed failure info:** Shows exactly which check failed
- **Console output:** Summary appears in README Console Output section
- **Logged Sub-Tests section:** Each `logTestResult()` call appears in README with conditions, expectations, and observations
- **Screenshots:** Automatically captures screenshots for failed checks
- **Error toasts:** Captures any error toast messages that appear
- **Early exit handling:** `registerExpectedTest()` + `finalizeUnreachedTests()` marks tests as failed if test exits before reaching them

**README Output:**

When using this pattern, the README will include:

1. **Console Output section:**

   ```
   📊 Test Logger Summary:

   5 tests | 4 passed | 1 failed

   Failed Tests:

   3. Check 2 - Correct text
      Conditions: userType=player, page=home
      Expected: Element should have correct text
      Observed: incorrect text: Wrong Text
      Screenshot: test-results/failures/check-2-correct-text-1234.png
   ```

2. **Logged Sub-Tests section:**

   - Shows each logged test with ✓/✗ icon
   - Includes conditions, expected, observed
   - Links to screenshots for failures
   - Summary of passed/failed sub-tests

3. **Error Message:**
   ```
   Error: Test failed: Element has incorrect text
   ```
   (Instead of generic "Test failed - see summary for details")

**Helper Functions:**

- `formatTestConditions(obj)` - Converts object to "key=value, key=value" string
- `logTestResult(logger, page, name, conditions, expectation, passed, observedSuccess, observedFailure)` - Logs a test result with screenshot capture for failures
- `captureFailureScreenshot(page, testName)` - Captures screenshot in test-results/failures/
- `checkForErrorToast(page)` - Checks for visible toast messages

**When to Use:**

- Tests with 3+ verification points
- Complex flows (signup → signout → signin)
- Tests where you need to know WHICH specific check failed
- Tests where early exit could hide failures
