# Testing Pattern and Strategy

This document provides comprehensive instructions for writing tests using a universal testing methodology.

## Tests.md Documentation Format

The `Tests.md` file documents all tests in the repository. Each test case should be listed in a single line with an indented line below showing the pass condition. The document must include:

1. **Run All Tests Section**: Shows the command to run the complete test suite
2. **Test Index**: Numbered list with links to test sections, including:
   - Section name with anchor link
   - File path as a clickable link
   - npm run command for that specific test file

### Test Index Format

```md
## Test Index

1. [Test Category Name](#1-test-category-name-tests) - [e2e/test-file.spec.ts](e2e/test-file.spec.ts) - `npm run test:category`
2. [Another Category](#2-another-category-tests) - [e2e/another.spec.ts](e2e/another.spec.ts) - `npm run test:another`
```

### Test Section Format

Each test section should follow this structure:

```md
## 1. Test Category Name Tests

**File:** `e2e/test-file.spec.ts`
**Command:** `npm run test:category`

### Feature Being Tested

- should perform specific action
  ✓ Expected result description

- should handle edge case
  ✓ Expected result description
```

## Universal Testing Methodology

### The Three-Part Pattern

All tests follow this three-part pattern to ensure compatibility between browser and Node.js environments:

1. **Environment Utilities** ([src/lib/env.utils.ts](src/lib/env.utils.ts))

   - All environment variable access uses `ENV` object
   - All browser API access uses `getBrowserAPI()` function
   - Applied to all utility files and functions

2. **Client Injection Pattern** (Utility Functions)

   - All database functions accept optional `client?: SupabaseClient` parameter
   - Functions default to client-side `supabase` client
   - Enables tests to inject service role client

3. **Service Role Testing** (Test Files)
   - Tests create service role client: `createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY)`
   - Tests inject client to functions: `myFunction({ param: value, client: supabase })`
   - Tests query seeded data from real database

### Application Rules

Apply these patterns universally:

**Environment Utilities - Required For:**

- All utility functions in `src/lib/*.utils.ts`
- Any code accessing environment variables
- Any code using browser APIs (localStorage, window, document, etc.)

**Client Injection - Required For:**

- All functions that query the database (`.from()`, `.select()`, `.insert()`, `.update()`, `.delete()`)
- All utility functions that may be imported by unit tests

**Service Role Client - Required For:**

- All unit test files
- All test helper utilities

## Single Source of Truth

Refer only to the `docs/Tests.md` file to determine the design and expected results of each test case.
Any changes made to the tests should be documented in the `docs/Tests.md` file.

## Core Testing Philosophy

**Real Database, No Mocks**: All tests interact with a real database using seeded data. Never use mocks or stubs.

**Two Test Types**:

1. **E2E Tests (Playwright)**: Test complete user workflows through the UI
2. **Unit Tests (Playwright)**: Test complex algorithms and helper functions directly

## Required Imports

Every test file must import from the centralized test utilities:

```typescript
import { test, expect } from "@playwright/test";
import {
  TestResultLogger,
  getElementByTestId,
  clickByTestId,
  fillByTestId,
  isVisibleByTestId,
  signUp,
  signIn,
  signOut,
  formatTestConditions,
  logTestResult,
} from "../src/lib/test.utils";
import { TestId } from "../src/test.types";
import * as fs from "fs";
import * as path from "path";
```

**Note:** Test files use relative imports (`../src/...`) instead of path aliases (`@/...`) to ensure compatibility with Playwright's test runner.

## Test Structure Requirements

### E2E Tests (Playwright)

Every E2E test must follow this exact structure:

```typescript
test.describe("Feature Name Tests", () => {
  const logger = new TestResultLogger();

  test.beforeAll(async () => {});

  test.afterAll(async () => {
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
        },
        null,
        2
      )
    );
  });

  test("should perform specific action", async ({ page }) => {
    await page.goto("/auth");
    await page.fill("#email", "test@example.com");
    await page.fill("#password", "password123");
    await page.click("button[type='submit']");

    await page.waitForURL("/");

    await expect(page.getByRole("button", { name: /feature/i })).toBeVisible({
      timeout: 15000,
    });
    const isVisible = await page
      .getByRole("button", { name: /feature/i })
      .isVisible();

    logger.log(
      "Element visibility check",
      formatTestConditions({
        userType: "authenticated user",
        authState: "logged in",
        action: "submitted signin form",
        email: "test@example.com",
      }),
      "Element should be visible",
      isVisible ? "Element is visible" : "Element not found",
      isVisible
    );
  });
});
```

#### E2E Test Rules

1. **Conditions Must Include**: User type, auth state, action performed, and user email
2. **Catch All Assertions**: Wrap all `expect()` assertions in try-catch blocks to prevent Playwright stack traces
3. **Use logTestResult Helper**: Automatically captures screenshots and error toasts on failure
4. **Throw Generic Error on Failure**: Only throw `new Error('Test failed - see summary for details')` to preserve test failure status
5. **Use Relative Imports**: Import test utilities from `"../src/lib/test.utils"` instead of `"@/lib/test.utils"`
6. **No Fixed Waits - Use Proper Timeouts**: Do not use fixed wait times (e.g., `page.waitForTimeout()`). Instead, use `expect()` assertions with timeouts to wait for elements. **Critical distinction**:
   - ❌ **WRONG**: `const visible = await element.isVisible({ timeout: 15000 }).catch(() => false)` - The `isVisible()` method checks visibility RIGHT NOW; the timeout only applies to finding the element, NOT waiting for it to become visible. Adding `.catch()` prevents proper waiting by swallowing timeout errors.
   - ✅ **CORRECT**: Wrap in try-catch to wait for the element, then check visibility for logging:
     ```typescript
     let visible = false;
     try {
       await expect(element).toBeVisible({ timeout: 15000 });
       visible = await element.isVisible();
     } catch (error) {
       visible = false;
     }
     ```
   - The `expect()` assertion actively waits for the element to become visible within the timeout period. The try-catch prevents Playwright stack traces.
