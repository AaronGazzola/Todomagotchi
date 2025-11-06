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

- **All Operations:** 10 seconds (10000ms)
  - UI Elements visibility checks
  - Navigation and URL changes
  - Complex operations
  - Database operations

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

## Test Implementation Patterns

### Test Structure

```typescript
import { test, expect } from "@playwright/test";
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

  test("should perform expected behavior", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId(TestId.ELEMENT).click();
    await expect(page.getByTestId(TestId.RESULT)).toBeVisible({
      timeout: 10000,
    });
  });
});
```

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
```

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

- **Screenshots:** Only on failure
- **Traces:** Only on first retry (not all failures)
- **Videos:** Disabled

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
- `screenshots`: Only present if screenshots were captured
- `videos`: Only present if videos were recorded
- `traces`: Only present if traces were captured

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
- **Traces** - List of debug traces (only on first retry)

**Example:**

```md
### should display player cards with essential information

**File:** e2e/find-partners.spec.ts
**Duration:** 30151ms

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

**Screenshots:**
- test-failed-1.png
```

**4. All Tests:**

- Status icon (✅ passed / ❌ failed / ⏭️ skipped)
- Test title
- Duration

**Diagnostic Data Priority:**

The README includes ALL available diagnostic data for failed tests, ensuring that developers have complete information to diagnose issues without needing to check multiple files. This includes:

1. **Error messages** - What went wrong (high-level)
2. **Stack traces** - Exactly where it went wrong (file and line number)
3. **Screenshots** - Visual state when the failure occurred
4. **Traces** - Playwright traces for step-by-step debugging
5. **Duration** - Whether timeout-related or immediate failure

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
