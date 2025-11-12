# Route Protection

This document describes the route protection and redirection strategy implemented in the application.

## Overview

The application uses a multi-layered approach to route protection:

1. **Middleware Protection** - Initial cookie-based authentication check at the request level
2. **Server-side Layout Guards** - Layout-level authentication verification
3. **Client-side User Verification** - Continuous authentication state monitoring with stale session cleanup
4. **Event-driven Redirection** - Post-authentication flow management

## Architecture

### Route Classification

Routes are classified in [configuration.ts](configuration.ts):

**Private Paths:**

- Home: `/`

**Public Paths:**

- Sign In: `/sign-in`
- Sign Up: `/sign-up`

### Path Checking

```typescript
export const isPrivatePath = (path: string) => privatePaths.includes(path);
```

## Layer 1: Middleware Protection

[middleware.ts](middleware.ts)

The middleware intercepts all requests before they reach layouts or pages:

```typescript
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasAuthCookie = request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.includes("better-auth") || cookie.name.includes("session")
    );

  if (isPrivatePath(pathname) && !hasAuthCookie) {
    return NextResponse.redirect(
      new URL(configuration.paths.signIn, request.url)
    );
  }

  return NextResponse.next();
}
```

**Key Features:**

- Runs before any page or layout code executes
- Fast cookie presence check (no database queries)
- Redirects unauthenticated users away from private paths
- Provides the earliest possible authentication gate

## Layer 2: Server-Side Layout Guards

Additional authentication verification at the layout level using Next.js server components.

### Auth Layout Protection

[app/(auth)/layout.tsx](app/(auth)/layout.tsx)

The auth layout prevents authenticated users from accessing sign-in/sign-up pages:

```typescript
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await hasAuthCookie()) {
    redirect(configuration.paths.home);
  }
  return <>{children}</>;
}
```

### Cookie-Based Authentication Check

[lib/auth.utils.ts](lib/auth.utils.ts:33-43)

The `hasAuthCookie` function performs a fast, lightweight check for Better Auth cookies:

```typescript
export const hasAuthCookie = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  const authCookies = cookieStore.getAll();

  const hasBetterAuthCookie = authCookies.some(
    (cookie) =>
      cookie.name.includes("better-auth") || cookie.name.includes("session")
  );

  return hasBetterAuthCookie;
};
```

This check is optimized for speed as it only examines cookies without making database or API calls.

## Layer 3: Client-Side User Verification

After the initial page load, client-side hooks continuously monitor authentication state and handle stale sessions.

### User Query Hook

[app/layout.hooks.tsx](app/layout.hooks.tsx:11-32)

The `useGetUser` hook validates the user session, clears stale cookies, and manages redirection:

```typescript
export const useGetUser = () => {
  const { setUser, reset } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();

  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data, error } = await getUserAction();
      if (!data || error) {
        await clearAuthCookiesAction();
        reset();
        if (isPrivatePath(pathname)) {
          router.push(configuration.paths.signIn);
        }
      }
      if (error) throw error;
      setUser(data ?? null);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};
```

**Key Features:**

- Verifies user exists in database with valid Better Auth session
- **Clears stale authentication cookies** when session is invalid
- Redirects to sign-in if user fetch fails on private paths
- Clears application state on authentication failure
- Caches user data for 5 minutes to reduce server load

### Stale Session Handling

When a stale session is detected (cookie exists but session is invalid), the following occurs:

1. `getUserAction()` returns `{ data: null }` because session validation fails
2. `clearAuthCookiesAction()` is called to remove stale cookies from the server
3. Application state is reset
4. User is redirected to sign-in if on a private path
5. On next navigation, middleware/layout checks find no cookie and allow access to sign-in

### User Action

[app/layout.actions.ts](app/layout.actions.ts:10-26)

The `getUserAction` retrieves the user from Better Auth and Prisma:

