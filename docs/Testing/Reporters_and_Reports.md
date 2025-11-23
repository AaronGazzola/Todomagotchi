# Reporters and Test Reports

This document explains the test reporting architecture, how test results are generated, and how to read and interpret test reports.

## Overview

Our test reporting system provides comprehensive failure diagnostics through:

1. **Consolidated Reporter** - Generates detailed README.md reports with diagnostics
2. **TEST_RUN_ID Synchronization** - Single directory per test run
3. **Dual Output Format** - JSON (structured data) + README.md (human-readable)
4. **Automatic Artifact Handling** - Screenshots, traces, and videos
5. **Summary Mode** - Clean console output option

---

## Reporter Architecture

### Consolidated Reporter

The consolidated reporter (`e2e/utils/consolidated-reporter.ts`) is a custom Playwright reporter that generates comprehensive test reports.

**Key Features:**
- TEST_RUN_ID synchronization (single directory per run)
- Dual output format (JSON + README.md)
- Automatic artifact copying (screenshots, traces, videos)
- Hard-coded metadata extractors
- Summary mode support

**Configuration (`playwright.config.ts`):**
```typescript
reporter: [
  ['list'], // Real-time console output
  ['./e2e/utils/consolidated-reporter.ts'], // Detailed reports
],
```

---

## TEST_RUN_ID Synchronization System

### Format

`YYYY-MM-DD_HHMMSS-mmm_testname`

**Example:** `2025-11-23_12-34-56-789_auth.spec`

### How It Works

**1. Reporter generates TEST_RUN_ID in `onBegin()`:**

```typescript
const timestamp = new Date()
  .toISOString()
  .replace(/T/, '_')
  .replace(/:/g, '-')
  .replace(/\..+/, '')
  .split('Z')[0];

const milliseconds = new Date().getMilliseconds().toString().padStart(3, '0');

const testFileName = suite.allTests()[0]?.location.file
  .split('/').pop()?.replace('.ts', '') || 'unknown';

const testRunId = `${timestamp.split('.')[0]}-${milliseconds}_${testFileName}`;
```

**2. Sets environment variable:**

```typescript
process.env.TEST_RUN_ID = testRunId;
```

**3. Playwright config reads TEST_RUN_ID for output directory:**

```typescript
outputDir: process.env.TEST_RUN_ID
  ? `test-results/${process.env.TEST_RUN_ID}`
  : 'test-results/default',
```

### Result

Single directory contains:
- Screenshots
- Traces
- Videos
- README.md
- test-report.json

**Example directory structure:**
```
test-results/
└── 2025-11-23_12-34-56-789_auth.spec/
    ├── README.md
    ├── test-report.json
    ├── screenshot-1.png
    ├── screenshot-2.png
    ├── trace.zip
    └── video.webm
```

---

## Dual Output Format

### 1. test-report.json (Structured Data)

Complete structured data for programmatic consumption.

**Structure:**
```json
{
  "testSuiteName": "Auth Tests",
  "startTime": "2025-11-23T12:34:56.789Z",
  "endTime": "2025-11-23T12:35:12.345Z",
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

**Fields:**
- `testSuiteName` - Name of test suite
- `startTime` / `endTime` - ISO timestamps
- `duration` - Total duration in milliseconds
- `summary` - Test count statistics
- `tests` - Array of individual test results
  - `title` - Test name
  - `status` - "passed", "failed", "skipped"
  - `duration` - Test duration in milliseconds
  - `error` - Error message (if failed)
  - `errorStack` - Full stack trace (if failed)
  - `screenshots` - Array of screenshot filenames
  - `traces` - Array of trace filenames
  - `videos` - Array of video filenames

---

### 2. README.md (Human-Readable Report)

Comprehensive human-readable report with diagnostics.

**Sections:**
1. **Header** - Timestamp, duration, summary
2. **Summary** - Test counts with emoji indicators
3. **Failed Tests** - Detailed diagnostics for each failure
4. **Failed Sub-Tests** - TestResultLogger sub-test failures
5. **All Tests** - Status list of all tests

**Example README.md:**

```markdown
# Test Results: Auth Tests

**Generated:** 2025-11-23 12:35:12
**Duration:** 15.56s
**Tests:** 3 total | ✅ 2 passed | ❌ 1 failed

---

## Summary

- ✅ **Passed:** 2
- ❌ **Failed:** 1
- ⏭️ **Skipped:** 0

---

## Failed Tests

### ❌ should complete player signup