7. **Navigation with Async Operations**: When clicks trigger async operations (database queries, API calls) before navigation, use `waitUntil: 'domcontentloaded'` with increased timeout:
   - ❌ **WRONG**: `await button.click(); await page.waitForURL(/\/target/);` - Default `waitUntil: 'load'` may timeout when async DB operations delay navigation
   - ✅ **CORRECT**: `await button.click(); await page.waitForURL(/\/target/, { timeout: 20000, waitUntil: 'domcontentloaded' });` - Waits for DOM ready instead of full page load, allows time for async operations
   - Use this pattern when click handlers perform database/API operations before calling `navigate()`
8. **Test Isolation - Page Navigation**: When running tests sequentially in a suite, ensure proper page state isolation to prevent state pollution between tests:
   - ❌ **WRONG**: Relying on previous test's navigation or assuming clean state
   - ✅ **CORRECT**: Each test should explicitly navigate to its starting page before authentication/setup:
     ```typescript
     test("should perform action", async ({ page }) => {
       await page.goto("/starting-page");
       await signIn(page, testUser, password);
       // ... rest of test
     });
     ```
   - **Why**: Tests may pass in isolation but fail in suite due to page state from previous tests. Explicit navigation ensures each test starts from a known state.
   - **When to apply**: Any test that can be run both individually and as part of a suite, especially tests involving authentication or page-specific state.
9. **Structured Logging**: Every assertion logged using `logTestResult()` - stores details only for failures
10. **Real User Flows**: Test complete user pathways including role/subscription checks
11. **Screenshot on Failure**: Automatically captured via `logTestResult()` helper
12. **Toast Error Checking**: Automatically checked and logged via `logTestResult()` helper
13. **Summary Output Only**: Single summary printed after all tests complete, no intermediate logs

### Unit Tests (Playwright)

Unit tests focus on testing complex logic and algorithms directly by importing app functions and testing them with real database data.

```typescript
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { TestResultLogger, formatTestConditions } from "../src/lib/test.utils";
import { myAlgorithmFunction } from "../src/lib/my-algorithm.utils";
import { ENV } from "../src/lib/env.utils";
import * as fs from "fs";
import * as path from "path";

const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY);

test.describe("Algorithm Name Tests", () => {
  const logger = new TestResultLogger();

  test.beforeAll(async () => {
    console.log("\n=== ALGORITHM TESTS ===\n");
  });

  test("should match correct criteria", async () => {
    const { data: userPrefs } = await supabase
      .from("partner_preferences")
      .select("*")
      .eq("user_id", "seeded-user-id")
      .single();

    const result = await myAlgorithmFunction({
      userPrefs: userPrefs,
      someParam: "value",
      client: supabase,
    });

    const conditions = formatTestConditions({
      input: "value",
      filter: "active",
    });
    const passed = result.length === 5;

    logger.log(
      "Algorithm matching criteria",
      conditions,
      "Results: 5 matches",
      `Results: ${result.length} matches`,
      passed
    );

    if (!passed) {
      throw new Error("Test failed - see summary for details");
    }

    expect(result.length).toBe(5);
  });

  test.afterAll(async () => {
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
        },
        null,
        2
      )
    );

    console.log("\n=== END OF TESTS ===\n");
  });
});
```

#### Unit Test Rules

1. **Import from App Code**: Test functions must be imported from actual application files (single source of truth)
2. **Use Service Role Client**: Create a Supabase client with service role key to bypass RLS policies
3. **Inject Client into Functions**: Pass the service role client to app functions using the client injection pattern
4. **Use Seeded Data**: Query database for seeded test data, never create mock data
5. **Real Database**: Always use actual database interactions, never mocks
6. **Use TestResultLogger**: Create logger instance at describe level, same as E2E tests
7. **File-Based Logging**: Write logger data to JSON file in `test.afterAll()` for reporter aggregation
8. **Format Conditions**: Use `formatTestConditions()` for consistent logging
9. **Throw on Failure**: Throw generic error if test fails to preserve test failure status
10. **Environment Compatibility**: All imported code must use `@/lib/env.utils` for universal compatibility (see Environment Compatibility section below)

## Environment Compatibility for Unit Tests

All code that may be imported by unit tests must use the centralized environment utilities to ensure compatibility with both browser and Node.js test environments.

### Universal Approach

**Always use `@/lib/env.utils` for environment variables and browser APIs.** This ensures universal compatibility with zero performance overhead.

#### Environment Variables

```typescript
import { ENV } from "@/lib/env.utils";

const apiUrl = ENV.SUPABASE_URL;
const apiKey = ENV.SUPABASE_KEY;
```

#### Browser APIs

```typescript
import { getBrowserAPI } from "@/lib/env.utils";

const storage = getBrowserAPI(() => localStorage);
const location = getBrowserAPI(() => window.location);
```

### Why This Approach

**Performance**: The environment checks happen once at module load time, not on every function call. There is zero runtime performance penalty.

**Consistency**: Using centralized utilities ensures the same pattern everywhere, making the codebase predictable and maintainable.

**Testability**: Any code using these utilities can be safely imported and tested in unit tests without modification.

### Implementation Example

The Supabase client ([src/integrations/supabase/client.ts](../src/integrations/supabase/client.ts)) demonstrates this pattern:

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { ENV, getBrowserAPI } from "@/lib/env.utils";

