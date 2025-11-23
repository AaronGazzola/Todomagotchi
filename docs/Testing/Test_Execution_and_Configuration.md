# Test Execution and Configuration

This document covers running tests, execution modes, Playwright configuration, and environment setup.

## Running Tests

### All Tests

```bash
npm run test:e2e
```

Runs all E2E tests in the `e2e/` directory.

---

### Specific Test Suites

```bash
# Auth tests
npm run test:e2e:auth

# Quiz tests
npm run test:e2e:quiz

# Watchlist tests
npm run test:e2e:watchlist

# Search tests
npm run test:e2e:search

# Recommendation tests
npm run test:e2e:recommendations
```

---

### Execution Modes

#### Standard Mode (Default)

```bash
npm run test:e2e:auth
```

**Behavior:**
- Headless browser (no visible window)
- Screenshots captured on failure
- Traces captured on first retry
- Fast execution

**Use when:**
- Running tests in CI/CD
- Quick local validation
- Standard development workflow

---

#### Headed Mode (Visible Browser)

```bash
npm run test:e2e:auth:headed
```

**Behavior:**
- Browser window visible
- Screenshots captured on failure
- Traces captured on first retry
- Slower execution (UI overhead)

**Use when:**
- Debugging test failures
- Understanding UI behavior
- Developing new tests
- Verifying visual appearance

---

#### Trace Mode (Full Debugging)

```bash
npm run test:e2e:auth:trace
```

**Behavior:**
- Headless browser
- Full trace + video for ALL tests (not just failures)
- Screenshots captured on failure
- Slowest execution (comprehensive logging)

**Use when:**
- Investigating flaky tests
- Understanding timing issues
- Debugging complex failures
- Need complete execution history

---

#### Summary Mode (Clean Console Output)

```bash
TEST_SUMMARY_ONLY=true npm run test:e2e
```

**Behavior:**
- Suppresses verbose Playwright output
- One-line-per-test summary
- Includes TestResultLogger summary at end

**Console Output:**
```
Running 6 tests using 1 worker

  ✓  1 …lete full player flow: signup -> signout -> signin (5.0s)
  ✓  2 … › should show error for invalid login credentials (1.2s)
  ✗  3 … › should update UI after signout (TIMEOUT after 30.0s)
```

**Use when:**
- CI/CD pipelines (cleaner build logs)
- Local development (less noise)
- Quick result scanning

---

### Viewing Test Results

#### Generate Test Report

```bash
npm run test:report
```

Generates a consolidated test report from all test results.

---

#### Generate Report and Cleanup

```bash
npm run test:report:cleanup
```

Generates report and cleans up old test results (keeps only latest per suite).

---

#### View Trace Files

```bash
npx playwright show-trace test-results/{TEST_RUN_ID}/trace.zip
```

Opens the Playwright trace viewer showing:
- Timeline of test execution
- Network requests and responses
- Console logs
- DOM snapshots
- Screenshots at each step

**Example:**
```bash
npx playwright show-trace test-results/2025-11-23_12-34-56-789_auth.spec/trace.zip
```

---

#### View README Report

```bash
cd test-results/{TEST_RUN_ID}
cat README.md
```

View human-readable test report with diagnostics.

---

## Playwright Configuration

### Base Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Global setup
  globalSetup: require.resolve('./e2e/global-setup'),

  // Timeout for each test (2 minutes)
  timeout: 120000,

  // Web server startup timeout (2 minutes)
  webServer: {
    timeout: 120000,
  },

  // Workers
  workers: process.env.CI ? 1 : undefined,

  // Retries
  retries: process.env.CI ? 2 : 0,

  // Reporters
  reporter: [
    ['list'], // Real-time console output
    ['./e2e/utils/consolidated-reporter.ts'], // Detailed reports
  ],

  // Base URL
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  // Output directory
  outputDir: process.env.TEST_RUN_ID
    ? `test-results/${process.env.TEST_RUN_ID}`
    : 'test-results/default',

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

---

### Key Configuration Options

#### Base URL

```typescript
use: {
  baseURL: 'http://localhost:3000',
}
```

All navigation uses relative paths:
```typescript
await page.goto('/');        // http://localhost:3000/
await page.goto('/auth');    // http://localhost:3000/auth
```

---

