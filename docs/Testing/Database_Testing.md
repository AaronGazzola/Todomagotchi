# Database Testing

This document covers database-specific testing patterns, seeding rules, and Supawright database operations.

## Overview

Database testing in this repository uses:

- **Supawright** - Automatic cleanup and test data management
- **PrismaClient** - Direct database access for specific use cases
- **Database Seeding** - Pre-populating required test data

Supawright handles 95% of database operations in tests, eliminating manual cleanup boilerplate.

---

## Database Seeding

### Command

```bash
npm run seed
```

### Purpose

Seeds the database with test data required for E2E tests:
- Test user accounts (players and coaches)
- Reference data (genres, moods, etc.)
- Sample movies and metadata

### When to Run

**Before running E2E tests for the first time** or **after database reset**.

---

## Critical Rules for Seed Scripts

### Rule 1: Seed Scripts Run After Complete Database Reset

Seed scripts assume a **clean, empty database**. They are designed to run only after:
- Complete database wipe
- Fresh database creation
- Database migration

**DO NOT run seed scripts on populated databases** - they will fail with unique constraint violations.

---

### Rule 2: Use `insert()` Operations, NOT `upsert()`

Seed scripts must use **`insert()`** operations exclusively.

**Why:**
- Seed runs on clean database (no conflicts possible)
- `insert()` is faster than `upsert()`
- `insert()` catches data errors immediately
- `upsert()` can mask issues

**Good:**
```typescript
await prisma.user.insert({
  data: { id: '123', email: 'test@example.com' },
});
```

**Bad:**
```typescript
await prisma.user.upsert({
  where: { id: '123' },
  update: {},
  create: { id: '123', email: 'test@example.com' },
});
```

---

### Rule 3: Check Errors and Throw Immediately

Every operation must check for errors and throw immediately.

**Good:**
```typescript
try {
  const user = await prisma.user.insert({
    data: { id: '123', email: 'test@example.com' },
  });
  if (!user) {
    throw new Error('Failed to create user');
  }
} catch (error) {
  console.error('Seed failed:', error);
  throw error;
}
```

**Bad:**
```typescript
const user = await prisma.user.insert({
  data: { id: '123', email: 'test@example.com' },
});
// No error handling - failures silently ignored
```

---

### Rule 4: Source All Data from `scripts/seed-data.ts`

All seed data **MUST** be sourced from `scripts/seed-data.ts`.

**Why:**
- Single source of truth
- Easy to update test data
- Consistent across environments
- Type-safe data structures

**Structure of `scripts/seed-data.ts`:**
```typescript
export const seedUsers = [
  { id: '123', email: 'test@example.com', password: 'hashed...' },
  { id: '456', email: 'coach@example.com', password: 'hashed...' },
];

export const seedGenres = [
  { id: 1, name: 'Action' },
  { id: 2, name: 'Drama' },
];
```

**Usage in seed script:**
```typescript
import { seedUsers, seedGenres } from './seed-data';

for (const user of seedUsers) {
  await prisma.user.insert({ data: user });
}

for (const genre of seedGenres) {
  await prisma.genre.insert({ data: genre });
}
```

---

## Supawright Database Operations

Supawright is the **primary method** for creating and managing test data.

### Basic Operations

#### Insert Records

```typescript
await supawright.db.from('profiles').insert({
  id: user.id,
  username: 'Test User',
  dna_type: 'adrenaline_seeker',
  intl_openness: true,
});
```

#### Insert Multiple Records

```typescript
await supawright.db.from('user_movie_interactions').insert([
  { user_id: user.id, movie_id: 550, movie_title: 'Fight Club', status: 'watchlist' },
  { user_id: user.id, movie_id: 13, movie_title: 'Forrest Gump', status: 'watchlist' },
]);
```

#### Query Records

```typescript
const profile = await supawright.db
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();
```

#### Update Records

```typescript
await supawright.db
  .from('profiles')
  .update({ username: 'Updated Name' })
  .eq('id', user.id);
```

---

## Automatic Cleanup

Supawright automatically cleans up all created records after each test.

### How It Works

1. **Tracking** - Supawright tracks every `insert()` call during test execution
2. **Foreign Key Analysis** - Inspects database schema to understand relationships
3. **Cascade Deletion** - Deletes records in correct order (child → parent)
4. **Guaranteed Execution** - Cleanup runs even if test fails

