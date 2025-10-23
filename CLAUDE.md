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

All tests should be performed with Jest or Playwright and documented in the `Test.md` document

## Test rules:

- The test should find elements in the DOM via data-attributes. Add corresponding data-attributes to the elements in the components. Import the data-attribute values from an enum exported from `@/test.types.ts`
- Do not use wait in the tests. Only use timeouts.

## Test.md

The test document should list all tests in the repo, with each test case listed in a single line with an indented line below with the pass condition.
Test document should begin with an index and number each test as demonstrated below:

# Test.md file example:

```md
# Test Documentation

## Run All Tests

**Command:** `npm run test`
✓ Runs the complete test suite across all test files

## Test Index

1. [Name](#1-name-tests) - `npm run test:name`

## 1. Name Tests

**File:** `__tests__/name.test.ts`
**Command:** `npm run test:name`

### Name Test

- should do something
  ✓ Validates expected results

- should do something else
  ✓ Validates expected results
```

# Console.logging

All logging should be performed using the `conditionalLog` function exported from `lib/log.util.ts`
The `NEXT_PUBLIC_LOG_LABELS` variable in `.env.local` stores a comma separated string of log labels. Logs are returned if `NEXT_PUBLIC_LOG_LABELS="all"`, or if `NEXT_PUBLIC_LOG_LABELS` includes the label arg in `conditionalLog`.
