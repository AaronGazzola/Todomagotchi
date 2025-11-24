# Todomagotchi - Test Suite

This document describes the complete test suite for Todomagotchi, covering authentication, todo management, permissions, messaging, and organization features.

## Test Philosophy

Tests focus on **user-facing features and functionality**, ensuring proper role-based access control and real-time collaboration features work correctly.

## Test Index

### Authentication Tests (e2e/auth.spec.ts)
1. [User can sign up](#1-user-can-sign-up) - `npm run test:e2e:auth`
2. [User can sign in](#2-user-can-sign-in) - `npm run test:e2e:auth`
3. [User can sign out](#3-user-can-sign-out) - `npm run test:e2e:auth`

### Todo Permission Tests (e2e/todo-permissions.spec.ts)
4. [Owner can create and delete todos, member can only toggle](#4-owner-can-create-and-delete-todos-member-can-only-toggle) - `npm run test:e2e`

### Todo Permission Unit Tests (app/page.actions.test.ts)
5. [Admin/Owner can create todo](#5-adminowner-can-create-todo) - `npm run test:unit`
6. [Member cannot create todo](#6-member-cannot-create-todo) - `npm run test:unit`
7. [Admin/Owner can delete todo](#7-adminowner-can-delete-todo) - `npm run test:unit`
8. [Member cannot delete todo](#8-member-cannot-delete-todo) - `npm run test:unit`
9. [Member can toggle todo](#9-member-can-toggle-todo) - `npm run test:unit`
10. [Handles no active organization](#10-handles-no-active-organization) - `npm run test:unit`
11. [Handles todo from different organization](#11-handles-todo-from-different-organization) - `npm run test:unit`
12. [Handles todo not found](#12-handles-todo-not-found) - `npm run test:unit`

### Live Data Tests (e2e/live-data.spec.ts)
13. [Live updates work across users](#13-live-updates-work-across-users) - `npm run test:e2e:live`

### Messaging Tests (e2e/messaging.spec.ts)
14. [Users can send and receive messages](#14-users-can-send-and-receive-messages) - `npm run test:e2e:messaging`

---

## Test Details

### 1. User can sign up

**File:** `e2e/auth.spec.ts`

**Pass Conditions:**
- User can fill name, email and password fields
- User can submit signup form
- User is redirected to homepage after signup
- User session is created in database
- Organization is automatically created for the user
- User has owner role in their organization

---

### 2. User can sign in

**File:** `e2e/auth.spec.ts`

**Pass Conditions:**
- User can fill email and password fields
- User can submit signin form
- User is redirected to homepage after signin
- User session persists across page refreshes

---

### 3. User can sign out

**File:** `e2e/auth.spec.ts`

**Pass Conditions:**
- User can click sign out button
- User is redirected to signin page
- User session is cleared from database

---

### 4. Owner can create and delete todos, member can only toggle

**File:** `e2e/todo-permissions.spec.ts`

**Pass Conditions:**

**Owner Permissions:**
- Owner can sign up and automatically gets owner role
- Owner can create todos successfully
- Owner can delete todos successfully
- Owner can send invitations to members
- Create input and add button are visible to owner

**Member Permissions:**
- Member can sign up and accept invitation
- Member automatically gets member role when accepting invitation
- Member can see todos in the organization
- Member CANNOT see create input or add button (UI hidden)
- Member CANNOT see delete button on todos (UI hidden)
- Member CAN toggle todo completion checkbox
- Member role persists in database

**Database Verification:**
- All operations are verified in Postgres database
- Organization roles are correctly assigned (owner vs member)
- Todo permissions are enforced server-side
- Better Auth organization plugin access control works correctly

---

### 5. Admin/Owner can create todo

**File:** `app/page.actions.test.ts` (Unit Test)

**Pass Conditions:**
- `auth.api.hasPermission` is called with `todo: ["create"]` permission
- When hasPermission returns true, todo is created successfully
- Database todo.create is called with correct parameters
- Action returns success response with created todo data

---

### 6. Member cannot create todo

**File:** `app/page.actions.test.ts` (Unit Test)

**Pass Conditions:**
- `auth.api.hasPermission` is called with `todo: ["create"]` permission
- When hasPermission returns false, action fails with permission error
- Database todo.create is NOT called
- Action returns error: "Insufficient permissions to create todos"

---

### 7. Admin/Owner can delete todo

**File:** `app/page.actions.test.ts` (Unit Test)

**Pass Conditions:**
- `auth.api.hasPermission` is called with `todo: ["delete"]` permission
- When hasPermission returns true, todo is deleted successfully
- Database todo.delete is called with correct ID
- Action returns success response

---

### 8. Member cannot delete todo

**File:** `app/page.actions.test.ts` (Unit Test)

**Pass Conditions:**
- `auth.api.hasPermission` is called with `todo: ["delete"]` permission
- When hasPermission returns false, action fails with permission error
- Database todo.delete is NOT called
- Action returns error: "Insufficient permissions to delete todos"

---

### 9. Member can toggle todo

**File:** `app/page.actions.test.ts` (Unit Test)

**Pass Conditions:**
- `auth.api.hasPermission` is called with `todo: ["update"]` permission
- When hasPermission returns true (members have update permission), todo is toggled
- Database todo.update is called to toggle completed status
- Action returns success response with updated todo

---

### 10. Handles no active organization

**File:** `app/page.actions.test.ts` (Unit Test)

**Pass Conditions:**
- When session.activeOrganizationId is null, action fails
- Action returns error: "No active organization"
- Database operations are NOT executed

---

### 11. Handles todo from different organization

**File:** `app/page.actions.test.ts` (Unit Test)

**Pass Conditions:**
- When todo.organizationId doesn't match session.activeOrganizationId, action fails
- Action returns error: "Todo does not belong to active organization"
- Todo is not modified or deleted

---

### 12. Handles todo not found

**File:** `app/page.actions.test.ts` (Unit Test)

**Pass Conditions:**
- When todo.findUnique returns null, action fails
- Action returns error: "Todo not found"
- Update/delete operations are NOT executed

---

### 13. Live updates work across users

**File:** `e2e/live-data.spec.ts`

**Pass Conditions:**
- Changes made by one user appear in real-time for other users
- Todos created by invitee appear for inviter after polling interval
- Database changes propagate correctly across sessions

---

### 14. Users can send and receive messages

**File:** `e2e/messaging.spec.ts`

**Pass Conditions:**
- Users can send messages in their organization
- Messages are visible to all organization members
- Messages persist in database
