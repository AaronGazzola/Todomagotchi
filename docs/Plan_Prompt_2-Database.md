# Plan Prompt 2: Database Schema and Migrations

Set up the database schema and create initial migrations for the Tamagotchi todo app.

## 1. Database Schema Overview

Two main models in the `public` schema:
- `Todo` - user todo items
- `Tamagotchi` - user's tamagotchi state

## 2. Prisma Schema

**File:** `prisma/schema.prisma`

### Todo Model

```prisma
model Todo {
  id        String   @id @default(cuid())
  userId    String
  text      String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@schema("public")
  @@index([userId])
}
```

### Tamagotchi Model

```prisma
model Tamagotchi {
  id              String   @id @default(cuid())
  userId          String   @unique
  hunger          Int      @default(50)
  happiness       Int      @default(100)
  wasteCount      Int      @default(0)
  lastFedAt       DateTime @default(now())
  lastCleanedAt   DateTime @default(now())
  lastCheckedAt   DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@schema("public")
}
```

### Field Descriptions

**Todo Fields:**
- `id` - unique identifier
- `userId` - reference to auth.user.id
- `text` - todo item content
- `completed` - completion status
- `createdAt/updatedAt` - timestamps

**Tamagotchi Fields:**
- `id` - unique identifier
- `userId` - reference to auth.user.id (one tamagotchi per user)
- `hunger` - hunger level (0-100, increases over time)
- `happiness` - happiness level (0-100, decreases over time)
- `wasteCount` - number of waste items (increases over time)
- `lastFedAt` - timestamp of last feeding action
- `lastCleanedAt` - timestamp of last cleaning action
- `lastCheckedAt` - timestamp of last stat calculation
- `createdAt/updatedAt` - timestamps

## 3. Row Level Security Policies

**File:** `prisma/migrations/[timestamp]_rls_policies/migration.sql`

### Todo RLS Policies

```sql
ALTER TABLE "public"."Todo" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own todos"
  ON "public"."Todo"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can insert their own todos"
  ON "public"."Todo"
  FOR INSERT
  WITH CHECK ("userId" = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can update their own todos"
  ON "public"."Todo"
  FOR UPDATE
  USING ("userId" = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can delete their own todos"
  ON "public"."Todo"
  FOR DELETE
  USING ("userId" = current_setting('app.current_user_id', TRUE));
```

### Tamagotchi RLS Policies

```sql
ALTER TABLE "public"."Tamagotchi" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tamagotchi"
  ON "public"."Tamagotchi"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can insert their own tamagotchi"
  ON "public"."Tamagotchi"
  FOR INSERT
  WITH CHECK ("userId" = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can update their own tamagotchi"
  ON "public"."Tamagotchi"
  FOR UPDATE
  USING ("userId" = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can delete their own tamagotchi"
  ON "public"."Tamagotchi"
  FOR DELETE
  USING ("userId" = current_setting('app.current_user_id', TRUE));
```

## 4. Initial Data Migration

**File:** `prisma/migrations/[timestamp]_seed_tamagotchi/migration.sql`

Trigger to auto-create Tamagotchi when user signs up:

```sql
CREATE OR REPLACE FUNCTION create_user_tamagotchi()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "public"."Tamagotchi" ("id", "userId")
  VALUES (gen_random_uuid()::text, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created
  AFTER INSERT ON "auth"."user"
  FOR EACH ROW
  EXECUTE FUNCTION create_user_tamagotchi();
```

## 5. Migration Commands

### Generate Migration
```bash
npx prisma migrate dev --name init_todo_tamagotchi
```

### Create RLS Policy Migration
```bash
npx prisma migrate dev --name add_rls_policies
```

### Create Trigger Migration
```bash
npx prisma migrate dev --name auto_create_tamagotchi
```

### Apply to Production
```bash
npx prisma migrate deploy
```

## 6. Database Indices

Indices already defined in schema via `@@index`:
- `Todo.userId` - for efficient user todo queries

Additional indices in migration if needed:
```sql
CREATE INDEX "Tamagotchi_userId_idx" ON "public"."Tamagotchi"("userId");
```

## 7. Type Generation

After schema changes, regenerate Prisma Client:

```bash
npx prisma generate
```

This creates TypeScript types:
- `Todo` type from `@prisma/client`
- `Tamagotchi` type from `@prisma/client`

## 8. Validation Constraints

Add check constraints in migration:

```sql
ALTER TABLE "public"."Tamagotchi"
  ADD CONSTRAINT "hunger_range" CHECK ("hunger" >= 0 AND "hunger" <= 100);

ALTER TABLE "public"."Tamagotchi"
  ADD CONSTRAINT "happiness_range" CHECK ("happiness" >= 0 AND "happiness" <= 100);

ALTER TABLE "public"."Tamagotchi"
  ADD CONSTRAINT "waste_count_positive" CHECK ("wasteCount" >= 0);
```

## 9. Seed Script

**File:** `prisma/seed.ts`

Create seed script to populate test data for development:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const testUserId = "test-user-id";

  console.log("Seeding database...");

  await prisma.tamagotchi.upsert({
    where: { userId: testUserId },
    update: {},
    create: {
      userId: testUserId,
      hunger: 40,
      happiness: 80,
      wasteCount: 1,
      lastFedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lastCleanedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      lastCheckedAt: new Date(),
    },
  });

  await prisma.todo.createMany({
    data: [
      {
        userId: testUserId,
        text: "Complete project setup",
        completed: false,
      },
      {
        userId: testUserId,
        text: "Write documentation",
        completed: false,
      },
      {
        userId: testUserId,
        text: "Review pull requests",
        completed: true,
      },
      {
        userId: testUserId,
        text: "Deploy to production",
        completed: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seeding complete!");
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

### Add seed command to package.json

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Run seed script

```bash
npx prisma db seed
```

### Reset database with seed

```bash
npx prisma migrate reset
```

This will:
1. Drop the database
2. Run all migrations
3. Execute the seed script

## Implementation Order

1. Update `prisma/schema.prisma` with Todo and Tamagotchi models
2. Generate initial migration
3. Create RLS policies migration
4. Create auto-create Tamagotchi trigger migration
5. Add validation constraints migration
6. Run `npx prisma generate`
7. Create `prisma/seed.ts` with test data
8. Add seed command to `package.json`
9. Run `npx prisma db seed` to populate test data
10. Verify migrations applied correctly
11. Test RLS policies work with `getAuthenticatedClient`
