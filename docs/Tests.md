# Tests.md

This document describes all testing suites that cover the functionality in the Todomagotchi application, following the patterns defined in [Testing.md](Testing.md).

## Run All Tests

```bash
npm run test
```

## Test Index

1. [Authentication Flow Tests](#1-authentication-flow-tests) - [e2e/auth.spec.ts](../e2e/auth.spec.ts) - `npm run test:e2e:auth`
2. [Organization Management Tests](#2-organization-management-tests) - [e2e/organization.spec.ts](../e2e/organization.spec.ts) - `npm run test:e2e:org`
3. [Organization Invitation Tests](#3-organization-invitation-tests) - [e2e/invitations.spec.ts](../e2e/invitations.spec.ts) - `npm run test:e2e:invitations`
4. [Todo CRUD Operations Tests](#4-todo-crud-operations-tests) - [e2e/todos.spec.ts](../e2e/todos.spec.ts) - `npm run test:e2e:todos`
5. [Tamagotchi Lifecycle Tests](#5-tamagotchi-lifecycle-tests) - [e2e/tamagotchi.spec.ts](../e2e/tamagotchi.spec.ts) - `npm run test:e2e:tamagotchi`
6. [Tamagotchi Evolution Unit Tests](#6-tamagotchi-evolution-unit-tests) - [e2e/tamagotchi-unit.spec.ts](../e2e/tamagotchi-unit.spec.ts) - `npm run test:unit:tamagotchi`
7. [Real-Time Multi-User Sync Tests](#7-real-time-multi-user-sync-tests) - [e2e/realtime-sync.spec.ts](../e2e/realtime-sync.spec.ts) - `npm run test:e2e:sync`

---

## 1. Authentication Flow Tests

**File:** `e2e/auth.spec.ts`
**Command:** `npm run test:e2e:auth`

Tests the Better-Auth integration covering sign-up, sign-in, sign-out, and session management.

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

## 2. Organization Management Tests

**File:** `e2e/organization.spec.ts`
**Command:** `npm run test:e2e:org`

Tests organization CRUD operations, member roles, organization switching, and data isolation.

### Organization Creation

- should create organization with custom name and slug
  ✓ Organization record created with provided name and slug in database

- should set creator as organization owner
  ✓ Member record created with role: "owner" for creating user

- should automatically create tamagotchi for new organization
  ✓ Tamagotchi record exists with organizationId, age: 0, hunger: 7, feedCount: 0

- should assign random species to tamagotchi (species0-9)
  ✓ Species value is one of 10 available species

- should set tamagotchi color to default #1f2937
  ✓ Color field initialized to gray

- should enforce unique constraint on (slug, createdBy)
  ✓ Error thrown when user tries to create duplicate slug

- should auto-set new organization as active
  ✓ Session activeOrganizationId updated to new organization

- should invalidate user-organizations query
  ✓ React Query refetches organization list

- should display success toast on creation
  ✓ Toast appears with success message

- should display error toast on creation failure
  ✓ Toast appears with error message for validation failures

### Organization Switching

- should display list of user's organizations in dropdown
  ✓ AvatarMenu shows all organizations where user is member

- should change active organization context via setActiveOrganizationAction
  ✓ Session activeOrganizationId updated in database

- should update Zustand store with new activeOrganizationId
  ✓ Store activeOrganizationId matches new selection

- should invalidate todos query on organization switch
  ✓ React Query refetches todos for new organization

- should invalidate tamagotchi query on organization switch
  ✓ React Query refetches tamagotchi for new organization

- should invalidate user-organizations query
  ✓ Organization list refreshed

- should display only todos from active organization
  ✓ TodoList filtered by activeOrganizationId

- should display only tamagotchi from active organization
  ✓ Tamagotchi component shows pet for activeOrganizationId

- should persist active organization across sessions
  ✓ Session activeOrganizationId loaded on page refresh

### Tamagotchi Color Management

- should update tamagotchi color for organization
  ✓ Color field updated in tamagotchi record

- should broadcast color change to all org members via SSE
  ✓ sseBroadcaster.notifyTamagotchi() called

- should invalidate tamagotchi query after color update
  ✓ React Query cache refreshed

- should display updated color immediately in UI
  ✓ Tamagotchi sprite renders with new color

- should persist color across sessions
  ✓ Color retrieved correctly on page reload

### Organization Data Reset

- should display confirmation dialog before reset
  ✓ Dialog appears with warning message

- should delete all todos for active organization
  ✓ Todo count becomes 0 after reset

- should reset tamagotchi to egg state (age: 0)
  ✓ Age field set to 0

- should reset tamagotchi feedCount to 0
  ✓ FeedCount field set to 0

- should assign random species to tamagotchi on reset
  ✓ Species changed to random value (species0-9)

- should preserve tamagotchi color on reset
  ✓ Color field unchanged after reset

- should broadcast reset notification via SSE
  ✓ All connected clients receive refresh signal

- should invalidate todos and tamagotchi queries
  ✓ React Query cache cleared for both

- should not reset if user cancels confirmation
  ✓ Data unchanged when dialog dismissed

### Organization Member Roles

- should assign "owner" role to organization creator
  ✓ Member record has role: "owner"

- should allow "owner" to send invitations
  ✓ sendInvitationsAction succeeds for owner

- should allow "admin" to send invitations
  ✓ sendInvitationsAction succeeds for admin

- should prevent "member" from sending invitations
  ✓ sendInvitationsAction throws authorization error

- should display role in organization member list
  ✓ Member role visible in UI

### Organization Data Isolation

- should filter todos by organizationId
  ✓ getTodosAction returns only todos for active organization

- should enforce organizationId check on todo updates
  ✓ toggleTodoAction throws error if todo not in active org

- should enforce organizationId check on todo deletes
  ✓ deleteTodoAction throws error if todo not in active org

- should enforce unique tamagotchi per organization
  ✓ Database constraint prevents multiple tamagotchis per org

- should allow same todo text in different organizations
  ✓ Two todos with identical text can exist in different orgs

---

## 3. Organization Invitation Tests

**File:** `e2e/invitations.spec.ts`
**Command:** `npm run test:e2e:invitations`

Tests organization invitation lifecycle including sending, receiving, accepting, and declining invitations.

### Sending Invitations

- should allow owner to send invitation with member role
  ✓ Invitation record created with role: "member", status: "pending"

- should allow owner to send invitation with admin role
  ✓ Invitation record created with role: "admin", status: "pending"

- should allow admin to send invitations
  ✓ sendInvitationsAction succeeds when member role is "admin"

- should prevent member from sending invitations
  ✓ sendInvitationsAction throws "Only organization admins and owners can send invitations"

- should set expiration date to 7 days from creation
  ✓ expiresAt field set to Date.now() + 7 days

- should validate email format with regex
  ✓ Invalid email rejected with "Invalid email format" error

- should prevent duplicate pending invitations to same email
  ✓ Error thrown when pending invitation already exists for email

- should prevent inviting existing organization members
  ✓ Error thrown when user is already a member

- should support sending multiple invitations at once
  ✓ sendInvitationsAction processes array of emails

- should return success/error for each email in batch
  ✓ InvitationResult array returned with per-email status

- should broadcast invitation to recipient's email via SSE
  ✓ sseBroadcaster.notifyInvitation(email) called

- should display success toast with invitation count
  ✓ Toast shows "X invitations sent successfully"

- should display error toast for validation failures
  ✓ Toast shows specific validation error messages

### Receiving Invitations

- should display pending invitations for user's email
  ✓ getPendingInvitationsForUserAction filters by email and status: "pending"

- should show organization name in invitation
  ✓ Invitation includes organization relation

- should show inviter name in invitation
  ✓ Invitation includes inviter relation

- should show role (member/admin) in invitation
  ✓ Invitation displays role field

- should display invitation via toast notification
  ✓ InvitationToasts component shows toast for each pending invitation

- should include accept and decline buttons in toast
  ✓ Both buttons visible and functional

- should not display expired invitations
  ✓ Invitations past expiresAt filtered out of query

- should not display rejected invitations
  ✓ Invitations with status: "rejected" filtered out

- should not display duplicate toasts for same invitation
  ✓ displayedInvitationsRef prevents duplicate rendering

### Accepting Invitations

- should create member record with correct role
  ✓ Member record created with role from invitation

- should update invitation status to "accepted"
  ✓ acceptInvitationAction calls Better-Auth method

- should add organization to user's organization list
  ✓ getUserOrganizationsAction returns new organization

- should set accepted organization as active
  ✓ Session activeOrganizationId updated to new organization

- should invalidate user-organizations query
  ✓ React Query refetches organization list

- should invalidate pending-invitations query
  ✓ React Query refetches invitation list

- should invalidate todos query
  ✓ Todos loaded for new active organization

- should invalidate tamagotchi query
  ✓ Tamagotchi loaded for new active organization

- should display success toast on acceptance
  ✓ Toast appears confirming invitation accepted

- should remove invitation from toast list
  ✓ Toast dismissed after acceptance

### Declining Invitations

- should update invitation status to "rejected"
  ✓ declineInvitationAction updates status field

- should not create member record
  ✓ No member record exists for declined invitation

- should remove invitation from pending list
  ✓ Invitation no longer returned by getPendingInvitationsForUserAction

- should invalidate pending-invitations query
  ✓ React Query cache updated

- should display confirmation toast
  ✓ Toast appears confirming decline

- should remove invitation from toast list
  ✓ Toast dismissed after declining

### Invitation Expiration

- should filter out expired invitations in pending query
  ✓ Invitations with expiresAt < Date.now() not returned

- should prevent accepting expired invitations
  ✓ acceptInvitationAction throws error for expired invitation

- should allow cleanup of expired invitations
  ✓ Expired invitations can be deleted from database

### Real-Time Invitation Notifications

- should notify recipient via SSE when invitation sent
  ✓ EventSource connection receives invitation event

- should display toast immediately when invitation received
  ✓ Toast appears via useTodosSSE() hook

- should register SSE client by recipient email
  ✓ SSEBroadcaster adds client to invitationClients map

- should broadcast to correct email only
  ✓ Only recipient's email receives notification

- should update pending list in real-time
  ✓ Invitation list refreshes via SSE without manual action

- should reconnect SSE on connection loss
  ✓ EventSource reconnects after 5 seconds on error

---

## 4. Todo CRUD Operations Tests

**File:** `e2e/todos.spec.ts`
**Command:** `npm run test:e2e:todos`

Tests todo create, read, update, delete operations with organization isolation and tamagotchi integration.

### Creating Todos

- should create todo with text input
  ✓ Todo record created in database with text and organizationId

- should display todo in list with completed: false
  ✓ New todo appears in TodoList component

- should clear input field after creation
  ✓ Input value reset to empty string

- should order todos by creation date (newest first)
  ✓ Todos appear in descending createdAt order

- should feed tamagotchi on todo creation via feedTamagotchiHelper
  ✓ Tamagotchi feedCount incremented, hunger increased

- should invalidate tamagotchi query after creation
  ✓ React Query refetches tamagotchi data

- should broadcast creation to all org members via SSE
  ✓ sseBroadcaster.notifyTodos(organizationId) called

- should display success toast on creation
  ✓ Toast appears with "Todo created" message

- should prevent creating todo with empty text
  ✓ Add button disabled when input length is 0

- should prevent creating todo with only whitespace
  ✓ Validation rejects whitespace-only input

- should support creating todo with Enter key
  ✓ handleKeyPress triggers create on Enter

- should display error toast on creation failure
  ✓ Toast appears with error message

### Reading Todos

- should fetch todos for active organization only via getTodosAction
  ✓ Query filters by session activeOrganizationId

- should display all todos in TodoList component
  ✓ Each todo rendered with checkbox, text, delete button

- should display empty state when no todos exist
  ✓ "No todos yet" message visible when todo count is 0

- should display checkbox for each todo
  ✓ Checkbox element visible with correct checked state

- should display delete button on todo item hover
  ✓ Delete button becomes visible on hover

- should display strikethrough text for completed todos
  ✓ Completed todos have line-through text decoration

- should cache todos with staleTime: Infinity
  ✓ useGetTodos query never becomes stale until explicit invalidation

### Updating Todos (Toggle Completion)

- should toggle todo from incomplete to complete
  ✓ Completed field changes from false to true

- should toggle todo from complete to incomplete
  ✓ Completed field changes from true to false

- should feed tamagotchi only when marking complete
  ✓ feedTamagotchiHelper called when completed: false → true

- should not feed tamagotchi when unchecking
  ✓ feedTamagotchiHelper not called when completed: true → false

- should invalidate tamagotchi query on completion
  ✓ React Query refetches tamagotchi when todo completed

- should broadcast toggle to all org members via SSE
  ✓ sseBroadcaster.notifyTodos() called

- should verify todo belongs to active organization before update
  ✓ toggleTodoAction throws error if organizationId mismatch

- should display error toast on toggle failure
  ✓ Toast appears with "Failed to toggle todo" message

- should not display success toast on toggle (silent success)
  ✓ No toast shown for successful toggle

### Deleting Todos

- should delete todo from database via deleteTodoAction
  ✓ Todo record removed

- should remove todo from list in UI
  ✓ Todo no longer visible in TodoList

- should broadcast deletion to all org members via SSE
  ✓ sseBroadcaster.notifyTodos() called

- should display success toast on deletion
  ✓ Toast appears with "Todo deleted" message

- should verify todo belongs to active organization before delete
  ✓ deleteTodoAction throws error if organizationId mismatch

- should display error toast on deletion failure
  ✓ Toast appears with error message

- should not feed tamagotchi on deletion
  ✓ Tamagotchi stats unchanged on delete

### Todo Organization Isolation

- should filter todos by activeOrganizationId in getTodosAction
  ✓ Query returns only todos for active organization

- should create todos in active organization only
  ✓ New todo organizationId matches session activeOrganizationId

- should not display todos from other organizations
  ✓ Switching orgs shows different todo sets

- should allow same text in different organizations
  ✓ Two todos with identical text can exist in different orgs

- should enforce organizationId check on toggle
  ✓ Cannot toggle todo from another organization

- should enforce organizationId check on delete
  ✓ Cannot delete todo from another organization

### Real-Time Todo Sync via SSE

- should update todo list when other member creates todo
  ✓ useTodosSSE receives event, updates React Query cache

- should update todo list when other member completes todo
  ✓ Checkbox state updates for all members

- should update todo list when other member deletes todo
  ✓ Todo removed from all members' views

- should register SSE client by organizationId
  ✓ SSEBroadcaster adds client to todoClients map

- should send todo data every 5 seconds via /api/todos/stream
  ✓ SSE endpoint streams data at 5-second intervals

- should update React Query cache directly via setQueryData
  ✓ Cache updated without triggering full refetch

- should reconnect SSE on connection loss
  ✓ EventSource reconnects after 5 seconds on error

- should cleanup SSE connection on component unmount
  ✓ EventSource closed when useTodosSSE unmounts

### Keyboard Shortcuts

- should create todo when Enter key pressed
  ✓ handleKeyPress triggers handleAddTodo

- should not create todo on other keys
  ✓ Only Enter key triggers creation

### Loading States

- should show loading state on create button during mutation
  ✓ Button disabled and shows loading indicator

- should show loading skeleton during initial query
  ✓ Loading state visible until todos fetched

---

## 5. Tamagotchi Lifecycle Tests

**File:** `e2e/tamagotchi.spec.ts`
**Command:** `npm run test:e2e:tamagotchi`

Tests tamagotchi creation, feeding, evolution, hunger decay, sprites, and real-time synchronization.

### Tamagotchi Creation

- should create tamagotchi on organization creation via afterCreateOrganization hook
  ✓ Tamagotchi record exists with organizationId

- should initialize with age 0 (egg stage)
  ✓ Age field equals 0

- should initialize with hunger 7
  ✓ Hunger field equals 7

- should initialize with feedCount 0
  ✓ FeedCount field equals 0

- should initialize with default color #1f2937
  ✓ Color field equals default gray

- should initialize with random species (species0-9)
  ✓ Species is one of 10 valid values

- should enforce unique constraint on organizationId
  ✓ Database prevents multiple tamagotchis per organization

### Feeding Mechanics

- should increase hunger when fed via left button
  ✓ Hunger value increases (capped at 7)

- should increment feedCount on each feed
  ✓ FeedCount increases by 1

- should cap hunger at 7
  ✓ Feeding at hunger 7 does not exceed 7

- should update lastFedAt timestamp
  ✓ LastFedAt field updated to current time

- should call feedTamagotchiHelper from createTodoAction
  ✓ Creating todo triggers feed

- should call feedTamagotchiHelper from toggleTodoAction when completing
  ✓ Completing todo triggers feed

- should not call feedTamagotchiHelper when uncompleting todo
  ✓ Unchecking todo does not trigger feed

- should broadcast feed action via SSE
  ✓ sseBroadcaster.notifyTamagotchi() called

- should invalidate tamagotchi query after feed
  ✓ React Query cache refreshed

### Evolution Progression

- should remain egg stage (age 0) from 0-4 feeds
  ✓ Age stays 0 when feedCount < 5

- should evolve to baby (age 1) at feedCount 5
  ✓ Age changes to 1 when feedCount reaches 5

- should evolve to child (age 2) at feedCount 10
  ✓ Age changes to 2 when feedCount reaches 10

- should evolve to adult (age 3) at feedCount 15
  ✓ Age changes to 3 when feedCount reaches 15

- should display evolution toast notification
  ✓ Toast appears for each age milestone (baby, child, adult)

- should change sprite based on age and species
  ✓ getSpriteForTamagotchi returns correct sprite

### Lifecycle Reset

- should reset to egg after 25 feeds
  ✓ Age changes to 0 when feedCount reaches 25

- should assign random species on lifecycle reset
  ✓ Species randomized when feedCount reaches 25

- should reset feedCount to 0 on lifecycle reset
  ✓ FeedCount set to 0 when age resets

- should display lifecycle completion toast
  ✓ Toast appears with reset message

### Hunger Decay System

- should decrease hunger every 30 seconds via useHungerTimer
  ✓ updateTamagotchiHungerAction called at 30-second intervals

- should calculate decay from lastCheckedAt timestamp
  ✓ Multiple 30-second intervals calculated correctly

- should cap hunger decrease at 0
  ✓ Hunger cannot go below 0

- should trigger death when hunger reaches 0
  ✓ Age resets to 0 on starvation

- should assign random species on starvation death
  ✓ Species changed when hunger reaches 0

- should reset feedCount to 0 on starvation
  ✓ FeedCount set to 0 when hunger reaches 0

- should not allow death for egg stage (age 0)
  ✓ Age 0 tamagotchi bypasses hunger depletion reset

### Sprite Rendering

- should display egg sprite (SPRITE_EGG) for all species at age 0
  ✓ Sprite matches SPRITE_EGG regardless of species

- should display species-specific baby sprite at age 1
  ✓ Sprite matches pattern {species}_age1

- should display species-specific child sprite at age 2
  ✓ Sprite matches pattern {species}_age2

- should display species-specific adult sprite at age 3
  ✓ Sprite matches pattern {species}_age3

- should render sprite as pixel grid
  ✓ Sprite grid rendered with correct dimensions (10x10 or 16x16)

- should display hunger bar with hambone icons
  ✓ Hunger bar shows 0-7 hambone sprites based on hunger level

### Button Interactions

- should feed tamagotchi when left button clicked
  ✓ useFeedTamagotchi mutation triggered

- should not trigger action on center button click
  ✓ No action occurs

- should not trigger action on right button click
  ✓ No action occurs

### Development Tools

- should display species selector in dev mode
  ✓ Species popover visible when NODE_ENV === "development"

- should update species via dev selector
  ✓ updateTamagotchiSpeciesAction called with selected species

- should display age selector in dev mode
  ✓ Age popover visible in development

- should update age via dev selector
  ✓ updateTamagotchiAgeAction called with selected age

- should hide dev tools in production
  ✓ Dev selectors not rendered when NODE_ENV === "production"

- should display sprite grid viewer in dev mode
  ✓ Sprite grid dialog available in development

### Real-Time Sync via SSE

- should broadcast tamagotchi updates to all org members
  ✓ sseBroadcaster.notifyTamagotchi(organizationId) called

- should register SSE client by organizationId
  ✓ SSEBroadcaster adds client to tamagotchiClients map

- should send tamagotchi data every 5 seconds via /api/tamagotchi/stream
  ✓ SSE endpoint streams data at 5-second intervals

- should update React Query cache on SSE event
  ✓ useTamagotchiSSE updates cache via setQueryData

- should reconnect SSE on connection loss
  ✓ EventSource reconnects after 5 seconds on error

- should cleanup SSE connection on component unmount
  ✓ EventSource closed when component unmounts

---

## 6. Tamagotchi Evolution Unit Tests

**File:** `e2e/tamagotchi-unit.spec.ts`
**Command:** `npm run test:unit:tamagotchi`

Unit tests for tamagotchi algorithms using service role client injection and seeded database data.

### Sprite Mapping Algorithm Tests

- should map species0-age0 to SPRITE_EGG
  ✓ getSpriteForTamagotchi("species0", 0) returns SPRITE_EGG

- should map species0-age1 to species0 baby sprite
  ✓ getSpriteForTamagotchi("species0", 1) returns SPRITE_LEVEL_1

- should map species5-age2 to species5 child sprite
  ✓ getSpriteForTamagotchi("species5", 2) returns correct sprite grid

- should map species9-age3 to species9 adult sprite
  ✓ getSpriteForTamagotchi("species9", 3) returns correct sprite grid

- should handle invalid species by defaulting to species0
  ✓ getSpriteForTamagotchi("invalid", 1) returns species0 sprite

- should handle invalid age by defaulting to age 0
  ✓ getSpriteForTamagotchi("species5", 99) returns SPRITE_EGG

- should return 10x10 grid for egg sprite
  ✓ SPRITE_EGG dimensions are 10x10

- should return correct dimensions for species-specific sprites
  ✓ Sprite dimensions match expected size (10x10 or 16x16)

### Feed Evolution Logic Tests

- should evolve from age 0 to age 1 at feedCount 5
  ✓ feedTamagotchiHelper updates age field to 1

- should evolve from age 1 to age 2 at feedCount 10
  ✓ feedTamagotchiHelper updates age field to 2

- should evolve from age 2 to age 3 at feedCount 15
  ✓ feedTamagotchiHelper updates age field to 3

- should reset to age 0 at feedCount 25
  ✓ feedTamagotchiHelper updates age field to 0

- should reset feedCount to 0 at lifecycle reset
  ✓ feedTamagotchiHelper sets feedCount to 0

- should randomize species at lifecycle reset
  ✓ Species changed to random value (species0-9)

- should increase hunger by 1 on feed (capped at 7)
  ✓ Hunger increments but does not exceed 7

- should update lastFedAt timestamp on feed
  ✓ lastFedAt field updated to current time

### Hunger Decay Logic Tests

- should decrease hunger by 1 every 30 seconds
  ✓ updateTamagotchiHungerAction calculates correct decrement

- should calculate multiple intervals correctly
  ✓ Hunger decreases by 3 after 90 seconds (3 intervals)

- should cap hunger decrease at 0
  ✓ Hunger cannot go below 0

- should reset to egg when hunger reaches 0
  ✓ Age set to 0 on starvation

- should randomize species on starvation
  ✓ Species changed on starvation

- should reset feedCount on starvation
  ✓ FeedCount set to 0 on starvation

- should not decay hunger for egg (age 0)
  ✓ Age 0 tamagotchi hunger remains unchanged

- should update lastCheckedAt timestamp
  ✓ lastCheckedAt updated to current time

### Random Species Selection Tests

- should return species value between species0-species9
  ✓ Random species is one of 10 valid values

- should have uniform distribution over 100 iterations
  ✓ Each species selected at least once in 100 trials

- should return different species on consecutive calls (probabilistic)
  ✓ At least 2 different species in 10 consecutive calls

### Edge Cases

- should not evolve egg (age 0) when hunger depletes
  ✓ Age 0 tamagotchi survives hunger reaching 0

- should handle feeding at hunger 0
  ✓ Hunger increases from 0 to 1 on feed

- should handle feeding at hunger 7
  ✓ Hunger remains 7 when already at maximum

- should handle concurrent feeds
  ✓ FeedCount increments correctly with rapid feeds

- should handle timestamp edge cases
  ✓ Hunger decay works with very old lastCheckedAt

- should handle feedCount exactly at evolution threshold
  ✓ Evolution triggers at exact thresholds (5, 10, 15, 25)

### Database Integration Tests

- should query seeded tamagotchi via service role client
  ✓ getTamagotchiAction returns seeded data

- should update tamagotchi via injected client
  ✓ feedTamagotchiHelper accepts client parameter

- should bypass RLS with service role client
  ✓ Service role client can query all organization data

- should inject client to all tested functions
  ✓ All functions accept client?: SupabaseClient parameter

---

## 7. Real-Time Multi-User Sync Tests

**File:** `e2e/realtime-sync.spec.ts`
**Command:** `npm run test:e2e:sync`

Tests SSE (Server-Sent Events) broadcasting and multi-user synchronization using multiple browser contexts.

### SSE Connection Management

- should establish EventSource connection on app load
  ✓ useTodosSSE, useTamagotchiSSE, useInvitationsSSE create connections

- should register client with SSEBroadcaster
  ✓ Client added to appropriate map (todoClients, tamagotchiClients, invitationClients)

- should register client by organizationId for todos
  ✓ SSEBroadcaster.addTodoClient(organizationId, client) called

- should register client by organizationId for tamagotchi
  ✓ SSEBroadcaster.addTamagotchiClient(organizationId, client) called

- should register client by email for invitations
  ✓ SSEBroadcaster.addInvitationClient(email, client) called

- should remove client from broadcaster on disconnect
  ✓ Client removed from map when EventSource closes

- should reconnect SSE on connection loss
  ✓ EventSource reconnects after 5 seconds on error

- should cleanup SSE connection on component unmount
  ✓ EventSource closed when component unmounts

### Todo SSE Synchronization

- should sync todo creation across two browser contexts
  ✓ User A creates todo → User B sees it immediately

- should sync todo completion across contexts
  ✓ User A completes todo → User B sees checkbox checked

- should sync todo deletion across contexts
  ✓ User A deletes todo → Todo removed from User B's list

- should broadcast to all org members
  ✓ sseBroadcaster.notifyTodos(organizationId) sends to all clients

- should not broadcast to other organizations
  ✓ User in org A does not receive org B notifications

- should send data every 5 seconds via /api/todos/stream
  ✓ SSE endpoint polls and sends at 5-second intervals

- should update React Query cache via setQueryData
  ✓ useTodosSSE updates cache without full refetch

### Tamagotchi SSE Synchronization

- should sync feeding across contexts
  ✓ User A feeds → User B sees hunger increase

- should sync evolution across contexts
  ✓ Tamagotchi evolves → All users see age change

- should sync color changes across contexts
  ✓ User A changes color → User B sees color update

- should sync species changes across contexts
  ✓ Dev tool species change → All users see new sprite

- should sync hunger decay across contexts
  ✓ Automatic hunger decrease visible to all users

- should send data every 5 seconds via /api/tamagotchi/stream
  ✓ SSE endpoint polls and sends at 5-second intervals

- should broadcast to all org members
  ✓ sseBroadcaster.notifyTamagotchi(organizationId) sends to all clients

### Invitation SSE Synchronization

- should notify user immediately when invitation received
  ✓ Toast appears in real-time when invitation sent

- should send data every 5 seconds via /api/invitations/stream
  ✓ SSE endpoint polls and sends at 5-second intervals

- should broadcast to recipient email only
  ✓ sseBroadcaster.notifyInvitation(email) sends to correct user

- should not notify other users
  ✓ Only recipient receives invitation notification

- should update pending list in real-time
  ✓ Invitation count updates without manual action

- should not display duplicate toasts
  ✓ displayedInvitationsRef prevents duplicate rendering

### Multi-Context Test Scenarios

- should support 3+ simultaneous users in same organization
  ✓ All users receive broadcasts correctly

- should handle rapid todo creation by multiple users
  ✓ All todos appear in correct order for all users

- should handle simultaneous feeding by multiple users
  ✓ Hunger increases correctly, no race conditions

- should handle simultaneous todo completion
  ✓ All completions processed, tamagotchi fed correctly

- should handle organization switching across contexts
  ✓ SSE subscriptions update, broadcasts filtered correctly

### SSE Error Handling

- should handle connection timeout gracefully
  ✓ Auto-reconnect after 5 seconds

- should handle network interruption
  ✓ EventSource reconnects when network restored

- should handle server error responses
  ✓ Error logged, reconnection attempted

- should handle SSE endpoint unavailable
  ✓ Graceful degradation, app remains functional

### SSE Broadcaster Management

- should maintain separate client maps per type
  ✓ todoClients, tamagotchiClients, invitationClients independent

- should remove disconnected clients automatically
  ✓ Clients removed when EventSource closed

- should handle client errors during broadcast
  ✓ Failed client removed, other clients unaffected

- should support multiple clients per organization
  ✓ Map stores Set of clients per key

---

## Test Data Requirements

### Seed Users

The following test users should be created in the seed script for test execution:

1. **testuser1@example.com** (Password123!)
   - Owner of "Test Org 1"
   - Used for primary user workflows

2. **testuser2@example.com** (Password123!)
   - Owner of "Test Org 2"
   - Admin of "Test Org 1"
   - Used for multi-user sync tests

3. **testuser3@example.com** (Password123!)
   - Member of "Test Org 1"
   - Used for permission tests

4. **testadmin@example.com** (Password123!)
   - Admin of "Test Org 1"
   - Used for invitation permission tests

5. **newinvite@example.com** (Password123!)
   - No organization memberships
   - Used for invitation acceptance tests

### Seed Organizations

1. **Test Org 1** (slug: "test-org-1")
   - Owner: testuser1@example.com
   - Admin: testuser2@example.com, testadmin@example.com
   - Member: testuser3@example.com
   - Tamagotchi: species3, age: 2, hunger: 5, feedCount: 7, color: "#1f2937"

2. **Test Org 2** (slug: "test-org-2")
   - Owner: testuser2@example.com
   - Tamagotchi: species5, age: 0, hunger: 7, feedCount: 0, color: "#1f2937"

### Seed Todos

**Test Org 1:**
- "Complete authentication tests" (completed: false, created 3 days ago)
- "Review pull requests" (completed: true, created 2 days ago)
- "Update documentation" (completed: false, created 1 day ago)

**Test Org 2:**
- "Deploy to production" (completed: false, created 1 day ago)

### Seed Invitations

1. **Pending Invitation**
   - Email: newinvite@example.com
   - Organization: Test Org 1
   - Role: member
   - Status: pending
   - Expires: 7 days from now
   - Inviter: testuser1@example.com

2. **Expired Invitation**
   - Email: expired@example.com
   - Organization: Test Org 1
   - Role: member
   - Status: pending
   - Expires: 1 day ago (expired)
   - Inviter: testuser1@example.com

### Test Cleanup Strategy

All test files use `beforeEach` and `afterEach` hooks to clean up test-generated data:

```typescript
import { cleanupTestData } from "./utils/test-cleanup";

test.beforeEach(async () => {
  await cleanupTestData([
    "testuser1@example.com",
    "testuser2@example.com",
    "testuser3@example.com",
  ]);
});

test.afterEach(async () => {
  await cleanupTestData([
    "testuser1@example.com",
    "testuser2@example.com",
    "testuser3@example.com",
  ]);
});
```

**Cleanup Functions:**

- `cleanupTodoData(userEmails)` - Deletes todos created during tests
- `cleanupInvitationData(userEmails)` - Deletes invitations created during tests
- `resetTamagotchiData(userEmails)` - Resets tamagotchi to seeded values
- `cleanupTestData(userEmails)` - Calls all cleanup functions

**Cleanup Rules:**
- Delete todos created during tests (preserve seeded todos by checking createdAt)
- Reset tamagotchi state to seeded values (age, hunger, feedCount)
- Delete invitations created during tests (preserve seeded invitations)
- Preserve all seeded users and organizations
- Run cleanup before AND after each test for isolation

---

## Test Execution Order

Recommended execution order to minimize dependencies:

1. **Authentication Tests** - Creates sessions for other tests
2. **Organization Management Tests** - Sets up organization context
3. **Organization Invitation Tests** - Tests invitation workflows
4. **Todo CRUD Tests** - Tests todo operations
5. **Tamagotchi Lifecycle Tests** - Tests tamagotchi UI and workflows
6. **Tamagotchi Unit Tests** - Isolated algorithm tests
7. **Real-Time Sync Tests** - Most complex, depends on all features

---

## Coverage Goals

- **Authentication**: 100% coverage of sign-up, sign-in, sign-out, session management, route protection
- **Organizations**: 100% coverage of CRUD operations, role management, switching, data isolation
- **Invitations**: 100% coverage of send, receive, accept, decline, validation, expiration, real-time notifications
- **Todos**: 100% coverage of CRUD operations, organization isolation, real-time sync, tamagotchi integration
- **Tamagotchi**: 100% coverage of lifecycle, feeding, growth, evolution, decay, sprites, real-time sync
- **Unit Tests**: 100% coverage of evolution algorithms, hunger decay, sprite mapping, random species selection
- **Real-Time**: 100% coverage of SSE events, multi-user sync, concurrent actions, connection management

---

## Test Implementation Notes

- All tests follow patterns described in [Testing.md](Testing.md)
- Tests use `TestResultLogger` for structured failure diagnostics
- All tests use seeded database data (no mocks or stubs)
- E2E tests use TestId enum for element selection
- Unit tests inject service role client for database access using client injection pattern
- All database functions accept `client?: SupabaseClient` parameter
- Real-time tests require SSE broadcaster to be running
- Multi-user tests use Playwright's multi-context feature to simulate multiple users
- All tests document expected behavior with pass conditions
