# Writing Tests

This document provides a practical guide to writing E2E tests with Supawright, including step-by-step workflows, common patterns, and complete examples.

## Test File Structure

### Standard Template

```typescript
import { test, expect } from './utils/test-fixtures';
import { supawright } from 'supawright';
import { TestResultLogger, formatTestConditions, logTestResult } from '@/lib/test.utils';
import { TestStepLogger } from './utils/test-logger';
import { TestId } from '@/test.types';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Feature Tests', () => {
  const logger = new TestResultLogger('feature-name');

  test.afterAll(async () => {
    logger.finalizeUnreachedTests();

    const summary = logger.getSummary();
    if (summary) {
      console.log('\n📊 Test Logger Summary:');
      console.log(summary);
    }

    const testResultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }

    const data = logger.getSerializableData();
    const callTimestamp = Date.now();
    const callPath = path.join(testResultsDir, `afterall-call-${callTimestamp}.json`);

    fs.writeFileSync(callPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      callId: callTimestamp,
      stats: data.stats,
      testsCount: data.tests.length,
      tests: data.tests,
      testSuiteName: data.testSuiteName,
    }, null, 2));
  });

  test('should perform feature test', async ({ page }) => {
    // Test implementation
  });
});
```

---

## Writing a Test: Step-by-Step

### Step 1: Import Dependencies

```typescript
import { test, expect } from './utils/test-fixtures'; // Custom fixtures for diagnostics
import { supawright } from 'supawright'; // Database and user management
import { TestId } from '@/test.types'; // Shared test IDs
```

**Critical:** Always use custom fixtures, not `@playwright/test`.

