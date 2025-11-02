# Organization Invitations System

This document explains the complete organization invitation system, covering how invitations are sent, received in real-time, and accepted/declined.

## Table of Contents

1. [Overview](#overview)
2. [Database Setup](#database-setup)
3. [Database Schema](#database-schema)
4. [Sending Invitations](#sending-invitations)
5. [Real-Time Notification System](#real-time-notification-system)
6. [Accepting/Declining Invitations](#acceptingdeclining-invitations)
7. [File Structure](#file-structure)
8. [End-to-End Flow](#end-to-end-flow)

## Overview

The invitation system allows organization administrators to invite users via email. Invited users receive email notifications and see real-time toast notifications when logged in. The system uses:

- **Better Auth** for invitation management and email sending
- **Polling** (2-minute intervals) for real-time notifications
- **Resend** for email delivery
- **Sonner toasts** for persistent UI notifications
- **React Query** for data fetching and caching
- **Prisma** with PostgreSQL for data persistence

## Database Setup

### Database Configuration

**File:** [prisma/schema.prisma](../prisma/schema.prisma#L5-L9)

The database uses PostgreSQL with a dual-schema setup:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["auth", "public"]
}
```

**Schema Organization:**

- `auth` schema: Contains authentication and authorization tables (user, session, account, organization, member, invitation)
- `public` schema: Contains application-specific tables (quiz, question, response, etc.)

### Required Migrations

The invitation system requires the following migrations to be applied:

#### 1. Initial Migration

**File:** [prisma/migrations/20250925085713_init/migration.sql](../prisma/migrations/20250925085713_init/migration.sql)

Creates the initial database structure including:

- `auth.invitation` table with required token field
- Foreign key constraints to organization and inviter
- Unique constraints on `token` and `(email, organizationId)`
- Cascade deletion when organization or inviter is deleted

Key table creation:

```sql
CREATE TABLE "auth"."invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "inviterId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invitation_token_key" ON "auth"."invitation"("token");
CREATE UNIQUE INDEX "invitation_email_organizationId_key" ON "auth"."invitation"("email", "organizationId");
```

#### 2. User Relation Fix

**File:** [prisma/migrations/20250926065137_fix_invitation_user_relation/migration.sql](../prisma/migrations/20250926065137_fix_invitation_user_relation/migration.sql)

This migration recreates tables with lowercase naming and adds the missing inviter foreign key:

```sql
ALTER TABLE "auth"."invitation" ADD CONSTRAINT "invitation_inviterId_fkey"
  FOREIGN KEY ("inviterId") REFERENCES "auth"."user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

#### 3. Optional Token Migration

**File:** [prisma/migrations/20251007024233_make_invitation_token_optional/migration.sql](../prisma/migrations/20251007024233_make_invitation_token_optional/migration.sql)

Makes the token field optional to support different invitation flows:

```sql
ALTER TABLE "auth"."invitation" ALTER COLUMN "token" DROP NOT NULL;
```

### Database Client Setup

**File:** [lib/auth.utils.ts](../lib/auth.utils.ts)

The `getAuthenticatedClient()` function provides authenticated database access:

```typescript
export const getAuthenticatedClient = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return {
    db: prisma,
    user: session?.user || null,
    session: session || null,
  };
};
```

**Usage in server actions:**

```typescript
const { db, user, session } = await getAuthenticatedClient();

const invitations = await db.invitation.findMany({
  where: { email: user.email, status: "pending" },
});
```

### Database Indexes

The invitation table has the following indexes for optimal query performance:

1. **Primary Key Index:** `id` (automatic)
2. **Unique Index:** `token` - Ensures token uniqueness for magic links
3. **Composite Unique Index:** `(email, organizationId)` - Prevents duplicate invitations
4. **Foreign Key Indexes:** Automatically created for `organizationId` and `inviterId`

### Environment Variables

Required environment variables for the database:

```env
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
```

**Note:** The connection string should point to your PostgreSQL database. Both `auth` and `public` schemas will be managed by Prisma.

### Running Migrations

To set up the database for organization invitations:

```bash
npx prisma migrate deploy
```

For development:

```bash
npx prisma migrate dev
```

To reset the database (warning: destroys all data):

```bash
npx prisma migrate reset
```

## Database Schema

### Invitation Model

**File:** [prisma/schema.prisma](../prisma/schema.prisma#L43-L59)

```prisma
model invitation {
  id             String        @id @default(uuid())
  organizationId String
  email          String
  role           String        @default("member")
  inviterId      String
  token          String?       @unique
  status         String        @default("pending")
  expiresAt      DateTime
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  organization   organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  inviter        user          @relation(fields: [inviterId], references: [id], onDelete: Cascade)
}
```

**Key Fields:**

- `email`: Invitee's email address
- `role`: "member" or "admin"
- `status`: "pending", "accepted", or "declined"
- `expiresAt`: 7 days from creation
- `token`: Optional unique token for magic link

### Related Models

- **member**: Links users to organizations with roles
- **organization**: Contains organization data and relations
- **user**: User accounts with invitation relations

## Sending Invitations

### UI Flow

**Page:** [app/(dashboard)/invite/page.content.tsx](<../app/(dashboard)/invite/page.content.tsx>)

The invite form allows administrators to:

1. Enter comma-separated email addresses
2. Select target organization
3. Choose role (admin/member)
4. Submit invitations

**Email Validation:**

```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

### Hook Implementation

**File:** [app/(dashboard)/invite/page.hooks.ts](<../app/(dashboard)/invite/page.hooks.ts>)

```typescript
export const useSendInvitations = () => {
  return useMutation({
    mutationFn: async (params: SendInvitationsParams) => {
      // Validates emails and calls sendInvitationsAction
    },
    onSuccess: (data) => {
      // Shows toast with results: invited/existing/failed counts
    },
    onError: (error) => {
      // Shows error toast
    },
  });
};
```

### Server Action

**File:** [app/(dashboard)/invite/page.actions.ts](<../app/(dashboard)/invite/page.actions.ts>)

The `sendInvitationsAction` function:

1. **Authenticates** user via session
2. **Checks permissions** (user must be admin/owner in organization)
3. **Validates emails** and filters valid addresses
4. **For each email:**
   - Checks if user exists and is already a member
   - Checks if invitation already exists
   - Calls `auth.api.createInvitation()`
   - Verifies invitation was created in database
5. **Returns results:**
   ```typescript
   {
     invited: number,
     failed: number,
     existing: number,
     errors: string[]
   }
   ```

### Email Delivery

**Configuration:** [lib/auth.ts](../lib/auth.ts)

Better Auth uses the Resend plugin to send invitation emails. The email includes:

- Organization name
- Inviter's name
- Role being assigned
- Accept/sign-in link
- Expiration warning (7 days)

#### Required Environment Variables for Email

```env
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_xxxxxxxxxxxxx"
```

**Environment Variable Details:**

- `BETTER_AUTH_SECRET`: Secret key for signing tokens and sessions (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL`: Base URL of your application (used for generating invitation links)
- `RESEND_API_KEY`: API key from Resend.com for sending emails

#### Better Auth Configuration

The Better Auth instance is configured with the organization plugin which handles invitation emails:

```typescript
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const inviteLink = `${process.env.BETTER_AUTH_URL}/api/auth/accept-invitation?token=${data.id}`;
        await resend.emails.send({
          from: "noreply@yourdomain.com",
          to: data.email,
          subject: `Invitation to join ${data.organizationName}`,
          html: `
            <p>You've been invited to join ${data.organizationName} as a ${data.role}.</p>
            <p>Invited by: ${data.inviterName}</p>
            <p><a href="${inviteLink}">Accept Invitation</a></p>
            <p>This invitation expires in 7 days.</p>
          `,
        });
      },
    }),
  ],
});
```

## Real-Time Notification System

### Architecture Overview

The invitation notification system uses **polling-based real-time updates** rather than WebSockets or database pub/sub mechanisms.

**Key Design Decisions:**

- **No WebSocket connections**: Simpler infrastructure, works with serverless deployments
- **No database broadcasting**: PostgreSQL LISTEN/NOTIFY not used; all updates via standard queries
- **React Query polling**: Automatic refetching at regular intervals
- **Client-side tracking**: Prevents duplicate toast notifications using useRef

### Polling Mechanism

The system uses **React Query's automatic refetching** to check for new invitations every 2 minutes.

**File:** [app/(dashboard)/layout.hooks.ts](<../app/(dashboard)/layout.hooks.ts>)

```typescript
export const useGetPendingInvitations = () => {
  return useQuery({
    queryKey: ["pending-invitations"],
    queryFn: async () => {
      const { data } = await getPendingInvitationsForUserAction();
      return data || [];
    },
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // 2 minutes
  });
};
```

### Fetching Pending Invitations

**File:** [app/(dashboard)/layout.actions.ts](<../app/(dashboard)/layout.actions.ts>)

The `getPendingInvitationsForUserAction` server action:

1. Authenticates user
2. Queries database for invitations matching user's email
3. Filters for `status: "pending"` and `expiresAt > now()`
4. Includes organization and inviter data
5. Returns array of `PendingInvitation` objects:
   ```typescript
   {
     id: string;
     organizationId: string;
     organizationName: string;
     role: string;
     inviterName: string;
     inviterEmail: string;
     createdAt: Date;
     expiresAt: Date;
   }
   ```

### Toast Display Component

**File:** [components/InvitationToasts.tsx](../components/InvitationToasts.tsx)

The `InvitationToasts` component:

1. **Fetches invitations** using `useGetPendingInvitations()`
2. **Tracks displayed invitations** in a `useRef<Set<string>>`
3. **For each new invitation:**
   - Displays Sonner toast with accept/decline buttons
   - Sets `duration: Infinity` (persistent)
   - Sets `dismissible: false`
4. **On accept/decline:**
   - Dismisses toast
   - Removes from tracking set

**Rendering Location:** [app/(dashboard)/layout.tsx](<../app/(dashboard)/layout.tsx>)

The component is rendered in the dashboard layout, making it visible on all dashboard pages.

## Accepting/Declining Invitations

### Accept Flow

**Hook:** [app/(dashboard)/layout.hooks.ts](<../app/(dashboard)/layout.hooks.ts>)

```typescript
export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      return await acceptInvitationAction({ invitationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["user-with-members"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Invitation accepted");
    },
  });
};
```

**Server Action:** [app/(dashboard)/layout.actions.ts](<../app/(dashboard)/layout.actions.ts>)

```typescript
export const acceptInvitationAction = async ({
  invitationId,
}: {
  invitationId: string;
}) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { data: null, error: "Unauthorized" };

  await auth.api.acceptInvitation({
    body: { invitationId },
    headers: await headers(),
  });

  return { data: null, error: null };
};
```

Better Auth handles:

- Creating member record
- Updating invitation status to "accepted"
- Email notifications (if configured)

### Decline Flow

**Hook:** Uses similar pattern to accept with `useDeclineInvitation()`

**Server Action:**

```typescript
export const declineInvitationAction = async ({
  invitationId,
}: {
  invitationId: string;
}) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { data: null, error: "Unauthorized" };

  const client = await getAuthenticatedClient();
  await client.invitation.update({
    where: { id: invitationId, email: session.user.email },
    data: { status: "declined" },
  });

  return { data: null, error: null };
};
```

On success:

- Invalidates `["pending-invitations"]` query
- Shows info toast
- Toast is dismissed

## File Structure

```
app/
├── (dashboard)/
│   ├── layout.tsx                [Renders InvitationToasts component]
│   ├── layout.hooks.ts           [useGetPendingInvitations, useAcceptInvitation, useDeclineInvitation]
│   ├── layout.actions.ts         [getPendingInvitationsForUserAction, acceptInvitationAction, declineInvitationAction]
│   └── invite/
│       ├── page.tsx              [Session verification wrapper]
│       ├── page.content.tsx      [Invitation form UI]
│       ├── page.hooks.ts         [useSendInvitations, useGetOrganizations]
│       ├── page.actions.ts       [sendInvitationsAction, getOrganizationsAction]
│       └── layout.tsx            [Access control for invite page]
├── api/
│   └── auth/[...all]/route.ts    [Better Auth endpoint handler]

components/
├── InvitationToasts.tsx          [Toast notification UI with accept/decline]
└── InviteUsersCard.actions.ts    [Alternative invitation methods]

lib/
├── auth.ts                       [Better Auth configuration with organization plugin]
├── auth-client.ts                [Better Auth client setup]
├── role.utils.ts                 [Server-side role checks]
└── client-role.utils.ts          [Client-side role checks]

prisma/
└── schema.prisma                 [Database schema with invitation model]
```

## End-to-End Flow

### 1. Sending Invitations

```
Admin opens invite page
  ↓
Fills form with emails, selects organization/role
  ↓
useSendInvitations hook validates and calls sendInvitationsAction
  ↓
Server action checks permissions (admin/owner/super-admin)
  ↓
For each email:
  - Checks if user exists and is already member
  - Checks if invitation already exists
  - Calls auth.api.createInvitation()
  ↓
Better Auth creates invitation record and sends email via Resend
  ↓
Returns result counts (invited/existing/failed)
  ↓
Toast displays results to admin
```

### 2. Receiving Invitations (Real-Time)

```
User logs into dashboard
  ↓
DashboardLayout component renders
  ↓
InvitationToasts component mounts
  ↓
useGetPendingInvitations hook starts polling (every 2 minutes)
  ↓
getPendingInvitationsForUserAction queries database
  ↓
Returns invitations matching user's email (status: pending, not expired)
  ↓
For each new invitation not in tracking Set:
  - Display persistent Sonner toast
  - Show organization name, inviter, role
  - Render Accept/Decline buttons
  - Add invitation ID to tracking Set
```

### 3. Accepting Invitation

```
User clicks Accept button in toast
  ↓
useAcceptInvitation mutation triggers
  ↓
acceptInvitationAction calls auth.api.acceptInvitation()
  ↓
Better Auth:
  - Creates member record (joins user to organization)
  - Updates invitation status to "accepted"
  ↓
React Query invalidates caches:
  - ["pending-invitations"] → invitation removed from list
  - ["user"] → user data refreshed with new organization
  - ["user-with-members"] → member relationships updated
  - ["organizations"] → organization list updated
  ↓
Toast is dismissed and removed from tracking Set
  ↓
Success toast displayed
  ↓
User is now member of organization
```

### 4. Declining Invitation

```
User clicks Decline button in toast
  ↓
useDeclineInvitation mutation triggers
  ↓
declineInvitationAction updates status to "declined"
  ↓
React Query invalidates ["pending-invitations"] cache
  ↓
Toast is dismissed and removed from tracking Set
  ↓
Info toast displayed
  ↓
Invitation is declined (user not added to organization)
```

## Key Technical Details

### Polling Configuration

- **Stale Time:** 1 minute (data considered fresh for 1 minute)
- **Refetch Interval:** 2 minutes (polls every 2 minutes)
- **Query Key:** `["pending-invitations"]`

### Authorization Checks

**Sending invitations requires:**

- Valid session
- User must be admin/owner in target organization OR super-admin

**Accepting/declining requires:**

- Valid session
- Invitation email must match authenticated user's email

### Cache Invalidation Strategy

When an invitation is accepted, multiple queries are invalidated to ensure UI consistency:

- `["pending-invitations"]` - Remove invitation from notification list
- `["user"]` - Refresh user data with new organization membership
- `["user-with-members"]` - Update member relationships
- `["organizations"]` - Refresh organization list for dropdowns

### Toast Configuration

**Invitation toasts:**

- `duration: Infinity` - Never auto-dismiss
- `dismissible: false` - Cannot be manually dismissed without action
- Removed from tracking Set on accept/decline to prevent re-display

### Email Configuration

**Provider:** Resend
**Template:** Custom HTML with organization details
**Expiration:** 7 days from creation
**Link:** Magic link to accept/sign in

## Summary

### Complete Setup Checklist

To implement organization invitations from scratch, ensure:

**Database:**

- [ ] PostgreSQL database configured with dual schemas (auth/public)
- [ ] `DATABASE_URL` environment variable set
- [ ] Migrations applied: `npx prisma migrate deploy`
- [ ] Invitation table with proper indexes and foreign keys

**Authentication:**

- [ ] Better Auth configured with organization plugin
- [ ] `BETTER_AUTH_SECRET` environment variable set
- [ ] `BETTER_AUTH_URL` environment variable set
- [ ] API routes configured at `/api/auth/[...all]`

**Email:**

- [ ] Resend account created and API key obtained
- [ ] `RESEND_API_KEY` environment variable set
- [ ] Email template configured in Better Auth
- [ ] Sender domain verified in Resend

**Frontend:**

- [ ] `InvitationToasts` component rendered in dashboard layout
- [ ] Polling configured (2-minute intervals via React Query)
- [ ] Toast UI with accept/decline buttons
- [ ] Query cache invalidation on accept/decline

**Permissions:**

- [ ] Role-based access control for sending invitations
- [ ] Email verification for accepting invitations
- [ ] Session-based authentication checks

### Data Flow Summary

**Sending:**

1. Admin submits emails → Form validation
2. Server action checks permissions → Database queries
3. Better Auth creates invitation → Email sent via Resend
4. Database stores invitation record → Toast confirmation

**Receiving:**

1. User logs in → React Query starts polling
2. Server queries pending invitations → Returns matching records
3. Client displays new toasts → Tracks displayed IDs
4. User sees persistent notification → Can accept/decline

**Accepting:**

1. User clicks accept → Mutation triggered
2. Better Auth processes acceptance → Creates member record
3. Database updates invitation status → Queries invalidated
4. UI refreshes automatically → User is now a member

### Alternative: Database Broadcasting (Not Implemented)

While this system uses polling, you could implement PostgreSQL LISTEN/NOTIFY for true real-time updates:

**Pros:**

- Instant notifications without polling delay
- Reduced database queries

**Cons:**

- Requires persistent database connections
- More complex infrastructure
- Incompatible with serverless deployments
- Requires WebSocket server or Server-Sent Events

The current polling approach was chosen for simplicity and serverless compatibility.
