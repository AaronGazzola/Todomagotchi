# Data Fetching Strategy

This document outlines the optimal data fetching strategy for React applications using React Query (TanStack Query) and Zustand for state management.

## Core Principles

1. **Parallel Fetching on Mount** - Fire all independent queries simultaneously for fastest initial load
2. **Granular Cache Invalidation** - Refetch only what changed, not entire page
3. **Centralized State** - Store data in Zustand for global access
4. **React Query Manages Lifecycle** - Loading, error, caching, and deduplication handled by React Query
5. **Component Isolation** - Each component accesses only its data slice

## Architecture Pattern

### 1. Individual Query Hooks

Each data requirement has its own hook that:

- Fetches data via React Query
- Updates the corresponding Zustand store on success
- Returns loading/error states

```typescript
export const useGetItems = () => {
  const setItems = useStore((state) => state.setItems);

  return useQuery({
    queryKey: ["items"],
    queryFn: () => getItemsAction(),
    onSuccess: (data) => setItems(data),
    staleTime: 1000 * 60 * 5,
  });
};
```

### 2. Composite Page Hook

A single hook that fires all page queries in parallel:

```typescript
export const usePageData = () => {
  const items = useGetItems();
  const metrics = useGetMetrics();
  const categories = useGetCategories();

  return {
    isLoading: items.isLoading || metrics.isLoading || categories.isLoading,
    isFetching: items.isFetching || metrics.isFetching || categories.isFetching,
    error: items.error || metrics.error || categories.error,
  };
};
```

### 3. Component Usage

Components call the composite hook and read from store:

```typescript
const PageComponent = () => {
  const { isLoading } = usePageData();

  const items = useStore((state) => state.items);
  const metrics = useStore((state) => state.metrics);

  if (isLoading) return <Skeleton />;

  return (
    <div>
      <MetricsCard data={metrics} />
      <ItemsList items={items} />
    </div>
  );
};
```

### 4. Granular Refetching

Individual queries can be invalidated independently:

```typescript
const { mutate: createItem } = useMutation({
  mutationFn: createItemAction,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["items"] });
  },
});
```

Only the `useGetItems` hook refetches. Other data (metrics, categories) remains cached.

## Store Pattern

### Store Definition

```typescript
import { create } from "zustand";

interface DataStore {
  items: Item[] | null;
  metrics: Metrics | null;
  categories: Category[] | null;
  setItems: (items: Item[]) => void;
  setMetrics: (metrics: Metrics) => void;
  setCategories: (categories: Category[]) => void;
  reset: () => void;
}

const initialState = {
  items: null,
  metrics: null,
  categories: null,
};

export const useDataStore = create<DataStore>()((set) => ({
  ...initialState,
  setItems: (items) => set({ items }),
  setMetrics: (metrics) => set({ metrics }),
  setCategories: (categories) => set({ categories }),
  reset: () => set(initialState),
}));
```

## Benefits of This Approach

### Fast Initial Load

React Query automatically runs all queries in parallel when hooks are called together. No serial waterfalls.

```typescript
const { isLoading } = usePageData();
```

This fires all queries at once, not sequentially.

### Optimal Refetching

When data changes, invalidate only the affected query:

```typescript
queryClient.invalidateQueries({ queryKey: ["items"] });
```

Other cached data (metrics, categories) is not refetched unnecessarily.

### Centralized Data Access

Any component can access data without prop drilling:

```typescript
const items = useDataStore((state) => state.items);
```

### Automatic Optimizations

React Query provides:

- Request deduplication
- Background refetching
- Cache management
- Retry logic
- Stale-while-revalidate

## Advanced Patterns

### Conditional Queries

Queries can be disabled until dependencies are ready:

```typescript
export const useGetDetails = (itemId: string | null) => {
  const { setDetails } = useDataStore();
  const enabled = !!itemId;

  return useQuery({
    queryKey: ["details", itemId],
    queryFn: () => getDetailsAction(itemId!),
    onSuccess: (data) => setDetails(data),
    enabled,
  });
};
```

### Dependent Queries

Chain queries when one depends on another:

```typescript
const { data: user } = useGetUser();
const { data: profile } = useGetProfile(user?.id);
```

The profile query waits until user ID is available.

### Paginated Data

Store includes pagination metadata:

```typescript
interface DataStore {
  items: Item[] | null;
  totalCount: number;
  totalPages: number;
  setItems: (items: Item[], totalCount: number, totalPages: number) => void;
}
```

### Query Parameters

Include dynamic parameters in query keys:

```typescript
export const useGetItems = (params: GetItemsParams) => {
  const { setItems } = useDataStore();

  return useQuery({
    queryKey: ["items", params],
    queryFn: () => getItemsAction(params),
    onSuccess: (data) => setItems(data.items, data.totalCount, data.totalPages),
  });
};
```

React Query automatically refetches when params change.

## Anti-Patterns to Avoid

### Don't Fetch Serially

```typescript
const { data: user } = useGetUser();

useEffect(() => {
  if (user) {
    fetchMetrics();
  }
}, [user]);
```

Unless metrics truly depends on user, fetch in parallel.

### Don't Duplicate State

```typescript
const [items, setItems] = useState([]);

useQuery({
  onSuccess: (data) => setItems(data),
});
```

Use Zustand store instead of local state for shared data.

### Don't Over-Invalidate

```typescript
queryClient.invalidateQueries();
```

This refetches everything. Be specific:

```typescript
queryClient.invalidateQueries({ queryKey: ["items"] });
```

### Don't Skip the Store

```typescript
const { data: items } = useGetItems();
```

If multiple components need this data, put it in the store.

## Summary

This strategy provides:

- **Fast**: Parallel fetching minimizes initial load time
- **Efficient**: Granular refetching reduces unnecessary network requests
- **Scalable**: Easy to add new data requirements
- **Maintainable**: Clear separation between fetching and state management
- **Optimized**: React Query handles caching, deduplication, and lifecycle

By combining React Query for data fetching with Zustand for state management, you get the best of both worlds: sophisticated caching with centralized, accessible state.
