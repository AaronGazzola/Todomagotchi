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

- **Base URL:** `http://localhost:8080`
- **Test Directory:** `./e2e`
- **Workers:** 1 in CI, optimal locally
- **Retries:** 2 in CI, 0 locally
- **Screenshots:** Only on failure
- **Traces:** On first retry (standard mode) or all tests (trace mode)

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