export const supabase = createClient<Database>(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_KEY,
  {
    auth: {
      storage: getBrowserAPI(() => localStorage),
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
```

### When to Apply

**Apply this pattern universally** in:

- All utility files that access environment variables
- All code that uses browser APIs (localStorage, window, document, etc.)
- Any file that might be imported by unit tests
- Shared configuration files

The overhead is negligible and the consistency benefit is significant. When in doubt, use the env utilities.

## Client Injection Pattern

All database utility functions accept an optional Supabase client parameter, enabling tests to inject a service role client while app code uses the default client-side client.

### In Utility Functions

All functions that query the database must follow this pattern:

```typescript
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

interface FunctionOptions {
  someParam: string;
  client?: SupabaseClient;
}

export const myDatabaseFunction = async ({
  someParam,
  client = supabase,
}: FunctionOptions) => {
  const { data, error } = await client
    .from("table_name")
    .select("*")
    .eq("field", someParam);

  if (error) throw error;
  return data;
};
```

**Requirements:**

1. Add `client?: SupabaseClient` to the options interface
2. Default to `client = supabase` in function parameters
3. Replace all `supabase.from()` calls with `client.from()`

### In Unit Tests

All unit tests must create a service role client and inject it into tested functions:

```typescript
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { myDatabaseFunction } from "@/lib/my-utils";
import { ENV } from "@/lib/env.utils";

const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY);

test("should query database correctly", async () => {
  const result = await myDatabaseFunction({
    someParam: "test",
    client: supabase,
  });

  expect(result).toBeDefined();
});
```

**Requirements:**

1. Create client with `ENV.SUPABASE_SERVICE_ROLE_KEY`
2. Pass `client: supabase` to all tested functions
3. Query seeded data from database

### Example Implementation

Utility function:

```typescript
interface SearchOptions {
  filters: FilterCriteria;
  sortBy: string;
  client?: SupabaseClient;
}

export const searchResults = async ({
  filters,
  sortBy,
  client = supabase,
}: SearchOptions) => {
  const { data } = await client
    .from("items")
    .select("*")
    .eq("category", filters.category);
  return data;
};
```

Unit test:

```typescript
const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY);

const results = await searchResults({
  filters: { category: "electronics" },
  sortBy: "price",
  client: supabase,
});
```

## Logging

### File-Based Logging with Aggregated Summary Output

All tests use a **file-based inter-process communication** architecture that works reliably with Playwright's multi-process test execution model.

#### The Challenge

Playwright runs tests in isolated worker processes and buffers all output (including `console.log()` and `process.stdout.write()`), making direct logging from tests impossible. Additionally, each nested `test.describe()` block runs its own `test.afterAll()` hook, fragmenting test data.

#### The Solution

Tests write their results to timestamped JSON files during execution, and the reporter aggregates ALL these files at the end to produce a comprehensive summary with proper global test numbering.

#### Architecture Flow

```
Test Worker Process (isolated):
  test() executes
    ↓ calls logTestResult()
    ↓ logger.log() stores in memory
  test.afterAll() runs (once per describe block)
    ↓ logger.getSerializableData()
    ↓ writes test-results/afterall-call-{timestamp}.json

Reporter Process (main):
  onEnd() hook executes (after ALL tests)
    ↓ reads ALL afterall-call-*.json files
    ↓ aggregates tests with global numbering (1...N)
    ↓ builds complete summary
    ↓ outputs via process.stdout.write() (WORKS!)
    ↓ cleans up temporary files
```

#### Components

**1. Minimal Test Reporter** ([e2e/utils/minimal-reporter.ts](../e2e/utils/minimal-reporter.ts))

- **During execution**: Displays one line per test: `✓   1 …test name`
- **In `onEnd()`**: Reads all `afterall-call-*.json` files, aggregates data, renumbers tests globally, outputs complete summary
- Runs in main process with proper stdout access

**2. TestResultLogger** ([src/lib/test.utils.ts](../src/lib/test.utils.ts))

- Tracks test results in memory during test execution
- **Passed tests**: Counted only, minimal data
- **Failed tests**: Complete diagnostics (conditions, expectations, observations, screenshots, error toasts)
- **`getSerializableData()`**: Returns JSON-ready structure for file writing

**3. test.afterAll() Hook** (in test files)

- Writes `test-results/afterall-call-{timestamp}.json` with logger data
- Creates one file per nested `test.describe()` block
- Files persist across process boundaries

**4. File Aggregation** (reporter's `onEnd()`)

- Collects ALL `afterall-call-*.json` files from test run
- Renumbers tests globally (avoiding duplicate numbers from nested blocks)
- Builds unified summary
- Cleans up temporary files

#### Summary Output Examples

**All Tests Pass:**

```
30 tests | 30 passed | 0 failed
```

**With Failures:**

```
30 tests | 25 passed | 5 failed

Failed Tests:

10. should show "Manage Subscription" button for premium users
   Conditions: user=premium@test.com, page=/subscription
   Expected: Shows "Manage Subscription"
   Observed: null
   Screenshot: test-results/failures/manage-subscription-button-1735123456789.png

14. should block free users from messaging coaches
   Conditions: user=free@test.com, action=message click
   Expected: Premium modal appears
   Observed: false
   Screenshot: test-results/failures/free-user-messaging-block-1735123456790.png
   Error Toast: Failed to load coaches

17. should allow premium users to view courts map
   Conditions: user=premium@test.com, page=/courts
   Expected: Map visible or no prompt
   Observed: Map: false, Prompt: true
   Screenshot: test-results/failures/premium-user-courts-access-1735123456791.png
```

### Test Structure with File-Based Logging

All E2E tests follow this pattern for file-based logging with aggregated summary output:

```typescript
import * as fs from "fs";
import * as path from "path";

test.describe("Feature Tests", () => {
  const logger = new TestResultLogger();

  test.afterAll(async () => {
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
        },
        null,
        2
      )
    );
  });

  test("should perform action", async ({ page }) => {
    await page.goto("/feature");

    const element = page.getByTestId(TestId.FEATURE_BUTTON);

    let isVisible = false;
    try {
      await expect(element).toBeVisible({ timeout: 10000 });
      isVisible = await element.isVisible();
    } catch (error) {
      isVisible = false;
    }

    await logTestResult(
      logger,
      page,
      "Feature button visibility",
      formatTestConditions({ user: "authenticated", page: "/feature" }),
      "Button should be visible",
      isVisible,
      "Button is visible",
      "Button not found"
    );

    if (!isVisible) {
      throw new Error("Test failed - see summary for details");
    }
  });
});
```

**Key Requirements:**

1. **Import fs and path**: Required for file-based inter-process communication
2. **Write to JSON file in test.afterAll()**: Persists data across process boundaries
3. **Use timestamped filenames**: Ensures unique files for each describe block
4. **Wrap assertions in try-catch**: Prevents Playwright stack traces during execution
5. **Use logTestResult helper**: Automatically captures screenshots and error toasts on failure
6. **Throw generic error on failure**: Preserves test failure status without duplicate error details
7. **All diagnostic data goes through logger**: Conditions, expectations, observed values, screenshots, error toasts
8. **MinimalReporter aggregates all files**: Reporter's `onEnd()` reads all JSON files and outputs unified summary

### Why This File-Based Logging Strategy?

**Benefits:**

1. **Clean Execution Output**: Minimal reporter shows progress without clutter
2. **No Duplicate Errors**: Playwright stack traces suppressed, all diagnostics in summary
3. **Actionable Failure Details**: Complete context provided only for failures
4. **Efficient Review**: Passed tests counted only, failures get full attention
5. **Automatic Diagnostics**: Screenshots and error toasts captured without manual effort
6. **Centralized Aggregation**: Single summary shows results from all test files in the run
7. **Reliable Output**: Uses Playwright's reporter API which has proper stdout access
8. **Process-Safe**: File system bridges isolated worker and reporter processes

**Architecture Advantages:**

- **No Process Isolation Issues**: Files persist across process boundaries
- **Handles Nested Describes**: Each describe block writes its own file with unique timestamp
- **File-Based IPC**: Test workers write JSON files, reporter reads and aggregates
- **Reporter Hook**: Aggregation and output happen in `onEnd()` when Playwright allows stdout
- **Universal Application**: Works for all test files without modification

**Applied Universally:**

- All E2E tests use `TestResultLogger` with `logTestResult()` helper (for page interactions)
- All unit tests use `TestResultLogger` with `logger.log()` (for direct function testing)
- Both E2E and unit tests use the same file-based logging approach
- Minimal reporter configured in `playwright.config.ts`
- `test.afterAll()` writes JSON files to `test-results/afterall-call-{timestamp}.json`
- MinimalReporter aggregates all JSON files in its `onEnd()` hook

## Element Selection with TestId Enum

### Adding New Test IDs

When a component needs testing, add data-testid attributes:

1. **Add to enum** in `src/test.types.ts`:

```typescript
export enum TestId {
  NEW_FEATURE_BUTTON = "new-feature-button",
  NEW_FEATURE_MODAL = "new-feature-modal",
}
```

2. **Add to component**:

```tsx
import { TestId } from "@/test.types";

