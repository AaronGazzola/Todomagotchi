# Testing Documentation

Welcome to the MyMovieTonight.com testing documentation. This directory contains comprehensive guides for writing, executing, and maintaining E2E tests.

## Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure environment variables are set
# See Test_Execution_and_Configuration.md for required variables
```

### Run Your First Test
```bash
# Run all tests
npm run test:e2e

# Run specific test suite
npm run test:e2e:auth

# Run with visible browser
npm run test:e2e:auth:headed
```

### View Test Results
```bash
# Generate test report
npm run test:report

# Results are in: test-results/{TEST_RUN_ID}/README.md
```

## Technology Stack

- **Playwright** - E2E testing framework
- **Supawright** - Supabase test harness for automatic cleanup and user management
- **Jest** - Unit testing framework
- **TypeScript** - Type-safe test implementation
- **Custom Reporters** - Consolidated and minimal reporters for detailed test output

## Documentation Index

### Getting Started

📘 **[Core_Rules.md](./Core_Rules.md)**
Essential testing principles and standards. Read this first to understand our testing philosophy and the 9 core rules.

📘 **[Writing_Tests.md](./Writing_Tests.md)**
Practical guide to writing new tests with step-by-step examples and common patterns.

### Core Systems

📗 **[Supawright_Integration.md](./Supawright_Integration.md)**
Complete guide to using Supawright for automatic database cleanup, pre-verified user creation, and test data management.

📗 **[Test_Logging_and_Diagnostics.md](./Test_Logging_and_Diagnostics.md)**
Deep dive into TestStepLogger, TestResultLogger, and automatic diagnostic capture systems.

📗 **[Reporters_and_Reports.md](./Reporters_and_Reports.md)**
Understanding test reporting architecture, TEST_RUN_ID synchronization, and reading test reports.

### Specialized Topics

📙 **[Database_Testing.md](./Database_Testing.md)**
Database-specific testing patterns, seeding rules, and Supawright database operations.

📙 **[Test_Execution_and_Configuration.md](./Test_Execution_and_Configuration.md)**
Running tests, execution modes, Playwright configuration, and environment setup.

### Reference

📕 **[Tests.md](./Tests.md)**
Complete catalog of all 68 test cases with pass conditions and test data.

📕 **[Test_attribute_index.md](./Test_attribute_index.md)**
Alphabetical index of all `data-testid` values used in the application.

## Common Commands

### Running Tests

```bash
# All tests
npm run test:e2e

# Specific suites
npm run test:e2e:auth
npm run test:e2e:quiz
npm run test:e2e:watchlist
npm run test:e2e:search
npm run test:e2e:recommendations

# Execution modes
npm run test:e2e:auth:headed    # Visible browser
npm run test:e2e:auth:trace     # Full debugging with traces

# Summary mode (less verbose output)
TEST_SUMMARY_ONLY=true npm run test:e2e
```

### Database Management

```bash
# Seed test data
npm run seed
```

### Reporting

```bash
# Generate test report
npm run test:report

# Generate report and cleanup old results
npm run test:report:cleanup
```

### Viewing Results

```bash
# View trace file
npx playwright show-trace test-results/{TEST_RUN_ID}/trace.zip

# Open test results directory
cd test-results/{TEST_RUN_ID}
cat README.md
```

## Testing Philosophy

Our testing approach prioritizes:

1. **Isolation** - Each test is independent with automatic cleanup via Supawright
2. **Speed** - Pre-verified users and direct database operations skip slow UI flows
3. **Reliability** - Data attributes over fragile CSS selectors, 20-second timeouts
4. **Diagnostics** - Comprehensive logging and automatic failure diagnostics
5. **Maintainability** - Shared test IDs, descriptive names, modular structure

## Workflow Overview

### 1. Write a Test

```typescript
import { test, expect } from './utils/test-fixtures';
import { supawright } from 'supawright';
import { TestId } from '@/test.types';

test('should display watchlist movies', async ({ page }) => {
  // Create pre-verified user
  const user = await supawright.auth.createUser({
    email: 'test@example.com',
    password: 'password123',
    email_confirm: true, // Skip email verification
  });

  // Create test data
  await supawright.db.from('user_movie_interactions').insert({
    user_id: user.id,
    movie_id: 550,
    movie_title: 'Fight Club',
    status: 'watchlist',
  });

  // Test
  await page.goto('/watchlist');
  await expect(page.getByTestId(TestId.MOVIE_CARD)).toBeVisible();

  // Cleanup handled automatically by Supawright
});
```

### 2. Run the Test

```bash
npm run test:e2e:watchlist:headed
```

### 3. Review Results

Check `test-results/{TEST_RUN_ID}/README.md` for detailed diagnostics if the test fails.

## Test Data Management with Supawright

Supawright automatically:
- Creates pre-verified users (bypasses email verification)
- Manages database records with automatic cleanup
- Handles foreign key constraints in correct order
- Ensures test isolation (no cross-contamination)

See [Supawright_Integration.md](./Supawright_Integration.md) for complete usage guide.

## Diagnostic Systems

Our tests capture comprehensive diagnostics automatically:

- **Console Logs** - All browser console messages with timestamps and locations
- **Network Failures** - HTTP 400+ responses with request/response details
- **Page Errors** - Uncaught JavaScript exceptions with stack traces
- **Screenshots** - Automatic capture on test failure
- **Traces** - Full Playwright traces for debugging

See [Test_Logging_and_Diagnostics.md](./Test_Logging_and_Diagnostics.md) for details.

## Need Help?

1. **Writing your first test?** → Start with [Writing_Tests.md](./Writing_Tests.md)
2. **Understanding test rules?** → Read [Core_Rules.md](./Core_Rules.md)
3. **Setting up Supawright?** → See [Supawright_Integration.md](./Supawright_Integration.md)
4. **Debugging test failures?** → Check [Reporters_and_Reports.md](./Reporters_and_Reports.md)
5. **Configuring test execution?** → Review [Test_Execution_and_Configuration.md](./Test_Execution_and_Configuration.md)

## Contributing

When adding new tests:
1. Follow the [Core Rules](./Core_Rules.md)
2. Use Supawright for test data management
3. Add test IDs to `src/test.types.ts`
4. Document your test in [Tests.md](./Tests.md)
5. Update this documentation if you add new patterns

---

**Last Updated:** 2025-11-23
