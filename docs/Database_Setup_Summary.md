# Database Setup Summary

## Overview

The database schema and migrations for the Todomagotchi app have been successfully set up with Prisma, PostgreSQL, and Better Auth integration.

## What Was Created

### 1. Prisma Schema

[prisma/schema.prisma](../prisma/schema.prisma)

Two schemas configured:
- `auth` schema - Better Auth tables (user, session, account, etc.)
- `public` schema - Application tables (Todo, Tamagotchi)

### 2. Models

**Todo Model** (`public` schema)
- id: String (cuid)
- userId: String (indexed)
- text: String
- completed: Boolean (default: false)
- createdAt/updatedAt: DateTime

**Tamagotchi Model** (`public` schema)
- id: String (cuid)
- userId: String (unique - one per user)
- hunger: Int (0-100, default: 50)
- happiness: Int (0-100, default: 100)
- wasteCount: Int (default: 0)
- lastFedAt/lastCleanedAt/lastCheckedAt: DateTime
- createdAt/updatedAt: DateTime

### 3. Migrations Applied

**Migration 1:** `20251023100644_init_todo_tamagotchi`
- Created all auth schema tables
- Created Todo and Tamagotchi tables

**Migration 2:** `20251023100700_add_rls_policies`
- Enabled Row Level Security on Todo and Tamagotchi tables
- Created SELECT/INSERT/UPDATE/DELETE policies for both tables
- Policies check `current_setting('app.current_user_id', TRUE)` to ensure users only access their own data

**Migration 3:** `20251023100800_auto_create_tamagotchi`
- Created trigger function `create_user_tamagotchi()`
- Automatically creates a Tamagotchi when a new user is created
- Trigger: `on_user_created` on `auth.user` table

**Migration 4:** `20251023100900_add_validation_constraints`
- Added CHECK constraints:
  - `hunger_range`: hunger between 0-100
  - `happiness_range`: happiness between 0-100
  - `waste_count_positive`: wasteCount >= 0

### 4. Utility Files Created

**[lib/prisma.ts](../lib/prisma.ts)**
- Global Prisma Client instance
- Prevents multiple instances in development

**[lib/prisma-rls.ts](../lib/prisma-rls.ts)**
- `createRLSClient(userId, tenantId?)` function
- Extends Prisma Client with RLS support
- Sets PostgreSQL session variables for RLS policies

**[lib/action.utils.ts](../lib/action.utils.ts)**
- `ActionResponse<T>` interface
- `getActionResponse()` helper function
- Standardized error handling for server actions

### 5. Seed Script

[prisma/seed.ts](../prisma/seed.ts)
- Creates test data for development
- Test user ID: `"test-user-id"`
- Creates 1 Tamagotchi with sample stats
- Creates 4 sample todos

### 6. Package.json Scripts

```bash
npm run db:migrate      # Create and apply new migration
npm run db:deploy       # Apply pending migrations (production)
npm run db:seed         # Run seed script
npm run db:reset        # Reset database and reseed
npm run db:generate     # Regenerate Prisma Client types
npm run db:studio       # Open Prisma Studio
```

## Environment Variables

The following variables were added to [.env](../.env):

```
DATABASE_URL                    # PostgreSQL connection (already configured)
BETTER_AUTH_URL                 # Auth server URL
BETTER_AUTH_SECRET              # Auth secret key
NEXT_PUBLIC_BETTER_AUTH_URL     # Public auth URL
RESEND_API_KEY                  # Email service API key
FROM_EMAIL                      # Email sender address
SUPABASE_JWT_SECRET             # JWT signing secret
NEXT_PUBLIC_LOG_LABELS          # Logging configuration
```

## Database State

All migrations have been successfully applied and the database is in sync with the schema.

**Status:** ✅ Ready for development

**Migration count:** 4
**Tables created:** 11 (8 auth + 2 public + 1 migration tracking)
**RLS enabled:** Yes (Todo, Tamagotchi)
**Seed data:** Available (test-user-id)

## Next Steps

To use the database in your application:

1. Import Prisma types:
   ```typescript
   import { Todo, Tamagotchi } from "@prisma/client";
   ```

2. Use RLS client in server actions:
   ```typescript
   import { getAuthenticatedClient } from "@/lib/auth.utils";

   const { db } = await getAuthenticatedClient();
   const todos = await db.todo.findMany();
   ```

3. Create actions following the pattern in [docs/util.md](./util.md)

4. Create hooks to call actions via React Query

5. Use Zustand stores for client-side state management

## Testing

You can verify the setup by:

1. Running Prisma Studio:
   ```bash
   npm run db:studio
   ```

2. Checking the seed data exists for `test-user-id`

3. Verifying RLS policies prevent cross-user data access

## Production Deployment

When deploying to production:

1. Set all environment variables in your hosting platform
2. Run `npm run db:deploy` to apply migrations
3. Do NOT run the seed script in production
4. Generate secure values for:
   - BETTER_AUTH_SECRET
   - SUPABASE_JWT_SECRET
   - RESEND_API_KEY

## Notes

- The `multiSchema` preview feature warning can be ignored (it's now stable)
- The `package.json#prisma` deprecation warning can be addressed later
- RLS policies require `getAuthenticatedClient()` to work correctly
- The trigger automatically creates a Tamagotchi for each new user
