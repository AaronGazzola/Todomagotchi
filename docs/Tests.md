# Tests

This document lists all test cases in the repository.

## Test Index

1. [Authentication Flow](#1-authentication-flow) - `npm run test:e2e:auth`
2. [Organization and Tamagotchi Creation](#2-organization-and-tamagotchi-creation) - `npm run test:e2e:org`
3. [Real-time Invitation Flow](#3-real-time-invitation-flow) - `npm run test:e2e:org`
4. [Accept Invitation and Verify Organization Access](#4-accept-invitation-and-verify-organization-access) - `npm run test:e2e:org`
5. [Decline Invitation](#5-decline-invitation) - `npm run test:e2e:org`

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

## Organization Tests

### 2. Organization and Tamagotchi Creation

**File:** `e2e/organization.spec.ts`

**Command:** `npm run test:e2e:org`

**Workers:** 1 (single user test)

**Description:** Tests that a tamagotchi and empty todo list are automatically created when a user signs up and creates their organization.

**Pass Conditions:**
- User can successfully sign up
- After sign up, user is redirected to home page (`/`)
- Tamagotchi container is visible on home page
- Todo empty state is visible (no todos exist)
- Database contains a tamagotchi record for the user's organization
- Database contains zero todo records for the user's organization
- Tamagotchi has correct initial values (organizationId matches user's org)

### 3. Real-time Invitation Flow

**File:** `e2e/organization.spec.ts`

**Command:** `npm run test:e2e:org`

**Workers:** 2 (multi-user test with parallel execution)

**Description:** Tests the real-time invitation flow where one user (inviter) sends an invitation to another user (invitee), and the invitee receives the invitation toast instantly without refreshing the page via Server-Sent Events (SSE).

**Pass Conditions:**

**Inviter (Worker 0):**
- Can successfully sign up and create an organization
- Can open the avatar menu and click invite users button
- Invite dialog opens successfully
- Can enter invitee's email address
- Can send invitation successfully (dialog closes)
- Invitation is stored in database with correct organization ID

**Invitee (Worker 1):**
- Can successfully sign up and create their own organization
- Receives invitation toast within 10 seconds without page refresh
- Invitation toast contains correct organization name via `data-org-name` attribute
- Invitation toast contains correct role via `data-role` attribute

### 4. Accept Invitation and Verify Organization Access

**File:** `e2e/organization.spec.ts`

**Command:** `npm run test:e2e:org`

**Workers:** 2 (continuation of invitation flow test)

**Description:** Tests that after accepting an invitation, the invitee can access the inviter's organization and see the correct organization context, including verifying that the tamagotchi and todo list belong to the correct organization via data attributes.

**Pass Conditions:**
- Invitee can click the accept button on the invitation toast
- Invitation toast dismisses after accepting
- Inviter's organization appears in the invitee's avatar menu organization selector
- Invitee can switch to the inviter's organization
- After switching, tamagotchi container has `data-organization-id` attribute matching inviter's organization ID
- After switching, todo list has `data-organization-id` attribute matching inviter's organization ID
- Database confirms invitee is now a member of inviter's organization
- Invitee can see the inviter's organization content (tamagotchi and todos)

### 5. Decline Invitation

**File:** `e2e/organization.spec.ts`

**Command:** `npm run test:e2e:org`

**Workers:** 2 (multi-user test with parallel execution)

**Description:** Tests that when an invitee declines an invitation, the organization does not become accessible to them.

**Pass Conditions:**

**Inviter (Worker 0):**
- Can send a new invitation to the invitee
- Invitation dialog closes after sending

**Invitee (Worker 1):**
- Receives invitation toast within 10 seconds
- Can click the decline button on the invitation toast
- Invitation toast dismisses after declining
- After declining, the inviter's organization does NOT appear in the invitee's organization selector
- Database confirms invitee is NOT a member of the declined organization
- Invitation status is marked as "rejected" in database