**File:** `e2e/auth.spec.ts:45`
**Duration:** 5.12s

#### Error

```
Error: Button not visible
```

#### Error Stack

```
Error: Button not visible
  at Test.fn (e2e/auth.spec.ts:67:11)
  at TestRunner.run (playwright/test/runner.ts:234:28)
```

#### Test Setup

**User:** test-1732368896789@example.com
**Conditions:** userType=new player, action=clicked signup link
**Expected:** Create Account text visible
**Observed:** Button not found

#### Execution Timeline

1. ✓ Navigate to /auth (0.5s)
2. ✓ Click signup link (0.2s)
3. ✗ Verify Create Account heading (4.4s - TIMEOUT)

#### Browser Console Errors

```
[ERROR] 12:34:58.123 - TypeError: Cannot read property 'id' of undefined
  at HomePage.tsx:45:12

[WARN] 12:34:58.456 - React Warning: Failed prop type: Invalid prop `user` of type `object`
  at AuthForm.tsx:23:5
```

#### Network Failures

**POST /api/auth/signup**
- Status: 400 Bad Request
- Response:
```json
{
  "error": "Email is required"
}
```

#### DOM State at Failure

```html
<div data-testid="auth-form" data-state="error">
  <div role="alert">Email is required</div>
</div>
```

#### Artifacts

- 📸 Screenshot: [screenshot-1.png](./screenshot-1.png)
- 🎬 Trace: [trace.zip](./trace.zip)

---

## Failed Sub-Tests

### 1. Signup - Create Account visible

**Conditions:** userType=new player, action=clicked signup link
**Expected:** Create Account text visible
**Observed:** not found
**Screenshot:** signup-create-account-1731328496789.png
**Error Toast:** Email is required

### 2. Signup - Redirect to home

**Conditions:** userType=new player, action=submitted form
**Expected:** Redirects to home (/)
**Observed:** Test did not execute - previous assertion failed

---

## All Tests

- ✅ should display login form
- ✅ should show error for invalid credentials
- ❌ should complete player signup

---

**Report generated by Consolidated Reporter**
```

---

## Hard-Coded Metadata Extractors

The reporter includes hard-coded functions to extract test metadata from test titles. This is a **known maintenance burden** but provides rich context in reports.

### Extractor Functions

#### `extractUser(test: TestCase): string | undefined`

Searches test title for email patterns.

**Supported patterns:**
- `email=test@example.com`
- `beginner.singles.casual.male.2000@test.com` (finds in title)

**Returns:** Email string or undefined

**Example:**
```typescript
test('should display profile for email=user@example.com', async ({ page }) => {
  // extractUser() returns "user@example.com"
});
```

---

#### `extractPreferences(test: TestCase): string | undefined`

Searches test title for preference patterns.

**Supported patterns:**
- `skill=beginner`
- `play=singles`
- `session=casual`
- `postcode=2000`

**Returns:** Comma-separated string like "skill=beginner, play=singles" or undefined

**Example:**
```typescript
test('should match players with skill=beginner, play=singles', async ({ page }) => {
  // extractPreferences() returns "skill=beginner, play=singles"
});
```

---

#### `extractExpected(test: TestCase, result: TestResult): string`

Maps test title keywords to expected outcomes.

**Examples:**
- Title contains "should display player cards" → Expected: "Display player cards"
- Title contains "should show error" → Expected: "Display error message"

**Returns:** Expected outcome string

---

#### `extractObserved(test: TestCase, result: TestResult, status: string): string`

Generates observed outcome based on status and error message.

**Logic:**
- If passed: Extracts success message from title
- If failed: Parses error message for specific failure details

**Returns:** Observed outcome string

---

### Maintenance Notes

To add support for new test title patterns:

1. Update `extractUser()` to recognize new email patterns
2. Update `extractPreferences()` to recognize new preference keys
3. Update `extractExpected()` keyword mapping
4. Update `extractObserved()` error message parsing

**Location:** `e2e/utils/consolidated-reporter.ts` (lines ~100-250)

**Future Enhancement:** Consider replacing hard-coded extractors with test metadata:

```typescript
test('should display cards', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'user', description: 'test@example.com' });
  testInfo.annotations.push({ type: 'conditions', description: 'skill=beginner' });
});
```

---

## Artifact Handling

The reporter automatically copies artifacts to the output directory.

### 1. Screenshots

```typescript
const screenshotAttachments = result.attachments.filter((a) =>
  a.contentType.startsWith('image/')
);

