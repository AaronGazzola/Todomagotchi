# Core Testing Rules

This document outlines the fundamental principles and standards for writing tests in this repository. These rules ensure consistency, reliability, and maintainability across the test suite.

## The 9 Core Rules

### Rule 1: Synchronize Test Changes with Documentation

**Every time a test is changed, the corresponding test in `docs/Testing/Tests.md` MUST be updated to match.**

This ensures that our test documentation remains accurate and reflects the current state of the test suite.

**Example:**
- If you modify the pass conditions for a test
- If you change test data or user credentials
- If you update the expected behavior

**Action Required:**
Update the corresponding test description in [Tests.md](./Tests.md) to reflect the changes.

---

### Rule 2: Always Prefer Data Attributes

**Always prefer `data-testid` attributes to select HTML elements in E2E tests. Never use CSS selectors, role selectors, or text content.**

**Why:**
- Data attributes are resilient to UI changes
- CSS classes and structure change frequently
- Text content is subject to copy changes and internationalization
- Role selectors can be ambiguous

**Bad:**
```typescript
await page.locator('.btn-primary').click();
await page.getByRole('button', { name: 'Submit' }).click();
await page.locator('button:has-text("Submit")').click();
```

**Good:**
```typescript
await page.getByTestId(TestId.SUBMIT_BUTTON).click();
```

---

### Rule 2a: Never Read Text Content - Only Use Data Attributes

**Tests must NEVER read text content from elements. All information needed by tests must be exposed through data attributes (`data-testid`, `data-state`, etc.).**

**Why:**
- Text content changes frequently (copy updates, internationalization)
- Data attributes are stable and designed for testing
- Reading text is brittle and leads to flaky tests

**Bad:**
```typescript
const buttonText = await page.locator('[data-testid="submit-button"]').textContent();
expect(buttonText).toBe('Submit');
```

**Good:**
```typescript
const button = page.getByTestId(TestId.SUBMIT_BUTTON);
await expect(button).toBeVisible();
await expect(button).toHaveAttribute('data-state', 'enabled');
```

**Exception:** Error messages and toasts can be read for diagnostic purposes, but should not be the primary assertion.

---

### Rule 3: Share Data Attribute Values

**Data attribute values MUST be imported into the test and the component from the shared `test.types.ts` file.**

This creates a single source of truth and prevents typos or mismatches.

**Implementation:**

1. **Define in `src/test.types.ts`:**
```typescript
export enum TestId {
  FORM_EMAIL_INPUT = "form-email-input",
  FORM_PASSWORD_INPUT = "form-password-input",
  FORM_SUBMIT_BUTTON = "form-submit-button",
}
```

2. **Use in Components:**
```typescript
import { TestId } from '@/test.types';

<input data-testid={TestId.FORM_EMAIL_INPUT} type="email" />
<input data-testid={TestId.FORM_PASSWORD_INPUT} type="password" />
<button data-testid={TestId.FORM_SUBMIT_BUTTON}>Submit</button>
```

3. **Use in Tests:**
```typescript
import { TestId } from '@/test.types';

await page.getByTestId(TestId.FORM_EMAIL_INPUT).fill('user@example.com');
await page.getByTestId(TestId.FORM_PASSWORD_INPUT).fill('password123');
await page.getByTestId(TestId.FORM_SUBMIT_BUTTON).click();
```

**Benefits:**
- TypeScript catches typos at compile time
- Refactoring is safe (rename in one place)
- Autocomplete in IDE
- Clear contract between components and tests

---

### Rule 3a: Use State Data Attributes for Dynamic UI States

**Use `data-state` attributes to expose element states for testing (e.g., `data-state="editing"` vs `data-state="viewing"`).**

**Why:**
- Visual states (CSS classes, inline styles) are implementation details
- Data attributes are explicit contracts for testing
- State attributes make assertions clearer and more reliable

**Example:**

**Component:**
```typescript
<div
  data-testid={TestId.PROFILE_CARD}
  data-state={isEditing ? 'editing' : 'viewing'}
>
  {/* content */}
</div>
```

**Test:**
```typescript
const profileCard = page.getByTestId(TestId.PROFILE_CARD);
await expect(profileCard).toHaveAttribute('data-state', 'editing');

// After saving
await page.getByTestId(TestId.SAVE_BUTTON).click();
await expect(profileCard).toHaveAttribute('data-state', 'viewing');
```

