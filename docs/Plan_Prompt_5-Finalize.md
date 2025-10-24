# Plan Prompt 5: Finalize Organization-Based Multi-Tenancy

This plan completes the implementation of Plan_Prompt_4 by connecting authentication, implementing route protection, and wiring up todos.

## Overview

Plan_Prompt_4 successfully implemented:
- ✅ Database schema with organizations, members, tamagotchis, todos
- ✅ RLS policies for data isolation
- ✅ Organization management UI with color picker
- ✅ Tamagotchi evolution system with 10 species and 4 ages
- ✅ Better-Auth configuration
- ✅ Server actions for all features

**What's Missing:**
- ❌ Auth pages not connected to Better-Auth
- ❌ No route protection middleware
- ❌ TodoList using mock data instead of server actions
- ❌ Better-Auth API routes not configured

**Organization Management:**
- Organization selection and creation happens entirely through the AvatarMenu component
- Users can switch organizations via the popover dropdown
- Users can create new organizations via the "+ Add New Organization" option in the dropdown
- A dialog opens for organization creation with name input and color picker
- No separate onboarding page needed - sign-up creates a default organization automatically

## Critical Path Implementation

### Phase 1: Better-Auth API Routes ⏳ MUST DO FIRST

Better-Auth requires API routes to handle authentication requests. Without these, signIn/signUp will fail.

**File:** `app/api/auth/[...all]/route.ts`

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

**Why This Matters:**
- Better-Auth client methods (signIn, signUp) make HTTP requests to `/api/auth/*` endpoints
- This route handles all auth operations: sign in, sign up, session management, organization operations
- Without this, the entire auth system is non-functional

---

### Phase 2: Authentication Pages ⏳ CRITICAL

#### 2.1 Sign-In Page

**File:** `app/(auth)/sign-in/page.tsx`

Current state: Stub form that just routes to "/" without authentication.

**Required Changes:**
1. Import `signIn` and `useSession` from `@/lib/auth-client`
2. Replace stub `handleSubmit` with actual Better-Auth call
3. Add loading state during authentication
4. Add error handling with toast notifications
5. Redirect to "/" on success
6. Redirect away if already authenticated

**Implementation:**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TestId } from "@/test.types";
import { signIn, useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { useEffect } from "react";

export default function SignInPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      router.push("/");
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to sign in");
      }

      toast.success("Signed in successfully");
      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Sign In</h1>
          <p className="text-muted-foreground mt-2">
            Enter your credentials to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="demo@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              data-testid={TestId.SIGN_IN_EMAIL}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              data-testid={TestId.SIGN_IN_PASSWORD}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid={TestId.SIGN_IN_SUBMIT}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              Don&apos;t have an account?{" "}
            </span>
            <Link
              href="/sign-up"
              className="font-medium underline underline-offset-4 hover:text-primary"
              data-testid={TestId.SIGN_UP_LINK}
            >
              Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