for (const screenshot of screenshotAttachments) {
  const screenshotName = path.basename(screenshot.path!);
  fs.copyFileSync(screenshot.path!, path.join(outputDir, screenshotName));
}
```

**File Naming:** `screenshot-1.png`, `screenshot-2.png`, ...

---

### 2. Traces

```typescript
const traceAttachments = result.attachments.filter((a) =>
  a.name?.includes('trace')
);

for (const trace of traceAttachments) {
  const traceName = path.basename(trace.path!);
  fs.copyFileSync(trace.path!, path.join(outputDir, traceName));
}
```

**File Naming:** `trace.zip`

---

### 3. Videos

```typescript
const video = result.attachments.find((a) => a.name === 'video');
if (video?.path) {
  fs.copyFileSync(video.path, path.join(outputDir, 'video.webm'));
}
```

**File Naming:** `video.webm`

---

## Summary Mode (TEST_SUMMARY_ONLY)

When `TEST_SUMMARY_ONLY=true` environment variable is set, the reporter provides clean console output.

### Behavior

1. **Suppresses verbose Playwright output**
2. **Prints formatted one-line-per-test output:**

```
Running 6 tests using 1 worker

  ✓  1 …lete full player flow: signup -> signout -> signin (5.0s)
  ✓  2 … › should show error for invalid login credentials (1.2s)
  ✗  3 … › should update UI after signout (TIMEOUT after 30.0s)
```

3. **Includes TestResultLogger summary at end**

### How It Works

```typescript
if (process.env.TEST_SUMMARY_ONLY === 'true') {
  const status = result.status === 'passed' ? '✓' : '✗';
  const duration = (result.duration / 1000).toFixed(1);
  const title = test.title.slice(0, 40);
  console.log(`  ${status}  ${testNumber} …${title} (${duration}s)`);
}
```

### When to Use

- **CI/CD pipelines** - Cleaner output for build logs
- **Local development** - Less noise, faster to scan
- **Debugging specific tests** - Focus on results, not verbose logs

### How to Enable

```bash
TEST_SUMMARY_ONLY=true npm run test:e2e
```

---

## Minimal Reporter

An alternative reporter for quick sub-test overview.

### Consolidated Reporter vs Minimal Reporter

**Consolidated Reporter:**
- Full README.md generation
- Includes all diagnostic data
- Copies artifacts
- Hard-coded extractors
- **Used for:** Standard test runs, CI/CD, comprehensive reports

**Minimal Reporter:**
- Sub-test summary only
- Reads `afterall-call-*.json` files
- Prints aggregated sub-test results
- Cleanup mode (deletes JSON files after reading)
- **Used for:** Quick sub-test overview, debugging TestResultLogger

### Switching to Minimal Reporter

**Update `playwright.config.ts`:**
```typescript
reporter: [
  ['./e2e/utils/minimal-reporter.ts'],
],
```

### Minimal Reporter Output Example

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

---

## Reading Test Reports

### Step 1: Locate Test Results

After running tests, find the TEST_RUN_ID directory:

```bash
ls test-results/

# Output:
2025-11-23_12-34-56-789_auth.spec/
2025-11-23_14-22-10-123_quiz.spec/
```

### Step 2: Read README.md

```bash
cd test-results/2025-11-23_12-34-56-789_auth.spec/
cat README.md
```

### Step 3: View Artifacts

**Screenshots:**
```bash
open screenshot-1.png
```

**Traces:**
```bash
npx playwright show-trace trace.zip
```

The Playwright trace viewer shows:
- Timeline of test execution
- Network requests and responses
- Console logs
- DOM snapshots
- Screenshots at each step

**Videos:**
```bash
open video.webm
```

### Step 4: Analyze Diagnostics

**Key sections to review:**

1. **Error Stack** - Identify the exact line that failed
2. **Browser Console Errors** - Look for JavaScript errors that caused UI issues
3. **Network Failures** - Check for failed API calls or unexpected responses
4. **DOM State at Failure** - See the actual HTML at the moment of failure
5. **Failed Sub-Tests** - Understand which specific verification failed

---

## Generating Reports

### Command: `npm run test:report`

Generates a consolidated test report from all test results.

**What it does:**
- Scans `test-results/` directory
- Reads all `afterall-call-*.json` files
- Generates summary report
- Includes sub-test results from TestResultLogger

### Command: `npm run test:report:cleanup`

Generates report and cleans up old test results (keeps only latest per suite).

**What it does:**
- Generates report (same as `test:report`)
- Deletes old test result directories
- Keeps only the most recent run for each test suite
- Deletes processed `afterall-call-*.json` files

---

## Output Directory Structure

```
test-results/
├── 2025-11-23_12-34-56-789_auth.spec/
│   ├── README.md               # Human-readable report
│   ├── test-report.json        # Structured data
│   ├── screenshot-1.png        # Failure screenshot
│   ├── screenshot-2.png        # Another screenshot
│   ├── trace.zip               # Debug trace
│   └── video.webm              # Test video (if enabled)
├── 2025-11-23_14-22-10-123_quiz.spec/
│   ├── README.md
│   ├── test-report.json
│   └── trace.zip
└── afterall-call-1732368896789.json  # TestResultLogger data
```

---

## Integration with TestResultLogger

The consolidated reporter reads `afterall-call-*.json` files generated by TestResultLogger in test afterAll hooks.

**Data Flow:**
1. Test runs and logs sub-test results with TestResultLogger
2. `test.afterAll()` writes `afterall-call-{timestamp}.json`
3. Consolidated reporter reads JSON files during `onEnd()`
4. Reporter includes sub-test results in README.md "Failed Sub-Tests" section

**Example Integration in README.md:**

```markdown
## Failed Sub-Tests

