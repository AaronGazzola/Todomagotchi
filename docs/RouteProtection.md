# Route Protection

This document describes the route protection and redirection strategy implemented in High School Hustle.

## Overview

The application uses a multi-layered approach to route protection:

1. **Server-side Layout Guards** - Initial cookie-based authentication check
2. **Client-side Profile Verification** - Continuous authentication state monitoring
3. **Event-driven Redirection** - Post-authentication flow management

## Architecture

### Route Classification

Routes are classified in [configuration.ts](configuration.ts:11-17):

**Private Paths:**

- Home: `/`
- Admin: `/admin`
- Dynamic Hustles: `/hustles/*`

**Public Paths:**

- Sign In: `/sign-in`
- Sign Up: `/sign-up`

### Path Checking

```typescript
export const isPrivatePath = (path: string) =>
  path.startsWith("/hustles/") || privatePaths.includes(path);
```

## Layer 1: Server-Side Layout Guards

Initial authentication verification happens at the layout level using Next.js server components.

### Dashboard Layout Protection

[app/(dashboard)/layout.tsx](<app/(dashboard)/layout.tsx:6-14>)

The dashboard layout protects all private routes:

```typescript
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuth = await hasAuthCookie();
  if (!isAuth) {
    redirect(configuration.paths.signIn);
  }
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
```

### Auth Layout Protection

[app/(auth)/layout.tsx](<app/(auth)/layout.tsx:6-12>)

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
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
```

### Cookie-Based Authentication Check

[lib/auth.utils.ts](lib/auth.utils.ts:7-17)

The `hasAuthCookie` function performs a fast, lightweight check for Supabase authentication cookies:

```typescript
export const hasAuthCookie = async (): Promise<boolean> => {
  const cookieStore = cookies();
  const authCookies = (await cookieStore).getAll();

  const hasSupabaseCookie = authCookies.some(
    (cookie) =>
      cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token")
  );

  return hasSupabaseCookie;
};
```

This check is optimized for speed as it only examines cookies without making database or API calls.

## Layer 2: Client-Side Profile Verification

After the initial page load, client-side hooks continuously monitor authentication state.

### Profile Query Hook

[app/layout.hooks.tsx](app/layout.hooks.tsx:11-33)

The `useGetProfile` hook validates the user session and manages redirection:

```typescript
export const useGetProfile = () => {
  const { setProfile, reset } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();

  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await getProfileAction();
      if (!data || error) {
        if (isPrivatePath(pathname)) {
          router.push(configuration.paths.signIn);
        }
        reset();
      }
      if (error) throw error;
      setProfile(data ?? null);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};
```

**Key Features:**

- Verifies user profile exists in database
- Redirects to sign-in if profile fetch fails on private paths
- Clears application state on authentication failure
- Caches profile data for 5 minutes to reduce server load

### Profile Action

[app/layout.actions.ts](app/layout.actions.ts:9-55)

The `getProfileAction` retrieves the user's profile from both Supabase Auth and Prisma:

```typescript
export const getProfileAction = async (): Promise<
  ActionResponse<Profile | null>
> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user) return getActionResponse({ data: null });

    const profile = await prisma.profile.findUnique({
      where: { auth_user_id: user.id },
    });

    return getActionResponse({ data: profile });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

## Layer 3: Event-Driven Redirection

Authentication events trigger appropriate redirections.

### Sign In Success

[app/(auth)/sign-in/page.hooks.tsx](<app/(auth)/sign-in/page.hooks.tsx:26-29>)

After successful sign-in, users are redirected to the home page:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["profile"] });
  queryClient.invalidateQueries({ queryKey: ["hustles"] });
  router.push(configuration.paths.home);
};
```

### Sign Up Success

[app/(auth)/sign-up/page.hooks.tsx](<app/(auth)/sign-up/page.hooks.tsx:42-45>)

After successful registration, users are redirected to the home page:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["profile"] });
  queryClient.invalidateQueries({ queryKey: ["hustles"] });
  router.push(configuration.paths.home);
};
```

### Sign Out

[app/layout.hooks.tsx](app/layout.hooks.tsx:35-63)

The `useSignOut` hook manages sign-out flow:

```typescript
export const useSignOut = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { reset } = useAppStore();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await signOutAction();
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onSettled: () => {
      router.push(configuration.paths.signIn);
      reset();
    },
  });
};
```

**Key Features:**

- Invalidates profile cache on success
- Always redirects to sign-in (regardless of success/failure)
- Clears application state
- Displays error toast on failure

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ User Navigates to Route                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Server Layout Guard   │
         │ (hasAuthCookie)       │
         └───────────┬───────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   Private Path              Public Path
   Has Cookie?               Has Cookie?
        │                         │
   ┌────┴────┐             ┌──────┴──────┐
   │         │             │             │
  Yes       No            Yes           No
   │         │             │             │
   │         ▼             ▼             │
   │    Redirect to    Redirect to      │
   │    Sign In        Home             │
   │                                     │
   └─────────────┬───────────────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │ Page Renders          │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ useGetProfile Hook    │
         │ Verifies Profile      │
         └───────────┬───────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   Profile Found            Profile Not Found
   & Valid                  or Error
        │                         │
        │                         ▼
        │                   On Private Path?
        │                         │
        │                    ┌────┴────┐
        │                    │         │
        │                   Yes       No
        │                    │         │
        │                    ▼         │
        │              Redirect to     │
        │              Sign In         │
        │                    │         │
        └────────────────────┴─────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ User Authenticated    │
         │ App State Updated     │
         └───────────────────────┘
```

## Key Implementation Details

### Why Two-Layer Protection?

1. **Performance**: Cookie checking ([hasAuthCookie](lib/auth.utils.ts:7)) is fast and prevents unnecessary page renders
2. **Security**: Profile verification ([getProfileAction](app/layout.actions.ts:9)) ensures the user still exists in the database
3. **User Experience**: Immediate feedback without waiting for API calls

### State Management

**Zustand Store** ([app/layout.stores.ts](app/layout.stores.ts))

- Stores profile data globally
- Provides `reset()` function to clear state on sign-out

**React Query**

- Manages loading/error states
- Caches profile data with 5-minute stale time
- Provides query invalidation on auth state changes

### Error Handling

All authentication errors result in:

1. State reset via `reset()`
2. Redirection to sign-in (if on private path)
3. User notification via toast (for explicit actions)

## Testing Route Protection

To test route protection:

1. **Unauthenticated Access**

   - Navigate to `/` without authentication
   - Expected: Redirect to `/sign-in`

2. **Authenticated Public Access**

   - Sign in, then navigate to `/sign-in`
   - Expected: Redirect to `/`

3. **Session Expiration**

   - Sign in, clear cookies, refresh page
   - Expected: Redirect to `/sign-in`

4. **Profile Deletion**
   - Sign in, delete profile from database, trigger profile refetch
   - Expected: State reset and redirect to `/sign-in`