<button data-testid={TestId.NEW_FEATURE_BUTTON}>Click Me</button>;
```

3. **Use in tests**:

```typescript
await clickByTestId(page, TestId.NEW_FEATURE_BUTTON);
const isVisible = await isVisibleByTestId(page, TestId.NEW_FEATURE_MODAL);
```

### Element Selection Helpers

Use these helper functions instead of manual selectors:

```typescript
const element = await getElementByTestId(page, TestId.SUBMIT_BUTTON);

await clickByTestId(page, TestId.SUBMIT_BUTTON);

await fillByTestId(page, TestId.EMAIL_INPUT, "user@example.com");

const isVisible = await isVisibleByTestId(page, TestId.MODAL, 3000);

const text = await getTextByTestId(page, TestId.WELCOME_MESSAGE);

const count = await countByTestId(page, TestId.LIST_ITEM);

const appeared = await waitForElement(page, TestId.LOADING_SPINNER);
```

## Authentication Helpers

### Sign In

```typescript
await signIn(page, "test@example.com", "password123");
```

### Sign Out

```typescript
await signOut(page);
```

### Sign Up

```typescript
await signUp(page, {
  email: generateUniqueEmail("test@example.com"),
  password: "password123",
  fullName: "Test User",
  // Add other required fields based on your application
});
```

### Generate Unique Email

```typescript
const uniqueEmail = generateUniqueEmail("test@example.com");
```

## Seed File Integration

### Understanding Seeded Data

The seed file (`scripts/seed.ts`) contains:

- Pre-created user accounts with known credentials
- Database records for all test scenarios
- Relationships between users, preferences, and features

### Using Seeded Data in Tests

```typescript
await signIn(page, "test.user@example.com", "testPassword123");

