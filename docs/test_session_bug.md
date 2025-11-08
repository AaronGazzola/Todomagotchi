# Test Session Bug Diagnosis

## Summary

Authentication tests are failing because `activeOrganizationId` is `null` in the session after sign-up/sign-in completes, preventing TodoList and Tamagotchi components from rendering.

## Root Cause

The sign-up and sign-in flows call `organization.setActive()` with a retry loop, but navigation happens before the session update propagates, leaving the home page without an active organization.

## Detailed Analysis

### Expected Flow (Browser - Working)

1. User signs up/in successfully
2. `organization.setActive()` is called with retry loop (up to 10 retries, 200ms intervals)
3. Retry loop polls `getSession()` until `activeOrganizationId` is present
4. `onSuccess` callback fires, triggering `router.push('/')`
5. Home page loads, `useSession()` hook fetches session
6. Session contains `activeOrganizationId`, so `hasActiveOrganization = true`
7. TodoList and Tamagotchi render

### Actual Flow (Playwright Tests - Failing)

1. User signs up/in successfully
2. `organization.setActive()` is called with retry loop
3. Retry loop completes checking `getSession()` from Better Auth client
4. `onSuccess` callback fires, triggering `router.push('/')`
5. Test sees URL change and proceeds
6. Home page loads, `useSession()` hook fetches session
7. **Session has `activeOrganizationId: null`**
8. `hasActiveOrganization = false` (app/page.tsx:16)
9. TodoList and Tamagotchi don't render (app/page.tsx:23)
10. Test fails waiting for `TestId.TODO_LIST`

## Diagnostic Evidence

### Test Output from `e2e/auth-debug.spec.ts`

```json
{
  "url": "http://localhost:3000/api/auth/get-session",
  "status": 200,
  "body": {
    "session": {
      "expiresAt": "2025-11-15T22:55:22.352Z",
      "token": "kAAQrH4cthFnjLdkHBl2SOskcbXJLpli",
      "createdAt": "2025-11-08T22:55:22.353Z",
      "updatedAt": "2025-11-08T22:55:22.353Z",
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "userId": "fA9JRFaspS6KMvuOuVVj09lklxGGK6Vj",
      "impersonatedBy": null,
      "activeOrganizationId": null,  ← THE PROBLEM
      "id": "7mNwQdgaoWhc7GKvzLX6LMU3O2NIXTjc"
    },
    "user": {
      "name": "Test Debug User",
      "email": "test-debug@example.com",
      ...
    }
  }
}
```

### Key Observations

1. **Session cookie is set correctly**: `better-auth.session_token` exists in Playwright context
2. **GET /api/auth/get-session returns 200**: Session fetch succeeds
3. **Session contains user data**: Authentication is working
4. **activeOrganizationId is null**: Organization not set in session
5. **LocalStorage shows no user**: `{"state":{"user":null,"activeOrganizationId":null}}`

### Code Locations

**Sign-up hook** (app/(auth)/sign-up/page.hooks.tsx:42-52):
```typescript
if (data && typeof data === 'object' && 'id' in data) {
  await organization.setActive({ organizationId: data.id as string });
  let retries = 0;
  while (retries < 10) {
    const session = await getSession();
    if (session?.session?.activeOrganizationId) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    retries++;
  }
}
```

**Sign-in hook** (app/(auth)/sign-in/page.hooks.tsx:28-42):
```typescript
if (!session?.session?.activeOrganizationId) {
  const { data: organizations } = await getUserOrganizationsAction();
  if (organizations && Array.isArray(organizations) && organizations.length > 0) {
    await organization.setActive({ organizationId: organizations[0].id });
    let retries = 0;
    while (retries < 10) {
      session = await getSession();
      if (session?.session?.activeOrganizationId) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
      retries++;
    }
  }
}
```

**Home page rendering** (app/page.tsx:15-23):
```typescript
const { data: session } = useSession();
const hasActiveOrganization = !!session?.session?.activeOrganizationId;

return (
  <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AvatarMenu />
    <InvitationToasts />

    {hasActiveOrganization && (
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col gap-6 md:grid md:grid-cols-[1fr_400px] md:gap-8">
          <TodoList />
          <Tamagotchi />
        </div>
      </div>
    )}
  </div>
);
```

## Why It Works in Browser but Fails in Tests

**Browser**: Users experience natural delays (UI rendering, form filling, network latency) that give the session time to propagate before components attempt to render.

**Playwright**: Tests execute rapidly with minimal delays. The retry loop in the auth hooks polls `getSession()` from the Better Auth client, but this is a separate call from the `useSession()` hook on the home page. There's a race condition where:
- The auth hook's retry loop may succeed with a stale/cached session
- Navigation happens immediately after `mutationFn` completes
- The home page's `useSession()` hook fetches before the server session is updated
- Better Auth's session update hasn't propagated to the database/cache

## Potential Solutions

### Option 1: Wait for activeOrganizationId in Tests
Add explicit waits in tests for the active organization to be set:
```typescript
await page.waitForFunction(
  () => {
    const storage = localStorage.getItem('app-storage');
    if (!storage) return false;
    const data = JSON.parse(storage);
    return data?.state?.activeOrganizationId !== null;
  },
  { timeout: 10000 }
);
```

### Option 2: Invalidate Session Query After Setting Active Org
Force the session to refetch after `organization.setActive()` completes:
```typescript
if (data && typeof data === 'object' && 'id' in data) {
  await organization.setActive({ organizationId: data.id as string });
  queryClient.invalidateQueries({ queryKey: ['$user_session'] });
  // Retry loop...
}
```

### Option 3: Wait for Session Update Before Navigation
Don't navigate until we confirm the session has `activeOrganizationId`:
```typescript
onSuccess: async () => {
  // Poll until session is ready
  let retries = 0;
  while (retries < 20) {
    const session = await getSession();
    if (session?.session?.activeOrganizationId) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    retries++;
  }

  queryClient.invalidateQueries({ queryKey: ["user"] });
  showSuccessToast("Account created successfully");
  router.push(configuration.paths.home);
},
```

### Option 4: Server-Side Redirect with Session Check
Instead of client-side navigation, use a server action that doesn't complete until the session is ready.

## Recommended Approach

**Option 3** is the most robust solution - it ensures the session is fully updated before navigation, fixing both the test issue and preventing potential race conditions in production with slow networks or high server load.

This should be combined with increasing timeouts in tests as a safety measure, but the core fix should be in the application code to guarantee session consistency.

## Failed Test Cases

1. **should sign up new user and sign out** (e2e/auth.spec.ts:24)
   - Element not found: `todo-list`
   - After signup/navigation to `/`, expected todo list not visible

2. **should sign in with existing user and sign out** (e2e/auth.spec.ts:87)
   - Navigation timeout to `/` after sign-in
   - Session has no activeOrganizationId

3. **should show error when signing up with existing email** (e2e/auth.spec.ts:146)
   - Element not found: `toast-error`
   - Likely different issue - toast timing

## References

- Test file: `e2e/auth.spec.ts`
- Diagnostic test: `e2e/auth-debug.spec.ts`
- Sign-up hook: `app/(auth)/sign-up/page.hooks.tsx`
- Sign-in hook: `app/(auth)/sign-in/page.hooks.tsx`
- Home page: `app/page.tsx`
- Latest test output: `test-results/2025-11-08_22-28-35-878/`
