# Plan Prompt 3: Backend Integration (Hooks and Actions)

Implement server actions and react-query hooks to connect UI components to the database.

## 1. Todo Actions

**File:** `app/page.actions.ts`

### getTodosAction

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

### createTodoAction

```typescript
export const createTodoAction = async (
  text: string
): Promise<ActionResponse<Todo>> => {
  try {
    const { db, session } = await getAuthenticatedClient();

    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    const todo = await db.todo.create({
      data: {
        text,
        userId: session.user.id,
      },
    });

    return getActionResponse({ data: todo });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

### updateTodoAction

```typescript
export const updateTodoAction = async (
  id: string,
  completed: boolean
): Promise<ActionResponse<Todo>> => {
  try {
    const { db } = await getAuthenticatedClient();

    const todo = await db.todo.update({
      where: { id },
      data: { completed },
    });

    return getActionResponse({ data: todo });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

### deleteTodoAction

```typescript
export const deleteTodoAction = async (
  id: string
): Promise<ActionResponse<void>> => {
  try {
    const { db } = await getAuthenticatedClient();

    await db.todo.delete({
      where: { id },
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

## 2. Tamagotchi Actions

**File:** `app/(components)/Tamagotchi.actions.ts`

### getTamagotchiAction

```typescript
"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { Tamagotchi } from "@prisma/client";

export const getTamagotchiAction = async (): Promise<
  ActionResponse<Tamagotchi>
> => {
  try {
    const { db, session } = await getAuthenticatedClient();

    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    const tamagotchi = await db.tamagotchi.findUnique({
      where: { userId: session.user.id },
    });

    if (!tamagotchi) {
      throw new Error("Tamagotchi not found");
    }

    return getActionResponse({ data: tamagotchi });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

### updateTamagotchiStatsAction

```typescript
export const updateTamagotchiStatsAction = async (
  updates: {
    hunger?: number;
    happiness?: number;
    wasteCount?: number;
    lastFedAt?: Date;
    lastCleanedAt?: Date;
    lastCheckedAt?: Date;
  }
): Promise<ActionResponse<Tamagotchi>> => {
  try {
    const { db, session } = await getAuthenticatedClient();

    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    const tamagotchi = await db.tamagotchi.update({
      where: { userId: session.user.id },
      data: updates,
    });

    return getActionResponse({ data: tamagotchi });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

## 3. Todo Hooks

**File:** `app/page.hooks.ts`

### useGetTodos

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
    staleTime: 1000 * 60,
  });
};
```

### useCreateTodo

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createTodoAction } from "./page.actions";

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
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      toast.success("Todo added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add todo");
    },
  });
};
```

### useUpdateTodo

```typescript
export const useUpdateTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await updateTodoAction(id, completed);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update todo");
    },
  });
};
```

### useDeleteTodo

```typescript
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

## 4. Tamagotchi Hooks

**File:** `app/(components)/Tamagotchi.hooks.ts`

### useGetTamagotchi

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { getTamagotchiAction } from "./Tamagotchi.actions";

