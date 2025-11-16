# Debug Logs Guide

This document explains how to use the diagnostic console logs added to debug home page display issues.

## How to Enable Logs

Add the following to your `.env.local` file:

```env
NEXT_PUBLIC_LOG_LABELS=all
```

Or enable specific log categories:

```env
NEXT_PUBLIC_LOG_LABELS=home-page,todos,tamagotchi,auth
```

## Log Categories Added

### 1. HOME_PAGE
**Location**: `app/page.tsx`

Logs the main home page state:
- `isLoading`: Whether data is loading
- `activeOrganizationId`: Current active organization ID
- `hasActiveOrganization`: Boolean check if organization exists

**What to check**: If `hasActiveOrganization` is `false`, content won't display.

### 2. AUTH
**Location**: `app/layout.hooks.tsx`

Logs user authentication and data fetching:
- Start of `getUserWithAllDataAction`
- Result with user, organizations, activeOrganizationId, activeTamagotchi
- Store updates confirmation

**What to check**:
- If `activeOrganizationId` is `null`, content won't display
- If `activeTamagotchi` is `null`, tamagotchi won't display
- Check if user has organizations

### 3. TODOS
**Location**: `app/page.hooks.ts` and `app/(components)/TodoList.tsx`

Logs todo data flow:
- Start of `getTodosAction`
- Result with todos array and count
- Store updates
- TodoList component renders with todos count

**What to check**:
- If todos array is empty or undefined
- If error occurred during fetch
- If store is being updated correctly

### 4. TAMAGOTCHI
**Location**: `app/(components)/Tamagotchi.hooks.ts` and `app/(components)/Tamagotchi.tsx`

Logs tamagotchi data flow:
- Start of `getTamagotchiAction` with activeOrganizationId
- Result with tamagotchi data
- Query state (isLoading, isFetching, isEnabled, hasData)
- Store updates
- Component renders with tamagotchi data

**What to check**:
- If `isEnabled` is `false` (query won't run without activeOrganizationId)
- If tamagotchi data is null
- If error occurred during fetch
- If store is being updated correctly

## Common Issues to Diagnose

### Issue 1: No content displays at all
**Check**:
1. HOME_PAGE logs - is `activeOrganizationId` present?
2. AUTH logs - is `getUserWithAllDataAction` returning data?
3. AUTH logs - is `activeOrganizationId` being set?

### Issue 2: TodoList displays but Tamagotchi doesn't
**Check**:
1. TAMAGOTCHI logs - is `isEnabled` true?
2. TAMAGOTCHI logs - is `getTamagotchiAction` being called?
3. TAMAGOTCHI logs - is tamagotchi data returned?
4. AUTH logs - is `activeTamagotchi` present in initial data?

### Issue 3: Tamagotchi displays but TodoList doesn't
**Check**:
1. TODOS logs - is `getTodosAction` being called?
2. TODOS logs - is data being returned?
3. TODOS logs - is the store being updated?
4. TODOS logs - what's the `todosCount` in TodoList render?

## Example Log Output

When everything works correctly, you should see logs like:

```json
{"message":"getUserWithAllDataAction - start"}
{"message":"getUserWithAllDataAction - result","hasData":true,"error":null,"user":{...},"organizations":[...],"activeOrganizationId":"abc123","activeTamagotchi":{...}}
{"message":"stores updated","activeOrganizationId":"abc123"}
{"isLoading":false,"activeOrganizationId":"abc123","hasActiveOrganization":true}
{"message":"getTodosAction - start"}
{"message":"getTamagotchiAction - start","activeOrganizationId":"abc123"}
```

## Disabling Logs

Set in `.env.local`:

```env
NEXT_PUBLIC_LOG_LABELS=none
```

Or remove the variable entirely.
