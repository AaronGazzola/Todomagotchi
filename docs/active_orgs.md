# Active Organization Management with Better-Auth

This document explains how to implement active organization management using Better-Auth's organization plugin. This implementation uses a session-based approach where the active organization ID is stored in the database session table.

## Overview

The active organization system allows users to:
- Switch between multiple organizations they belong to
- Persist their active organization choice across sessions
- Automatically set the first organization as active on session creation
- Access organization-specific data based on the currently active organization

## Architecture

The system follows this data flow:

1. **Session Storage**: Active organization ID is stored in the `session` table's `activeOrganizationId` field
2. **Server Actions**: Fetch user data, organizations, and active organization from the database
3. **React Query**: Cache and manage data fetching with query invalidation
4. **Zustand Store**: Store organizations and user data in client state
5. **Hooks**: Derive active organization from session and provide switching functionality

## Database Schema

### Session Table Extension

Add `activeOrganizationId` to your session schema:

```prisma
model session {
  id                   String   @id @default(cuid())
  userId               String
  expiresAt            DateTime
  token                String   @unique
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  ipAddress            String?
  userAgent            String?
  activeOrganizationId String?
  user                 user     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@schema("auth")
}
```

## Better-Auth Configuration

### Server Setup (`lib/auth.ts`)

```typescript
import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const member = await prisma.member.findFirst({
            where: { userId: session.userId },
            select: { organizationId: true },
            orderBy: { createdAt: "asc" },
          });

          return {
            data: {
              ...session,
              activeOrganizationId: member?.organizationId || null,
            },
          };
        },
      },
    },
  },
  plugins: [
    organization({
      organizationHooks: {
        afterCreateOrganization: async ({ organization, user }) => {
          await prisma.member.update({
            where: {
              userId_organizationId: {
                userId: user.id,
                organizationId: organization.id,
              },
            },
            data: { role: "owner" },
          });
        },
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
```

### Client Setup (`lib/auth-client.ts`)

```typescript
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [organizationClient()],
});

export const {
  signIn,
  useSession,
  getSession,
  signUp,
  organization,
  signOut,
} = authClient;
```

## Type Definitions

### `layout.types.ts`

```typescript
import { user, Tamagotchi } from "@prisma/client";

export interface OrganizationWithTamagotchi {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  metadata: string | null;
  createdBy: string;
  tamagotchi: Tamagotchi | null;
}

export interface AppState {
  user: user | null;
  setUser: (user: user | null) => void;
  reset: () => void;
}

export interface OrganizationState {
  organizations: OrganizationWithTamagotchi[];
  setOrganizations: (orgs: OrganizationWithTamagotchi[]) => void;
  reset: () => void;
}
```

## Zustand Stores

### `layout.stores.ts`

```typescript
import { create } from "zustand";
import { AppState, OrganizationState } from "./layout.types";

const appInitialState = {
  user: null,
};

export const useAppStore = create<AppState>()((set) => ({
  ...appInitialState,
  setUser: (user) => set({ user }),
  reset: () => set(appInitialState),
}));

const orgInitialState = {
  organizations: [],
};

export const useOrganizationStore = create<OrganizationState>()((set) => ({
  ...orgInitialState,
  setOrganizations: (orgs) => set({ organizations: orgs }),
  reset: () => set(orgInitialState),
}));
```

## Server Actions

### `layout.actions.ts`

```typescript
"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { user } from "@prisma/client";
import { headers } from "next/headers";
import { OrganizationWithTamagotchi } from "./layout.types";

export interface UserWithAllData {
  user: user;
  organizations: OrganizationWithTamagotchi[];
  activeOrganizationId: string | null | undefined;
}

export const getUserWithAllDataAction = async (): Promise<
  ActionResponse<UserWithAllData | null>
> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return getActionResponse({ data: null });

    const [prismaUser, organizationsResponse] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
      }),
      auth.api.listOrganizations({
        headers: await headers(),
      }),
    ]);

    if (!prismaUser) return getActionResponse({ data: null });

    const organizations = (organizationsResponse || []) as Array<{
      id: string;
      name: string;
    }>;

    const organizationsWithMetadata: OrganizationWithTamagotchi[] =
      organizations.map((org) => ({
        ...org,
        slug: org.id,
        logo: null,
        metadata: null,
        createdAt: new Date(),
        createdBy: session.user.id,
      }));

    let activeOrganizationId = session.session.activeOrganizationId;

    if (!activeOrganizationId && organizations.length > 0) {
      activeOrganizationId = organizations[0].id;
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: { organizationId: activeOrganizationId },
      });
    }

    return getActionResponse({
      data: {
        user: prismaUser,
        organizations: organizationsWithMetadata,
        activeOrganizationId,
      },
    });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

### `AvatarMenu.actions.ts`

```typescript
"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { headers } from "next/headers";

