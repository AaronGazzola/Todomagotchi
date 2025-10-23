# Plan Prompt 1: UI Components and Layout

Build the frontend UI components without backend integration. All data should use mock state.

## 1. Authentication UI Component

**File:** `app/(components)/AvatarMenu.tsx`

- Create popover menu component in top-right corner
- Display user avatar (placeholder circle with initials) when signed in
- Display "Sign In" button when signed out
- Popover contains: user email, sign-out button
- Use Shadcn Popover and Avatar components
- Position: `fixed top-4 right-4 z-50`
- Mock user data: `{ name: "Demo User", email: "demo@example.com" }`

## 1.5. Authentication Pages

**Files:** `app/(auth)/sign-in/page.tsx` and `app/(auth)/sign-up/page.tsx`

### Sign In Page
- Email input field
- Password input field
- Submit button
- Link to sign-up page
- No email verification required

### Sign Up Page
- Email input field
- Password input field
- Confirm password input field
- Submit button
- Link to sign-in page
- No email verification required

## 2. Tamagotchi Component

**File:** `app/(components)/Tamagotchi.tsx`

Create animated Tamagotchi display with the following structure:

### Container Styling
- Border-radius with retro aesthetic
- Shadow for depth
- Background: gradient or solid color scheme
- Padding for inner content

### Stats Display
- Hunger bar (0-100%, visual indicator)
- Happiness bar (0-100%, visual indicator)
- Waste count (number display with icon)
- Age display (in hours/days)

### Animation Screen
- SVG or CSS-animated creature
- Animations: idle, happy, sad, hungry states
- Transitions between states based on stats
- Screen dimensions: square aspect ratio

### Mock State
```typescript
{
  hunger: 60,
  happiness: 75,
  wasteCount: 2,
  age: "3 days",
  state: "idle" | "happy" | "sad" | "hungry"
}
```

## 3. Todo List Component

**File:** `app/(components)/TodoList.tsx`

### Input Section
- Text input field (Shadcn Input)
- Add button (Shadcn Button)
- Input validation: minimum 1 character
- Clear input after adding

### Todo Items
- Checkbox for completion status
- Text display
- Delete button (icon button)
- Strikethrough styling when completed
- Hover state for interactivity

### Empty State
- Display message when no todos exist
- Icon or illustration
- Call-to-action text

### Mock State
```typescript
[
  { id: "1", text: "Complete project", completed: false },
  { id: "2", text: "Review code", completed: true }
]
```

## 4. Layout Implementation

**File:** `app/page.tsx`

### Mobile Layout (< 768px)
```
┌─────────────────┐
│   AvatarMenu    │
├─────────────────┤
│                 │
│   Tamagotchi    │
│                 │
├─────────────────┤
│                 │
│   Todo List     │
│                 │
└─────────────────┘
```

### Desktop Layout (≥ 768px)
```
┌──────────────────────────────┐
│           AvatarMenu         │
├──────────────────┬───────────┤
│                  │           │
│   Todo List      │ Tamagotchi│
│                  │           │
│                  │           │
└──────────────────┴───────────┘
```

### Responsive Classes
- Mobile: `flex flex-col gap-6`
- Desktop: `md:grid md:grid-cols-[1fr_400px] md:gap-8`
- Container: `max-w-7xl mx-auto px-4 py-8 md:py-12`

## 5. Type Definitions

**File:** `app/page.types.ts`

```typescript
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export interface TamagotchiState {
  hunger: number;
  happiness: number;
  wasteCount: number;
  age: string;
  state: "idle" | "happy" | "sad" | "hungry";
}
```

## 6. Component State Management

Use React useState for mock data:
- `const [todos, setTodos] = useState<Todo[]>(mockTodos)`
- `const [tamagotchi, setTamagotchi] = useState<TamagotchiState>(mockState)`

## 7. Styling Requirements

- TailwindCSS for all styling
- Shadcn components: Button, Input, Checkbox, Popover, Avatar
- Color scheme: cohesive palette (suggest primary, secondary, accent)
- Responsive breakpoint: 768px
- Animations: smooth transitions (transition-all duration-300)

## 8. Accessibility

- Proper ARIA labels on interactive elements
- Keyboard navigation support
- Focus states visible
- Semantic HTML structure

## Implementation Order

1. Create type definitions
2. Build AvatarMenu component
3. Build Tamagotchi component with mock animations
4. Build TodoList component with CRUD operations
5. Implement responsive layout in page.tsx
6. Test responsive behavior at 768px breakpoint
7. Add test data-attributes from `@/test.types.ts` enum