See [Test_Logging_and_Diagnostics.md](./Test_Logging_and_Diagnostics.md#why-custom-testexpect-imports) for why this matters.

---

### Step 2: Create Test User with Supawright

```typescript
test('should display user profile', async ({ page }) => {
  // Create pre-verified user (bypasses email verification)
  const user = await supawright.auth.createUser({
    email: `test-${Date.now()}@example.com`, // Unique email
    password: 'SecurePassword123!',
    email_confirm: true, // Skip email verification
  });

  // Create profile
  await supawright.db.from('profiles').insert({
    id: user.id,
    username: 'Test User',
    dna_type: 'adrenaline_seeker',
    intl_openness: true,
  });

  // Test logic...
});
```

**Key Points:**
- ✅ Always use unique emails (`Date.now()`, `Math.random()`)
- ✅ Always set `email_confirm: true` to skip verification
- ✅ Create profile immediately after user (required for most features)
- ✅ No cleanup needed (Supawright handles automatically)

---

### Step 3: Set Up Test Data with Supawright

```typescript
// Create quiz responses
await supawright.db.from('cinematic_dna_quiz_responses').insert({
  user_id: user.id,
  q1_emotions: ['thrilled', 'excited'],
  q2_taste: 'action-packed',
  q4_tones: ['intense', 'fast-paced'],
  q5_runtime: '120-150min',
  q6_subtitles: 'no-preference',
});

// Create calibration data
await supawright.db.from('calibration_actors_directors').insert([
  { user_id: user.id, tmdb_id: 31, name: 'Tom Hanks', type: 'actor' },
  { user_id: user.id, tmdb_id: 524, name: 'Natalie Portman', type: 'actor' },
]);

// Create watchlist items
await supawright.db.from('user_movie_interactions').insert([
  { user_id: user.id, movie_id: 550, movie_title: 'Fight Club', status: 'watchlist' },
  { user_id: user.id, movie_id: 13, movie_title: 'Forrest Gump', status: 'watchlist' },
]);
```

**Key Points:**
- ✅ Create data in parent → child order (user → profile → quiz → watchlist)
- ✅ Group related data creation together
- ✅ Use descriptive values for easier debugging
- ✅ All data cleaned up automatically by Supawright

---

### Step 4: Navigate and Interact with UI

```typescript
// Navigate to page
await page.goto('/');

// Fill form fields
await page.getByTestId(TestId.EMAIL_INPUT).fill('user@example.com');
await page.getByTestId(TestId.PASSWORD_INPUT).fill('password123');

// Click buttons
await page.getByTestId(TestId.SUBMIT_BUTTON).click();

// Wait for navigation
await expect(page).toHaveURL('/dashboard', { timeout: 20000 });

// Verify elements
await expect(page.getByTestId(TestId.USER_MENU_BUTTON)).toBeVisible({ timeout: 20000 });
```

**Key Points:**
- ✅ Always use `data-testid` attributes (never CSS selectors or text)
- ✅ Always specify `{ timeout: 20000 }` (20-second standard)
- ✅ Use descriptive test IDs from `src/test.types.ts`

---

### Step 5: Make Assertions

```typescript
// Element visibility
await expect(page.getByTestId(TestId.MOVIE_CARD)).toBeVisible({ timeout: 20000 });

// Element count
const movieCards = page.getByTestId(TestId.MOVIE_CARD);
await expect(movieCards).toHaveCount(5, { timeout: 20000 });

// URL verification
await expect(page).toHaveURL('/watchlist', { timeout: 20000 });

// Element state
await expect(page.getByTestId(TestId.PROFILE_CARD)).toHaveAttribute('data-state', 'editing');

// Text content (only for error messages/toasts)
await expect(page.getByRole('alert')).toContainText('Email is required');
```

**Key Points:**
- ✅ Always use 20-second timeouts
- ✅ Prefer data attributes over text content
- ✅ Use `data-state` for UI states
- ✅ Text content OK for error messages (diagnostic purposes)

---

## Using Data Attributes

### Defining in test.types.ts

```typescript
// src/test.types.ts
export enum TestId {
  // Auth
  AUTH_EMAIL_INPUT = "auth-email-input",
  AUTH_PASSWORD_INPUT = "auth-password-input",
  AUTH_SUBMIT_BUTTON = "auth-submit-button",
  AUTH_SIGNUP_LINK = "auth-signup-link",

  // Watchlist
  WATCHLIST_GRID = "watchlist-grid",
  MOVIE_CARD = "movie-card",
  ADD_TO_WATCHLIST_BUTTON = "add-to-watchlist-button",

  // Navigation
  USER_MENU_BUTTON = "user-menu-button",
  SIGN_OUT_BUTTON = "sign-out-button",
}
```

---

### Using in Components

```typescript
import { TestId } from '@/test.types';

function AuthForm() {
  return (
    <form>
      <input
        data-testid={TestId.AUTH_EMAIL_INPUT}
        type="email"
        placeholder="Email"
      />
      <input
        data-testid={TestId.AUTH_PASSWORD_INPUT}
        type="password"
        placeholder="Password"
      />
      <button data-testid={TestId.AUTH_SUBMIT_BUTTON}>
        Submit
      </button>
    </form>
  );
}
```

---

### Using in Tests

```typescript
import { TestId } from '@/test.types';

test('should submit login form', async ({ page }) => {
  await page.goto('/auth');
  await page.getByTestId(TestId.AUTH_EMAIL_INPUT).fill('user@example.com');
  await page.getByTestId(TestId.AUTH_PASSWORD_INPUT).fill('password123');
  await page.getByTestId(TestId.AUTH_SUBMIT_BUTTON).click();
});
```

**Benefits:**
- ✅ TypeScript catches typos
- ✅ Refactoring is safe
- ✅ IDE autocomplete
- ✅ Single source of truth

See [Core_Rules.md - Rule 3](./Core_Rules.md#rule-3-share-data-attribute-values) for details.

---

## Error Validation Patterns

### Checking for Error Messages

```typescript
test('should show error for invalid email', async ({ page }) => {
  await page.goto('/auth');
  await page.getByTestId(TestId.AUTH_EMAIL_INPUT).fill('invalid-email');
  await page.getByTestId(TestId.AUTH_SUBMIT_BUTTON).click();

  // Check for error toast
  const errorToast = page.getByRole('alert');
  await expect(errorToast).toBeVisible({ timeout: 20000 });
  await expect(errorToast).toContainText('Invalid email format');
});
```

---

### Toast Detection

```typescript
test('should display success toast after signup', async ({ page }) => {
  // Signup logic...

  // Verify success toast
  const toast = page.getByTestId(TestId.TOAST_SUCCESS);
  await expect(toast).toBeVisible({ timeout: 20000 });
  await expect(toast).toContainText('Account created successfully');
});
```

**Supported toast test IDs:**
- `TestId.TOAST_SUCCESS`
- `TestId.TOAST_ERROR`
- `TestId.TOAST_INFO`

**Alternative (using roles):**
```typescript
const toast = page.getByRole('status'); // or 'alert'
await expect(toast).toBeVisible({ timeout: 20000 });
```

---

### Form Validation

```typescript
test('should validate required fields', async ({ page }) => {
  await page.goto('/auth');

  // Submit without filling fields
  await page.getByTestId(TestId.AUTH_SUBMIT_BUTTON).click();

  // Check for validation errors
  await expect(page.getByText('Email is required')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Password is required')).toBeVisible({ timeout: 20000 });
});
```

---

## Async Handling Patterns

### Proper Waits

```typescript
// ✅ Good - wait for specific condition
await expect(page.getByTestId(TestId.MOVIE_CARD)).toBeVisible({ timeout: 20000 });

// ❌ Bad - hard-coded wait
await page.waitForTimeout(5000);
```

---

### Waiting for Network Requests

```typescript
test('should load movies from API', async ({ page }) => {
  // Setup network request interception
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/movies') && response.status() === 200,
    { timeout: 20000 }
  );

  await page.goto('/');

  // Wait for API response
  const response = await responsePromise;
  const data = await response.json();

  // Verify data loaded
  expect(data.movies.length).toBeGreaterThan(0);
  await expect(page.getByTestId(TestId.MOVIE_CARD)).toBeVisible({ timeout: 20000 });
});
```

---

### Waiting for Navigation

```typescript
test('should redirect after login', async ({ page }) => {
  await page.goto('/auth');
  await page.getByTestId(TestId.AUTH_EMAIL_INPUT).fill('user@example.com');
  await page.getByTestId(TestId.AUTH_PASSWORD_INPUT).fill('password123');
  await page.getByTestId(TestId.AUTH_SUBMIT_BUTTON).click();

  // Wait for navigation
  await expect(page).toHaveURL('/', { timeout: 20000 });
});
```

---

### Waiting for Element State Changes

```typescript
test('should update button state after click', async ({ page }) => {
  await page.goto('/');

  const button = page.getByTestId(TestId.ADD_TO_WATCHLIST_BUTTON);

  // Initial state
  await expect(button).toHaveAttribute('data-state', 'not-added');

  // Click button
  await button.click();

  // Wait for state change
  await expect(button).toHaveAttribute('data-state', 'added', { timeout: 20000 });
});
```

---

## Common Patterns and Examples

### Pattern 1: Authentication Flow

```typescript
test('should complete login flow', async ({ page }) => {
  // Create user
  const user = await supawright.auth.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true,
  });

  await supawright.db.from('profiles').insert({
    id: user.id,
    username: 'Test User',
  });

  // Navigate to login
  await page.goto('/auth');

  // Fill credentials
  await page.getByTestId(TestId.AUTH_EMAIL_INPUT).fill(user.email);
  await page.getByTestId(TestId.AUTH_PASSWORD_INPUT).fill('password123');
  await page.getByTestId(TestId.AUTH_SUBMIT_BUTTON).click();

  // Verify redirect
  await expect(page).toHaveURL('/', { timeout: 20000 });

  // Verify authenticated state
  await expect(page.getByTestId(TestId.USER_MENU_BUTTON)).toBeVisible({ timeout: 20000 });
});
```

---

### Pattern 2: Form Submission

```typescript
test('should submit quiz form', async ({ page }) => {
  const user = await supawright.auth.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true,
  });

  await supawright.db.from('profiles').insert({
    id: user.id,
    username: 'Test User',
  });

  // Login (code omitted)

  // Navigate to quiz
  await page.goto('/quiz');

  // Fill quiz
  await page.getByTestId(TestId.QUIZ_EMOTION_BUTTON).filter({ hasText: 'Thrilled' }).click();
  await page.getByTestId(TestId.QUIZ_NEXT_BUTTON).click();

  await page.getByTestId(TestId.QUIZ_TASTE_BUTTON).filter({ hasText: 'Action-Packed' }).click();
  await page.getByTestId(TestId.QUIZ_NEXT_BUTTON).click();

  // Submit quiz
  await page.getByTestId(TestId.QUIZ_SUBMIT_BUTTON).click();

  // Verify redirect to results
  await expect(page).toHaveURL('/quiz/results', { timeout: 20000 });
});
```

---

### Pattern 3: List Filtering

```typescript
test('should filter movies by mood', async ({ page }) => {
  const user = await supawright.auth.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true,
  });

  await supawright.db.from('profiles').insert({
    id: user.id,
    username: 'Test User',
    dna_type: 'adrenaline_seeker',
  });

  // Login (code omitted)

  // Navigate to home
  await page.goto('/');

  // Initial state - all movies visible
  const movieCards = page.getByTestId(TestId.MOVIE_CARD);
  const initialCount = await movieCards.count();
  expect(initialCount).toBeGreaterThan(0);

  // Apply mood filter
  await page.getByTestId(TestId.MOOD_FILTER_BUTTON).filter({ hasText: 'Action' }).click();

  // Verify filtered results
  await page.waitForTimeout(1000); // Allow filter to apply
  const filteredCount = await movieCards.count();
  expect(filteredCount).toBeLessThanOrEqual(initialCount);

  // Verify mood filter active
  const moodFilter = page.getByTestId(TestId.MOOD_FILTER_BUTTON).filter({ hasText: 'Action' });
  await expect(moodFilter).toHaveAttribute('data-state', 'active');
});
```

---

### Pattern 4: Multi-Step Flow

```typescript
test('should complete signup to watchlist flow', async ({ page }) => {
  const email = `test-${Date.now()}@example.com`;

  // Pre-create verified user (skip UI signup)
  const user = await supawright.auth.createUser({
    email,
    password: 'password123',
    email_confirm: true,
  });

  await supawright.db.from('profiles').insert({
    id: user.id,
    username: 'Test User',
  });

  // Step 1: Login
  await page.goto('/auth');
  await page.getByTestId(TestId.AUTH_EMAIL_INPUT).fill(email);
  await page.getByTestId(TestId.AUTH_PASSWORD_INPUT).fill('password123');
  await page.getByTestId(TestId.AUTH_SUBMIT_BUTTON).click();
  await expect(page).toHaveURL('/', { timeout: 20000 });

  // Step 2: Browse movies
  await expect(page.getByTestId(TestId.MOVIE_CARD).first()).toBeVisible({ timeout: 20000 });

  // Step 3: Add to watchlist
  const firstMovie = page.getByTestId(TestId.MOVIE_CARD).first();
  const addButton = firstMovie.getByTestId(TestId.ADD_TO_WATCHLIST_BUTTON);
  await addButton.click();
  await expect(addButton).toHaveAttribute('data-state', 'added', { timeout: 20000 });

  // Step 4: Navigate to watchlist
  await page.goto('/watchlist');

  // Step 5: Verify movie in watchlist
  await expect(page.getByTestId(TestId.MOVIE_CARD)).toHaveCount(1, { timeout: 20000 });
});
```

---

### Pattern 5: Anonymous User Flow

```typescript
test('should save mood selection for anonymous user', async ({ page }) => {
  const deviceId = `device-${Date.now()}`;

  // Navigate and set device_id
  await page.goto('/');
  await page.evaluate((id) => {
    localStorage.setItem('device_id', id);
  }, deviceId);

  // Select mood
  await page.getByTestId(TestId.MOOD_BUTTON).filter({ hasText: 'Action' }).click();

  // Verify mood saved (UI state)
  const moodButton = page.getByTestId(TestId.MOOD_BUTTON).filter({ hasText: 'Action' });
  await expect(moodButton).toHaveAttribute('data-state', 'selected');

  // Reload page
  await page.reload();

  // Verify mood persisted
  await expect(moodButton).toHaveAttribute('data-state', 'selected', { timeout: 20000 });

  // Verify in database
  const moodRecord = await supawright.db
    .from('anonymous_mood_selections')
    .select('*')
    .eq('device_id', deviceId)
    .single();

  expect(moodRecord.data?.mood).toBe('action');
});
```

---

## Complete Test Example

```typescript
import { test, expect } from './utils/test-fixtures';
import { supawright } from 'supawright';
import { TestResultLogger, formatTestConditions, logTestResult } from '@/lib/test.utils';
import { TestStepLogger } from './utils/test-logger';
import { TestId } from '@/test.types';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Watchlist Tests', () => {
  const resultLogger = new TestResultLogger('watchlist');

  test.afterAll(async () => {
    resultLogger.finalizeUnreachedTests();

    const summary = resultLogger.getSummary();
    if (summary) {
      console.log('\n📊 Test Logger Summary:');
      console.log(summary);
    }

    const testResultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }

    const data = resultLogger.getSerializableData();
    const callTimestamp = Date.now();
    const callPath = path.join(testResultsDir, `afterall-call-${callTimestamp}.json`);

    fs.writeFileSync(callPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      callId: callTimestamp,
      stats: data.stats,
      testsCount: data.tests.length,
      tests: data.tests,
      testSuiteName: data.testSuiteName,
    }, null, 2));
  });

  test('should display watchlist movies', async ({ page }) => {
    const stepLogger = new TestStepLogger('Watchlist Display Test');

    // Create user
    await stepLogger.step('Create test user with Supawright', async () => {
      const user = await supawright.auth.createUser({
        email: `watchlist-${Date.now()}@example.com`,
        password: 'password123',
        email_confirm: true,
      });

      await supawright.db.from('profiles').insert({
        id: user.id,
        username: 'Watchlist Test User',
        dna_type: 'heart',
      });

      // Store user for later steps
      (page as any).testUser = user;
    });

    // Create watchlist data
    await stepLogger.step('Create watchlist items', async () => {
      const user = (page as any).testUser;

      await supawright.db.from('user_movie_interactions').insert([
        { user_id: user.id, movie_id: 550, movie_title: 'Fight Club', movie_year: '1999', status: 'watchlist' },
        { user_id: user.id, movie_id: 13, movie_title: 'Forrest Gump', movie_year: '1994', status: 'watchlist' },
        { user_id: user.id, movie_id: 680, movie_title: 'Pulp Fiction', movie_year: '1994', status: 'watchlist' },
      ]);
    });

    // Login
    await stepLogger.step('Login to application', async () => {
      const user = (page as any).testUser;

      await page.goto('/auth');
      await page.getByTestId(TestId.AUTH_EMAIL_INPUT).fill(user.email);
      await page.getByTestId(TestId.AUTH_PASSWORD_INPUT).fill('password123');
      await page.getByTestId(TestId.AUTH_SUBMIT_BUTTON).click();
      await expect(page).toHaveURL('/', { timeout: 20000 });
    });

    // Navigate to watchlist
    await stepLogger.step('Navigate to watchlist page', async () => {
      await page.goto('/watchlist');
    });

    // Verify watchlist displayed
    await stepLogger.step('Verify watchlist movies displayed', async () => {
      const movieCards = page.getByTestId(TestId.MOVIE_CARD);
      await expect(movieCards).toHaveCount(3, { timeout: 20000 });
      await expect(movieCards.first()).toBeVisible();
    });

    // Verify movie details
    await stepLogger.step('Verify movie card details', async () => {
      const firstCard = page.getByTestId(TestId.MOVIE_CARD).first();
      await expect(firstCard).toContainText('Fight Club');
      await expect(firstCard).toContainText('1999');
    });
  });

  test('should add movie to watchlist', async ({ page }) => {
    const stepLogger = new TestStepLogger('Add to Watchlist Test');

    // Create user
    const user = await supawright.auth.createUser({
      email: `add-watchlist-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true,
    });

    await supawright.db.from('profiles').insert({
      id: user.id,
      username: 'Add Watchlist Test User',
    });

    // Login (code simplified)
    await page.goto('/auth');
    await page.getByTestId(TestId.AUTH_EMAIL_INPUT).fill(user.email);
    await page.getByTestId(TestId.AUTH_PASSWORD_INPUT).fill('password123');
    await page.getByTestId(TestId.AUTH_SUBMIT_BUTTON).click();
    await expect(page).toHaveURL('/', { timeout: 20000 });

    // Browse movies
    await stepLogger.step('Browse movies', async () => {
      await expect(page.getByTestId(TestId.MOVIE_CARD).first()).toBeVisible({ timeout: 20000 });
    });

    // Add to watchlist
    await stepLogger.step('Add movie to watchlist', async () => {
      const firstMovie = page.getByTestId(TestId.MOVIE_CARD).first();
      const addButton = firstMovie.getByTestId(TestId.ADD_TO_WATCHLIST_BUTTON);
      await addButton.click();
      await expect(addButton).toHaveAttribute('data-state', 'added', { timeout: 20000 });
    });

    // Navigate to watchlist
    await stepLogger.step('Navigate to watchlist', async () => {
      await page.goto('/watchlist');
    });

    // Verify movie added
    await stepLogger.step('Verify movie in watchlist', async () => {
      await expect(page.getByTestId(TestId.MOVIE_CARD)).toHaveCount(1, { timeout: 20000 });
    });
  });
});
```

---

## Best Practices Summary

### 1. Always Use Unique Users

```typescript
// ✅ Good
const user = await supawright.auth.createUser({
  email: `test-${Date.now()}-${Math.random()}@example.com`,
  password: 'password123',
  email_confirm: true,
});