### 1. Signup - Create Account visible

**Conditions:** userType=new player, action=clicked signup link
**Expected:** Create Account text visible
**Observed:** not found
**Screenshot:** signup-create-account-1731328496789.png
**Error Toast:** Email is required
```

See [Test_Logging_and_Diagnostics.md](./Test_Logging_and_Diagnostics.md) for TestResultLogger documentation.

---

## Best Practices

### 1. Always Review README.md First

Start with README.md for high-level overview, then drill down into artifacts if needed.

### 2. Use Trace Viewer for Complex Failures

For failures where the error message isn't clear, open the trace file:
```bash
npx playwright show-trace test-results/{TEST_RUN_ID}/trace.zip
```

### 3. Check Browser Console Errors

Many UI failures are caused by JavaScript errors. Always review "Browser Console Errors" section.

### 4. Verify Network Failures

API failures often cause UI issues. Check "Network Failures" section for 400+ responses.

### 5. Compare Expected vs Observed

In "Test Setup" section, compare expected and observed outcomes to understand what went wrong.

### 6. Review Failed Sub-Tests

For complex multi-step tests, review "Failed Sub-Tests" to see exactly which verification failed and which were skipped.

---

## Troubleshooting

### Issue: README.md Not Generated

**Cause:** Reporter not configured in `playwright.config.ts`

**Solution:**
```typescript
reporter: [
  ['list'],
  ['./e2e/utils/consolidated-reporter.ts'],
],
```

### Issue: Diagnostics Missing in README.md

**Cause:** Not importing test/expect from custom fixtures

**Solution:** Always use:
```typescript
import { test, expect } from './utils/test-fixtures';
```

### Issue: TEST_RUN_ID Directory Not Created

**Cause:** `globalSetup` or reporter `onBegin()` not executed

**Solution:** Verify Playwright configuration and check for setup errors.

### Issue: Artifacts Not Copied to Report Directory

**Cause:** Screenshot/trace capture not enabled in config

**Solution:** Verify `playwright.config.ts`:
```typescript
use: {
  screenshot: 'only-on-failure',
  trace: 'on-first-retry',
}
```

---

## Summary

Our reporting system provides:

1. **Comprehensive Diagnostics** - Console logs, network failures, page errors, DOM state
2. **TEST_RUN_ID Synchronization** - Single directory per test run
3. **Dual Output** - JSON for automation, README.md for humans
4. **Automatic Artifacts** - Screenshots, traces, videos
5. **Sub-Test Tracking** - Integration with TestResultLogger
6. **Summary Mode** - Clean console output option

**Key Takeaways:**
- ✅ Use TEST_SUMMARY_ONLY for cleaner console output
- ✅ Always review README.md first for failure diagnostics
- ✅ Use trace viewer for complex debugging
- ✅ Check browser console and network failures
- ✅ Review failed sub-tests for multi-step test failures
- ✅ Keep test result cleanup automated with `test:report:cleanup`

**Next Steps:**
- Read [Test_Logging_and_Diagnostics.md](./Test_Logging_and_Diagnostics.md) to understand logging systems
- Review [Test_Execution_and_Configuration.md](./Test_Execution_and_Configuration.md) for execution modes

---

**Last Updated:** 2025-11-23
