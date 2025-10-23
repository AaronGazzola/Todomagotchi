# Plan Prompt 4: Tamagotchi Logic and Automation

Implement the automatic stat decay system and todo-triggered actions for the Tamagotchi.

## 1. Stat Calculation Utility

**File:** `lib/tamagotchi.utils.ts`

### calculateStatDecay

Calculate time-based stat changes:

```typescript
import { Tamagotchi } from "@prisma/client";

const HUNGER_INCREASE_PER_MINUTE = 10;
const HAPPINESS_DECREASE_PER_MINUTE = 5;
const WASTE_INCREASE_PER_2_MINUTES = 1;

export function calculateStatDecay(tamagotchi: Tamagotchi): {
  hunger: number;
  happiness: number;
  wasteCount: number;
} {
  const now = new Date();
  const lastChecked = new Date(tamagotchi.lastCheckedAt);
  const minutesSinceCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60);

  const hungerIncrease = Math.floor(minutesSinceCheck * HUNGER_INCREASE_PER_MINUTE);
  const happinessDecrease = Math.floor(minutesSinceCheck * HAPPINESS_DECREASE_PER_MINUTE);
  const wasteIncrease = Math.floor(minutesSinceCheck / 2) * WASTE_INCREASE_PER_2_MINUTES;

  return {
    hunger: Math.min(100, tamagotchi.hunger + hungerIncrease),
    happiness: Math.max(0, tamagotchi.happiness - happinessDecrease),
    wasteCount: tamagotchi.wasteCount + wasteIncrease,
  };
}
```

### feedTamagotchi

Reduce hunger and increase happiness:

```typescript
const FEED_HUNGER_REDUCTION = 20;
const FEED_HAPPINESS_INCREASE = 10;

export function feedTamagotchi(currentStats: {
  hunger: number;
  happiness: number;
}): {
  hunger: number;
  happiness: number;
  lastFedAt: Date;
} {
  return {
    hunger: Math.max(0, currentStats.hunger - FEED_HUNGER_REDUCTION),
    happiness: Math.min(100, currentStats.happiness + FEED_HAPPINESS_INCREASE),
    lastFedAt: new Date(),
  };
}
```

### cleanTamagotchi

Remove waste and increase happiness:

```typescript
const CLEAN_HAPPINESS_INCREASE = 15;

export function cleanTamagotchi(currentStats: {
  wasteCount: number;
  happiness: number;
}): {
  wasteCount: number;
  happiness: number;
  lastCleanedAt: Date;
} {
  const happinessBonus = currentStats.wasteCount > 0 ? CLEAN_HAPPINESS_INCREASE : 0;

  return {
    wasteCount: 0,
    happiness: Math.min(100, currentStats.happiness + happinessBonus),
    lastCleanedAt: new Date(),
  };
}
```

### calculateAge

Convert createdAt to human-readable age:

```typescript
export function calculateAge(createdAt: Date): string {
  const now = new Date();
  const ageInMs = now.getTime() - createdAt.getTime();
  const ageInHours = Math.floor(ageInMs / (1000 * 60 * 60));
  const ageInDays = Math.floor(ageInHours / 24);

  if (ageInDays > 0) {
    return `${ageInDays} day${ageInDays !== 1 ? "s" : ""}`;
  }
  return `${ageInHours} hour${ageInHours !== 1 ? "s" : ""}`;
}
```

## 2. Auto-Update Action

**File:** `app/(components)/Tamagotchi.actions.ts`

Add new action:

### updateTamagotchiWithDecayAction

```typescript
export const updateTamagotchiWithDecayAction = async (): Promise<
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

    const decayedStats = calculateStatDecay(tamagotchi);

    const updated = await db.tamagotchi.update({
      where: { userId: session.user.id },
      data: {
        hunger: decayedStats.hunger,
        happiness: decayedStats.happiness,
        wasteCount: decayedStats.wasteCount,
        lastCheckedAt: new Date(),
      },
    });

    return getActionResponse({ data: updated });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

### feedTamagotchiAction

```typescript
export const feedTamagotchiAction = async (): Promise<
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

    const decayedStats = calculateStatDecay(tamagotchi);
    const fedStats = feedTamagotchi(decayedStats);

    const updated = await db.tamagotchi.update({
      where: { userId: session.user.id },
      data: {
        ...fedStats,
        lastCheckedAt: new Date(),
      },
    });

    return getActionResponse({ data: updated });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

### cleanTamagotchiAction