const { data: user } = await supabase.auth.admin.listUsers();
const testUser = users.find((u) => u.email === "test.user@example.com");
```

### Resetting and Seeding the Database

The database must be reset before seeding to ensure a clean state. Use the following command:

```bash
npm run seed
```

This command:

1. Prompts for confirmation with a warning about data deletion
2. Resets the database using `supabase db reset --linked --yes`
3. Runs the seed script to populate fresh test data

The seed script ([scripts/seed.ts](../scripts/seed.ts)) expects a clean database and will fail if users already exist. Always use `npm run seed` which handles the reset automatically.

### Adding New Seed Data

When a test requires new data:

1. Add the data to `scripts/seed-data.ts`
2. Run the reset and seed command: `npm run seed`
3. Type `yes` when prompted to confirm database reset
4. Reference the seeded data in tests using known identifiers

## Seed Data and Test Cleanup Pattern

### Centralized Seed Data

All seed data is exported from `scripts/seed-data.ts` as the single source of truth:

```typescript
import { SEEDED_USERS, USER_NAMES, SEED_PASSWORD } from "../scripts/seed-data";
```

**Available exports:**

- `PLAYER_DATA` - Array of player seed data (for creating seeds)
- `COACH_DATA` - Array of coach seed data (for creating seeds)
- `SEEDED_USERS` - Object with email lookup by category/key
- `USER_NAMES` - Object with name lookup by email
- `SEED_PASSWORD` - Shared password for all seeded users (`'Password123!'`)

**Example usage in tests:**

```typescript
const alexEmail = SEEDED_USERS.players.beginner;
const coachEmail = SEEDED_USERS.coaches.sydney_beginner;
const alexName = USER_NAMES[alexEmail];

await loginAsUser(page, alexEmail, SEED_PASSWORD);
```

### Test Cleanup Strategy

**Rule: Cleanup runs BEFORE and AFTER each test**

This ensures test isolation regardless of previous test failures or partial execution.

#### Why Both beforeEach and afterEach?

- **beforeEach**: Ensures clean state even if previous test failed mid-execution
- **afterEach**: Cleans up after current test for next run

#### Implementation Pattern

```typescript
import { cleanupMessagingData } from "./utils/test-cleanup";
import { SEEDED_USERS } from "../scripts/seed-data";

test.describe("Feature Tests", () => {
  const testUserEmails = [
    SEEDED_USERS.players.beginner,
    SEEDED_USERS.players.intermediate,
  ];

  test.beforeEach(async () => {
    await cleanupMessagingData(testUserEmails);
  });

  test.afterEach(async () => {
    await cleanupMessagingData(testUserEmails);
  });

  test("should test feature", async ({ page }) => {
    // Test implementation
  });
});
```

#### Available Cleanup Functions

Located in `e2e/utils/test-cleanup.ts`:

**`cleanupMessagingData(userEmails: string[])`**

- Deletes conversations involving specified users
- Deletes messages in those conversations
- Deletes booking_offers in those conversations

**`cleanupCommunityData(userEmails: string[])`**

- Deletes posts created by specified users
- Deletes comments created by specified users

**`cleanupBookingData(userEmails: string[])`**

- Deletes bookings involving specified users
- Deletes booking_offers involving specified users

**`cleanupUserGeneratedContent(userEmails: string[])`**

- Calls all cleanup functions above
- Use for comprehensive cleanup

#### Database Reset vs Test Cleanup

**Seed Script (`npm run seed`)**:

- Full database reset + seed all data
- Run once when:
  - Starting test suite development
  - Seed data structure changes
  - Database schema changes

**Test Cleanup (beforeEach/afterEach)**:

- Surgical cleanup of test-affected data only
- Runs automatically before/after every test
- Only cleans data that test will create/modify
- Preserves all seed data for other tests

**Example:**

```typescript
// Seed script creates: 21 players + 5 coaches = 26 users
await seedDatabase();

// Test cleanup only removes data created by test users
await cleanupMessagingData([
  SEEDED_USERS.players.beginner,
  SEEDED_USERS.players.intermediate,
]);

// Other 24 users' data remains untouched
```

### Best Practices

1. **Specify minimal user list**: Only include users actually used in the test suite
2. **Group related tests**: Tests using same users should be in same describe block
3. **Update cleanup list**: Add users to testUserEmails array when adding new tests
4. **Don't cleanup in test body**: Let beforeEach/afterEach handle it automatically

### Example: Complete Test File

```typescript
import { test, expect } from "@playwright/test";
import { SEEDED_USERS, USER_NAMES, SEED_PASSWORD } from "../scripts/seed-data";
import { cleanupMessagingData } from "./utils/test-cleanup";