export const useGetTamagotchi = () => {
  return useQuery({
    queryKey: ["tamagotchi"],
    queryFn: async () => {
      const { data, error } = await getTamagotchiAction();
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
};
```

### useUpdateTamagotchiStats

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTamagotchiStatsAction } from "./Tamagotchi.actions";

export const useUpdateTamagotchiStats = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      hunger?: number;
      happiness?: number;
      wasteCount?: number;
      lastFedAt?: Date;
      lastCleanedAt?: Date;
      lastCheckedAt?: Date;
    }) => {
      const { data, error } = await updateTamagotchiStatsAction(updates);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
    },
  });
};
```

## 5. Store Integration with Persistence

**File:** `app/page.stores.ts`

State management strategy:
- When signed out: todos and tamagotchi state persist in zustand store with localStorage
- When signed in: zustand store is populated from database via hooks
- Store provides fallback when database queries are loading

```typescript
import { Todo, Tamagotchi } from "@prisma/client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LocalTodo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface LocalTamagotchi {
  hunger: number;
  happiness: number;
  wasteCount: number;
  lastFedAt: string;
  lastCleanedAt: string;
  lastCheckedAt: string;
  createdAt: string;
}

interface PageState {
  localTodos: LocalTodo[];
  setLocalTodos: (todos: LocalTodo[]) => void;
  addLocalTodo: (text: string) => void;
  updateLocalTodo: (id: string, completed: boolean) => void;
  deleteLocalTodo: (id: string) => void;
  localTamagotchi: LocalTamagotchi;
  setLocalTamagotchi: (tamagotchi: LocalTamagotchi) => void;
  updateLocalTamagotchiStats: (updates: Partial<LocalTamagotchi>) => void;
  reset: () => void;
}

const defaultTamagotchi: LocalTamagotchi = {
  hunger: 50,
  happiness: 100,
  wasteCount: 0,
  lastFedAt: new Date().toISOString(),
  lastCleanedAt: new Date().toISOString(),
  lastCheckedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

const initialState = {
  localTodos: [],
  localTamagotchi: defaultTamagotchi,
};

export const usePageStore = create<PageState>()(
  persist(
    (set) => ({
      ...initialState,
      setLocalTodos: (todos) => set({ localTodos: todos }),
      addLocalTodo: (text) =>
        set((state) => ({
          localTodos: [
            {
              id: crypto.randomUUID(),
              text,
              completed: false,
              createdAt: new Date().toISOString(),
            },
            ...state.localTodos,
          ],
        })),
      updateLocalTodo: (id, completed) =>
        set((state) => ({
          localTodos: state.localTodos.map((todo) =>
            todo.id === id ? { ...todo, completed } : todo
          ),
        })),
      deleteLocalTodo: (id) =>
        set((state) => ({
          localTodos: state.localTodos.filter((todo) => todo.id !== id),
        })),
      setLocalTamagotchi: (tamagotchi) => set({ localTamagotchi: tamagotchi }),
      updateLocalTamagotchiStats: (updates) =>
        set((state) => ({
          localTamagotchi: { ...state.localTamagotchi, ...updates },
        })),
      reset: () => set(initialState),
    }),
    {
      name: "todomagotchi-storage",
    }
  )
);
```

## 6. Component Integration

### Update TodoList Component

**File:** `app/(components)/TodoList.tsx`

Replace mock state with conditional logic based on auth state:

```typescript
const session = useSession();
const isAuthenticated = !!session?.user;

const { data: dbTodos } = useGetTodos({ enabled: isAuthenticated });
const { mutate: createTodo } = useCreateTodo();
const { mutate: updateTodo } = useUpdateTodo();
const { mutate: deleteTodo } = useDeleteTodo();

const {
  localTodos,
  addLocalTodo,
  updateLocalTodo,
  deleteLocalTodo,
} = usePageStore();

const todos = isAuthenticated ? dbTodos || [] : localTodos;

const handleCreate = (text: string) => {
  if (isAuthenticated) {
    createTodo(text);
  } else {
    addLocalTodo(text);
  }
};

const handleUpdate = (id: string, completed: boolean) => {
  if (isAuthenticated) {
    updateTodo({ id, completed });
  } else {
    updateLocalTodo(id, completed);
  }
};

const handleDelete = (id: string) => {
  if (isAuthenticated) {
    deleteTodo(id);
  } else {
    deleteLocalTodo(id);
  }
};
```

### Update Tamagotchi Component

**File:** `app/(components)/Tamagotchi.tsx`

Replace mock state with conditional logic:

```typescript
const session = useSession();
const isAuthenticated = !!session?.user;

const { data: dbTamagotchi } = useGetTamagotchi({ enabled: isAuthenticated });
const { localTamagotchi } = usePageStore();

const tamagotchi = isAuthenticated ? dbTamagotchi : localTamagotchi;

const state = useMemo(() => {
  if (!tamagotchi) return "idle";
  if (tamagotchi.hunger > 80) return "hungry";
  if (tamagotchi.happiness > 80) return "happy";
  if (tamagotchi.happiness < 30) return "sad";
  return "idle";
}, [tamagotchi]);
```

## 7. Type Definitions

**File:** `app/page.types.ts`

Update with database types:

```typescript
import { Todo, Tamagotchi } from "@prisma/client";

export type { Todo, Tamagotchi };

export interface TamagotchiDisplayState {
  hunger: number;
  happiness: number;
  wasteCount: number;
  age: string;
  state: "idle" | "happy" | "sad" | "hungry";
}
```

## 8. Error Handling

All actions and hooks follow error pattern:
- Actions throw errors wrapped in `getActionResponse({ error })`
- Hooks catch errors and display toast notifications
- Query invalidation triggers after successful mutations

## 9. Authentication Integration

### Better-Auth Configuration

**File:** `lib/auth.ts`

Configure Better-Auth for email/password only:

```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
});
```

### Authentication Hooks

**File:** `app/(auth)/auth.hooks.ts`

```typescript
"use client";

import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth.client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const useSignUp = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const result = await authClient.signUp.email({
        email,
        password,
      });
      if (result.error) throw new Error(result.error.message);
      return result;
    },
    onSuccess: () => {
      toast.success("Account created successfully");
      router.push("/");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to sign up");
    },
  });
};

export const useSignIn = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const result = await authClient.signIn.email({
        email,
        password,
      });
      if (result.error) throw new Error(result.error.message);
      return result;
    },
    onSuccess: () => {
      toast.success("Signed in successfully");
      router.push("/");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to sign in");
    },
  });
};

export const useSignOut = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      toast.success("Signed out successfully");
      router.push("/sign-in");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to sign out");
    },
  });
};

export const useSession = () => {
  return authClient.useSession();
};
```

## Implementation Order

1. Configure Better-Auth with email/password only (no verification)
2. Create authentication pages (sign-in, sign-up)
3. Create authentication hooks
4. Create `page.actions.ts` with all todo actions
5. Create `Tamagotchi.actions.ts` with tamagotchi actions
6. Create `page.hooks.ts` with todo hooks
7. Create `Tamagotchi.hooks.ts` with tamagotchi hooks
8. Create `page.stores.ts` with zustand store (with persistence)
9. Update `TodoList.tsx` to use conditional logic (auth vs local)
10. Update `Tamagotchi.tsx` to use conditional logic (auth vs local)
11. Update `page.types.ts` with proper database types
12. Test CRUD operations work correctly for both auth and local state
13. Verify query invalidation triggers refetch for authenticated users
14. Verify localStorage persists state for unauthenticated users