#### Test Directory

```typescript
testDir: './e2e',
```

All files matching `*.spec.ts` in `e2e/` directory are executed.

---

#### Workers

```typescript
workers: process.env.CI ? 1 : undefined,
```

**CI Environment:** 1 worker (sequential execution)
**Local Environment:** `undefined` (optimal parallel execution)

**Override for specific tests:**
```typescript
test.describe.configure({ workers: 1 });
```

See [Core_Rules.md - Rule 9](./Core_Rules.md#rule-9-use-minimum-required-workers) for when to override.

---

#### Retries

```typescript
retries: process.env.CI ? 2 : 0,
```

**CI Environment:** 2 retries (handles transient failures)
**Local Environment:** 0 retries (fail fast for quick feedback)

---

#### Reporters

```typescript
reporter: [
  ['list'], // Real-time console output
  ['./e2e/utils/consolidated-reporter.ts'], // Detailed reports
],
```

**list reporter:** Real-time test execution output
**consolidated-reporter:** Generates comprehensive README.md reports

See [Reporters_and_Reports.md](./Reporters_and_Reports.md) for details.

---

#### Screenshots

```typescript
use: {
  screenshot: 'only-on-failure',
}
```

**Options:**
- `'only-on-failure'` - Capture on test failure (recommended)
- `'on'` - Capture after every step
- `'off'` - Never capture

---

#### Traces

```typescript
use: {
  trace: 'on-first-retry',
}
```

**Options:**
- `'on-first-retry'` - Capture on first retry attempt (recommended)
- `'on'` - Capture for all tests (use in trace mode)
- `'off'` - Never capture

**Trace mode override:**
```bash
npm run test:e2e:auth:trace
```

Sets `trace: 'on'` for comprehensive debugging.

---

#### Timeout

```typescript
timeout: 120000, // 2 minutes
```

Maximum time for a single test. Fails if exceeded.

**Per-test override:**
```typescript
test('long-running test', async ({ page }) => {
  test.setTimeout(180000); // 3 minutes
  // Test logic...
});
```

---

#### Web Server Timeout

```typescript
webServer: {
  timeout: 120000, // 2 minutes
}
```

Maximum time to wait for dev server to start.

---

## Environment Variables

### Required Variables

Create `.env.local` with:

```env
# Supabase
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mapbox
VITE_MAPBOX_PUBLIC_TOKEN=your-mapbox-token

# Stripe
STRIPE_PUBLISHABLE_KEY=your-stripe-key
```

---

### Variable Descriptions

#### `VITE_SUPABASE_URL`

Supabase project URL. Used by application and tests.

**Example:** `http://localhost:54321` (local) or `https://xxx.supabase.co` (production)

---

#### `VITE_SUPABASE_PUBLISHABLE_KEY`

Supabase anonymous key. Public key for client-side operations.

**Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

#### `SUPABASE_SERVICE_ROLE_KEY`

Supabase service role key. **REQUIRED** for Supawright to create users and manage database.

**Security:** Never commit this key. Keep in `.env.local` only.

**Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

#### `VITE_MAPBOX_PUBLIC_TOKEN`

Mapbox API token for location-based features.

**Example:** `pk.eyJ1IjoieW91ciIsImEiOiJjbHR0ZXN0In0...`

---

#### `STRIPE_PUBLISHABLE_KEY`

Stripe publishable key for payment features.

**Example:** `pk_test_51H...`

---

### Loading Environment Variables

Environment variables are loaded automatically by Vite and Playwright.

**Vite:** Loads `.env.local` during dev server startup
**Playwright:** Loads `.env.local` during test execution

**Accessing in tests:**
```typescript
const supabaseUrl = process.env.VITE_SUPABASE_URL;
```

---

## Worker Configuration

### Default Configuration

```typescript
workers: process.env.CI ? 1 : undefined,
```

**CI:** 1 worker (sequential)
**Local:** `undefined` (optimal parallel execution)

---

### When to Use `workers: 1`

Override default configuration when:
- Tests modify shared database state
- Tests require sequential execution
- Tests have race condition concerns
- Tests are already isolated and parallelization adds no benefit

**Example:**
```typescript
test.describe.configure({ workers: 1 });

test.describe('Sequential Tests', () => {
  test('should execute first', async ({ page }) => { /* ... */ });
  test('should execute second', async ({ page }) => { /* ... */ });
});
```

See [Core_Rules.md - Rule 9](./Core_Rules.md#rule-9-use-minimum-required-workers) for details.

---

### When to Use Default (undefined)

Use default configuration when:
- Tests are fully isolated (Supawright creates unique users)
- Tests are independent and can run in any order
- Parallelization speeds up test suite

**Example:**
```typescript
test.describe('Parallel Tests', () => {
  test('Test 1', async ({ page }) => {
    const user = await supawright.auth.createUser({
      email: `test1-${Date.now()}@example.com`, // Unique user
      password: 'password123',
      email_confirm: true,
    });
    // Test logic...
  });

  test('Test 2', async ({ page }) => {
    const user = await supawright.auth.createUser({
      email: `test2-${Date.now()}@example.com`, // Different unique user
      password: 'password123',
      email_confirm: true,
    });
    // Test logic...
  });
});
```

---

## Global Setup

### Purpose

Initialize Supawright before tests run.

### File: `e2e/global-setup.ts`

```typescript
import { supawright } from 'supawright';

export default async function globalSetup() {
  await supawright.init({
    supabaseUrl: process.env.VITE_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });
}
```

### Configuration

Reference in `playwright.config.ts`:

```typescript
globalSetup: require.resolve('./e2e/global-setup'),
```

### Execution

Global setup runs **once before all tests** in the suite.

---

## Test Fixtures

### Custom test/expect Imports

**CRITICAL:** Always import `test` and `expect` from custom fixtures:

```typescript
import { test, expect } from './utils/test-fixtures'; // ✅ Correct
import { test, expect } from '@playwright/test';      // ❌ Wrong
```

### Why Custom Fixtures?

Custom fixtures extend Playwright with automatic diagnostic capture:
- Console logs
- Network failures
- Page errors

See [Test_Logging_and_Diagnostics.md](./Test_Logging_and_Diagnostics.md) for details.

---

## Output Directory Structure

```
test-results/
├── 2025-11-23_12-34-56-789_auth.spec/
│   ├── README.md               # Human-readable report
│   ├── test-report.json        # Structured data
│   ├── screenshot-1.png        # Failure screenshot
│   ├── trace.zip               # Debug trace
│   └── video.webm              # Test video (if enabled)
├── 2025-11-23_14-22-10-123_quiz.spec/
│   ├── README.md
│   ├── test-report.json
│   └── trace.zip
└── afterall-call-1732368896789.json  # TestResultLogger data
```

### TEST_RUN_ID Format

`YYYY-MM-DD_HHMMSS-mmm_testname`

**Example:** `2025-11-23_12-34-56-789_auth.spec`

See [Reporters_and_Reports.md](./Reporters_and_Reports.md) for details.

---

## Browser Configuration

### Default Browser: Chromium

```typescript
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
],
```

### Adding Additional Browsers

```typescript
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
],
```

**Run specific browser:**
```bash
npx playwright test --project=firefox
```

---

## Test Filtering

### Run Specific File

```bash
npx playwright test e2e/auth.spec.ts
```

---

### Run Tests Matching Pattern

```bash
npx playwright test --grep "signup"
```

Runs all tests with "signup" in the title.

---

### Run Tests in Headed Mode

```bash
npx playwright test --headed
```

---

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

Opens Playwright Inspector for step-by-step debugging.

---

## CI/CD Configuration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          VITE_MAPBOX_PUBLIC_TOKEN: ${{ secrets.VITE_MAPBOX_PUBLIC_TOKEN }}
          STRIPE_PUBLISHABLE_KEY: ${{ secrets.STRIPE_PUBLISHABLE_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

---

## Common Commands Reference

### Running Tests

```bash
# All tests
npm run test:e2e

# Specific suite
npm run test:e2e:auth
npm run test:e2e:quiz
npm run test:e2e:watchlist

# Execution modes
npm run test:e2e:auth:headed    # Visible browser
npm run test:e2e:auth:trace     # Full debugging

# Summary mode
TEST_SUMMARY_ONLY=true npm run test:e2e
```

---

### Viewing Results

```bash
# Generate report
npm run test:report

# Generate report and cleanup
npm run test:report:cleanup

# View trace
npx playwright show-trace test-results/{TEST_RUN_ID}/trace.zip

# View README
cat test-results/{TEST_RUN_ID}/README.md
```

---

### Database

```bash
# Seed database
npm run seed

# Reset database
npx prisma migrate reset
```

---

### Debugging

```bash
# Run specific test in debug mode
npx playwright test e2e/auth.spec.ts --debug

# Run tests with headed browser
npx playwright test --headed

# View trace after failure
npx playwright show-trace test-results/{TEST_RUN_ID}/trace.zip
```

---

## Troubleshooting

### Issue: Tests Timeout

**Cause:** Web server not starting or tests running longer than 2 minutes.

**Solution:**
1. Increase timeout in `playwright.config.ts`:
```typescript
timeout: 180000, // 3 minutes
```

2. Or increase per-test:
```typescript
test('long test', async ({ page }) => {
  test.setTimeout(180000);
  // Test logic...
});
```

---

### Issue: Tests Fail in CI but Pass Locally

**Cause:** Environment differences (timing, resources, environment variables).

**Solution:**
1. Run locally with CI configuration:
```bash
CI=true npm run test:e2e
```

2. Check environment variables in CI
3. Review CI logs for specific errors
4. Use `trace: 'on'` in CI for full diagnostics

---

### Issue: Worker Conflicts

**Cause:** Tests modifying shared state running in parallel.

**Solution:** Set `workers: 1` for test suite:
```typescript
test.describe.configure({ workers: 1 });
```

---

### Issue: Supawright Not Initialized

**Cause:** Global setup not configured.

**Solution:** Verify `playwright.config.ts`:
```typescript
globalSetup: require.resolve('./e2e/global-setup'),
```

And `e2e/global-setup.ts` exists and initializes Supawright.

---

### Issue: Screenshots Not Captured

**Cause:** Screenshot configuration disabled.

**Solution:** Verify `playwright.config.ts`:
```typescript
use: {
  screenshot: 'only-on-failure',
}
```

---

### Issue: Environment Variables Not Loaded

**Cause:** `.env.local` not present or variables not prefixed correctly.

**Solution:**
1. Ensure `.env.local` exists in project root
2. Vite variables must be prefixed with `VITE_`
3. Restart dev server after changing `.env.local`

---

## Best Practices

### 1. Use Appropriate Execution Mode

- **Standard mode** - Default for most cases
- **Headed mode** - Debugging and development
- **Trace mode** - Investigating complex failures
- **Summary mode** - CI/CD and clean console output

---

### 2. Set Realistic Timeouts

- **Default 2 minutes** - Sufficient for most tests
- **Increase for slow operations** - File uploads, large data processing
- **Don't set too high** - Masks real performance issues

---

### 3. Use Workers Appropriately

- **Default (undefined)** - Parallel execution for isolated tests
- **workers: 1** - Sequential execution for tests with shared state
- See [Core_Rules.md - Rule 9](./Core_Rules.md#rule-9-use-minimum-required-workers)

---

### 4. Always Review Test Reports

After test failures:
1. Read `test-results/{TEST_RUN_ID}/README.md`
2. View trace file if error is unclear
3. Check browser console and network failures
4. Review failed sub-tests for multi-step tests

---

### 5. Keep Test Results Clean

```bash
# Regularly cleanup old results
npm run test:report:cleanup
```

---

## Summary

Test execution and configuration:

1. ✅ **Multiple execution modes** - Standard, headed, trace, summary
2. ✅ **Flexible workers** - Parallel or sequential execution
3. ✅ **Comprehensive reporting** - JSON + README.md with diagnostics
4. ✅ **Environment variable support** - Easy configuration
5. ✅ **CI/CD ready** - Works seamlessly in automated pipelines

**Key Takeaways:**
- Use standard mode for most tests, trace mode for debugging
- Set `workers: 1` only when tests modify shared state
- Always use custom test fixtures for automatic diagnostics
- Review test reports after failures for comprehensive diagnostics
- Keep environment variables in `.env.local` (never commit secrets)

**Next Steps:**
- Read [Writing_Tests.md](./Writing_Tests.md) for practical test examples
- Review [Reporters_and_Reports.md](./Reporters_and_Reports.md) for report details

---

**Last Updated:** 2025-11-23
