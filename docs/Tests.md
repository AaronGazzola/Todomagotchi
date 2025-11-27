# Tests

This document lists all test cases in the repository.

## Test Index

1. [Authentication Flow](e2e/auth.spec.ts) - `npm run test:e2e:auth`
2. [Todo Permissions](e2e/todo-permissions.spec.ts) - `playwright test e2e/todo-permissions.spec.ts`
3. [Live Data Updates](e2e/live-data.spec.ts) - `npm run test:e2e:live`
4. [Messaging](e2e/messaging.spec.ts) - `npm run test:e2e:messaging`
5. [Unit Tests](app/page.actions.test.ts) - `npm run test:unit`

---

## Authentication Tests

### 1. Authentication Flow

**File:** `e2e/auth.spec.ts`

**Command:** `npm run test:e2e:auth`

**Description:** Tests the complete authentication flow including sign up, sign out, and sign in functionality.

**Pass Conditions:**

- User can navigate to sign up page
- User can successfully sign up with name, email, and password
- After sign up, user is redirected to home page (`/`)
- Avatar menu displays the user's email address
- Organization is created in database with owner role
- Tamagotchi is created for the organization
- Todo list is initialized (empty)
- User can successfully sign out
- After sign out, user is redirected to sign in page (`/sign-in`)
- User can successfully sign in with the same credentials
- After sign in, user is redirected to home page (`/`)
- Avatar menu is visible after successful sign in

---

## Permission Tests

### 2. Todo Permissions

**File:** `e2e/todo-permissions.spec.ts`

**Command:** `playwright test e2e/todo-permissions.spec.ts`

**Description:** Tests role-based access control for todo operations. Validates that owners have full CRUD permissions while members are restricted to update-only operations.

**Pass Conditions:**

#### Owner Flow:
- Owner can sign up successfully with owner role
- Owner can create a todo
- Owner can delete a todo
- Owner can send invitation to another user

#### Member Flow:
- Member can sign up successfully
- Member can accept invitation and join organization with member role
- Member cannot see todo input/create button (UI hidden)
- Member cannot see delete button on todos (UI hidden)
- Member can toggle todo completion status

---

## Live Data Tests

### 3. Live Data Updates

**File:** `e2e/live-data.spec.ts`

**Command:** `npm run test:e2e:live`

**Description:** Tests real-time data synchronization between two users using polling. Validates that organization invitations and todo updates are propagated via live data streams.

**Test Configuration:**

- Mode: Parallel execution
- Workers: 2 parallel tests (inviter and invitee)
- Synchronization: File-based coordination via `.test-sync` directory

**Pass Conditions:**

#### Inviter Flow:
- Inviter can create an account successfully
- Account creation signals to invitee via sync file
- Inviter waits for invitee account creation (max 60s)
- Inviter can open invite dialog via avatar menu
- Inviter can send invitation with admin role to invitee email
- Success toast appears after sending invitation
- Inviter waits for invitee to create a todo (max 120s)
- Inviter receives live data update showing the todo created by invitee
- Todo item becomes visible in inviter's UI via polling update (max 30s)
- Tamagotchi age increases from 0 to > 0 after todo creation

#### Invitee Flow:
- Invitee waits for inviter account creation (max 60s)
- Invitee can create an account successfully
- Account creation signals to inviter via sync file
- Invitation toast appears via live data stream (max 30s)
- Toast contains valid organization name and ID
- Invitee can accept the invitation
- Toast disappears after acceptance
- Organization appears in avatar menu organization selector (max 30s)
- Invitee can select the organization from dropdown
- Tamagotchi container updates to show correct organization ID (max 30s)
- Tamagotchi data loads for selected organization (age attribute present, max 30s)
- Invitee can create a todo in the shared organization
- Todo item appears in invitee's UI (max 30s)
- Todo creation signals to inviter via sync file

**Synchronization Files:**

- `.test-sync/inviter-created.txt` - Inviter account created
- `.test-sync/invitee-created.txt` - Invitee account created
- `.test-sync/todo-created.txt` - Invitee todo created

---

## Messaging Tests

### 4. Messaging

**File:** `e2e/messaging.spec.ts`

**Command:** `npm run test:e2e:messaging`

**Description:** Tests real-time messaging functionality between organization members. Validates that messages are properly synchronized across users and that messages are scoped to specific organizations.

**Test Configuration:**

- Mode: Parallel execution
- Workers: 2 parallel tests (inviter and invitee)
- Synchronization: File-based coordination via `.test-sync` directory

**Pass Conditions:**

#### Inviter Flow:
- Inviter can create an account successfully
- Inviter can send invitation to invitee
- Inviter can expand messaging component
- Inviter can send a message ("Hello from inviter!")
- Message appears in inviter's chat
- Invitee's reply appears in inviter's chat via polling (max 20s)
- Inviter can send a reply message ("Got your message!")
- Reply appears in chat

#### Invitee Flow:
- Invitee waits for inviter account creation
- Invitee can create an account successfully
- Invitation toast appears via live data stream
- Invitee can accept the invitation
- Organization appears in selector and can be selected
- Invitee can expand messaging component
- Inviter's message appears in invitee's chat (max 30s)
- Message has inviter's user ID attribute
- Invitee can send a reply ("Hi inviter, I got your message!")
- Reply appears in chat
- Inviter's second message appears in invitee's chat (max 15s)
- Invitee can switch to personal organization
- Messages from shared organization are no longer visible in personal organization

**Synchronization Files:**

- `.test-sync/inviter-created.txt` - Inviter account created
- `.test-sync/invitee-created.txt` - Invitee account created
- `.test-sync/org-selected.txt` - Invitee selected shared organization
- `.test-sync/invitee-sent-message.txt` - Invitee sent message
- `.test-sync/inviter-replied.txt` - Inviter replied
- `.test-sync/invitee-test-complete.txt` - Invitee test complete

---

## Unit Tests

### 5. Unit Tests

**File:** `app/page.actions.test.ts`

**Command:** `npm run test:unit`

**Description:** Tests todo action permissions for different user roles (admin, owner, member). Validates that role-based access control works correctly at the action level.

**Pass Conditions:**

#### Create Todo:
- Admin can create todo
- Owner can create todo
- Member is denied from creating todo
- No active organization returns error

#### Toggle Todo:
- Member can toggle todo
- Admin can toggle todo
- User without update permission is denied
- Todo not found returns error
- Todo from different organization returns error
- No active organization returns error

#### Delete Todo:
- Admin can delete todo
- Owner can delete todo
- Member is denied from deleting todo
- Todo not found returns error
- Todo from different organization returns error
- No active organization returns error

---

## Cleanup

All tests perform automatic cleanup:
- All sync files deleted in beforeAll and afterAll hooks
- All test users, sessions, organizations, members, invitations, todos, messages, and tamagotchis deleted
- Prisma connection closed after all tests
