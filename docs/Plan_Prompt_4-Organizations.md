# Plan Prompt 4: Organization-Based Multi-Tenancy with Tamagotchi Evolution

Transform the single-user app into a multi-tenant organization-based system where each organization has its own task list and uniquely colored, evolving tamagotchi.

## Overview

This plan implements two major feature sets:

### 1. Organization-Based Multi-Tenancy
- Users can belong to multiple organizations
- Each organization has its own isolated task list and tamagotchi
- Organization selector in auth popover enables switching between orgs
- Row-Level Security (RLS) ensures data isolation

### 2. Tamagotchi Evolution System
- **Species System**: Ten unique species (species0-species9) with different sprite sets
- **Age Progression**: Four life stages (egg→baby→child→adult) based on feeding
- **Feed Counter**: Tracks total feeds to trigger evolution
- **Color Customization**: Each organization's tamagotchi has a unique hex color
- **Evolution Cycle**:
  - Feeds 0-9: Age 0 (egg - species-specific egg sprite)
  - Feeds 10-19: Age 1 (baby)
  - Feeds 20-29: Age 2 (child)
  - Feeds 30-49: Age 3 (adult)
  - Feed 50: Reset to age 0 (evolution cycle restarts, feedCount resets to 0)

## 1. Database Schema Updates

**File:** `prisma/schema.prisma`

### Update Tamagotchi Model

Add color, species, age, and feedCount fields:

```prisma
model Tamagotchi {
  id              String   @id @default(cuid())
  organizationId  String   @unique
  hunger          Int      @default(7)
  happiness       Int      @default(100)
  wasteCount      Int      @default(0)
  color           String   @default("#1f2937")
  species         String   @default("random")
  age             Int      @default(0)
  feedCount       Int      @default(0)
  lastFedAt       DateTime @default(now())
  lastCleanedAt   DateTime @default(now())
  lastCheckedAt   DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@schema("public")
}
```

### Field Descriptions

- `species`: Determines which sprite set to use ("species0" through "species9"), defaults to random selection from 10 species
- `age`: Current age stage (0=egg, 1=baby, 2=child, 3=adult), defaults to 0
- `feedCount`: Number of times fed (0-50), used to trigger age progression and reset
- `hunger`: Hunger level (0-100), defaults to 7 to show one hambone on hunger bar

### Update Todo Model

Change from `userId` to `organizationId`:

```prisma
model Todo {
  id             String   @id @default(cuid())
  organizationId String
  text           String
  completed      Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@schema("public")
  @@index([organizationId])
}
```

### Key Changes

- `Tamagotchi.userId` becomes `Tamagotchi.organizationId`
- `Tamagotchi.color` field added (hex color string, defaults to gray-900)
- `Tamagotchi.species` field added (determines sprite set: "species0" through "species9" - 10 total species)
- `Tamagotchi.age` field added (0=egg, 1=baby, 2=child, 3=adult)
- `Tamagotchi.feedCount` field added (tracks feeds 0-50, resets to 0 after reaching 50)
- `Tamagotchi.hunger` default changed to 7 (displays one hambone)
- `Todo.userId` becomes `Todo.organizationId`
- Each organization gets one tamagotchi and one task list
- Users can belong to multiple organizations via Better-Auth organization plugin

## 2. Migration Strategy

### Overview: Database Reset Approach

Since this is a major architectural change from user-based to organization-based tenancy, **reset the database** rather than migrating existing data. This approach:

- **Simplifies migration** - No complex data transformation logic needed
- **Ensures clean state** - No orphaned or inconsistent data
- **Faster to implement** - Direct path to new schema
- **Better for development** - Fresh start with well-structured seed data

**Important:** This will **delete all existing data**. For production use, a proper data migration would be required.

### Step 1: Update Prisma Schema

First, update `prisma/schema.prisma` with all the changes shown in section 1 above.

### Step 2: Create Migration for Schema Changes

```bash
npx prisma migrate dev --name add_organizations_and_tamagotchi_features
```

This migration will:
- Change `userId` to `organizationId` in both Todo and Tamagotchi models
- Add `color`, `species`, `age`, and `feedCount` fields to `Tamagotchi`
- Update `hunger` default from 50 to 7
- Remove user-based foreign key relationships
- Add organization-based foreign key relationships
- Enable RLS on both tables

### Step 3: Update RLS Policies

**File:** `prisma/migrations/[timestamp]_update_rls_for_orgs/migration.sql`

Replace user-based RLS with organization-based RLS:

```sql
DROP POLICY IF EXISTS "Users can view their own todos" ON "public"."Todo";
DROP POLICY IF EXISTS "Users can insert their own todos" ON "public"."Todo";
DROP POLICY IF EXISTS "Users can update their own todos" ON "public"."Todo";
DROP POLICY IF EXISTS "Users can delete their own todos" ON "public"."Todo";

CREATE POLICY "Users can view organization todos"
  ON "public"."Todo"
  FOR SELECT
  USING ("organizationId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY "Users can insert organization todos"
  ON "public"."Todo"
  FOR INSERT
  WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY "Users can update organization todos"
  ON "public"."Todo"
  FOR UPDATE
  USING ("organizationId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY "Users can delete organization todos"
  ON "public"."Todo"
  FOR DELETE
  USING ("organizationId" = current_setting('app.current_tenant_id', TRUE));

DROP POLICY IF EXISTS "Users can view their own tamagotchi" ON "public"."Tamagotchi";
DROP POLICY IF EXISTS "Users can insert their own tamagotchi" ON "public"."Tamagotchi";
DROP POLICY IF EXISTS "Users can update their own tamagotchi" ON "public"."Tamagotchi";
DROP POLICY IF EXISTS "Users can delete their own tamagotchi" ON "public"."Tamagotchi";

CREATE POLICY "Users can view organization tamagotchi"
  ON "public"."Tamagotchi"
  FOR SELECT
  USING ("organizationId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY "Users can insert organization tamagotchi"
  ON "public"."Tamagotchi"
  FOR INSERT
  WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY "Users can update organization tamagotchi"
  ON "public"."Tamagotchi"
  FOR UPDATE
  USING ("organizationId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY "Users can delete organization tamagotchi"
  ON "public"."Tamagotchi"
  FOR DELETE
  USING ("organizationId" = current_setting('app.current_tenant_id', TRUE));
```

### Step 3: Update Auto-Create Trigger

**File:** `prisma/migrations/[timestamp]_update_tamagotchi_trigger/migration.sql`

Replace user-based trigger with organization-based trigger:

```sql
DROP TRIGGER IF EXISTS on_user_created ON "auth"."user";
DROP FUNCTION IF EXISTS create_user_tamagotchi();

CREATE OR REPLACE FUNCTION create_organization_tamagotchi()
RETURNS TRIGGER AS $$
DECLARE
  random_species TEXT;
  species_options TEXT[] := ARRAY['species0', 'species1', 'species2', 'species3', 'species4', 'species5', 'species6', 'species7', 'species8', 'species9'];
BEGIN
  random_species := species_options[1 + FLOOR(RANDOM() * 10)::INT];

  INSERT INTO "public"."Tamagotchi" ("id", "organizationId", "color", "species", "age", "feedCount", "hunger")
  VALUES (
    gen_random_uuid()::text,
    NEW.id,
    '#' || LPAD(TO_HEX((RANDOM() * 16777215)::INT), 6, '0'),
    random_species,
    0,
    0,
    7
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON "auth"."organization"
  FOR EACH ROW
  EXECUTE FUNCTION create_organization_tamagotchi();
```

### Step 4: Reset Database and Run Migrations

Since we're using a database reset approach, run:

```bash
npx prisma migrate reset
```

This will:
1. Drop the entire database
2. Recreate the database structure
3. Run all migrations in order
4. Execute the seed script (see Section 3 below)

**Note:** Skip data migration - all existing data will be cleared and replaced with fresh seed data.

## 3. Seed Script Updates

**File:** `prisma/seed.ts`

Update seed script to create organizations with demo data showcasing the tamagotchi evolution system:

### Seed Script Structure

1. **Create Demo User** - Single test user account
2. **Create Two Organizations** - Demonstrate multi-org functionality
3. **Create Organization Memberships** - Link user to both orgs
4. **Create Tamagotchis** - One per org with different species/ages
5. **Create Todos** - Task lists for each organization