// ❌ Bad
const user = await supawright.auth.createUser({
  email: 'test@example.com', // Can cause conflicts
  password: 'password123',
  email_confirm: true,
});
```

---

### 2. Always Use Data Attributes

```typescript
// ✅ Good
await page.getByTestId(TestId.SUBMIT_BUTTON).click();

// ❌ Bad
await page.locator('.btn-primary').click();
await page.getByRole('button', { name: 'Submit' }).click();
```

---

### 3. Always Specify Timeouts

```typescript
// ✅ Good
await expect(page.getByTestId(TestId.MOVIE_CARD)).toBeVisible({ timeout: 20000 });

// ❌ Bad
await expect(page.getByTestId(TestId.MOVIE_CARD)).toBeVisible(); // Uses default 5s
```

---

### 4. Create Data in Correct Order

```typescript
// ✅ Good - parent first, then children
const user = await supawright.auth.createUser({ /* ... */ });
await supawright.db.from('profiles').insert({ id: user.id, /* ... */ });
await supawright.db.from('user_movie_interactions').insert({ user_id: user.id, /* ... */ });

// ❌ Bad - child before parent
await supawright.db.from('user_movie_interactions').insert({ user_id: user.id, /* ... */ });
const user = await supawright.auth.createUser({ /* ... */ });
```

---

### 5. Use Descriptive Test Names

```typescript
// ✅ Good
test('should display watchlist movies for authenticated user', async ({ page }) => { /* ... */ });

