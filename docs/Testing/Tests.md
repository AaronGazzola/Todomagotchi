# Todomagotchi - Test Suite

This document describes the complete test suite for Todomagotchi, covering authentication, todo management, permissions, messaging, and live data features.

## Test Philosophy

Tests focus on **user-facing features and functionality**, ensuring proper role-based access control and real-time collaboration features work correctly.

## Test Index

### Authentication Tests
1. [Authentication Flow](e2e/auth.spec.ts) - `npm run test:e2e:auth`

### Todo Permission E2E Tests
2. [Todo Permission Flow](e2e/todo-permissions.spec.ts) - `npm run test:e2e:permissions`

### Todo Permission Unit Tests
3. [Todo Actions Permission Tests](app/page.actions.test.ts) - `npm run test:unit`

### Live Data Tests
4. [Live Data Updates](e2e/live-data.spec.ts) - `npm run test:e2e:live`

### Messaging Tests
5. [Messaging Flow](e2e/messaging.spec.ts) - `npm run test:e2e:messaging`

---

## Test Details

### 1. Authentication Flow

**File:** `e2e/auth.spec.ts`

**Command:** `npm run test:e2e:auth`

**Description:** Tests the complete authentication flow including sign up, sign out, and sign in functionality.

**Pass Conditions:**

- Sign Up - Navigate to sign up page loads successfully
- Sign Up - Redirect to home after signup (/)
- Sign Up - Avatar menu visible after signup
- Sign Up - Email displayed in avatar menu correctly
- Sign Up - Organization created in database
- Sign Up - Tamagotchi created in database
- Sign Up - Todo list initialized (empty)
- Sign Out - Redirect to sign in page (/sign-in)
- Sign In - Redirect to home after signin (/)
- Sign In - Avatar menu visible after signin

---

### 2. Todo Permission Flow

**File:** `e2e/todo-permissions.spec.ts`

**Command:** `npm run test:e2e`

**Description:** Tests role-based access control for todo operations. Verifies that owners can create/delete todos while members can only toggle completion.

**Pass Conditions:**

**Owner Permissions:**
- Owner Signup - Successful (owner role in database)
- Owner Create Todo - Successful
- Owner Delete Todo - Successful
- Owner Send Invitation - Successful

**Member Permissions:**
- Member Signup - Successful
- Member Accept Invitation - Successful (member role in database)
- Member Cannot Create - UI Hidden (no input/button visible)
- Member Cannot Delete - UI Hidden (no delete button visible)
- Member Can Toggle - Successful (can check/uncheck todos)

---

### 3. Todo Actions Permission Tests

**File:** `app/page.actions.test.ts` (Unit Test)

**Command:** `npm run test:unit`

**Description:** Unit tests for server actions that enforce permission checks using Better Auth's hasPermission API.

**Pass Conditions:**

**createTodoAction:**
- Should allow admin to create todo
- Should allow owner to create todo
- Should deny member from creating todo
- Should handle no active organization

**toggleTodoAction:**
- Should allow member to toggle todo
- Should allow admin to toggle todo
- Should deny user without update permission
- Should handle todo not found
- Should handle todo from different organization
- Should handle no active organization

**deleteTodoAction:**
- Should allow admin to delete todo
- Should allow owner to delete todo
- Should deny member from deleting todo
- Should handle todo not found
- Should handle todo from different organization
- Should handle no active organization

---

### 4. Live Data Updates

**File:** `e2e/live-data.spec.ts`

**Command:** `npm run test:e2e:live`

**Description:** Tests real-time data synchronization between two users using polling. Validates that organization invitations and todo updates propagate correctly.

**Test Configuration:**
- Mode: Parallel execution
- Workers: 2 parallel tests (inviter and invitee)
- Synchronization: File-based coordination via `.test-sync` directory

**Pass Conditions:**

**Inviter Flow:**
- Inviter can create an account successfully
- Inviter can send invitation to invitee email
- Success toast appears after sending invitation
- Inviter receives live data update showing todo created by invitee
- Todo item becomes visible in inviter's UI via polling
- Tamagotchi age increases from 0 to > 0 after todo creation

**Invitee Flow:**
- Invitee can create an account successfully
- Invitation toast appears via polling
- Toast contains valid organization name and ID
- Invitee can accept the invitation
- Organization appears in avatar menu organization selector
- Invitee can select the organization from dropdown
- Tamagotchi data loads for selected organization
- Invitee can create a todo in the shared organization
- Todo item appears in invitee's UI

**Synchronization Files:**
- `.test-sync/inviter-created.txt` - Inviter account created
- `.test-sync/invitee-created.txt` - Invitee account created
- `.test-sync/todo-created.txt` - Invitee todo created

---

### 5. Messaging Flow

**File:** `e2e/messaging.spec.ts`

**Command:** `npm run test:e2e:messaging`

**Description:** Tests real-time messaging between organization members using polling. Validates message sending, receiving, and organization isolation.

**Test Configuration:**
- Mode: Parallel execution
- Workers: 2 parallel tests (inviter and invitee)
- Synchronization: File-based coordination via `.test-sync` directory

**Pass Conditions:**

**Inviter Flow:**
- Inviter can create an account successfully
- Inviter can send invitation to invitee
- Inviter can expand messaging component
- Inviter can send message ("Hello from inviter!")
- Message appears in inviter's chat
- Inviter receives invitee's reply ("Hi inviter, I got your message!")
- Inviter can send reply ("Got your message!")

**Invitee Flow:**
- Invitee can create an account successfully
- Invitee receives and accepts invitation
- Invitee can select invited organization
- Invitee can expand messaging component
- Invitee receives inviter's message ("Hello from inviter!")
- Message has inviter's user ID attribute
- Invitee can send reply
- Invitee receives inviter's final reply
- After switching to personal org, shared messages are NOT visible (org isolation)

**Synchronization Files:**
- `.test-sync/inviter-created.txt` - Inviter account created
- `.test-sync/invitee-created.txt` - Invitee account created
- `.test-sync/org-selected.txt` - Invitee selected organization
- `.test-sync/invitee-sent-message.txt` - Invitee sent message
- `.test-sync/inviter-replied.txt` - Inviter replied
- `.test-sync/invitee-test-complete.txt` - Invitee test complete