### Complete Seed Script:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const testUser = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      id: "test-user-id",
      email: "demo@example.com",
      name: "Demo User",
      emailVerified: true,
    },
  });

  const org1 = await prisma.organization.upsert({
    where: { slug: "demo-org-1" },
    update: {},
    create: {
      id: "test-org-1",
      name: "Personal Tasks",
      slug: "demo-org-1",
    },
  });

  const org2 = await prisma.organization.upsert({
    where: { slug: "demo-org-2" },
    update: {},
    create: {
      id: "test-org-2",
      name: "Work Projects",
      slug: "demo-org-2",
    },
  });

  await prisma.member.upsert({
    where: {
      userId_organizationId: {
        userId: testUser.id,
        organizationId: org1.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      organizationId: org1.id,
      role: "owner",
    },
  });

  await prisma.member.upsert({
    where: {
      userId_organizationId: {
        userId: testUser.id,
        organizationId: org2.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      organizationId: org2.id,
      role: "admin",
    },
  });

  await prisma.tamagotchi.upsert({
    where: { organizationId: org1.id },
    update: {},
    create: {
      organizationId: org1.id,
      hunger: 40,
      happiness: 80,
      wasteCount: 1,
      color: "#3b82f6",
      species: "species3",
      age: 2,
      feedCount: 25,
      lastFedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lastCleanedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      lastCheckedAt: new Date(),
    },
  });

  await prisma.tamagotchi.upsert({
    where: { organizationId: org2.id },
    update: {},
    create: {
      organizationId: org2.id,
      hunger: 7,
      happiness: 90,
      wasteCount: 0,
      color: "#10b981",
      species: "species7",
      age: 0,
      feedCount: 5,
      lastFedAt: new Date(),
      lastCleanedAt: new Date(),
      lastCheckedAt: new Date(),
    },
  });

  await prisma.todo.deleteMany({
    where: {
      organizationId: { in: [org1.id, org2.id] },
    },
  });

  await prisma.todo.createMany({
    data: [
      {
        organizationId: org1.id,
        text: "Buy groceries",
        completed: false,
      },
      {
        organizationId: org1.id,
        text: "Call dentist",
        completed: true,
      },
      {
        organizationId: org2.id,
        text: "Review pull request",
        completed: false,
      },
      {
        organizationId: org2.id,
        text: "Update documentation",
        completed: false,
      },
    ],
  });

  console.log("Seeding complete!");
  console.log("\nDemo Account:");
  console.log("Email: demo@example.com");
  console.log("Password: (set during sign-up)");
  console.log("\nOrganizations:");
  console.log("1. Personal Tasks - species3, age 2 (child), 25 feeds, blue tamagotchi");
  console.log("2. Work Projects - species7, age 0 (egg), 5 feeds, green tamagotchi");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Seed Data Highlights

**Organization 1: "Personal Tasks"**
- Tamagotchi: species3, age 2 (child stage), blue color (#3b82f6)
- FeedCount: 25 (has been fed 25 times, currently at child stage)
- Hunger: 40 (moderately hungry, shows ~3 hambones)
- Demonstrates mid-evolution state

**Organization 2: "Work Projects"**
- Tamagotchi: species7, age 0 (egg stage), green color (#10b981)
- FeedCount: 5 (has been fed 5 times, still in egg stage)
- Hunger: 7 (minimal hunger, shows 1 hambone)
- Demonstrates early egg state with species-specific egg sprite

This seed data allows testing:
- Organization switching with different tamagotchi states
- Different species (species3 vs species7) rendering different sprites
- Different ages showing different evolution stages
- Color customization per organization
- Age progression when feeding (egg at 5 feeds → baby at 10 feeds → child at 20 feeds → adult at 30 feeds → reset at 50 feeds)

## 4. Auth Utilities Update

**File:** `lib/auth.utils.ts`

Update `getAuthenticatedClient` to use active organization as tenant:

```typescript
import { User } from "better-auth";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";
import { auth, Session } from "./auth";
import { createRLSClient } from "./prisma-rls";

export async function getAuthenticatedClient(user?: User): Promise<{
  db: ReturnType<typeof createRLSClient>;
  session: Session | null;
}> {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  const userId = user?.id || session?.user.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const activeOrganizationId = session?.session?.activeOrganizationId;

  if (!activeOrganizationId) {
    throw new Error("No active organization");
  }

  const db = createRLSClient(userId, activeOrganizationId);

  return { db, session };
}

export function generateSupabaseJWT(userId: string, userRole: string): string {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("SUPABASE_JWT_SECRET is required for JWT generation");
  }

  const payload = {
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    sub: userId,
    email: `${userId}@better-auth.local`,
    role: "authenticated",
    user_metadata: {
      better_auth_user_id: userId,
      better_auth_role: userRole,
    },
    app_metadata: {
      provider: "better-auth",
      providers: ["better-auth"],
    },
  };

  return jwt.sign(payload, jwtSecret, {
    algorithm: "HS256",
  });
}
```

## 5. Better-Auth Configuration Update

**File:** `lib/auth.ts`

Enable organization plugin (already configured based on docs/util.md):

```typescript
import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization } from "better-auth/plugins";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    admin(),
    organization(),
  ],
});
```

**File:** `lib/auth-client.ts`

Enable organization client plugin:

```typescript
import { createAuthClient } from "better-auth/client";
import { adminClient, organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [adminClient(), organizationClient()],
});

export const {
  signIn,
  useSession,
  getSession,
  signUp,
  organization,
  admin,
  signOut,
} = authClient;
```

## 6. Store Updates

**File:** `app/layout.stores.ts`

Create app-level store to track active organization:

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  activeOrganizationId: string | null;
  setActiveOrganizationId: (id: string | null) => void;
  reset: () => void;
}

const initialState = {
  activeOrganizationId: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      setActiveOrganizationId: (id) => set({ activeOrganizationId: id }),
      reset: () => set(initialState),
    }),
    {
      name: "app-storage",
    }
  )
);
```

## 7. Organization Actions

**File:** `app/(components)/AvatarMenu.actions.ts`

```typescript
"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { headers } from "next/headers";

export const getUserOrganizationsAction = async (): Promise<
  ActionResponse<unknown>