test.describe("Messaging Tests", () => {
  const testUserEmails = [
    SEEDED_USERS.players.beginner,
    SEEDED_USERS.players.intermediate,
    SEEDED_USERS.coaches.sydney_beginner,
  ];

  test.beforeEach(async () => {
    await cleanupMessagingData(testUserEmails);
  });

  test.afterEach(async () => {
    await cleanupMessagingData(testUserEmails);
  });

  test("should send message", async ({ page }) => {
    await page.goto("/auth");
    await page.fill("#email", SEEDED_USERS.players.beginner);
    await page.fill("#password", SEED_PASSWORD);
    // ... rest of test
  });
});
```

## Common Patterns

### Testing Role-Based Access

```typescript
test("admin users can access admin feature", async ({ page }) => {
  await signIn(page, "admin@test.com", "password123");
  await page.goto("/admin");

  const adminVisible = await isVisibleByTestId(page, TestId.ADMIN_PANEL);

  logger.log(
    "Admin user access",
    formatTestConditions({ role: "admin", feature: "admin panel" }),
    "Admin panel should be visible",
    adminVisible ? "Admin panel is visible" : "Admin panel not found",
    adminVisible
  );

  await expect(
    await getElementByTestId(page, TestId.ADMIN_PANEL)
  ).toBeVisible();
});
```

### Testing Feature Access

```typescript
test("standard users see upgrade prompt for premium features", async ({
  page,
}) => {
  await signIn(page, "standard@test.com", "password123");
  await page.goto("/premium-feature");

  const upgradeVisible = await isVisibleByTestId(page, TestId.UPGRADE_PROMPT);

  logger.log(
    "Standard user upgrade prompt",
    formatTestConditions({ role: "standard", feature: "premium feature" }),
    "Upgrade prompt should be visible",
    upgradeVisible ? "Upgrade prompt is visible" : "Upgrade prompt not found",
    upgradeVisible
  );

  await expect(
    await getElementByTestId(page, TestId.UPGRADE_PROMPT)
  ).toBeVisible();
});
```

### Testing Filtering Logic

```typescript
test("filters results by category", async () => {
  const filters = {
    category: "electronics",
    minPrice: 100,
  };

  const results = await getFilteredResults(filters);

  const conditions = formatTestConditions({
    category: filters.category,
    minPrice: filters.minPrice,
  });

  console.log(`[TEST] ${conditions}`);
  console.log(
    `  → Results: ${results.length} | All electronics: ${results.every(
      (r) => r.category === "electronics"
    )}`
  );

  expect(results.every((r) => r.category === "electronics")).toBe(true);
});
```

## Summary Checklist

### Before Submitting Any Test

**Utility Functions:**

- [ ] Uses `ENV` from `@/lib/env.utils` for environment variables
- [ ] Uses `getBrowserAPI()` for browser APIs
- [ ] Database functions accept `client?: SupabaseClient` parameter
- [ ] Database functions default to `client = supabase`
- [ ] All `supabase.from()` replaced with `client.from()`

**Unit Tests:**

- [ ] Imports from app code (single source of truth)
- [ ] Creates service role client with `ENV.SUPABASE_SERVICE_ROLE_KEY`
- [ ] Passes `client: supabase` to tested functions
- [ ] Queries seeded data from real database
- [ ] Creates `TestResultLogger` instance at describe level
- [ ] Uses `formatTestConditions()` for logging
- [ ] Uses `logger.log()` for all test assertions
- [ ] Writes logger data to JSON file in `test.afterAll()`
- [ ] Throws generic error on failure: `throw new Error('Test failed - see summary for details')`
- [ ] No mocks or stubs

**E2E Tests:**

- [ ] Imports `TestResultLogger` from `@/lib/test.utils`
- [ ] Imports `TestId` enum from `@/test.types`
- [ ] Uses `signIn()` for authentication
- [ ] Selects elements using `TestId` enum values
- [ ] Wraps `expect()` assertions in try-catch blocks
- [ ] Uses `logTestResult()` for all assertions (not `logger.log()`)
- [ ] Writes logger data to JSON file in `test.afterAll()`
- [ ] Throws generic error on failure: `throw new Error('Test failed - see summary for details')`
- [ ] No fixed waits (`waitForTimeout`)

**Documentation:**

- [ ] Test documented in `docs/Tests.md`

## Complete Example Test File

```typescript
import { test, expect } from "@playwright/test";
import {
  TestResultLogger,
  clickByTestId,
  isVisibleByTestId,
  getElementByTestId,
  signIn,
  formatTestConditions,
  logTestResult,
} from "../src/lib/test.utils";
import { TestId } from "../src/test.types";
import * as fs from "fs";
import * as path from "path";

test.describe("Feature Access Tests", () => {
  const logger = new TestResultLogger();

  test.afterAll(async () => {
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
        },
        null,
        2
      )
    );
  });

  test("admin user can access admin feature", async ({ page }) => {
    await signIn(page, "admin@test.com", "password123");
    await page.goto("/admin");

    const adminVisible = await isVisibleByTestId(page, TestId.ADMIN_PANEL);

    logger.log(
      "Admin access",
      formatTestConditions({ role: "admin", feature: "admin panel" }),
      "Admin panel should be visible",
      adminVisible ? "Admin panel is visible" : "Admin panel not found",
      adminVisible
    );

    await expect(
      await getElementByTestId(page, TestId.ADMIN_PANEL)
    ).toBeVisible();
  });

  test("standard user sees upgrade prompt", async ({ page }) => {
    await signIn(page, "standard@test.com", "password123");
    await page.goto("/premium-feature");

    const upgradePromptVisible = await isVisibleByTestId(
      page,
      TestId.UPGRADE_PROMPT
    );

    logger.log(
      "Standard user upgrade prompt",
      formatTestConditions({ role: "standard", feature: "premium feature" }),
      "Upgrade prompt should be visible",
      upgradePromptVisible
        ? "Upgrade prompt visible"
        : "Upgrade prompt not found",
      upgradePromptVisible
    );

    await expect(
      await getElementByTestId(page, TestId.UPGRADE_PROMPT)
    ).toBeVisible();
  });
});
```

## Implementation Checklist

### Writing a New Utility Function

Apply all three patterns to every utility function:

**1. Environment Utilities**

- [ ] Import `ENV` from `@/lib/env.utils`
- [ ] Replace all `process.env.X` or `import.meta.env.X` with `ENV.X`
- [ ] Import `getBrowserAPI` for any browser API usage
- [ ] Wrap browser APIs: `getBrowserAPI(() => localStorage)`

**2. Client Injection (if function queries database)**

- [ ] Add `client?: SupabaseClient` to options interface
- [ ] Add `client = supabase` as default parameter
- [ ] Replace all `supabase.from()` with `client.from()`
- [ ] Apply to all database operations in the function

### Writing a New Unit Test

Follow this exact structure for all unit tests:

**Required Imports:**

```typescript
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { TestResultLogger, formatTestConditions } from "../src/lib/test.utils";
import { myFunction } from "../src/lib/my-utils";
import { ENV } from "../src/lib/env.utils";
import * as fs from "fs";
import * as path from "path";
```

**Required Setup:**

```typescript
const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY);
```

**Test Structure:**

- [ ] Import function from app code (never rewrite logic)
- [ ] Create `TestResultLogger` instance at describe level
- [ ] Create service role client with `ENV.SUPABASE_SERVICE_ROLE_KEY`
- [ ] Query seeded data using service role client
- [ ] Pass `client: supabase` to tested function
- [ ] Use `formatTestConditions()` for logging
- [ ] Use `logger.log()` with conditions, expected, and observed values
- [ ] Throw generic error on failure to preserve test status
- [ ] Add `beforeAll` with test banner
- [ ] Add `afterAll` with file-based logging and completion banner

### Writing a New E2E Test

Follow this exact structure for all E2E tests:

**Required Imports:**

```typescript
import { test, expect } from "@playwright/test";
import {
  TestResultLogger,
  getElementByTestId,
  clickByTestId,
  signIn,
  formatTestConditions,
  logTestResult,
} from "../src/lib/test.utils";
import { TestId } from "../src/test.types";
import * as fs from "fs";
import * as path from "path";
```

**Test Structure:**

- [ ] Create `TestResultLogger` instance at describe level
- [ ] Use `signIn()` for authentication
- [ ] Select elements using `TestId` enum
- [ ] Wrap `expect()` assertions in try-catch blocks
- [ ] Use `logTestResult()` for all assertions (stores failure details automatically)
- [ ] Throw generic error on failure to preserve test status
- [ ] Write logger data to JSON file in `test.afterAll()` for reporter aggregation
- [ ] Never use fixed waits (`waitForTimeout`)

### Pattern Examples

**Utility Function with All Patterns:**

```typescript
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ENV, getBrowserAPI } from "@/lib/env.utils";