```

#### 2.2 Sign-Up Page

**File:** `app/(auth)/sign-up/page.tsx`

Current state: Stub form with password validation that routes to "/" without creating account.

**Required Changes:**
1. Import `signUp`, `organization`, and `useSession` from `@/lib/auth-client`
2. Replace stub `handleSubmit` with actual Better-Auth call
3. Add name field (Better-Auth requirement)
4. Create default organization after signup (tamagotchi auto-created via database trigger)
5. Add loading state during authentication
6. Add error handling with toast notifications
7. Redirect to "/" on success
8. Redirect away if already authenticated

**Note:** When an organization is created, a database trigger automatically creates a tamagotchi for that organization with:
- Random species (species0-species9)
- Random color
- Default stats (hunger: 7, happiness: 100, age: 0, feedCount: 0)

**Implementation:**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TestId } from "@/test.types";
import { signUp, organization, useSession } from "@/lib/auth-client";
import { toast } from "sonner";

export default function SignUpPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      router.push("/");
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const signUpResult = await signUp.email({
        email,
        password,
        name,
      });

      if (signUpResult.error) {
        throw new Error(signUpResult.error.message || "Failed to sign up");
      }

      toast.success("Account created successfully");

      const slug = name.toLowerCase().replace(/\s+/g, "-") + "-tasks";
      const orgResult = await organization.create({
        name: `${name}'s Tasks`,
        slug,
      });

      if (orgResult.error) {
        toast.error("Account created but failed to create organization");
      } else {
        await organization.setActive(orgResult.data.id);
      }

      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Sign Up</h1>
          <p className="text-muted-foreground mt-2">
            Create an account to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              data-testid={TestId.SIGN_UP_NAME}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="demo@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              data-testid={TestId.SIGN_UP_EMAIL}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              data-testid={TestId.SIGN_UP_PASSWORD}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              data-testid={TestId.SIGN_UP_CONFIRM_PASSWORD}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid={TestId.SIGN_UP_SUBMIT}
          >
            {isLoading ? "Creating account..." : "Sign Up"}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Link
              href="/sign-in"
              className="font-medium underline underline-offset-4 hover:text-primary"
              data-testid={TestId.SIGN_IN_LINK}
            >
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
```

#### 2.3 Update Test Types

**File:** `test.types.ts`

Add missing test ID for name field:

```typescript
export enum TestId {
  SIGN_UP_NAME = "sign-up-name",
}
```

---

### Phase 3: Route Protection ⏳ CRITICAL

#### 3.1 Create Middleware

**File:** `middleware.ts` (root level)

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const publicRoutes = ["/sign-in", "/sign-up"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const isAuthenticated = !!session?.user;

  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**What This Does:**
1. Protects all routes except `/sign-in` and `/sign-up`
2. Redirects unauthenticated users to `/sign-in`
3. Redirects authenticated users away from auth pages to `/`
4. Allows API routes, static files, and images through

**Note on Organization Management:**
- No need for onboarding page - sign-up creates a default organization automatically
- Users manage organizations entirely through the AvatarMenu popover component
- If a user signs in without an active organization, they can select/create one from the AvatarMenu
- The existing AvatarMenu component already handles all organization management UX

---

### Phase 4: Connect TodoList to Server Actions ⏳ CRITICAL

**File:** `app/(components)/TodoList.tsx`

Current state: Uses mock data with local state.

**Required Changes:**
1. Remove mock data
2. Import todo hooks from `page.hooks.ts`
3. Replace local state with React Query hooks
4. Call server actions via hooks
5. Handle loading and error states
6. Keep `onTodoAction` callback for tamagotchi updates

**Note:** First need to create `page.hooks.ts` file.

#### 4.1 Create Todo Hooks

**File:** `app/page.hooks.ts`

```typescript
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTodosAction,
  createTodoAction,
  toggleTodoAction,
  deleteTodoAction,
} from "./page.actions";

export const useGetTodos = () => {
  return useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const { data, error } = await getTodosAction();
      if (error) throw new Error(error);
      return data || [];
    },
    staleTime: 1000 * 60,
  });
};

export const useCreateTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await createTodoAction(text);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Todo created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create todo");
    },
  });
};

export const useToggleTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await toggleTodoAction(id);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to toggle todo");
    },
  });
};

