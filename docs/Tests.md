# Tests

This document lists all test cases in the repository.

## Test Index

1. [Authentication Flow](#1-authentication-flow) - `npm run test:e2e:auth`
2. [Live Data Updates](#2-live-data-updates) - `npm run test:e2e:live-data`

## Authentication Tests

### 1. Authentication Flow

**File:** `e2e/auth.spec.ts`

**Command:** `npm run test:e2e:auth`

**Description:** Tests the complete authentication flow including sign up, sign out, and sign in functionality.

**Pass Conditions:**
- User can successfully sign up with name, email, and password
- After sign up, user is redirected to home page (`/`)
- Avatar menu displays the user's email address
- User can successfully sign out
- After sign out, user is redirected to sign in page (`/sign-in`)
- User can successfully sign in with the same credentials
- After sign in, user is redirected to home page (`/`)
- Avatar menu is visible after successful sign in

## Live Data Tests

### 2. Live Data Updates

**File:** `e2e/live-data.spec.ts`

**Command:** `npm run test:e2e:live-data`

**Description:** Tests real-time data synchronization between two users using Server-Sent Events (SSE). Validates that organization invitations and todo updates are propagated via live data streams.

**Test Configuration:**
- Mode: Parallel execution
- Workers: 2 parallel tests (inviter and invitee)
- Synchronization: File-based coordination via `.test-sync` directory

**Pass Conditions:**

#### Inviter Flow:
- Inviter can create an account successfully
- Account creation signals to invitee via sync file
- Inviter waits for invitee account creation (max 60s)
- Inviter waits for invitee SSE connection (max 30s)
- Inviter can open invite dialog via avatar menu
- Inviter can send invitation to invitee email
- Success toast appears after sending invitation
- Inviter waits for invitee to create a todo (max 120s)
- Inviter receives live data update showing the todo created by invitee
- Todo item becomes visible in inviter's UI via SSE update (max 30s)
- Tamagotchi age increases from 0 to > 0 after todo creation

#### Invitee Flow:
- Invitee waits for inviter account creation (max 60s)
- Invitee can create an account successfully
- Account creation signals to inviter via sync file
- SSE connection establishes successfully (readyState === 1, max 10s)
- SSE ready state signals to inviter via sync file
- Invitation toast appears via live data stream (max 120s)
- Toast contains valid organization name and ID
- Invitee can accept the invitation
- Toast disappears after acceptance
- Organization appears in avatar menu organization selector (max 20s)
- Invitee can select the organization from dropdown
- Tamagotchi container updates to show correct organization ID (max 20s)
- Tamagotchi data loads for selected organization (age and health attributes present, max 20s)
- Invitee can create a todo in the shared organization
- Todo item appears in invitee's UI (max 10s)
- Todo creation signals to inviter via sync file

**Synchronization Files:**
- `.test-sync/sse-ready-simple.txt` - Invitee SSE connection ready
- `.test-sync/inviter-created.txt` - Inviter account created
- `.test-sync/invitee-created.txt` - Invitee account created
- `.test-sync/todo-created.txt` - Invitee todo created

**Cleanup:**
- All sync files deleted in beforeAll and afterAll hooks
- All test users, sessions, organizations, members, invitations, todos, and tamagotchis deleted
- Prisma connection closed after all tests