interface Options {
  userId: string;
  client?: SupabaseClient;
}

export const getUserData = async ({ userId, client = supabase }: Options) => {
  const apiUrl = ENV.SUPABASE_URL;
  const storage = getBrowserAPI(() => localStorage);

  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId);

  if (error) throw error;
  return data;
};
```

**Unit Test with All Patterns:**

```typescript
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { TestResultLogger, formatTestConditions } from "../src/lib/test.utils";
import { getUserData } from "../src/lib/user.utils";
import { ENV } from "../src/lib/env.utils";
import * as fs from "fs";
import * as path from "path";

const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY);

test.describe("User Data Tests", () => {
  const logger = new TestResultLogger();

  test("should get user data", async () => {
    const result = await getUserData({
      userId: "seeded-user-id",
      client: supabase,
    });

    const conditions = formatTestConditions({
      userId: "seeded-user-id",
    });
    const passed = result !== undefined && result !== null;

    logger.log(
      "Get user data",
      conditions,
      "User data returned",
      result ? "User data returned" : "No data returned",
      passed
    );

    if (!passed) {
      throw new Error("Test failed - see summary for details");
    }

    expect(result).toBeDefined();
  });

  test.afterAll(async () => {
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
        },
        null,
        2
      )
    );
  });
});
```

## Applying This Pattern to Other Projects

To apply this testing pattern to a new project:

1. **Copy `src/lib/test.utils.ts`** to the new project
2. **Copy `src/lib/env.utils.ts`** to the new project
3. **Create `src/test.types.ts`** with a `TestId` enum
4. **Create `scripts/seed.ts`** with test data
5. **Add data-testid attributes** to components using the enum
6. **Write tests** following the patterns in this document
7. **Configure Playwright** with proper environment variables
8. **Reference this document** when writing new tests

This approach ensures consistent, maintainable, and reliable tests across all projects.

## Payment Flow Testing Methodology

### Complete Payment Pathway Verification

The payment testing strategy uses a **layered approach** to verify the complete payment flow from user action through Stripe integration to database updates. This ensures that if all tests pass, only infrastructure configuration (not code changes) is needed for production.

### Three-Layer Testing Strategy

**Layer 1: E2E User Workflows** ([e2e/booking-payment.spec.ts](../e2e/booking-payment.spec.ts))

- Player creates booking offer via UI
- Coach accepts offer in browser
- Stripe redirect verified
- Success page displays after payment

**Layer 2: Stripe API Integration** ([**tests**/create-coach-booking-integration.test.ts](../__tests__/create-coach-booking-integration.test.ts))

- Edge function creates real Stripe checkout session
- Verifies 10% application fee set in Stripe API call
- Confirms transfer destination = coach's Stripe Connect account
- Validates metadata passed for webhook reconciliation

**Layer 3: Webhook Processing** ([**tests**/stripe-webhook.test.ts](../__tests__/stripe-webhook.test.ts))

- Simulates `checkout.session.completed` webhook from Stripe
- Verifies booking status updates from "pending" → "confirmed"
- Confirms `stripe_payment_intent_id` saved to database
- Tests metadata extraction from webhook event

### Complete Flow Verification

```
[E2E Test] Player creates offer
     ↓
[E2E Test] Coach accepts & clicks "Pay"
     ↓
[Integration Test] Edge function creates Stripe session
                   - application_fee_amount = 10% ✓
                   - transfer_data.destination = coach account ✓
                   - metadata.booking_id = UUID ✓
     ↓