> => {
  try {
    const organizations = await auth.api.listOrganizations({
      headers: await headers(),
    });

    return getActionResponse({ data: organizations });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const setActiveOrganizationAction = async (
  organizationId: string
): Promise<ActionResponse<unknown>> => {
  try {
    await auth.api.setActiveOrganization({
      body: { organizationId },
      headers: await headers(),
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const createOrganizationAction = async (
  name: string,
  slug: string
): Promise<ActionResponse<unknown>> => {
  try {
    const result = await auth.api.createOrganization({
      body: { name, slug },
      headers: await headers(),
    });

    return getActionResponse({ data: result });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getOrganizationTamagotchiColorAction = async (
  organizationId: string
): Promise<ActionResponse<string>> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const { db } = await getAuthenticatedClient();

    const tamagotchi = await db.tamagotchi.findUnique({
      where: { organizationId },
      select: { color: true },
    });

    return getActionResponse({ data: tamagotchi?.color || "#1f2937" });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const updateTamagotchiColorAction = async (
  color: string
): Promise<ActionResponse<void>> => {
  try {
    const { db } = await getAuthenticatedClient();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    await db.tamagotchi.update({
      where: { organizationId: activeOrganizationId },
      data: { color },
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

## 8. Organization Hooks

**File:** `app/(components)/AvatarMenu.hooks.ts`

```typescript
"use client";

import { organization } from "@/lib/auth-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getUserOrganizationsAction,
  updateTamagotchiColorAction,
  getOrganizationTamagotchiColorAction,
  createOrganizationAction,
} from "./AvatarMenu.actions";

export const useGetUserOrganizations = () => {
  return useQuery({
    queryKey: ["user-organizations"],
    queryFn: async () => {
      const { data, error } = await getUserOrganizationsAction();
      if (error) throw new Error(error);
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useSetActiveOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      await organization.setActive(organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      queryClient.invalidateQueries({ queryKey: ["user-organizations"] });
      toast.success("Organization switched");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to switch organization");
    },
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { data, error } = await createOrganizationAction(name, slug);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-organizations"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["todos"] });
        queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      }
      toast.success("Organization created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create organization");
    },
  });
};

export const useGetOrganizationColor = (organizationId: string | null) => {
  return useQuery({
    queryKey: ["organization-color", organizationId],
    queryFn: async () => {
      if (!organizationId) return "#1f2937";
      const { data, error } = await getOrganizationTamagotchiColorAction(
        organizationId
      );
      if (error) throw new Error(error);
      return data || "#1f2937";
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
};

export const useUpdateTamagotchiColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (color: string) => {
      const { error } = await updateTamagotchiColorAction(color);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      queryClient.invalidateQueries({ queryKey: ["organization-color"] });
      toast.success("Tamagotchi color updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update color");
    },
  });
};
```

## 9. Install React-Colorful

```bash
npm install react-colorful
```

## 10. AvatarMenu Component Updates

**File:** `app/(components)/AvatarMenu.tsx`

Add organization selector with "Add New" button and color picker to popover menu:

```typescript
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSession, signOut } from "@/lib/auth-client";
import { TestDataAttributes } from "@/test.types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import {
  useGetUserOrganizations,
  useSetActiveOrganization,
  useGetOrganizationColor,
  useUpdateTamagotchiColor,
  useCreateOrganization,
} from "./AvatarMenu.hooks";

export function AvatarMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  const { data: organizations } = useGetUserOrganizations();
  const { mutate: setActiveOrganization } = useSetActiveOrganization();
  const { mutate: updateColor } = useUpdateTamagotchiColor();
  const { mutate: createOrganization, isPending: isCreatingOrg } = useCreateOrganization();

  const activeOrganizationId = session?.session?.activeOrganizationId;
  const { data: currentColor } = useGetOrganizationColor(activeOrganizationId);

  const [tempColor, setTempColor] = useState(currentColor || "#1f2937");

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  const handleOrganizationChange = (value: string) => {
    if (value === "__add_new__") {
      setShowCreateOrgDialog(true);
    } else {
      setActiveOrganization(value);
    }
  };

  const handleCreateOrganization = () => {
    if (!newOrgName.trim()) return;

    const slug = newOrgName.toLowerCase().replace(/\s+/g, "-");
    createOrganization(
      { name: newOrgName, slug },
      {
        onSuccess: () => {
          setNewOrgName("");
          setShowCreateOrgDialog(false);
        },
      }
    );
  };

  const handleColorChange = (color: string) => {
    setTempColor(color);
  };

  const handleColorSubmit = () => {
    updateColor(tempColor);
    setShowColorPicker(false);
  };

  if (!session?.user) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => router.push("/sign-in")}
          data-testid={TestDataAttributes.SIGN_IN_BUTTON}
        >
          Sign In
        </Button>
      </div>
    );
  }

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const activeOrganization = organizations?.find(
    (org: { id: string }) => org.id === activeOrganizationId
  );

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full"
              data-testid={TestDataAttributes.AVATAR_MENU_TRIGGER}
            >
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-80"
            data-testid={TestDataAttributes.AVATAR_MENU_CONTENT}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <p
                  className="text-sm text-muted-foreground"
                  data-testid={TestDataAttributes.AVATAR_MENU_EMAIL}
                >
                  {session.user.email}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Organization</label>
                <select
                  value={activeOrganizationId || ""}
                  onChange={(e) => handleOrganizationChange(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  data-testid={TestDataAttributes.AVATAR_MENU_ORG_SELECT}
                >
                  {organizations?.map((org: { id: string; name: string }) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                  <option value="__add_new__">+ Add New Organization</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Tamagotchi Color</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="h-10 w-10 rounded-md border-2 border-gray-300"
                    style={{ backgroundColor: currentColor }}
                    data-testid={TestDataAttributes.AVATAR_MENU_COLOR_SWATCH}
                  />
                  <span className="text-xs text-muted-foreground uppercase">
                    {currentColor}
                  </span>
                </div>

                {showColorPicker && (
                  <div className="flex flex-col gap-2">
                    <HexColorPicker
                      color={tempColor}
                      onChange={handleColorChange}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleColorSubmit}
                        size="sm"
                        className="flex-1"
                      >
                        Apply
                      </Button>
                      <Button
                        onClick={() => setShowColorPicker(false)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full"
                data-testid={TestDataAttributes.AVATAR_MENU_SIGN_OUT}
              >
                Sign Out
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Dialog open={showCreateOrgDialog} onOpenChange={setShowCreateOrgDialog}>
        <DialogContent data-testid={TestDataAttributes.CREATE_ORG_DIALOG}>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCreatingOrg) {
                  handleCreateOrganization();
                }
              }}
              data-testid={TestDataAttributes.CREATE_ORG_INPUT}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateOrgDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrganization}
              disabled={!newOrgName.trim() || isCreatingOrg}
              data-testid={TestDataAttributes.CREATE_ORG_SUBMIT}
            >
              {isCreatingOrg ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## 11. Update Test Types

**File:** `test.types.ts`

Add new test attributes:

```typescript
export enum TestDataAttributes {
  AVATAR_MENU = "avatar-menu",
  AVATAR_MENU_TRIGGER = "avatar-menu-trigger",
  AVATAR_MENU_CONTENT = "avatar-menu-content",
  AVATAR_MENU_EMAIL = "avatar-menu-email",
  AVATAR_MENU_ORG_SELECT = "avatar-menu-org-select",
  AVATAR_MENU_COLOR_SWATCH = "avatar-menu-color-swatch",
  AVATAR_MENU_SIGN_OUT = "avatar-menu-sign-out",
  CREATE_ORG_DIALOG = "create-org-dialog",
  CREATE_ORG_INPUT = "create-org-input",
  CREATE_ORG_SUBMIT = "create-org-submit",
  SIGN_IN_BUTTON = "sign-in-button",
  SIGN_IN_EMAIL = "sign-in-email",
  SIGN_IN_PASSWORD = "sign-in-password",
  SIGN_IN_SUBMIT = "sign-in-submit",
  SIGN_IN_LINK = "sign-in-link",
  SIGN_UP_EMAIL = "sign-up-email",
  SIGN_UP_PASSWORD = "sign-up-password",
  SIGN_UP_CONFIRM_PASSWORD = "sign-up-confirm-password",
  SIGN_UP_SUBMIT = "sign-up-submit",
  SIGN_UP_LINK = "sign-up-link",
  TAMAGOTCHI_CONTAINER = "tamagotchi-container",
  TAMAGOTCHI_SCREEN = "tamagotchi-screen",
  TAMAGOTCHI_BUTTON_LEFT = "tamagotchi-button-left",
  TAMAGOTCHI_BUTTON_CENTER = "tamagotchi-button-center",
  TAMAGOTCHI_BUTTON_RIGHT = "tamagotchi-button-right",
  TAMAGOTCHI_HUNGER_BAR = "tamagotchi-hunger-bar",
  TAMAGOTCHI_HAPPINESS_BAR = "tamagotchi-happiness-bar",
  TAMAGOTCHI_WASTE_COUNT = "tamagotchi-waste-count",
  TAMAGOTCHI_AGE = "tamagotchi-age",
  TAMAGOTCHI_ANIMATION = "tamagotchi-animation",
  TODO_LIST = "todo-list",
  TODO_INPUT = "todo-input",
  TODO_ADD_BUTTON = "todo-add-button",
  TODO_ITEM = "todo-item",
  TODO_CHECKBOX = "todo-checkbox",
  TODO_DELETE_BUTTON = "todo-delete-button",
  TODO_TEXT = "todo-text",
  TODO_EMPTY_STATE = "todo-empty-state",
}
```

## 12. Tamagotchi Sprite Selection Logic

**File:** `app/(components)/Tamagotchi.utils.ts`

Create utility functions for sprite selection based on species and age:

```typescript
import { SpriteGrid } from "./Tamagotchi.sprites";

export type TamagotchiSpecies =
  | "species0" | "species1" | "species2" | "species3" | "species4"
  | "species5" | "species6" | "species7" | "species8" | "species9";

export function getSpriteForTamagotchi(
  species: TamagotchiSpecies,
  age: number
): SpriteGrid {
  const spriteKey = `${species}_age${age}`;

  const SPRITE_MAP: Record<string, SpriteGrid> = {
    species0_age0: SPRITE_SPECIES0_EGG,
    species0_age1: SPRITE_SPECIES0_BABY,
    species0_age2: SPRITE_SPECIES0_CHILD,
    species0_age3: SPRITE_SPECIES0_ADULT,

    species1_age0: SPRITE_SPECIES1_EGG,
    species1_age1: SPRITE_SPECIES1_BABY,
    species1_age2: SPRITE_SPECIES1_CHILD,
    species1_age3: SPRITE_SPECIES1_ADULT,

    species2_age0: SPRITE_SPECIES2_EGG,
    species2_age1: SPRITE_SPECIES2_BABY,
    species2_age2: SPRITE_SPECIES2_CHILD,
    species2_age3: SPRITE_SPECIES2_ADULT,

    species3_age0: SPRITE_SPECIES3_EGG,
    species3_age1: SPRITE_SPECIES3_BABY,
    species3_age2: SPRITE_SPECIES3_CHILD,
    species3_age3: SPRITE_SPECIES3_ADULT,

    species4_age0: SPRITE_SPECIES4_EGG,
    species4_age1: SPRITE_SPECIES4_BABY,
    species4_age2: SPRITE_SPECIES4_CHILD,
    species4_age3: SPRITE_SPECIES4_ADULT,

    species5_age0: SPRITE_SPECIES5_EGG,
    species5_age1: SPRITE_SPECIES5_BABY,
    species5_age2: SPRITE_SPECIES5_CHILD,
    species5_age3: SPRITE_SPECIES5_ADULT,

    species6_age0: SPRITE_SPECIES6_EGG,
    species6_age1: SPRITE_SPECIES6_BABY,
    species6_age2: SPRITE_SPECIES6_CHILD,
    species6_age3: SPRITE_SPECIES6_ADULT,

    species7_age0: SPRITE_SPECIES7_EGG,
    species7_age1: SPRITE_SPECIES7_BABY,
    species7_age2: SPRITE_SPECIES7_CHILD,
    species7_age3: SPRITE_SPECIES7_ADULT,

    species8_age0: SPRITE_SPECIES8_EGG,
    species8_age1: SPRITE_SPECIES8_BABY,
    species8_age2: SPRITE_SPECIES8_CHILD,
    species8_age3: SPRITE_SPECIES8_ADULT,

    species9_age0: SPRITE_SPECIES9_EGG,
    species9_age1: SPRITE_SPECIES9_BABY,
    species9_age2: SPRITE_SPECIES9_CHILD,
    species9_age3: SPRITE_SPECIES9_ADULT,
  };

  return SPRITE_MAP[spriteKey] || SPRITE_SPECIES0_EGG;
}
```

### Sprite Mapping Logic

**10 Species System:**
Each of the 10 species (species0-species9) has 4 unique sprites:
- **Age 0 (Egg)**: Species-specific egg sprite (e.g., SPRITE_SPECIES0_EGG)
- **Age 1 (Baby)**: Species-specific baby sprite (e.g., SPRITE_SPECIES0_BABY)
- **Age 2 (Child)**: Species-specific child sprite (e.g., SPRITE_SPECIES0_CHILD)
- **Age 3 (Adult)**: Species-specific adult sprite (e.g., SPRITE_SPECIES0_ADULT)

**Total Sprites Required:**
- 10 species × 4 ages = 40 unique sprite patterns
- Each sprite must be defined in [Tamagotchi.sprites.ts](app/(components)/Tamagotchi.sprites.ts)
- Sprite naming convention: `SPRITE_SPECIES{N}_AGE{N}` where N is 0-9 for species and 0-3 for age

## 13. Feeding Logic and Age Progression

**File:** `app/(components)/Tamagotchi.actions.ts`

Add feeding action with age progression logic:

```typescript
export const feedTamagotchiAction = async (): Promise<
  ActionResponse<Tamagotchi>
> => {
  try {
    const { db } = await getAuthenticatedClient();
    const session = await auth.api.getSession({ headers: await headers() });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const tamagotchi = await db.tamagotchi.findUnique({
      where: { organizationId: activeOrganizationId },
    });

    if (!tamagotchi) {
      throw new Error("Tamagotchi not found");
    }

    const newFeedCount = tamagotchi.feedCount + 1;
    let newAge = tamagotchi.age;
    let resetFeedCount = newFeedCount;

    if (newFeedCount >= 50) {
      newAge = 0;
      resetFeedCount = 0;
    } else if (newFeedCount >= 30 && tamagotchi.age < 3) {
      newAge = 3;
    } else if (newFeedCount >= 20 && tamagotchi.age < 2) {
      newAge = 2;
    } else if (newFeedCount >= 10 && tamagotchi.age < 1) {
      newAge = 1;
    }

    const updatedTamagotchi = await db.tamagotchi.update({
      where: { organizationId: activeOrganizationId },
      data: {
        hunger: Math.max(0, tamagotchi.hunger - 10),
        feedCount: resetFeedCount,
        age: newAge,
        lastFedAt: new Date(),
      },
    });

    return getActionResponse({ data: updatedTamagotchi });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

### Feeding Logic Rules

1. **Hunger Reduction**: Each feed decreases hunger by 10 points (min 0)
2. **Feed Count Tracking**: Increment `feedCount` by 1 with each feed
3. **Age Progression**:
   - At 10 feeds: Age becomes 1 (baby) if currently age 0
   - At 20 feeds: Age becomes 2 (child) if currently age < 2
   - At 30 feeds: Age becomes 3 (adult) if currently age < 3
   - At 50 feeds: Age resets to 0 (egg) and feedCount resets to 0

**Age Progression Timeline:**
- Feeds 0-9: Age 0 (egg)
- Feeds 10-19: Age 1 (baby)
- Feeds 20-29: Age 2 (child)
- Feeds 30-49: Age 3 (adult)
- Feed 50: Reset to Age 0 (egg) and feedCount to 0, cycle restarts

## 14. Feed Hook

**File:** `app/(components)/Tamagotchi.hooks.ts`

Add feed mutation hook:

```typescript
export const useFeedTamagotchi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await feedTamagotchiAction();
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });

      if (data?.age === 0 && data?.feedCount === 0) {
        toast.success("Your Tamagotchi has evolved back to an egg!");
      } else if (data?.feedCount === 10 || data?.feedCount === 20 || data?.feedCount === 30) {
        const ageNames = ["egg", "baby", "child", "adult"];
        toast.success(`Your Tamagotchi grew to ${ageNames[data.age]}!`);
      } else {
        toast.success("Fed your Tamagotchi!");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to feed Tamagotchi");
    },
  });
};
```

## 15. Update Tamagotchi Component to Use Color and Sprite Logic

**File:** `app/(components)/Tamagotchi.tsx`

Pass color prop to sprite rendering and use species/age for sprite selection:

```typescript
"use client";

import { useMemo } from "react";
import { useGetTamagotchi, useFeedTamagotchi } from "./Tamagotchi.hooks";
import { SPRITE_HAMBONE } from "./Tamagotchi.sprites";
import { getSpriteForTamagotchi, TamagotchiSpecies } from "./Tamagotchi.utils";
import { TestDataAttributes } from "@/test.types";

export function Tamagotchi() {
  const { data: tamagotchi } = useGetTamagotchi();
  const { mutate: feedTamagotchi, isPending: isFeeding } = useFeedTamagotchi();

  const color = tamagotchi?.color || "#1f2937";
  const species = (tamagotchi?.species || "species0") as TamagotchiSpecies;
  const age = tamagotchi?.age || 0;

  const currentSprite = useMemo(
    () => getSpriteForTamagotchi(species, age),
    [species, age]
  );

  const handleFeed = () => {
    if (!isFeeding) {
      feedTamagotchi();
    }
  };

  return (
    <div
      className="flex flex-col gap-4 p-6 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 shadow-lg"
      data-testid={TestDataAttributes.TAMAGOTCHI_CONTAINER}
    >
      <div
        className="relative aspect-square bg-gradient-to-br from-lime-200 to-amber-100 rounded-lg p-8 shadow-inner"
        data-testid={TestDataAttributes.TAMAGOTCHI_SCREEN}
      >
        <div className="w-full h-full flex items-center justify-center">
          <SpriteRenderer
            grid={currentSprite}
            color={color}
            data-testid={TestDataAttributes.TAMAGOTCHI_ANIMATION}
          />
        </div>
      </div>

      <HungerBar
        level={tamagotchi?.hunger || 0}
        data-testid={TestDataAttributes.TAMAGOTCHI_HUNGER_BAR}
      />

      <div className="flex justify-center gap-4">
        <button
          onClick={handleFeed}
          disabled={isFeeding}
          className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-md disabled:opacity-50"
          data-testid={TestDataAttributes.TAMAGOTCHI_BUTTON_LEFT}
        >
          🍔
        </button>
        <button
          className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors shadow-md"
          data-testid={TestDataAttributes.TAMAGOTCHI_BUTTON_CENTER}
        >
          💡
        </button>
        <button
          className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-md"
          data-testid={TestDataAttributes.TAMAGOTCHI_BUTTON_RIGHT}
        >
          🧹
        </button>
      </div>
    </div>
  );
}

function SpriteRenderer({
  grid,
  color,
  ...props
}: {
  grid: (0 | 1)[][];
  color: string;
  [key: string]: unknown;
}) {
  const gridSize = grid.length;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${gridSize}, 3px)`,
        gridTemplateRows: `repeat(${gridSize}, 3px)`,
        gap: "1px",
      }}
      {...props}
    >
      {grid.flat().map((pixel, i) => (
        <div
          key={i}
          style={{
            width: "3px",
            height: "3px",
            backgroundColor: pixel ? color : "transparent",
          }}
        />
      ))}
    </div>
  );
}

function HungerBar({ level, ...props }: { level: number; [key: string]: unknown }) {
  const hambones = Math.min(Math.floor(level / 14.3), 7);

  return (
    <div className="flex gap-1 justify-center" {...props}>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className={i < hambones ? "opacity-100" : "opacity-20"}>
          <SpriteRenderer grid={SPRITE_HAMBONE} color="#1f2937" />
        </div>
      ))}
    </div>
  );
}
```

## 13. Update Actions to Use Organization

**File:** `app/page.actions.ts`

Update all todo actions to use organization context (no code changes needed - RLS handles this automatically via `getAuthenticatedClient`):

```typescript
"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { Todo } from "@prisma/client";

export const getTodosAction = async (): Promise<ActionResponse<Todo[]>> => {
  try {
    const { db } = await getAuthenticatedClient();

    const todos = await db.todo.findMany({
      orderBy: { createdAt: "desc" },
    });

    return getActionResponse({ data: todos });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const createTodoAction = async (
  text: string
): Promise<ActionResponse<Todo>> => {
  try {
    const { db } = await getAuthenticatedClient();
    const session = await auth.api.getSession({ headers: await headers() });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const todo = await db.todo.create({
      data: {
        text,
        organizationId: activeOrganizationId,
      },
    });

    return getActionResponse({ data: todo });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

**File:** `app/(components)/Tamagotchi.actions.ts`

Update tamagotchi actions (no code changes needed - RLS handles this automatically):

```typescript
"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { Tamagotchi } from "@prisma/client";

export const getTamagotchiAction = async (): Promise<
  ActionResponse<Tamagotchi>
> => {
  try {
    const { db } = await getAuthenticatedClient();
    const session = await auth.api.getSession({ headers: await headers() });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const tamagotchi = await db.tamagotchi.findUnique({
      where: { organizationId: activeOrganizationId },
    });

    if (!tamagotchi) {
      throw new Error("Tamagotchi not found");
    }

    return getActionResponse({ data: tamagotchi });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

## Implementation Order

### Phase 1: Database Schema & Infrastructure

1. Update `prisma/schema.prisma` with organizationId, color, species, age, and feedCount fields
2. Create RLS policy migration for organization-based access (in migrations folder)
3. Create trigger migration to auto-create tamagotchi with random species for new organizations
4. Update `prisma/seed.ts` with organization-based seed data (see Section 3)
5. Run database reset: `npx prisma migrate reset` (drops DB, runs migrations, executes seed)
6. Run `npx prisma generate` to regenerate types with new fields
7. Verify seed data created correctly using `npx prisma studio`

### Phase 2: Backend Logic & Auth

8. Update `lib/auth.utils.ts` to use activeOrganizationId as tenant in RLS
9. Verify `lib/auth.ts` has organization plugin enabled
10. Verify `lib/auth-client.ts` has organizationClient plugin enabled
11. Create `app/layout.stores.ts` for app-level active organization state
12. Create `app/(components)/Tamagotchi.utils.ts` with sprite selection logic
13. Update `app/(components)/Tamagotchi.actions.ts`:
    - Add `feedTamagotchiAction` with age progression logic
    - Update `getTamagotchiAction` to use activeOrganizationId
14. Update `app/page.actions.ts` to use activeOrganizationId for todo operations
15. Create `app/(components)/AvatarMenu.actions.ts` with organization and color actions

### Phase 3: Frontend Hooks & Components

16. Install react-colorful: `npm install react-colorful`
17. Update `app/(components)/Tamagotchi.hooks.ts`:
    - Add `useFeedTamagotchi` hook with toast notifications
    - Update existing hooks
18. Create `app/(components)/AvatarMenu.hooks.ts`:
    - Add `useGetUserOrganizations` hook
    - Add `useSetActiveOrganization` hook
    - Add `useCreateOrganization` hook
    - Add `useGetOrganizationColor` hook
    - Add `useUpdateTamagotchiColor` hook
19. Update `test.types.ts` with new test attributes (AVATAR_MENU_ORG_SELECT, CREATE_ORG_DIALOG, CREATE_ORG_INPUT, CREATE_ORG_SUBMIT, etc.)
20. Update `app/(components)/Tamagotchi.tsx`:
    - Use `getSpriteForTamagotchi()` for sprite selection
    - Add feed button functionality
    - Apply color from database
21. Update `app/(components)/AvatarMenu.tsx`:
    - Add organization selector dropdown with "+ Add New Organization" option
    - Add create organization dialog with input field
    - Add color swatch with color picker
    - Wire up organization switching, creation, and color update logic

### Phase 4: Testing & Validation

22. Start dev server: `npm run dev`
23. Sign up with demo account (demo@example.com)
24. Test organization switching updates todos and tamagotchi with different sprites
25. Test organization creation:
    - Click "+ Add New Organization" in dropdown
    - Enter organization name in dialog
    - Submit and verify new organization is created with random tamagotchi
    - Verify user is automatically switched to new organization
26. Test color picker updates tamagotchi color in real-time
27. Test feeding button:
    - Decreases hunger by 10
    - Increments feedCount
    - Shows appropriate toast messages
28. Test age progression:
    - Feed egg to 10 total feeds → should evolve to baby (age 1)
    - Feed to 20 total feeds → should evolve to child (age 2)
    - Feed to 30 total feeds → should evolve to adult (age 3)
29. Test evolution cycle:
    - Feed adult to 50 total feeds → should reset to egg (age 0, feedCount 0)
30. Test all 10 different species display different sprites at each of the 4 ages
31. Test RLS properly isolates data between organizations
32. Verify switching orgs shows correct color, species, and age
33. Test hunger bar displays correct number of hambones (1 hambone per ~14 hunger)