**Example:**
```typescript
test('should create user data', async ({ page }) => {
  // Create user
  const user = await supawright.auth.createUser({
    email: 'test@example.com',
    password: 'password123',
    email_confirm: true,
  });

  // Create profile
  await supawright.db.from('profiles').insert({
    id: user.id,
    username: 'Test User',
  });

  // Create quiz responses
  await supawright.db.from('cinematic_dna_quiz_responses').insert({
    user_id: user.id,
    q1_emotions: ['thrilled'],
  });

  // Create watchlist items
  await supawright.db.from('user_movie_interactions').insert({
    user_id: user.id,
    movie_id: 550,
    status: 'watchlist',
  });

  // Test logic...

  // NO CLEANUP CODE NEEDED
  // Supawright automatically deletes:
  // 1. user_movie_interactions (child of user)
  // 2. cinematic_dna_quiz_responses (child of user)
  // 3. profiles (child of user)
  // 4. auth.users (parent)
});
```

---

## Foreign Key Handling

Supawright automatically handles foreign key constraints.

### Automatic Ordering

Supawright inspects your database schema and deletes records in the correct order to satisfy foreign key constraints.

**Example Schema:**
```
auth.users (parent)
  ├── profiles (child, FK: id → auth.users.id)
  ├── user_movie_interactions (child, FK: user_id → auth.users.id)
  └── cinematic_dna_quiz_responses (child, FK: user_id → auth.users.id)
```

**Deletion Order (automatic):**
1. `user_movie_interactions` (child)
2. `cinematic_dna_quiz_responses` (child)
3. `profiles` (child)
4. `auth.users` (parent)

**No manual ordering required** - Supawright handles this automatically.

---

## Test Data Isolation

Each test is fully isolated from other tests.

### How Supawright Ensures Isolation

1. **Unique Users** - Each test creates its own user with unique email
2. **Automatic Cleanup** - All data deleted after test completes
3. **No Shared State** - Tests cannot interfere with each other
4. **Parallel Execution Safe** - Tests can run in parallel without conflicts

**Example:**
```typescript
test('Test 1', async ({ page }) => {
  const user = await supawright.auth.createUser({
    email: `test1-${Date.now()}@example.com`, // Unique email
    password: 'password123',
    email_confirm: true,
  });
  // Test logic...
  // User cleaned up automatically
});

test('Test 2', async ({ page }) => {
  const user = await supawright.auth.createUser({
    email: `test2-${Date.now()}@example.com`, // Different unique email
    password: 'password123',
    email_confirm: true,
  });
  // Test logic...
  // User cleaned up automatically
});

// Test 1 and Test 2 are fully isolated
// Can run in parallel without conflicts
```

---

## beforeAll and afterAll Patterns

With Supawright, `beforeAll` and `afterAll` hooks are **minimal**.

### Typical Pattern

```typescript
import { test, expect } from './utils/test-fixtures';
import { supawright } from 'supawright';
import { TestResultLogger } from '@/lib/test.utils';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Feature Tests', () => {
  const logger = new TestResultLogger('feature');

  // afterAll only needed for logger finalization
  test.afterAll(async () => {
    logger.finalizeUnreachedTests();

    const testResultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }

    const data = logger.getSerializableData();
    const callPath = path.join(testResultsDir, `afterall-call-${Date.now()}.json`);
    fs.writeFileSync(callPath, JSON.stringify(data, null, 2));

    // NO database cleanup needed - Supawright handles it
  });

  test('should work', async ({ page }) => {
    // Create test data - cleaned up automatically
  });
});
```

**Key Points:**
- ✅ No `beforeAll` for database setup (create data in each test)
- ✅ `afterAll` only for logger finalization
- ✅ No manual database cleanup
- ✅ No PrismaClient disconnect (unless using PrismaClient directly)

---

## Direct PrismaClient Usage

Use PrismaClient directly only when Supawright doesn't meet your needs.

### When to Use PrismaClient Directly

1. **Complex queries** - Joins, aggregations, raw SQL
2. **Schema introspection** - Inspecting database structure
3. **Transaction support** - Multi-step atomic operations
4. **Performance** - Bulk operations on large datasets

### Pattern for Direct PrismaClient Usage