**Common State Values:**
- `loading` / `loaded` / `error`
- `enabled` / `disabled`
- `editing` / `viewing`
- `expanded` / `collapsed`
- `selected` / `unselected`

---

### Rule 4: Always Prefer Timeouts Over Hard-Coded Waits

**GLOBAL TIMEOUT STANDARD: All timeouts in tests must be set to 20 seconds (20000ms).**

**Why:**
- Hard-coded waits (`page.waitForTimeout(5000)`) waste time on fast operations
- Timeouts allow tests to proceed as soon as conditions are met
- 20 seconds provides buffer for slow CI environments while failing fast locally

**Bad:**
```typescript
await page.click('[data-testid="button"]');
await page.waitForTimeout(5000); // Always waits 5 seconds
```

**Good:**
```typescript
await page.getByTestId(TestId.BUTTON).click();
await expect(page.getByTestId(TestId.SUCCESS_MESSAGE)).toBeVisible({ timeout: 20000 });
```

**Applying the Standard:**
```typescript
// Element visibility
await expect(element).toBeVisible({ timeout: 20000 });

// URL navigation
await expect(page).toHaveURL('/dashboard', { timeout: 20000 });

// Element state
await expect(element).toHaveAttribute('data-state', 'loaded', { timeout: 20000 });

// Custom waits
await page.waitForSelector('[data-testid="card"]', { timeout: 20000 });
```

---

### Rule 5: Isolate Test Data

**Each test must clean up its own data and not interfere with other tests using `beforeAll` and `afterAll` hooks.**

**With Supawright (Recommended):**
Supawright handles cleanup automatically. You only need `afterAll` for logger finalization.

```typescript
import { test } from './utils/test-fixtures';
import { supawright } from 'supawright';
import { TestResultLogger } from '@/lib/test.utils';

test.describe('Feature Tests', () => {
  const logger = new TestResultLogger('feature');

  test.afterAll(async () => {
    logger.finalizeUnreachedTests();
    // Write logger data to JSON
    // Supawright handles all database cleanup automatically
  });

  test('should work correctly', async ({ page }) => {
    // Create user - cleaned up automatically
    const user = await supawright.auth.createUser({
      email: 'test@example.com',
      password: 'password123',
      email_confirm: true,
    });

    // Create data - cleaned up automatically
    await supawright.db.from('profiles').insert({
      id: user.id,
      username: 'Test User',
    });
  });
});
```

**Without Supawright (Manual Cleanup):**
If not using Supawright, you must manually clean up in correct foreign key order.

See [Database_Testing.md](./Database_Testing.md) for details on when manual cleanup is needed.

---

### Rule 6: Use Descriptive Test Names

**Test names should describe the behavior being tested, starting with "should".**

**Why:**
- Clear test names serve as documentation
- Failures are easier to understand
- Test intent is obvious without reading code

**Bad:**
```typescript
test('test signup', async ({ page }) => { /* ... */ });
test('auth', async ({ page }) => { /* ... */ });
test('form validation', async ({ page }) => { /* ... */ });
```

**Good:**
```typescript
test('should display error for invalid email', async ({ page }) => { /* ... */ });
test('should redirect to home page after successful signup', async ({ page }) => { /* ... */ });
test('should preserve form data when validation fails', async ({ page }) => { /* ... */ });
```

**Pattern:**
```
should [action/outcome] [condition/context]
```

**Examples:**
- `should display watchlist movies for authenticated user`
- `should show error toast when network request fails`
- `should update movie card state after adding to watchlist`
- `should preserve quiz progress when navigating between steps`

---

### Rule 7: Never Take Manual Screenshots

**Playwright automatically captures screenshots on failure - never use `page.screenshot()` manually.**

**Why:**
- Playwright's automatic screenshots are triggered at the right time (on failure)
- Manual screenshots clutter the code
- Custom reporters handle screenshot organization
- TestResultLogger captures screenshots on failure automatically

**Bad:**
```typescript
test('should display movies', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'homepage.png' }); // Don't do this
  const movies = page.getByTestId(TestId.MOVIE_CARD);
  await expect(movies).toBeVisible();
});
```

