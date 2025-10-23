# Quick Reference - Database & Prisma Commands

## Database Scripts

```bash
npm run db:migrate        # Create new migration from schema changes
npm run db:deploy         # Apply pending migrations (production)
npm run db:seed           # Populate database with test data
npm run db:reset          # Drop DB, reapply migrations, and seed
npm run db:generate       # Regenerate Prisma Client types
npm run db:studio         # Open Prisma Studio GUI
```

## Common Workflows

### Make Schema Changes

1. Edit [prisma/schema.prisma](../prisma/schema.prisma)
2. Run `npm run db:migrate` and name your migration
3. Types are automatically regenerated

### Reset Development Database

```bash
npm run db:reset
```

This will:
- Drop all tables
- Reapply all migrations
- Run the seed script

### View Database in GUI

```bash
npm run db:studio
```

Opens at http://localhost:5555

## File Structure Reference

```
prisma/
├── schema.prisma           # Database schema definition
├── seed.ts                 # Test data seeding script
└── migrations/             # All migration files
    └── [timestamp]_[name]/
        └── migration.sql

lib/
├── prisma.ts              # Global Prisma Client
├── prisma-rls.ts          # RLS Client extension
├── auth.ts                # Better Auth server config
├── auth-client.ts         # Better Auth client exports
├── auth.utils.ts          # Auth helper functions
├── action.utils.ts        # Action response helpers
├── log.util.ts            # Logging utilities
└── emails/                # Email templates
    ├── MagicLinkEmail.tsx
    ├── InvitationMagicLinkEmail.tsx
    └── OrganizationInvitationEmail.tsx
```

## Import Examples

### Using Prisma Types

```typescript
import { Todo, Tamagotchi, User } from "@prisma/client";
```

### Server Actions with RLS

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
```

### Better Auth Client

```typescript
"use client";

import { signIn, signOut, useSession } from "@/lib/auth-client";
```

### React Query Hook

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { getTodosAction } from "./page.actions";

export const useGetTodos = () => {
  return useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const { data, error } = await getTodosAction();
      if (error) throw new Error(error);
      return data || [];
    },
  });
};
```

## Environment Variables

Required in `.env`:

```bash
DATABASE_URL                    # PostgreSQL connection string
BETTER_AUTH_URL                 # http://localhost:3000
BETTER_AUTH_SECRET              # Random secret for auth
NEXT_PUBLIC_BETTER_AUTH_URL     # http://localhost:3000
RESEND_API_KEY                  # Your Resend API key
FROM_EMAIL                      # Email sender address
SUPABASE_JWT_SECRET             # Random secret for JWT
NEXT_PUBLIC_LOG_LABELS          # "all" or comma-separated labels
```

## Database Models

### Todo

```typescript
{
  id: string
  userId: string
  text: string
  completed: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Tamagotchi

```typescript
{
  id: string
  userId: string
  hunger: number          // 0-100
  happiness: number       // 0-100
  wasteCount: number      // >= 0
  lastFedAt: Date
  lastCleanedAt: Date
  lastCheckedAt: Date
  createdAt: Date
  updatedAt: Date
}
```

## Tips

- Always use `getAuthenticatedClient()` for database queries (enforces RLS)
- Use `ActionResponse<T>` for all server action return types
- Use React Query hooks for all data fetching
- Update Zustand stores in `onSuccess` of mutations
- Loading/error states managed by React Query, not Zustand
- Run `db:generate` after any schema changes
- Use `db:studio` to inspect database visually

## Production Checklist

Before deploying:

- [ ] Set all environment variables in hosting platform
- [ ] Generate secure values for secrets
- [ ] Add real Resend API key
- [ ] Run `npm run db:deploy` (not `db:migrate`)
- [ ] Do NOT run seed script
- [ ] Verify RLS policies are working
- [ ] Test authentication flow