```typescript
import { PrismaClient } from '@prisma/client';

test.describe('Complex Query Tests', () => {
  const prisma = new PrismaClient();

  test.afterAll(async () => {
    await prisma.$disconnect(); // Disconnect when done
  });

  test('should query with complex join', async ({ page }) => {
    // Create user with Supawright (automatic cleanup)
    const user = await supawright.auth.createUser({
      email: 'test@example.com',
      password: 'password123',
      email_confirm: true,
    });

    // Use PrismaClient for complex query
    const usersWithWatchlists = await prisma.profiles.findMany({
      where: { id: user.id },
      include: {
        user_movie_interactions: {
          where: { status: 'watchlist' },
        },
      },
    });

    // Assertions...

    // Supawright still handles cleanup (even though we used PrismaClient for read)
  });
});
```

**Important:**
- ✅ Use Supawright for all **writes** (inserts, updates, deletes)
- ✅ Use PrismaClient for complex **reads** (queries, joins, aggregations)
- ✅ Supawright cleanup still works (it tracks auth users and database inserts)

---

## Anonymous User Testing (Device ID)

Test anonymous user features with `device_id`.

### Pattern

```typescript
test('should persist mood selection for anonymous user', async ({ page }) => {
  // Generate unique device_id
  const deviceId = `device-${Date.now()}`;

  // Navigate and set device_id in localStorage
  await page.goto('/');
  await page.evaluate((id) => {
    localStorage.setItem('device_id', id);
  }, deviceId);

  // Create anonymous user data with Supawright
  await supawright.db.from('anonymous_mood_selections').insert({
    device_id: deviceId,
    mood: 'action-packed',
    timestamp: new Date().toISOString(),
  });

  // Reload page and verify mood persisted
  await page.reload();
  await expect(page.getByTestId(TestId.MOOD_FILTER)).toHaveAttribute('data-state', 'action-packed');

  // Supawright cleans up anonymous_mood_selections automatically
});
```

**Key Points:**
- Generate unique `device_id` for each test
- Set `device_id` in localStorage via `page.evaluate()`
- Create anonymous data with `supawright.db.from().insert()`
- Supawright cleans up device_id-based records automatically

---

## Complex Data Relationships

Create complex data structures with foreign key relationships.

### Example: User with Complete Profile

```typescript
test('should display user profile with recommendations', async ({ page }) => {
  // Create user
  const user = await supawright.auth.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true,
  });

  // Create profile
  await supawright.db.from('profiles').insert({
    id: user.id,
    username: 'Test User',
    dna_type: 'heart',
    intl_openness: false,
  });

  // Create quiz responses
  await supawright.db.from('cinematic_dna_quiz_responses').insert({
    user_id: user.id,
    q1_emotions: ['moved', 'uplifted'],
    q2_taste: 'heartwarming',
    q4_tones: ['lighthearted', 'emotional'],
    q5_runtime: '90-120min',
    q6_subtitles: 'avoid',
  });

  // Create calibration data
  await supawright.db.from('calibration_actors_directors').insert([
    { user_id: user.id, tmdb_id: 31, name: 'Tom Hanks', type: 'actor' },
    { user_id: user.id, tmdb_id: 524, name: 'Natalie Portman', type: 'actor' },
  ]);

  await supawright.db.from('calibration_movie_ratings').insert([
    { user_id: user.id, movie_id: 13, movie_title: 'Forrest Gump', rating: 5 },
    { user_id: user.id, movie_id: 550, movie_title: 'Fight Club', rating: 4 },
  ]);

  // Create watchlist
  await supawright.db.from('user_movie_interactions').insert([
    { user_id: user.id, movie_id: 680, movie_title: 'Pulp Fiction', status: 'watchlist' },
    { user_id: user.id, movie_id: 155, movie_title: 'The Dark Knight', status: 'watchlist' },
  ]);

  // Test logic...

  // ALL records cleaned up automatically in correct order:
  // 1. calibration_actors_directors (child)
  // 2. calibration_movie_ratings (child)
  // 3. user_movie_interactions (child)
  // 4. cinematic_dna_quiz_responses (child)
  // 5. profiles (child)
  // 6. auth.users (parent)
});
```

---

## Best Practices

### 1. Always Create Unique Users

```typescript
// ✅ Good
const user = await supawright.auth.createUser({
  email: `test-${Date.now()}-${Math.random()}@example.com`,
  password: 'password123',
  email_confirm: true,
});

// ❌ Bad - can cause conflicts in parallel tests
const user = await supawright.auth.createUser({
  email: 'test@example.com',
  password: 'password123',
  email_confirm: true,
});
```