```typescript
export const getUserAction = async (): Promise<ActionResponse<user | null>> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return getActionResponse({ data: null });

    const prismaUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    return getActionResponse({ data: prismaUser });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

### Clear Auth Cookies Action

[app/layout.actions.ts](app/layout.actions.ts:28-35)

The `clearAuthCookiesAction` removes stale authentication cookies:

```typescript
export const clearAuthCookiesAction = async (): Promise<ActionResponse<void>> => {
  try {
    await clearAuthCookies();
    return getActionResponse({ data: undefined });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

[lib/auth.utils.ts](lib/auth.utils.ts:45-54)

The `clearAuthCookies` function deletes all Better Auth cookies:

```typescript
export const clearAuthCookies = async (): Promise<void> => {
  const cookieStore = await cookies();
  const authCookies = cookieStore.getAll();

  authCookies.forEach((cookie) => {
    if (cookie.name.includes("better-auth") || cookie.name.includes("session")) {
      cookieStore.delete(cookie.name);
    }
  });
};
```

## Layer 4: Event-Driven Redirection

Authentication events trigger appropriate redirections.

### Sign In Success

After successful sign-in, users are redirected to the home page with query cache invalidation.

### Sign Up Success

After successful registration, users are redirected to the home page with query cache invalidation.

### Sign Out

[app/layout.hooks.tsx](app/layout.hooks.tsx:35-56)

The `useSignOut` hook manages sign-out flow:

```typescript
export const useSignOut = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { reset } = useAppStore();

  return useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSuccess: () => {
      showSuccessToast("Signed out successfully");
      queryClient.invalidateQueries();
      reset();
      router.push(configuration.paths.signIn);
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to sign out", "Sign Out Failed");
      queryClient.invalidateQueries();
      reset();
      router.push(configuration.paths.signIn);
    },
  });
};
```

**Key Features:**

- Uses Better Auth's client-side `signOut()` to clear session
- Invalidates all query cache on success or error
- Always redirects to sign-in (regardless of success/failure)
- Clears application state
- Displays appropriate toast notifications

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ User Navigates to Route                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Middleware            │
         │ (Cookie Check)        │
         └───────────┬───────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   Private Path              Public Path
   Has Cookie?               (Allow Through)
        │
   ┌────┴────┐
   │         │
  Yes       No
   │         │
   │         ▼
   │    Redirect to
   │    Sign In
   │
   └─────┬────────────────────────┐
         │                        │
         ▼                        ▼
   ┌──────────────┐      ┌──────────────┐
   │ Auth Layout  │      │ Root Layout  │
   │ Has Cookie?  │      │ (No Check)   │
   └──────┬───────┘      └──────┬───────┘
          │                     │
     ┌────┴────┐                │
     │         │                │
    Yes       No                │
     │         │                │
     ▼         │                │
Redirect to    │                │
Home           │                │
     │         │                │
     └─────────┴────────────────┘
               │
               ▼
     ┌─────────────────┐
     │ Page Renders    │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ useGetUser Hook │
     │ Validates User  │
     └────────┬────────┘
              │
     ┌────────┴─────────┐
     │                  │
     ▼                  ▼
User Found         No User/Error
Valid Session      Invalid Session
     │                  │
     │                  ▼
     │         ┌─────────────────────┐
     │         │ clearAuthCookies()  │
     │         │ Delete Stale Cookie │
     │         └─────────┬───────────┘
     │                   │
     │                   ▼
     │            Reset App State
     │                   │
     │         ┌─────────┴─────────┐
     │         │                   │
     │         ▼                   ▼
     │    Private Path       Public Path
     │    Redirect to        Stay on Page
     │    Sign In
     │         │                   │
     └─────────┴───────────────────┘
               │
               ▼
     ┌─────────────────┐
     │ User Auth State │
     │ Finalized       │
     └─────────────────┘
```

## Key Implementation Details

### Why Multi-Layer Protection?

1. **Middleware**: Fastest possible check, runs before any code execution
2. **Layout Guards**: Additional server-side verification for public/private route separation
3. **Client-Side Validation**: Validates actual session and handles stale cookie cleanup
4. **Performance**: Cookie checking is fast and prevents unnecessary page renders
5. **Security**: User verification ensures the user still exists in the database
6. **User Experience**: Immediate feedback without waiting for API calls

### Stale Session Problem & Solution

**The Problem:**
- Cookie exists in browser but session is no longer valid on server
- Middleware/layouts see cookie → redirect to home
- Client-side hook sees invalid session → redirects to sign-in
- Loop: sign-in → home → sign-in (because cookie still exists)

**The Solution:**
- Client-side hook calls `clearAuthCookiesAction()` when session is invalid
- Server action deletes all Better Auth cookies
- Next navigation: middleware sees no cookie → allows sign-in page access
- Loop broken

### State Management

**Zustand Store** ([app/layout.stores.ts](app/layout.stores.ts))

- Stores user data globally
- Provides `reset()` function to clear state on authentication failure

**React Query**

- Manages loading/error states
- Caches user data with 5-minute stale time
- Provides query invalidation on auth state changes

### Error Handling

All authentication errors result in:

1. **Stale cookie cleanup** via `clearAuthCookiesAction()`
2. **State reset** via `reset()`
3. **Redirection to sign-in** (if on private path)
4. **User notification via toast** (for explicit actions like sign-out)

## Testing Route Protection

To test route protection:

1. **Unauthenticated Access**

   - Navigate to `/` without authentication
   - Expected: Middleware redirects to `/sign-in`

2. **Authenticated Public Access**

   - Sign in, then navigate to `/sign-in`
   - Expected: Auth layout redirects to `/`

3. **Session Expiration / Cookie Cleared**

   - Sign in, clear cookies via browser DevTools, refresh page
   - Expected: Middleware redirects to `/sign-in`

4. **Stale Session (Cookie Exists but Invalid)**

   - Sign in, manually invalidate session on server (or wait for expiration)
   - Navigate to `/` (middleware allows through because cookie exists)
   - Expected: `useGetUser` detects invalid session, clears cookies, redirects to `/sign-in`
   - Navigate to `/` again
   - Expected: Middleware sees no cookie, redirects to `/sign-in`

5. **User Deletion**
   - Sign in, delete user from database
   - Trigger user refetch (refresh page or navigate)
   - Expected: Cookies cleared, state reset, redirect to `/sign-in`