```typescript
export const cleanTamagotchiAction = async (): Promise<
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

    const decayedStats = calculateStatDecay(tamagotchi);
    const cleanedStats = cleanTamagotchi(decayedStats);

    const updated = await db.tamagotchi.update({
      where: { userId: session.user.id },
      data: {
        ...cleanedStats,
        lastCheckedAt: new Date(),
      },
    });

    return getActionResponse({ data: updated });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

## 3. Todo Action Integration

**File:** `app/page.hooks.ts`

Modify existing hooks to trigger tamagotchi actions (database) OR update local state:

### Update useCreateTodo

```typescript
import { feedTamagotchiAction } from "./(components)/Tamagotchi.actions";
import { feedTamagotchi } from "@/lib/tamagotchi.utils";
import { usePageStore } from "./page.stores";
import { useSession } from "./(auth)/auth.hooks";

export const useCreateTodo = () => {
  const queryClient = useQueryClient();
  const session = useSession();
  const isAuthenticated = !!session?.user;
  const { localTamagotchi, updateLocalTamagotchiStats } = usePageStore();

  return useMutation({
    mutationFn: async (text: string) => {
      if (isAuthenticated) {
        const { data, error } = await createTodoAction(text);
        if (error) throw new Error(error);
        await feedTamagotchiAction();
        return data;
      } else {
        const fedStats = feedTamagotchi({
          hunger: localTamagotchi.hunger,
          happiness: localTamagotchi.happiness,
        });
        updateLocalTamagotchiStats(fedStats);
        return null;
      }
    },
    onSuccess: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["todos"] });
        queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      }
      toast.success("Todo added - Tamagotchi fed!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add todo");
    },
  });
};
```

### Update useUpdateTodo

```typescript
import { cleanTamagotchiAction } from "./(components)/Tamagotchi.actions";
import { cleanTamagotchi } from "@/lib/tamagotchi.utils";
import { usePageStore } from "./page.stores";
import { useSession } from "./(auth)/auth.hooks";

export const useUpdateTodo = () => {
  const queryClient = useQueryClient();
  const session = useSession();
  const isAuthenticated = !!session?.user;
  const { localTamagotchi, updateLocalTamagotchiStats } = usePageStore();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      if (isAuthenticated) {
        const { data, error } = await updateTodoAction(id, completed);
        if (error) throw new Error(error);

        if (completed) {
          await cleanTamagotchiAction();
        }

        return data;
      } else {
        if (completed) {
          const cleanedStats = cleanTamagotchi({
            wasteCount: localTamagotchi.wasteCount,
            happiness: localTamagotchi.happiness,
          });
          updateLocalTamagotchiStats(cleanedStats);
        }
        return null;
      }
    },
    onSuccess: (_, variables) => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["todos"] });
        queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      }
      if (variables.completed) {
        toast.success("Todo completed - Waste cleaned!");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update todo");
    },
  });
};
```

## 4. Auto-Decay Hook

**File:** `app/(components)/Tamagotchi.hooks.ts`

Add hook to trigger decay calculation (database OR local):

### useAutoUpdateTamagotchi

```typescript
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTamagotchiWithDecayAction } from "./Tamagotchi.actions";
import { calculateStatDecay } from "@/lib/tamagotchi.utils";
import { usePageStore } from "../page.stores";
import { useSession } from "../(auth)/auth.hooks";

export const useAutoUpdateTamagotchi = () => {
  const queryClient = useQueryClient();
  const session = useSession();
  const isAuthenticated = !!session?.user;
  const { localTamagotchi, updateLocalTamagotchiStats } = usePageStore();

  const { mutate: updateWithDecay } = useMutation({
    mutationFn: async () => {
      if (isAuthenticated) {
        const { data, error } = await updateTamagotchiWithDecayAction();
        if (error) throw new Error(error);
        return data;
      } else {
        const decayedStats = calculateStatDecay({
          ...localTamagotchi,
          lastCheckedAt: new Date(localTamagotchi.lastCheckedAt),
          lastFedAt: new Date(localTamagotchi.lastFedAt),
          lastCleanedAt: new Date(localTamagotchi.lastCleanedAt),
          createdAt: new Date(localTamagotchi.createdAt),
          id: "local",
          userId: "local",
          updatedAt: new Date(),
        });
        updateLocalTamagotchiStats({
          ...decayedStats,
          lastCheckedAt: new Date().toISOString(),
        });
        return null;
      }
    },
    onSuccess: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      }
    },
  });

  useEffect(() => {
    updateWithDecay();

    const interval = setInterval(() => {
      updateWithDecay();
    }, 60000);

    return () => clearInterval(interval);
  }, [updateWithDecay]);
};
```

## 5. Tamagotchi Component Updates

**File:** `app/(components)/Tamagotchi.tsx`

### Add auto-update hook

```typescript
import { useGetTamagotchi, useAutoUpdateTamagotchi } from "./Tamagotchi.hooks";
import { calculateAge } from "@/lib/tamagotchi.utils";

