# Organization Creation on Sign-Up

This document explains how the application handles organization creation during the user sign-up process.

## Overview

The sign-up flow creates a seamless onboarding experience where new users automatically receive:
- A user account
- A personal organization
- A tamagotchi companion for their organization
- Owner permissions for their organization

### Flow Diagram

```
User Registration → Organization Creation → Tamagotchi Setup → Redirect to Home
```

## Sign-Up Flow

### 1. User Registration (`app/(auth)/sign-up/page.tsx`)

The sign-up page collects user credentials and triggers a two-step process:

**User Input:**
- Name
- Email
- Password (minimum 8 characters)

**Process:**
1. Call `useSignUp()` hook with user credentials
2. On success → Call `useCreateOrganization()` hook
3. On organization creation success → Redirect to home (`/`)

**Organization Naming:**
- Name: `{userName}'s Tasks`
- Slug: `{userName}-tasks` (lowercase, spaces to hyphens)

### 2. Sign-Up Hook (`app/(auth)/sign-up/page.hooks.tsx`)

```typescript
useSignUp() → useMutation that:
  - Validates password (minimum 8 characters)
  - Calls signUp.email() from Better-Auth client
  - On success:
    - Fetches all user data via getUserWithAllDataAction()
    - Updates Zustand stores: user, organizations, tamagotchi
    - Sets React Query cache
  - On error: Shows error toast
```

### 3. Organization Creation Hook (`app/(components)/AvatarMenu.hooks.ts`)

```typescript
useCreateOrganization() → useMutation that:
  - Calls createOrganizationAction(name, slug)
  - Sets organization as active via organization.setActive()
  - Parallel fetches:
    - getUserWithAllDataAction()
    - getTodosAction()
    - getTamagotchiAction()
  - Updates Zustand stores: user, organizations, tamagotchi, todos
  - Invalidates React Query caches
  - On success: Shows success toast
```

### 4. Organization Creation Action (`app/(components)/AvatarMenu.actions.ts`)

```typescript
createOrganizationAction(name, slug) → Server action that:
  - Calls auth.api.createOrganization() (Better-Auth handles DB insert)
  - Triggers afterCreateOrganization hook automatically
  - Returns: { id, name, slug }
```

## Better-Auth Configuration

### Location: `lib/auth.ts`

**Core Setup:**
- Framework: Better-Auth with Prisma adapter
- Database: PostgreSQL with dual schemas (`auth` + `public`)
- Email/Password: Enabled, no email verification required
- Plugins: Admin plugin + Organization plugin

### Critical Hooks

#### `databaseHooks.session.create.before`

When a session is created, automatically sets `activeOrganizationId` by finding the user's first member record (ordered by creation date). Ensures a default organization is always active.

#### `organizationHooks.afterCreateOrganization`

After organization creation, three automatic actions occur:

1. **Update Organization**: Sets `createdBy` field to the user ID
2. **Create Tamagotchi**: Generates a Tamagotchi for the organization with:
   - Random species: `species0` through `species9`
   - Random color: Selected from 17 predefined colors
   - Default stats: hunger=7, happiness=100, wasteCount=0
3. **Set Member Role**: Upgrades the user from `member` to `owner` in the organization

## Database Schema

### User Model (`auth.user`)

```
Fields: id, email (unique), name, role, banned status, emailVerified
Relations: accounts, sessions, members, invitations
```

### Organization Model (`auth.organization`)

```
Fields: id (cuid), name, slug, logo, createdBy (userId), metadata, timestamps
Unique Constraint: (slug, createdBy)
Relations: members, invitations
```

### Member Model (`auth.member`)

```
Fields: id, userId, organizationId, role
Roles: "member" | "admin" | "owner" (default: "member")
Unique Constraint: (userId, organizationId)
Relations: user, organization
```

### Tamagotchi Model (`public.Tamagotchi`)

```
Fields: id, organizationId (unique), hunger, happiness, wasteCount
        color (hex), species, age, feedCount
        timestamps: lastFedAt, lastCleanedAt, lastCheckedAt, createdAt, updatedAt
Constraint: One tamagotchi per organization
```

### Invitation Model (`auth.invitation`)

```
Fields: id, organizationId, email, role, inviterId, token, status, expiresAt
Status: "pending" | "rejected"
Expiration: 7 days by default
Unique Constraint: (email, organizationId)
Relations: organization, inviter
```

### Todo Model (`public.Todo`)

```
Fields: id, organizationId, text, completed
Index: organizationId
```

### Message Model (`public.Message`)

```
Fields: id, organizationId, userId, text
Indexes: organizationId, createdAt
```

## Default Organization Settings

### Created Automatically