**Good:**
```typescript
test('should display movies', async ({ page }) => {
  await page.goto('/');
  const movies = page.getByTestId(TestId.MOVIE_CARD);
  await expect(movies).toBeVisible();
  // Screenshot taken automatically if assertion fails
});
```

**Exception:** TestResultLogger's `logTestResult()` helper captures screenshots for sub-test tracking. This is the only approved manual screenshot usage.

---

### Rule 8: Fail Immediately on First Assertion Failure

**Tests must fail fast at the first assertion failure - never collect failures in an array.**

**Why:**
- Early exit reveals the root cause faster
- Subsequent failures are often cascading effects
- TestResultLogger tracks unreached tests automatically
- Reduces noise in test output

**Bad:**
```typescript
test('should complete user flow', async ({ page }) => {
  const failures = [];

  try {
    await expect(page.getByTestId(TestId.STEP_1)).toBeVisible();
  } catch (e) {
    failures.push('Step 1 failed');
  }

  try {
    await expect(page.getByTestId(TestId.STEP_2)).toBeVisible();
  } catch (e) {
    failures.push('Step 2 failed');
  }

  if (failures.length > 0) {
    throw new Error(failures.join(', '));
  }
});
```

**Good:**
```typescript
test('should complete user flow', async ({ page }) => {
  // Fails immediately on first assertion
  await expect(page.getByTestId(TestId.STEP_1)).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId(TestId.STEP_2)).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId(TestId.STEP_3)).toBeVisible({ timeout: 20000 });
});
```

**With TestResultLogger:**
When using TestResultLogger for granular tracking, still fail immediately:

```typescript
test('should complete user flow', async ({ page }) => {
  logger.registerExpectedTest('Step 1', conditions, expectation);
  logger.registerExpectedTest('Step 2', conditions, expectation);
  logger.registerExpectedTest('Step 3', conditions, expectation);

  const step1Visible = await isVisibleByTestId(page, TestId.STEP_1);
  await logTestResult(logger, page, 'Step 1', conditions, expectation, step1Visible, 'visible', 'not found');
  if (!step1Visible) throw new Error('Step 1 failed'); // Fail immediately

  const step2Visible = await isVisibleByTestId(page, TestId.STEP_2);
  await logTestResult(logger, page, 'Step 2', conditions, expectation, step2Visible, 'visible', 'not found');
  if (!step2Visible) throw new Error('Step 2 failed'); // Fail immediately

  // Step 3 never executes if Step 2 fails
  // afterAll hook marks it as unreached
});
```

---

### Rule 9: Use Minimum Required Workers

**Tests must specify the minimum number of workers required. If a test only needs one worker, explicitly set `workers: 1` in the test configuration.**

**Why:**
- Prevents unnecessary parallelization
- Ensures predictable test execution
- Avoids race conditions in tests that modify shared state
- Reduces resource usage for isolated tests

**Default Configuration:**
```typescript
// playwright.config.ts
workers: process.env.CI ? 1 : undefined
```

**Override for Specific Tests:**
```typescript
test.describe.configure({ workers: 1 });

test.describe('Sequential Tests', () => {
  test('should execute first', async ({ page }) => { /* ... */ });
  test('should execute second', async ({ page }) => { /* ... */ });
});
```

**When to Use `workers: 1`:**
- Tests modify shared database state
- Tests require sequential execution
- Tests have race condition concerns
- Tests are already isolated and parallelization adds no benefit

**When to Use Default (undefined):**
- Tests are fully isolated (Supawright creates unique users)
- Tests are independent and can run in any order
- Parallelization speeds up test suite

---

## Data Attribute System

### Primary Identifiers

**`data-testid`** - Identifies the element

Used to locate elements in tests. Always prefer this over CSS selectors or text content.

```typescript
<button data-testid={TestId.SUBMIT_BUTTON}>Submit</button>
```

```typescript
await page.getByTestId(TestId.SUBMIT_BUTTON).click();
```

### State Indicators

**`data-state`** - Identifies the current state of the element

Used to assert on element states without relying on CSS classes or visual properties.

```typescript
<div data-testid={TestId.PROFILE_CARD} data-state={isEditing ? 'editing' : 'viewing'}>
  {/* content */}
</div>
```

```typescript
await expect(page.getByTestId(TestId.PROFILE_CARD)).toHaveAttribute('data-state', 'editing');
```