// ❌ Bad
test('test watchlist', async ({ page }) => { /* ... */ });
```

---

### 6. Group Related Operations

```typescript
// ✅ Good
const user = await supawright.auth.createUser({ /* ... */ });
await supawright.db.from('profiles').insert({ /* ... */ });

// Quiz data
await supawright.db.from('cinematic_dna_quiz_responses').insert({ /* ... */ });

// Watchlist data
await supawright.db.from('user_movie_interactions').insert([ /* ... */ ]);
```

---

## Next Steps

1. **Read [Core_Rules.md](./Core_Rules.md)** - Understand fundamental testing principles
2. **Review [Supawright_Integration.md](./Supawright_Integration.md)** - Master test data management
3. **Study [Tests.md](./Tests.md)** - See all test cases with pass conditions
4. **Check [Test_attribute_index.md](./Test_attribute_index.md)** - Reference all test IDs

---

## Summary

Writing effective tests:

1. ✅ **Use Supawright** - Automatic cleanup, pre-verified users
2. ✅ **Use data attributes** - Stable, resilient selectors
3. ✅ **Use 20-second timeouts** - Standard across all tests
4. ✅ **Create unique users** - Avoid conflicts in parallel tests
5. ✅ **Descriptive test names** - Clear intent and behavior
6. ✅ **Import custom fixtures** - Automatic diagnostics

**Key Takeaways:**
- Start with user creation via Supawright
- Create test data in parent → child order
- Use data-testid for all element selection
- Always specify 20-second timeouts
- Let Supawright handle all cleanup
- Follow the 9 core rules

Happy testing! 🧪

---

**Last Updated:** 2025-11-23
