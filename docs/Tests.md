# Tests.md

This document describes all testing suites that cover the functionality in the Todomagotchi application, following the patterns defined in [Testing.md](Testing.md).

## Run All Tests

```bash
npm run test
```

## Test Index

1. [Authentication Flow Tests](#1-authentication-flow-tests) - [auth.spec.ts](../e2e/auth.spec.ts) - `npm run test:e2e:auth`
2. [Organization Invitation Tests](#2-organization-invitation-tests) - [invitations.spec.ts](../e2e/invitations.spec.ts) - `npm run test:e2e:invitations`
3. [SSE Session Tests](#3-sse-session-tests) - [sse-session.spec.ts](../e2e/sse-session.spec.ts) - `npm run test:e2e:sse`
4. [Todo CRUD Operations Tests](#4-todo-crud-operations-tests) - [todos.spec.ts](../e2e/todos.spec.ts) - `npm run test:e2e:todos`

---

## 1. Authentication Flow Tests

**File:** `e2e/auth.spec.ts`
**Command:** `npm run test:e2e:auth`

Tests the Better-Auth integration covering sign-up, sign-in, sign-out, and session management.

**Test Account:** The seed script creates a test account for sign-in tests:
- Email: `e2e-test@example.com`
- Password: `E2ETestPass123!`
- Organization: E2E Test Organization

**Main Test Cases:**
1. **should sign up new user and sign out** - Creates a new user account, verifies home page redirect, checks avatar menu, and signs out
2. **should sign in with existing user and sign out** - Signs in with the seeded test account, verifies home page redirect, checks avatar menu, and signs out

### Sign-Up Flow

- should create new user account with valid credentials
  ✓ User record created in database with hashed password, name, and email

- should automatically create organization with pattern "{name}'s Tasks"
  ✓ Organization created with slug format "name-tasks" (e.g., "john-doe-tasks")

- should automatically create tamagotchi with random species
  ✓ Tamagotchi exists with age: 0, hunger: 7, feedCount: 0, species: species0-9

- should set new organization as active in session
  ✓ Session activeOrganizationId matches newly created organization ID

- should promote creator to owner role in organization
  ✓ Member record created with role: "owner"

- should redirect to home page (/) after successful sign-up
  ✓ URL changes from /sign-up to /

- should invalidate queries: user, user-organizations, todos, tamagotchi
  ✓ React Query cache cleared for all specified keys

- should display success toast notification
  ✓ Toast appears with success message

- should reject password less than 8 characters
  ✓ Error toast appears with validation message

- should reject duplicate email address
  ✓ Error toast appears indicating email already exists

- should reject invalid email format
  ✓ Error toast appears with email format validation message

- should support fake email addresses for demo mode
  ✓ Sign-up succeeds with fake email pattern

### Sign-In Flow

- should authenticate user with valid credentials
  ✓ Session cookie created, user redirected to home page

- should load user organizations after sign-in
  ✓ Organizations query fetches all user memberships

- should set activeOrganizationId from session
  ✓ Store hydrates with last active organization

- should invalidate user query on successful sign-in
  ✓ React Query refetches user data

- should redirect to home page (/) after sign-in
  ✓ URL changes from /sign-in to /

- should display success toast notification
  ✓ Toast appears confirming sign-in

- should reject incorrect password
  ✓ Error toast appears with authentication failure message

- should reject non-existent email
  ✓ Error toast appears with authentication failure message

- should maintain session across page refreshes
  ✓ Session cookie persists, user remains authenticated

- should support fake email addresses for demo mode
  ✓ Sign-in succeeds with fake email pattern

### Sign-Out Flow

- should clear session and redirect to /sign-in
  ✓ Session cookie removed, URL changes to /sign-in

- should reset app store state (user, activeOrganizationId)
  ✓ Zustand store cleared via reset()

- should invalidate all React Query caches
  ✓ All queries cleared from cache

- should display success toast notification
  ✓ Toast appears confirming sign-out

- should redirect to /sign-in even on error
  ✓ Error handling ensures redirect always occurs

### Route Protection

- should redirect unauthenticated users from / to /sign-in
  ✓ Private path redirect works when no session exists

- should redirect authenticated users from /sign-in to /
  ✓ Auth layout redirect works when session exists

- should redirect authenticated users from /sign-up to /
  ✓ Auth layout redirect works when session exists

- should allow authenticated users to access home page (/)
  ✓ User with session can view protected routes

### Session Management

- should fetch user from database via getUserAction
  ✓ Session retrieved via auth.api.getSession()

- should return null when no session exists
  ✓ getUserAction returns null for unauthenticated request

- should require active organization for authenticated client
  ✓ getAuthenticatedClient throws "No active organization" error

- should create RLS-enabled Prisma client with user context
  ✓ Client configured with session userId and organizationId

- should cache user query for 5 minutes
  ✓ useGetUser hook uses staleTime: 5 minutes

---

## 2. Organization Invitation Tests

**File:** `e2e/invitations.spec.ts`
**Command:** `npm run test:e2e:org` or `npm run test:e2e:invitations`

Tests multi-user organization invitation flow including sending invitations, real-time notification delivery via SSE, accepting/declining invitations, organization switching, and data isolation verification.

### Full Invitation Flow with Real-Time Updates

- should complete full invitation flow with real-time updates and org switching
  ✓ User A signs up and creates organization
  ✓ User A opens avatar menu and clicks invite users button
  ✓ User A enters User B's email and selects member role
  ✓ User A sends invitation and sees success toast
  ✓ User B signs up with invited email address
  ✓ User B receives invitation toast in real-time (within 15 seconds via SSE)
  ✓ Invitation toast displays organization name and role
  ✓ User B accepts invitation and sees success toast
  ✓ User B's organization selector shows at least 2 organizations
  ✓ User B switches to User A's organization
  ✓ User A creates todo in shared organization
  ✓ User B can see User A's todo after page reload
  ✓ User B switches back to own organization
  ✓ User B does not see User A's todos (data isolation verified)
  ✓ Browser contexts cleaned up properly

### Declining Invitations

- should allow user to decline invitation
  ✓ User A signs up and sends invitation to User B
  ✓ User B signs up and receives invitation toast in real-time
  ✓ User B declines invitation
  ✓ Invitation toast disappears
  ✓ User B's organization count remains at 2 (own org + "Add New Organization" option)
  ✓ No member record created for declined invitation
  ✓ Test data cleaned up (sessions, invitations, members, todos, tamagotchi, organizations, users)

---

## 3. SSE Session Tests

**File:** `e2e/sse-session.spec.ts`
**Command:** `npm run test:e2e:sse`

Tests SSE (Server-Sent Events) connection initialization to ensure no "No active organization" errors occur during sign-up flow when SSE connections attempt to establish before organization is set.

**Main Test Cases:**
1. **should not throw 'No active organization' error when SSE connects after sign-up** - Verifies SSE endpoints properly handle race condition where connection establishes before activeOrganizationId is set in session

### Pass Conditions:
- No network errors containing "No active organization"
- SSE streams (/api/todos/stream, /api/tamagotchi/stream, /api/invitations/stream) establish successfully
- Console errors do not include SSE-related failures
- User can complete sign-up flow without SSE errors

---

## 4. Todo CRUD Operations Tests

**File:** `e2e/todos.spec.ts`
**Command:** `npm run test:e2e:todos`

Tests todo create, read, update, delete operations with organization isolation and real-time updates.

**Main Test Cases:**

1. **should create a new todo** - Creates new user, signs up, adds todo, verifies todo appears in list
2. **should display multiple todos** - Signs in, creates 3 todos, verifies count is correct (4 total including first test's todo)
3. **should toggle todo completion** - Signs in, toggles todo checkbox on and off, verifies checked state
4. **should delete a todo** - Signs in, deletes first todo, verifies count decreases
5. **should not create empty todos** - Signs in, attempts to create empty todo, verifies count stays same
6. **should persist todos after page reload** - Signs in, reloads page, verifies todo count remains same
7. **should display empty state when no todos exist** - Creates new user, verifies empty state or zero todos

### Pass Conditions:

- ✓ Todo created with text appears in todo list
- ✓ Multiple todos display correctly in list
- ✓ Todo checkbox toggles between checked/unchecked states
- ✓ Deleted todo removed from list, count decreases
- ✓ Empty text input does not create todo
- ✓ Todos persist across page reloads
- ✓ Empty state shown when user has no todos (or count is 0)

---

## Test Data Management

### Seeded Test User

The seed script creates one persistent test account for sign-in tests:

**Email:** `e2e-test@example.com`
**Password:** `E2ETestPass123!`
**Organization:** E2E Test Organization

### Dynamic Test Data

Most tests create their own temporary users with unique emails (timestamped) to ensure test isolation:

```typescript
const TEST_USER_EMAIL = `test-signup-${Date.now()}@example.com`;
```

### Test Cleanup Strategy

All test files use `beforeAll` and `afterAll` hooks with the `cleanupTestData()` utility:

```typescript
import { cleanupTestData } from "./utils/test-cleanup";

test.beforeAll(async () => {
  await cleanupTestData([TEST_USER_EMAIL]);
});

test.afterAll(async () => {
  await cleanupTestData([TEST_USER_EMAIL]);
  await prisma.$disconnect();
});
```

**Cleanup Functions:**

- `cleanupTestData(userEmails)` - Cascade deletes all user data (todos, tamagotchi, invitations, sessions, members, organizations, users)
- `resetTamagotchiState(organizationId)` - Resets tamagotchi to initial values
- `cleanupUserGeneratedContent(userEmails)` - Alias for cleanupTestData

**Cleanup Order (Cascade Deletion):**
1. Todos (by organizationId)
2. Tamagotchi (by organizationId)
3. Invitations (by email or inviterId)
4. Sessions (by userId)
5. Accounts (by userId)
6. Members (by userId)
7. Organizations (by id)
8. Users (by email)

---

## Test Execution Order

Tests are fully isolated and can run in any order. Each test suite manages its own data:

1. **Authentication Tests** - 9 tests covering sign-up, sign-in, sign-out, validation, route protection
2. **Organization Invitation Tests** - 2 tests covering full invitation flow and declining invitations
3. **SSE Session Tests** - 1 test verifying SSE connections work during sign-up
4. **Todo CRUD Tests** - 7 tests covering create, read, update, delete, persistence

---

## Test Implementation Notes

- All tests follow patterns described in [Testing.md](Testing.md)
- All tests use `data-testid` attributes from TestId enum (Rule 2: Always prefer data attributes)
- All tests use data attributes instead of text content reading (Rule 2a)
- All tests use 10000ms timeouts (Rule 4: Global timeout standard)
- All tests use cleanup utilities, no inline cleanup logic (Rule 5: Isolate test data)
- All tests use Playwright's automatic screenshot capture on failure (Rule 7: Never take manual screenshots)
- All tests fail immediately on first assertion failure (Rule 8)
- Multi-user tests use Playwright's multi-context feature to simulate multiple users
- Tests use real database operations via PrismaClient (no mocks)