export const setActiveOrganizationAction = async (
  organizationId: string
): Promise<ActionResponse<unknown>> => {
  try {
    const { db, session } = await getAuthenticatedClient();

    await db.session.update({
      where: { id: session.session.id },
      data: { activeOrganizationId: organizationId },
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const createOrganizationAction = async (
  name: string,
  slug: string
): Promise<ActionResponse<{ id: string; name: string; slug: string }>> => {
  try {
    const result = await auth.api.createOrganization({
      body: { name, slug },
      headers: await headers(),
    });

    if (!result) {
      throw new Error("Failed to create organization");
    }

    return getActionResponse({ data: result });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

## React Query Hooks

### `layout.hooks.tsx`

```typescript
"use client";

import { showErrorToast } from "@/app/(components)/Toast";
import { configuration, isPrivatePath } from "@/configuration";
import { useSession } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { getUserWithAllDataAction } from "./layout.actions";
import { useAppStore, useOrganizationStore } from "./layout.stores";

export const useGetUser = () => {
  const { setUser, reset: resetApp } = useAppStore();
  const { setOrganizations, reset: resetOrg } = useOrganizationStore();
  const pathname = usePathname();
  const router = useRouter();

  return useQuery({
    queryKey: ["user-with-all-data"],
    queryFn: async () => {
      const { data, error } = await getUserWithAllDataAction();

      if (!data || error) {
        resetApp();
        resetOrg();
        if (isPrivatePath(pathname)) {
          router.push(configuration.paths.signIn);
        }
      }

      if (error) throw error;

      if (data) {
        setUser(data.user);
        setOrganizations(data.organizations);
      }

      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useActiveOrganizationId = () => {
  const { data: session } = useSession();
  return session?.session?.activeOrganizationId || null;
};

export const useActiveOrganization = () => {
  const { organizations } = useOrganizationStore();
  const activeOrganizationId = useActiveOrganizationId();
  return organizations.find(org => org.id === activeOrganizationId) || null;
};
```

### `AvatarMenu.hooks.ts`

```typescript
"use client";

import { organization } from "@/lib/auth-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showErrorToast, showSuccessToast } from "./Toast";
import { createOrganizationAction } from "./AvatarMenu.actions";
import { useOrganizationStore, useAppStore } from "@/app/layout.stores";
import { getUserWithAllDataAction } from "@/app/layout.actions";

export const useSetActiveOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      await organization.setActive({ organizationId });
      return organizationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-with-all-data"] });
      showSuccessToast("Organization switched");
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to switch organization", "Switch Failed");
    },
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  const { setUser } = useAppStore();
  const { setOrganizations } = useOrganizationStore();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { data, error } = await createOrganizationAction(name, slug);
      if (error) throw new Error(error);

      if (data?.id) {
        await organization.setActive({ organizationId: data.id });

        const { data: allData } = await getUserWithAllDataAction();

        if (allData) {
          setUser(allData.user);
          setOrganizations(allData.organizations);
          queryClient.setQueryData(["user-with-all-data"], allData);
        }
      }

      return data as { id: string } | null;
    },
    onSuccess: async () => {
      showSuccessToast("Organization created successfully");
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to create organization", "Creation Failed");
    },
  });
};
```

## Usage in Components

```typescript
"use client";

import { useActiveOrganization, useActiveOrganizationId } from "@/app/layout.hooks";
import { useOrganizationStore } from "@/app/layout.stores";
import { useSetActiveOrganization, useCreateOrganization } from "./AvatarMenu.hooks";

export function OrganizationSelector() {
  const { organizations } = useOrganizationStore();
  const activeOrganizationId = useActiveOrganizationId();
  const activeOrganization = useActiveOrganization();
  const { mutate: setActiveOrganization } = useSetActiveOrganization();
  const { mutate: createOrganization } = useCreateOrganization();

  return (
    <div>
      <select
        value={activeOrganizationId || ""}
        onChange={(e) => setActiveOrganization(e.target.value)}
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>

      <button
        onClick={() => createOrganization({ name: "New Org", slug: "new-org" })}
      >
        Create Organization
      </button>

      <p>Current: {activeOrganization?.name}</p>
    </div>
  );
}
```

## Key Features of This Implementation

### 1. Session-Based Active Organization

The active organization ID is stored in the session table, ensuring it persists across page reloads and browser sessions. This is managed by Better-Auth's `setActiveOrganization` API method.

### 2. Database Hook for Auto-Selection

When a user signs in and creates a new session, the `databaseHooks.session.create.before` hook automatically sets their first organization as active if they have organizations.

### 3. Better-Auth Client Methods

- `organization.setActive({ organizationId })` - Updates the session's active organization
- `auth.api.setActiveOrganization({ body, headers })` - Server-side method to set active org
- `auth.api.listOrganizations({ headers })` - Fetches all organizations for the user

### 4. React Query Cache Invalidation

When switching organizations, all relevant queries are invalidated to ensure data consistency:
- `user-with-all-data` - Refetches user and organization list
- Any organization-specific data queries

### 5. Zustand Store for Client State

Organizations are stored in Zustand for efficient client-side access without prop drilling. The active organization ID is derived from the session, not stored in Zustand.

## Adapting for Multiple Active Organizations

To support selecting multiple organizations simultaneously, you would need to:

### 1. Modify Session Schema

```prisma
model session {
  activeOrganizationIds String[]
}
```

### 2. Update Types

```typescript
export interface MultiOrgState {
  activeOrganizationIds: string[];
  setActiveOrganizationIds: (ids: string[]) => void;
}
```

### 3. Create Multi-Select Actions

```typescript
export const setActiveOrganizationsAction = async (
  organizationIds: string[]
): Promise<ActionResponse<unknown>> => {
  try {
    const { db, session } = await getAuthenticatedClient();

    await db.session.update({
      where: { id: session.session.id },
      data: { activeOrganizationIds: organizationIds },
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

### 4. Create Multi-Select Hooks

```typescript
export const useSetActiveOrganizations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationIds: string[]) => {
      const { error } = await setActiveOrganizationsAction(organizationIds);
      if (error) throw new Error(error);
      return organizationIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-with-all-data"] });
      showSuccessToast("Active organizations updated");
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to update organizations", "Update Failed");
    },
  });
};

export const useActiveOrganizationIds = () => {
  const { data: session } = useSession();
  return session?.session?.activeOrganizationIds || [];
};

export const useActiveOrganizations = () => {
  const { organizations } = useOrganizationStore();
  const activeOrganizationIds = useActiveOrganizationIds();
  return organizations.filter(org => activeOrganizationIds.includes(org.id));
};

export const useToggleOrganization = () => {
  const { mutate: setActiveOrganizations } = useSetActiveOrganizations();
  const activeOrganizationIds = useActiveOrganizationIds();

  return (organizationId: string) => {
    const newIds = activeOrganizationIds.includes(organizationId)
      ? activeOrganizationIds.filter(id => id !== organizationId)
      : [...activeOrganizationIds, organizationId];

    setActiveOrganizations(newIds);
  };
};
```

### 5. Update Multi-Select UI

```typescript
export function MultiOrganizationSelector() {
  const { organizations } = useOrganizationStore();
  const activeOrganizationIds = useActiveOrganizationIds();
  const toggleOrganization = useToggleOrganization();

  return (
    <div>
      {organizations.map((org) => (
        <label key={org.id}>
          <input
            type="checkbox"
            checked={activeOrganizationIds.includes(org.id)}
            onChange={() => toggleOrganization(org.id)}
          />
          {org.name}
        </label>
      ))}
    </div>
  );
}
```

### 6. Filter Data by Multiple Organizations

```typescript
export const getMultiOrgDataAction = async (): Promise<
  ActionResponse<Data[]>
> => {
  try {
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationIds = session.session.activeOrganizationIds || [];

    if (activeOrganizationIds.length === 0) {
      return getActionResponse({ data: [] });
    }

    const data = await db.yourModel.findMany({
      where: {
        organizationId: {
          in: activeOrganizationIds,
        },
      },
    });

    return getActionResponse({ data });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

## Important Considerations

1. **Session Synchronization**: Better-Auth's `organization.setActive()` handles updating the session in the database automatically.

2. **Query Invalidation**: Always invalidate relevant queries after switching organizations to prevent stale data.

3. **Initial Load**: The `getUserWithAllDataAction` automatically sets the first organization as active if none is set.

4. **Type Safety**: Use Prisma types for all database models to ensure type safety throughout the application.

5. **Error Handling**: All actions return `ActionResponse<T>` with either data or error for consistent error handling.

6. **Multi-Organization Data Filtering**: When querying organization-specific data, always filter by `activeOrganizationId` or use Prisma RLS (Row Level Security) for automatic filtering.