[User completes payment in Stripe - not tested, Stripe's responsibility]
     ↓
[Webhook Test] checkout.session.completed webhook received
               - Extracts booking_id from metadata ✓
               - Updates booking.status = "confirmed" ✓
               - Saves payment_intent_id ✓
     ↓
[E2E Test] Success page displays
```

### Why This Approach Works

**Tests verify YOUR code logic:**

- Fee calculations (unit tests)
- Stripe API calls with correct parameters (integration tests)
- Webhook handler business logic (webhook tests)
- UI workflows (E2E tests)

**Tests DON'T verify Stripe's infrastructure (not your responsibility):**

- Actual payment processing (Stripe's responsibility - they test this)
- Webhook HTTP delivery from Stripe servers (Stripe's responsibility - they test this)
- Production webhook endpoint accessibility (DevOps configuration)

### Production Readiness Guarantee

**If all automated tests pass, your development work is 100% complete.**

The tests verify every line of YOUR code:

- ✅ Fee calculations and business logic
- ✅ Stripe API integration (creates real sessions on Stripe's test servers)
- ✅ Webhook handler processes events correctly
- ✅ Database updates work as expected
- ✅ UI workflows function properly

**Remaining work is infrastructure/deployment (NOT development):**

1. Replace test API keys with live keys (configuration)
2. Configure production webhook endpoint in Stripe Dashboard (configuration)
3. Set production webhook secret in environment (configuration)

These are deployment configuration steps, not code changes. Your code is proven correct by the automated test suite.

### How Tests Use Real Stripe API

The integration tests call the **actual Stripe API** (test mode):

```typescript
// Your edge function makes a REAL network request to Stripe
await stripe.checkout.sessions.create({...})
  ↓
// Stripe creates a REAL session on their servers (test mode)
  ↓
// Test retrieves the REAL session data from Stripe
const session = await stripe.checkout.sessions.retrieve(sessionId)
  ↓
// Verifies the REAL data Stripe stored
expect(session.payment_intent_data.application_fee_amount).toBe(1500)
```

This is not mocked - your code talks to real Stripe servers using test API keys.

## Test Utilities Reference

All test helper functions are centralized in [src/lib/test.utils.ts](../src/lib/test.utils.ts).

## Playwright Configuration

### Reporter Configuration

The Playwright configuration ([playwright.config.ts](../playwright.config.ts)) uses only the minimal reporter to display clean, file-based logging output:

```typescript
reporter: [["./e2e/utils/minimal-reporter.ts"]];
```

**Why only minimal reporter?**

- **Clean terminal output**: Shows only essential test progress and final summary
- **No browser popups**: The HTML reporter (`['html']`) opens a browser after tests complete, which interrupts the workflow
- **File-based logging**: All test results are captured in JSON files and aggregated by the minimal reporter
- **CI/CD friendly**: Terminal-only output works perfectly in continuous integration environments

**To add HTML reporter (not recommended):**

If you need the HTML report for debugging, you can temporarily add it:

```typescript
reporter: [["./e2e/utils/minimal-reporter.ts"], ["html"]];
```

This will open a browser with detailed test results after each test run. Remove `['html']` to disable browser summaries.

## Test Execution

Run all tests: `npm run test`

Individual test commands documented in [Tests.md](Tests.md)

## Test Log Aggregation

### Overview

All test executions write detailed logs to `logs/tests/{test-name}/{timestamp}.txt`. The test log aggregation script consolidates the latest logs from each test suite into a single summary file for easy review.

### Aggregation Script

**Command:** `npm run test:summary`

This script:

1. Scans all test log directories in `logs/tests/`
2. Identifies the latest log file for each test suite (based on timestamp)
3. Aggregates all latest logs into a single summary file
4. Saves the summary to `logs/tests/summary/{timestamp}.txt`
5. Displays overall statistics in the terminal

### Output Structure

The aggregated summary file includes:

**Header Section:**

- Generation timestamp
- Overall statistics (total suites, tests passed/failed, pass rate)

**Per-Test Section:**
Each test suite section contains:

- Test suite name
- File path (e.g., `e2e/auth.spec.ts`)
- Run command (e.g., `npm run test:e2e:auth`)
- Last run timestamp
- Log file path
- Complete test execution log

**Example Summary Structure:**

```
OVERALL SUMMARY
Total Test Suites:        6
Suites with Logs:         5
Suites without Logs:      1
Total Tests:              124
Passed:                   120
Failed:                   4
Pass Rate:                96.8%
─────────────────────────────────────────────────────────────────────

Authentication Flow
File:      e2e/auth.spec.ts
Command:   npm run test:e2e:auth
Last Run:  2025-10-31 13-10-24-772
Log File:  logs/tests/auth/2025-10-31T13-10-24-772Z.txt
─────────────────────────────────────────────────────────────────────

Test Execution Report
Execution Time: 2025-10-31T13:10:24.772Z
...
```

### Configured Test Suites

The script aggregates logs from these test suites:

- Authentication Flow (`logs/tests/auth/`)
- Find Partners Pathway (`logs/tests/find-partners-onboarding/`)
- Find Partners Algorithm Unit (`logs/tests/find-partners-unit/`)
- Coach Booking & Payment (`logs/tests/booking-payment/`)
- Subscription Management (`logs/tests/subscription/`)
- Courts Discovery (`logs/tests/courts/`)

### Adding New Test Suites

To include additional test suites in the aggregation:

1. Open `scripts/aggregate-test-logs.js`
2. Add a new entry to the `TEST_CONFIGS` array:

```javascript
{
  name: 'Test Suite Name',
  dir: 'log-directory-name',
  file: 'e2e/test-file.spec.ts',
  command: 'npm run test:command'
}
```

3. The script will automatically include this suite in future aggregations

### Use Cases

**Review Latest Test Results:**
After running multiple test suites, use `npm run test:summary` to see all results in one place without searching through individual log directories.

**CI/CD Integration:**
Aggregate test logs after a full test suite run to generate a single artifact for build reports.

**Test History:**
The summary files are timestamped, creating a historical record of test runs over time.

**Quick Health Check:**
The terminal output provides immediate visibility into overall test health across all suites.
