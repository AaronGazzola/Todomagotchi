# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

### Core Technologies

- **Next.js 15** with App Router architecture
- **TypeScript** for type safety
- **TailwindCSS & Shadcn** for styling
- **Postgres & Prisma** for database and ORM
- **Better-Auth** for authentication

# General rules:

- Don't include any comments in any files.
- All errors should be thrown - no "fallback" functionality
- Import "cn" from "@/lib/utils" to concatinate classes.

# File Organization and Naming Conventions

- Types and store files alongside anscenstor files
- Actions and hooks files alongside descendent files

```txt
app/
├── layout.tsx
├── layout.providers.tsx
├── layout.types.ts
├── layout.stores.ts ◄─── useAppStore
└── (dashboard)/
    ├── layout.tsx
    ├── layout.types.tsx
    ├── layout.stores.tsx ◄─── useDashboardStore
    ├── page.tsx              ─┐
    ├── page.hooks.tsx         ├────► useAppStore
    ├── Component.tsx          ├────► useDashboardStore
    ├── Component.hooks.tsx   ─┘
    ├── page.actions.ts
    └── Component.actions.ts

    key:
    ◄─── = defined
    ───► = imported
```

# Hook, action, store and type patterns

DB <-> Action <-> hook <-> store

- Better-auth client methods are called directly in react-query hooks.
- Prisma client queries are called in actions via getAuthenticatedClient.
- Actions are called via react-query hooks.
- Data returned in the onSuccess function of react-query hooks is used to update the corresponding zustand store.
- Loading and error state is managed via the react-query hooks, NOT the zustand store.
- All db types should be defined from `"@prisma/client"`

## Example of file patterns - [`docs/util.md`](docs/util.md)

Follow the examples outlined in [`docs/util.md`](docs/util.md) when working on hook, action, store or type files. The file also contains the `prisma-rls.ts` and `action.util.ts` files for reference.

# Testing

All tests should be performed with Playwright and documented in the `Tests.md` document. For complete testing instructions, patterns, and documentation format, refer to [`docs/Testing.md`](docs/Testing.md).

# Environment Variables and Browser APIs

All environment variable access and browser API usage must use the centralized utilities from `@/lib/env.utils`:

```typescript
import { ENV, getBrowserAPI } from "@/lib/env.utils";

const apiUrl = ENV.SUPABASE_URL;
const storage = getBrowserAPI(() => localStorage);
```

This ensures universal compatibility between browser and Node.js test environments with zero performance overhead.

# Console.logging

All logging should be performed using the `conditionalLog` function exported from `lib/log.utils.ts`
The `VITE_LOG_LABELS` variable in `.env.local` stores a comma separated string of log labels. Logs are returned if `VITE_LOG_LABELS="all"`, or if `VITE_LOG_LABELS` includes the label arg in `conditionalLog`.