export const useDeleteTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteTodoAction(id);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Todo deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete todo");
    },
  });
};
```

#### 4.2 Update TodoList Component

**File:** `app/(components)/TodoList.tsx`

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TestId } from "@/test.types";
import { cn } from "@/lib/utils";
import {
  useGetTodos,
  useCreateTodo,
  useToggleTodo,
  useDeleteTodo,
} from "@/app/page.hooks";

interface TodoListProps {
  onTodoAction?: () => void;
}

export function TodoList({ onTodoAction }: TodoListProps = {}) {
  const [inputValue, setInputValue] = useState("");

  const { data: todos = [], isLoading } = useGetTodos();
  const { mutate: createTodo, isPending: isCreating } = useCreateTodo();
  const { mutate: toggleTodo } = useToggleTodo();
  const { mutate: deleteTodo } = useDeleteTodo();

  const handleAddTodo = () => {
    if (inputValue.trim().length < 1) {
      throw new Error("Todo text must be at least 1 character");
    }

    createTodo(inputValue.trim(), {
      onSuccess: () => {
        setInputValue("");
        onTodoAction?.();
      },
    });
  };

  const handleToggleTodo = (id: string) => {
    toggleTodo(id, {
      onSuccess: () => {
        onTodoAction?.();
      },
    });
  };

  const handleDeleteTodo = (id: string) => {
    deleteTodo(id);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim().length >= 1 && !isCreating) {
      handleAddTodo();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid={TestId.TODO_LIST}>
        <h2 className="text-2xl font-bold">Tasks</h2>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid={TestId.TODO_LIST}>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Tasks</h2>

        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Add a new task..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isCreating}
            data-testid={TestId.TODO_INPUT}
            className="flex-1"
          />
          <Button
            onClick={handleAddTodo}
            data-testid={TestId.TODO_ADD_BUTTON}
            disabled={inputValue.trim().length < 1 || isCreating}
          >
            {isCreating ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {todos.length === 0 ? (
          <div
            className="text-center py-12 space-y-4"
            data-testid={TestId.TODO_EMPTY_STATE}
          >
            <div className="text-6xl">✓</div>
            <div className="space-y-2">
              <p className="text-lg font-medium">No tasks yet</p>
              <p className="text-sm text-muted-foreground">
                Add a task above to get started
              </p>
            </div>
          </div>
        ) : (
          todos.map((todo: { id: string; text: string; completed: boolean }) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group"
              data-testid={`${TestId.TODO_ITEM}-${todo.id}`}
            >
              <Checkbox
                checked={todo.completed}
                onCheckedChange={() => handleToggleTodo(todo.id)}
                data-testid={`${TestId.TODO_CHECKBOX}-${todo.id}`}
                aria-label={`Mark "${todo.text}" as ${
                  todo.completed ? "incomplete" : "complete"
                }`}
              />
              <span
                className={cn(
                  "flex-1 transition-all",
                  todo.completed && "line-through text-muted-foreground"
                )}
                data-testid={`${TestId.TODO_TEXT}-${todo.id}`}
              >
                {todo.text}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteTodo(todo.id)}
                data-testid={`${TestId.TODO_DELETE_BUTTON}-${todo.id}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Delete "${todo.text}"`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

### Phase 5: Fix Missing Server Action Imports ⏳ CRITICAL

The `page.actions.ts` file has server actions but is missing necessary imports.

**File:** `app/page.actions.ts`

Add missing imports at the top:

```typescript
"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Todo } from "@prisma/client";
```

---

### Phase 6: Environment Variables ⏳ MUST VERIFY

Ensure `.env.local` has required variables:

```bash
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"
```

**Generate secrets:**
```bash
openssl rand -base64 32
```

---

## Implementation Order

### Critical Path (Must Complete for Functionality)

1. ✅ **Phase 1**: Create Better-Auth API routes at `app/api/auth/[...all]/route.ts`
2. ✅ **Phase 2**: Wire sign-in and sign-up pages to Better-Auth
3. ✅ **Phase 2.3**: Add `SIGN_UP_NAME` to test.types.ts
4. ✅ **Phase 3**: Create middleware for route protection
5. ✅ **Phase 4.1**: Create todo hooks in `app/page.hooks.ts`
6. ✅ **Phase 4.2**: Connect TodoList to server actions
7. ✅ **Phase 5**: Fix server action imports
8. ✅ **Phase 6**: Verify environment variables

### Optional Enhancements (Nice-to-Have)

9. ⬜ Add loading spinners to all components
10. ⬜ Add optimistic updates to todo mutations
11. ⬜ Implement email verification flow
12. ⬜ Add password strength indicator
13. ⬜ Add "Forgot Password" functionality

---

## Testing Checklist

After implementation, verify:

### Authentication Flow
- [ ] Sign-up creates account and default organization
- [ ] Sign-up redirects to home page with active organization
- [ ] Sign-in authenticates and redirects to home
- [ ] Sign-out clears session and redirects to sign-in
- [ ] Auth pages redirect away if already authenticated
- [ ] Home page redirects to sign-in if not authenticated

### Organization Management
- [ ] Can switch between organizations
- [ ] Switching orgs updates todos and tamagotchi
- [ ] Can create new organization from avatar menu
- [ ] Each org has unique tamagotchi color
- [ ] Color picker updates tamagotchi color

### Todo Management
- [ ] Todos load from database on page load
- [ ] Can create new todo
- [ ] Can toggle todo completion
- [ ] Can delete todo
- [ ] Todos are isolated by organization (switching orgs shows different todos)
- [ ] Empty state shows when no todos

### Tamagotchi System
- [ ] Tamagotchi displays with correct color
- [ ] Feed button reduces hunger
- [ ] Feed counter increments
- [ ] Age progression works (egg → baby → child → adult)
- [ ] Evolution cycle resets at 50 feeds
- [ ] Different species show different sprites

### Data Isolation
- [ ] User A cannot see User B's todos
- [ ] User A cannot see User B's tamagotchi
- [ ] Organization members can see shared todos
- [ ] Organization members see shared tamagotchi

---

## Known Issues & Limitations

### Current Limitations
1. **No email verification** - Users can sign up without verifying email (set `requireEmailVerification: false` in auth.ts)
2. **No password reset** - Users cannot reset forgotten passwords
3. **Limited species sprites** - Only basic sprites implemented, not full 10 species × 4 ages = 40 sprites
4. **No happiness/waste implementation** - Database fields exist but no game logic
5. **No invitation system** - Cannot invite other users to organizations

### Security Considerations
1. RLS policies depend on `app.current_tenant_id` being set correctly by `createRLSClient`
2. Middleware must run on all protected routes
3. Session tokens should be stored securely (Better-Auth handles this)
4. API routes are public - Better-Auth handles authentication

### Future Improvements
1. Add Suspense boundaries for better loading UX
2. Add error boundaries for graceful error handling
3. Implement optimistic updates for snappier UI
4. Add keyboard shortcuts for todo management
5. Add tamagotchi animations
6. Implement happiness decay and waste accumulation
7. Add achievement system
8. Create 40 unique species sprites

---

## Summary

This plan completes Plan_Prompt_4 by:
- ✅ Creating Better-Auth API routes (required for auth to work)
- ✅ Connecting sign-in/sign-up pages to actual authentication
- ✅ Implementing route protection middleware
- ✅ Wiring TodoList to server actions and database
- ✅ Adding organization auto-creation on signup (default org created automatically)
- ✅ Fixing missing imports in server actions
- ✅ Providing comprehensive testing checklist

**Organization Management Approach:**
- All organization management happens through the existing AvatarMenu component
- Sign-up automatically creates a default organization for the user
- Users can switch organizations via the popover dropdown in AvatarMenu
- Users can create additional organizations via the "+ Add New Organization" option
- No separate onboarding page required - the UX is entirely self-contained in the AvatarMenu

**Estimated Implementation Time:** 2-3 hours

**Files to Create:**
- `app/api/auth/[...all]/route.ts`
- `middleware.ts`
- `app/page.hooks.ts`

**Files to Modify:**
- `app/(auth)/sign-in/page.tsx`
- `app/(auth)/sign-up/page.tsx`
- `app/(components)/TodoList.tsx`
- `app/page.actions.ts`
- `test.types.ts`

**After Implementation:**
- Run `npm run dev`
- Test complete user flow from signup → todo creation → tamagotchi interaction
- Verify organization management through AvatarMenu popover:
  - Switch between organizations
  - Create new organizations via "+ Add New Organization" option
  - Customize tamagotchi color per organization
- Verify data isolation between organizations
- Run test suite to ensure all test attributes work correctly

The application will be **fully functional** after completing the critical path (steps 1-8).

**Key UX Note:** Organization management is entirely contained within the AvatarMenu component - no separate pages or complex flows needed. Users interact with organizations via a simple popover dropdown with organization selection and a dialog for creating new organizations.