export function Tamagotchi() {
  const { data: tamagotchi } = useGetTamagotchi();
  useAutoUpdateTamagotchi();

  const age = tamagotchi ? calculateAge(new Date(tamagotchi.createdAt)) : "0 hours";

  const state = useMemo(() => {
    if (!tamagotchi) return "idle";
    if (tamagotchi.hunger > 80) return "hungry";
    if (tamagotchi.happiness > 80) return "happy";
    if (tamagotchi.happiness < 30) return "sad";
    return "idle";
  }, [tamagotchi]);
}
```

### Display computed values

```typescript
<div>
  <StatBar label="Hunger" value={tamagotchi?.hunger || 0} />
  <StatBar label="Happiness" value={tamagotchi?.happiness || 0} />
  <div>Waste: {tamagotchi?.wasteCount || 0}</div>
  <div>Age: {age}</div>
</div>
```

## 6. Animation State Logic

**File:** `app/(components)/Tamagotchi.tsx`

Add animation classes based on state:

```typescript
const animationClass = useMemo(() => {
  switch (state) {
    case "hungry":
      return "animate-bounce";
    case "happy":
      return "animate-pulse";
    case "sad":
      return "animate-none opacity-75";
    default:
      return "animate-none";
  }
}, [state]);
```

Apply to creature element:

```typescript
<div className={cn("tamagotchi-creature", animationClass)}>
</div>
```

## 7. Environment Configuration

**File:** `.env.local`

Add configurable constants:

```env
NEXT_PUBLIC_TAMAGOTCHI_UPDATE_INTERVAL=60000
NEXT_PUBLIC_HUNGER_INCREASE_PER_MINUTE=10
NEXT_PUBLIC_HAPPINESS_DECREASE_PER_MINUTE=5
NEXT_PUBLIC_WASTE_INCREASE_PER_2_MINUTES=1
```

Update `tamagotchi.utils.ts` to use env vars.

## 8. Death State (Optional Enhancement)

Add logic to handle "death" when stats are critical:

```typescript
export function checkTamagotchiHealth(tamagotchi: {
  hunger: number;
  happiness: number;
}): boolean {
  return tamagotchi.hunger < 100 && tamagotchi.happiness > 0;
}
```

Add `isDead` field to schema if implementing death state.

## 9. Clean Up Mock Data

Remove all placeholder/mock data from Plan Prompt 1:

### Remove from page.tsx

Delete any mock state initialization:

```typescript
const mockTodos = [
  { id: "1", text: "Complete project", completed: false },
  { id: "2", text: "Review code", completed: true }
];

const mockState = {
  hunger: 60,
  happiness: 75,
  wasteCount: 2,
  age: "3 days",
  state: "idle"
};
```

### Remove from TodoList.tsx

Delete mock useState if present:

```typescript
const [todos, setTodos] = useState<Todo[]>(mockTodos);
```

### Remove from Tamagotchi.tsx

Delete mock useState if present:

```typescript
const [tamagotchi, setTamagotchi] = useState<TamagotchiState>(mockState);
```

### Remove from AvatarMenu.tsx

Delete mock user data:

```typescript
const mockUser = { name: "Demo User", email: "demo@example.com" };
```

Replace with Better-Auth session hook or passed user prop.

## Implementation Order

1. Create `lib/tamagotchi.utils.ts` with all utility functions
2. Add `updateTamagotchiWithDecayAction` to `Tamagotchi.actions.ts`
3. Add `feedTamagotchiAction` and `cleanTamagotchiAction`
4. Create `useAutoUpdateTamagotchi` hook
5. Update `useCreateTodo` to call `feedTamagotchiAction`
6. Update `useUpdateTodo` to call `cleanTamagotchiAction` on completion
7. Update `Tamagotchi.tsx` to use auto-update hook
8. Add age calculation display
9. Implement animation state logic
10. Remove all mock data from components (step 9 above)
11. Verify all components use real database data
12. Test full cycle: add todo → feed, complete todo → clean, wait → decay