---

### 2. Create Data in Correct Parent → Child Order

```typescript
// ✅ Good - parent first, then children
const user = await supawright.auth.createUser({ /* ... */ });
await supawright.db.from('profiles').insert({ id: user.id, /* ... */ });
await supawright.db.from('user_movie_interactions').insert({ user_id: user.id, /* ... */ });

// ❌ Bad - child before parent (foreign key violation)
await supawright.db.from('user_movie_interactions').insert({ user_id: user.id, /* ... */ });
const user = await supawright.auth.createUser({ /* ... */ });
```

---

### 3. Use Descriptive Test Data

```typescript
// ✅ Good - descriptive data aids debugging
await supawright.db.from('profiles').insert({
  id: user.id,
  username: 'Heart DNA Type Test User',
  dna_type: 'heart',
});

// ❌ Bad - generic data makes debugging harder
await supawright.db.from('profiles').insert({
  id: user.id,
  username: 'User',
  dna_type: 'heart',
});
```

---

### 4. Group Related Data Creation

```typescript
// ✅ Good - grouped by relationship
const user = await supawright.auth.createUser({ /* ... */ });
await supawright.db.from('profiles').insert({ /* ... */ });

// Quiz data
await supawright.db.from('cinematic_dna_quiz_responses').insert({ /* ... */ });

// Calibration data
await supawright.db.from('calibration_actors_directors').insert([ /* ... */ ]);
await supawright.db.from('calibration_movie_ratings').insert([ /* ... */ ]);

// Watchlist data
await supawright.db.from('user_movie_interactions').insert([ /* ... */ ]);
```

---

### 5. Prefer Supawright for All Writes

```typescript
// ✅ Good - Supawright for writes
await supawright.db.from('profiles').insert({ /* ... */ });

// ✅ Good - PrismaClient for complex reads
const usersWithWatchlists = await prisma.profiles.findMany({
  include: { user_movie_interactions: true },
});

// ❌ Bad - PrismaClient for writes (no automatic cleanup)
await prisma.profiles.create({
  data: { /* ... */ },
});
```

---

## Troubleshooting

### Issue: Foreign Key Constraint Violation

**Cause:** Trying to create child records before parent records.

**Solution:** Create parent first, then children:
```typescript
const user = await supawright.auth.createUser({ /* ... */ });
await supawright.db.from('profiles').insert({ id: user.id, /* ... */ });
```

---

### Issue: Unique Constraint Violation

**Cause:** Hardcoded email used across multiple parallel tests.

**Solution:** Use unique emails:
```typescript
const user = await supawright.auth.createUser({
  email: `test-${Date.now()}-${Math.random()}@example.com`,
  password: 'password123',
  email_confirm: true,
});
```

---

### Issue: Data Not Cleaned Up

**Cause:** Supawright global setup not configured.

**Solution:** Verify `e2e/global-setup.ts` initializes Supawright:
```typescript
import { supawright } from 'supawright';

export default async function globalSetup() {
  await supawright.init({
    supabaseUrl: process.env.VITE_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });
}
```

And `playwright.config.ts` references it:
```typescript
globalSetup: require.resolve('./e2e/global-setup'),
```

---

### Issue: Seed Script Fails

**Cause:** Running seed on non-empty database.

**Solution:** Reset database before seeding:
```bash
# Reset database
npx prisma migrate reset

# Run seed
npm run seed
```

---

## Summary

Database testing with Supawright:

1. ✅ **Automatic Cleanup** - No manual cleanup code required
2. ✅ **Foreign Key Handling** - Automatic cascade deletion in correct order
3. ✅ **Test Isolation** - Each test fully isolated from others
4. ✅ **Minimal Boilerplate** - No beforeAll/afterAll for database operations
5. ✅ **Type Safety** - Full TypeScript support

**Key Takeaways:**
- Use Supawright for all database writes (inserts, updates, deletes)
- Use PrismaClient only for complex reads (joins, aggregations)
- Create unique users for each test
- Create data in parent → child order
- Let Supawright handle all cleanup automatically
- Run seed scripts only after database reset

**Next Steps:**
- Read [Supawright_Integration.md](./Supawright_Integration.md) for detailed Supawright usage
- Review [Writing_Tests.md](./Writing_Tests.md) for complete test examples

---

**Last Updated:** 2025-11-23
