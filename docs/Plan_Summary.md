# Todomagotchi Implementation Plan Summary

## Overview

Todomagotchi is a gamified todo list app where completing tasks keeps your virtual Tamagotchi pet alive and happy.

## Key Changes from Original Plan

### 1. Stat Decay Rate
- Changed from **per hour** to **per minute** for faster gameplay
- Hunger increases 10% per minute (was 10% per hour)
- Happiness decreases 5% per minute (was 5% per hour)
- Waste accumulates every 2 minutes (was every 2 hours)

### 2. Authentication Strategy
- **Email/password only** - no email verification required
- Uses Better-Auth with `requireEmailVerification: false`
- Simple sign-in/sign-up flow without confirmation emails

### 3. State Persistence Strategy
- **When signed out**: All data (todos + tamagotchi state) persists in zustand store with localStorage
- **When signed in**: Zustand store is populated from database via React Query hooks
- Seamless transition between local and database state based on authentication status

## Architecture

### State Management Flow

```
┌─────────────────────────────────────────────────┐
│                   Component                      │
└─────────────────────┬───────────────────────────┘
                      │
                      ├─── Check: isAuthenticated?
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
   YES (Signed In)             NO (Signed Out)
        │                           │
        ▼                           ▼
┌──────────────┐            ┌──────────────┐
│   Database   │            │   Zustand    │
│   (Prisma)   │            │  + LocalStorage│
└──────────────┘            └──────────────┘
        │                           │
        ▼                           ▼
   React Query                 Direct Updates
   Hooks + Actions             to Store
```

## Implementation Phases

### Phase 1: UI Components
- Build all UI with mock data
- Authentication pages (sign-in/sign-up)
- Avatar menu with conditional display
- Tamagotchi display with animations
- Todo list with CRUD operations
- Responsive layout (mobile/desktop)

### Phase 2: Database Setup
- Prisma schema with `Todo` and `Tamagotchi` models
- Row-level security policies
- Auto-create Tamagotchi trigger on user signup
- Validation constraints (hunger 0-100, happiness 0-100, wasteCount >= 0)

### Phase 3: Backend Integration
- Better-Auth configuration (email/password, no verification)
- Authentication hooks (useSignUp, useSignIn, useSignOut, useSession)
- Server actions for todos and tamagotchi
- React Query hooks with conditional logic
- Zustand store with persistence middleware
- Components updated to handle both auth and local state

### Phase 4: Game Logic
- Stat decay calculations (per minute)
- Feed and clean utility functions
- Auto-update hook for both database and local state
- Todo actions trigger tamagotchi updates
- Animation states based on stats

## User Experience

### Unauthenticated User Flow
1. Visit site → See Tamagotchi + Todo list
2. Add todos, complete tasks → Pet responds immediately
3. Stats decay over time, stored in localStorage
4. Close browser, return later → State persists locally

### Authenticated User Flow
1. Sign up/Sign in → Database auto-creates Tamagotchi
2. Add todos, complete tasks → Saved to database
3. Stats decay over time, synced to database every minute
4. Access from any device → State syncs from database

### Game Mechanics
- **Add Todo** → Feed pet (-20 hunger, +10 happiness)
- **Complete Todo** → Clean waste (wasteCount = 0, +15 happiness)
- **Every minute** → +10 hunger, -5 happiness, +0.5 waste (every 2 min)
- **Visual states**: idle, happy, sad, hungry (with corresponding animations)

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- TailwindCSS + Shadcn
- Postgres + Prisma
- Better-Auth (email/password)
- React Query (server state)
- Zustand (client state + persistence)

## Key Files Structure

```
app/
├── (auth)/
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   └── auth.hooks.ts
├── (components)/
│   ├── AvatarMenu.tsx
│   ├── Tamagotchi.tsx
│   ├── Tamagotchi.hooks.ts
│   ├── Tamagotchi.actions.ts
│   └── TodoList.tsx
├── page.tsx
├── page.hooks.ts
├── page.actions.ts
├── page.stores.ts (zustand with persist)
└── page.types.ts

lib/
├── auth.ts (Better-Auth config)
├── auth.client.ts
├── auth.utils.ts (getAuthenticatedClient)
├── action.utils.ts
└── tamagotchi.utils.ts (game logic)

prisma/
├── schema.prisma
└── migrations/
```

## Environment Variables

```env
DATABASE_URL=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=...

NEXT_PUBLIC_TAMAGOTCHI_UPDATE_INTERVAL=60000
NEXT_PUBLIC_HUNGER_INCREASE_PER_MINUTE=10
NEXT_PUBLIC_HAPPINESS_DECREASE_PER_MINUTE=5
NEXT_PUBLIC_WASTE_INCREASE_PER_2_MINUTES=1
NEXT_PUBLIC_LOG_LABELS=all
```

## Testing Strategy

- Jest/Playwright tests
- Data attributes for DOM element selection
- Test both authenticated and unauthenticated flows
- Verify localStorage persistence
- Verify database sync for authenticated users
- Test stat decay calculations
- Test todo → tamagotchi action triggers