### Custom Data Attributes

For complex scenarios, you can add custom data attributes:

```typescript
<div
  data-testid={TestId.MOVIE_CARD}
  data-movie-id={movie.id}
  data-watchlist-status={isInWatchlist ? 'added' : 'not-added'}
>
  {/* content */}
</div>
```

```typescript
const movieCard = page.getByTestId(TestId.MOVIE_CARD).filter({ has: page.locator('[data-movie-id="550"]') });
await expect(movieCard).toHaveAttribute('data-watchlist-status', 'added');
```

---

## Test File Organization

### Standard Structure

```
project/
├── e2e/
│   ├── auth.spec.ts
│   ├── quiz.spec.ts
│   ├── watchlist.spec.ts
│   ├── search.spec.ts
│   ├── recommendations.spec.ts
│   └── utils/
│       ├── test-cleanup.ts
│       ├── test-fixtures.ts
│       ├── test-logger.ts
│       └── consolidated-reporter.ts
├── __tests__/
│   └── unit-test.test.ts
├── src/
│   └── test.types.ts
├── playwright.config.ts
└── docs/
    └── Testing/
        ├── README.md
        ├── Core_Rules.md
        ├── Tests.md
        └── ...
```

### File Naming Conventions

- **E2E tests:** `{feature}.spec.ts` (e.g., `auth.spec.ts`, `quiz.spec.ts`)
- **Unit tests:** `{component}.test.ts` (e.g., `utils.test.ts`)
- **Test utilities:** `test-{purpose}.ts` (e.g., `test-fixtures.ts`, `test-logger.ts`)

---

## Test Types File (`src/test.types.ts`)

All test IDs must be defined in the shared `test.types.ts` file:

```typescript
export enum TestId {
  // Auth
  AUTH_EMAIL_INPUT = "auth-email-input",
  AUTH_PASSWORD_INPUT = "auth-password-input",
  AUTH_SUBMIT_BUTTON = "auth-submit-button",
  AUTH_SIGNUP_LINK = "auth-signup-link",
  AUTH_CREATE_ACCOUNT_HEADING = "auth-create-account-heading",

  // Quiz
  QUIZ_START_BUTTON = "quiz-start-button",
  QUIZ_NEXT_BUTTON = "quiz-next-button",
  QUIZ_EMOTION_BUTTON = "quiz-emotion-button",

  // Watchlist
  WATCHLIST_GRID = "watchlist-grid",
  MOVIE_CARD = "movie-card",
  ADD_TO_WATCHLIST_BUTTON = "add-to-watchlist-button",

  // Navigation
  HEADER_LOGO = "header-logo",
  USER_MENU_BUTTON = "user-menu-button",
  SIGN_OUT_BUTTON = "sign-out-button",
}
```

**Benefits:**
- Single source of truth
- TypeScript type safety
- IDE autocomplete
- Compile-time error checking
- Safe refactoring

**See Also:**
- [Test_attribute_index.md](./Test_attribute_index.md) - Complete alphabetical index of all TestId values

---

## Summary

These 9 core rules form the foundation of our testing approach:

1. ✅ **Synchronize test changes with documentation**
2. ✅ **Always prefer data attributes over CSS/role selectors**
3. ✅ **Never read text content - use data attributes**
4. ✅ **Share data attribute values via test.types.ts**
5. ✅ **Use data-state for dynamic UI states**
6. ✅ **Prefer timeouts (20s) over hard-coded waits**
7. ✅ **Isolate test data with Supawright auto-cleanup**
8. ✅ **Use descriptive test names starting with "should"**
9. ✅ **Never take manual screenshots**
10. ✅ **Fail immediately on first assertion failure**
11. ✅ **Use minimum required workers**

Following these rules ensures our tests are:
- **Reliable** - Stable selectors and proper timeouts
- **Maintainable** - Shared test IDs and clear naming
- **Isolated** - Automatic cleanup prevents interference
- **Debuggable** - Automatic diagnostics and screenshots
- **Fast** - Proper timeouts and parallel execution

**Next Steps:**
- Read [Writing_Tests.md](./Writing_Tests.md) for practical examples
- Review [Supawright_Integration.md](./Supawright_Integration.md) for test data management
- Check [Tests.md](./Tests.md) for complete test catalog

---

**Last Updated:** 2025-11-23