- **Member Role**: "owner" (set after creation by afterCreateOrganization hook)
- **Tamagotchi Settings**:
  - Hunger: 7
  - Happiness: 100
  - Waste Count: 0
  - Species: Random (species0-species9)
  - Color: Random from 17 hex colors
- **Invitations**: Expire after 7 days

### Permissions Model (`lib/permissions.ts`)

```typescript
Roles:
- member: can UPDATE todos only
- admin: can CREATE, UPDATE, DELETE todos
- owner: can CREATE, UPDATE, DELETE todos

Default new member role: "member"
Creator role after org creation: "owner"
```

## User-Organization Relationship

### Relationship Flow

```
1. User registers → User created in auth.user
2. Organization created → Org created in auth.organization
3. Member record auto-created → With role "member"
4. afterCreateOrganization hook → Updates member role to "owner"
5. Session created → activeOrganizationId set to first org
```

### Multi-Organization Support

- Users can belong to multiple organizations
- Each user-org pairing is tracked in the `member` table
- Session stores `activeOrganizationId` (currently active org context)
- All operations are scoped to the active organization
- Users can switch between organizations via avatar menu

### Data Isolation

- RLS (Row-Level Security) client created with userId and activeOrganizationId
- Todos, Messages, Tamagotchi filtered by activeOrganizationId
- Invitations checked for organization membership
- All queries use `getAuthenticatedClient()` to enforce organization context

## State Management

### Zustand Stores (`app/layout.stores.ts`)

1. **useAppStore**: Manages current user
2. **useOrganizationStore**: Manages user's organization list with tamagotchis
3. **useTamagotchiStore**: Manages currently active tamagotchi

### Data Flow Pattern

```
Server Action → React Query Hook → Zustand Store → UI Updates
```

### Example: Sign-Up State Flow

```
1. useSignUp hook calls signUp.email() (Better-Auth)
2. On success, calls getUserWithAllDataAction() (server action)
3. Receives user, organizations, activeTamagotchi
4. Updates all three Zustand stores
5. Sets React Query cache for ["user-with-all-data"]
```

## Authentication Setup

### Better-Auth Client (`lib/auth-client.ts`)

```typescript
Configuration:
- Plugins: adminClient(), organizationClient()
- Base URL: NEXT_PUBLIC_BETTER_AUTH_URL from env
- Exported methods: signIn, signUp, signOut, organization, admin, useSession, getSession
```

### API Route (`app/api/auth/[...all]/route.ts`)

```typescript
- Uses toNextJsHandler(auth)
- Handles: signup, signin, session management, organization operations
```

### Session Management

- Cookies store session tokens with "better-auth" or "session" in name
- Auth utilities provide `getAuthenticatedClient()` that:
  - Validates session
  - Sets up RLS context with userId and activeOrganizationId
  - Throws "Unauthorized" if no valid session
  - Throws "No active organization" if org context missing

## Complete Server Actions Flow

### `getUserWithAllDataAction()` (`app/layout.actions.ts`)

```typescript
Flow:
- Fetches current user from session
- Lists all user's organizations via auth.api.listOrganizations()
- Fetches all tamagotchis for those organizations
- If no activeOrganizationId, sets first organization as active
- Returns: { user, organizations[], activeOrganizationId, activeTamagotchi }
```

### `setActiveOrganizationAction(organizationId)`

```typescript
Updates session.activeOrganizationId to switch organization context
```

## Summary

The application provides a streamlined onboarding experience:

1. **User signs up** with email/password
2. **System automatically creates** an organization with their name
3. **Better-Auth's afterCreateOrganization hook** automatically:
   - Creates a Tamagotchi companion
   - Sets the user as the organization owner
4. **Session is established** with the new organization as active
5. **User is redirected** to the home page with full data loaded
6. **State is managed** via Zustand stores with React Query for async operations
7. **All data operations** are scoped to the active organization using RLS

This creates a seamless experience where new users immediately have a functional organization with a tamagotchi game companion ready to interact with.

## File References

- Sign-up page: `app/(auth)/sign-up/page.tsx:1`
- Sign-up hooks: `app/(auth)/sign-up/page.hooks.tsx:1`
- Organization hooks: `app/(components)/AvatarMenu.hooks.ts:1`
- Organization actions: `app/(components)/AvatarMenu.actions.ts:1`
- Better-Auth config: `lib/auth.ts:1`
- Auth client: `lib/auth-client.ts:1`
- Permissions: `lib/permissions.ts:1`
- Prisma schema: `prisma/schema.prisma:1`
- Layout actions: `app/layout.actions.ts:1`
- Layout stores: `app/layout.stores.ts:1`