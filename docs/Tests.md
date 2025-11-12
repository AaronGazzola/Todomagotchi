# Tests

This document lists all test cases in the repository.

## Test Index

1. [Authentication Flow](#1-authentication-flow) - `npm run test:e2e:auth`

## Authentication Tests

### 1. Authentication Flow

**File:** `e2e/auth.spec.ts`

**Command:** `npm run test:e2e:auth`

**Description:** Tests the complete authentication flow including sign up, sign out, and sign in functionality.

**Pass Conditions:**
- User can successfully sign up with name, email, and password
- After sign up, user is redirected to home page (`/`)
- Avatar menu displays the user's email address
- User can successfully sign out
- After sign out, user is redirected to sign in page (`/sign-in`)
- User can successfully sign in with the same credentials
- After sign in, user is redirected to home page (`/`)
- Avatar menu is visible after successful sign in
