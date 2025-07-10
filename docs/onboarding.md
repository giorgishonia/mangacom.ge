# User Onboarding Process

This document describes the user onboarding process in the Manganime application.

## Overview

When a new user signs up, they need to go through an onboarding process to complete their profile before they can fully use the application. The onboarding flow collects essential information and preferences.

## Technical Implementation

### Database Schema

The onboarding status is tracked in the user's profile with the `has_completed_onboarding` field:

```sql
-- In the profiles table
has_completed_onboarding BOOLEAN DEFAULT false
```

This field is set to `false` when a user initially signs up and is set to `true` when they complete the onboarding process.

### Onboarding Flow

1. **Signup**: When a user signs up (either via email/password or OAuth), a profile record is created with `has_completed_onboarding = false`.

2. **Redirect**: The auth provider checks this field when a user logs in. If it's `false`, the user is redirected to the onboarding page.

3. **Onboarding Form**: The onboarding form at `/onboarding` collects:
   - Basic information (first name, last name, username)
   - Interests (anime, manga)
   - Additional details (location, birth date)

4. **Completion**: Upon successful submission, the `completeOnboarding` function in `lib/users.ts` updates the user's profile and sets `has_completed_onboarding = true`.

### Automatic Redirection

The `SupabaseAuthProvider` component contains logic to check if a user has completed onboarding. If not, they are redirected to the onboarding page when attempting to access protected areas of the site.

### Maintenance Operations

There are several maintenance operations that ensure the onboarding process works correctly:

1. **Schema Validation**: The system checks that the `has_completed_onboarding` column exists in the profiles table.

2. **Auto-Updates**: Users who have filled in profile information but don't have the `has_completed_onboarding` field set are automatically updated to `has_completed_onboarding = true`.

## Debugging Onboarding Issues

If a user is stuck in the onboarding flow:

1. Check the user's profile in the Supabase database to ensure `has_completed_onboarding` is set correctly.

2. Verify that the user has a valid profile record with their user ID.

3. If necessary, run the maintenance API endpoint to fix database schema issues:
   ```
   GET /api/setup/maintenance
   ```

4. To manually mark a user as having completed onboarding, you can run this SQL:
   ```sql
   UPDATE profiles 
   SET has_completed_onboarding = true 
   WHERE id = 'user-uuid-here';
   ```

## Code References

- **Onboarding Page**: `app/onboarding/page.tsx`
- **Auth Provider**: `components/supabase-auth-provider.tsx`
- **User Functions**: `lib/users.ts` (specifically `completeOnboarding`)
- **Schema Maintenance**: `app/api/setup/maintenance/route.ts` 