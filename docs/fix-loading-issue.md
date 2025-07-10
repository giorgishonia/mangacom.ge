# Fixing the Infinite Loading Issue

This document provides instructions for fixing the issue where the website gets stuck loading after login, though it works fine for anonymous users.

## Root Causes

The issue was caused by several factors:

1. **Avatar URL Handling**: The app was generating invalid URLs for avatars, causing 400 Bad Request errors.
2. **Row-Level Security (RLS) Issues**: Some tables didn't have proper RLS policies for anonymous access.
3. **Realtime Subscription Errors**: Unhandled errors in Supabase Realtime subscriptions.
4. **Authentication State Management**: The auth provider wasn't properly handling loading states.

## Applied Fixes

### 1. Avatar URL Handling

- Modified `getCurrentAvatarUrl` in `lib/auth-utils.ts` to stop generating potentially invalid URLs
- Updated `getSupabaseAvatarUrl` in `lib/comments.ts` to only generate URLs for public paths
- Added DiceBear as a fallback avatar service to ensure users always have an avatar

### 2. Row-Level Security (RLS)

- Created SQL scripts to add proper RLS policies for content, chapters, profiles, and comments tables
- Made the avatars bucket public in Supabase Storage

### 3. Realtime Subscription Error Handling

- Added try/catch blocks around channel.unsubscribe() calls in app-sidebar.tsx
- Fixed the channel state check to use channel.state !== 'joined'

### 4. Authentication State Management

- Added proper cleanup with isMounted flag in supabase-auth-provider.tsx
- Ensured isLoading state is always set to false even when errors occur
- Created a supabasePublic client for anonymous content reads

## Deployment Instructions

1. **Deploy Code Changes**: Deploy all the modified files to your production environment.

2. **Apply SQL Scripts**: Run the SQL script in `scripts/fix-rls-policies.sql` in your Supabase dashboard SQL editor.
   - This script will add the necessary RLS policies for anonymous access
   - It will also make the avatars bucket public if it exists

3. **Verify Changes**: Use the `/api/setup/check-access` endpoint to verify that anonymous access is working correctly.

4. **Clear Browser Caches**: Ask users to clear their browser caches or use incognito mode to test the changes.

## Testing

After applying these changes, test the following scenarios:

1. **Anonymous Access**: Ensure anonymous users can browse content without logging in.
2. **Login Flow**: Verify that users can log in without getting stuck in loading state.
3. **Avatar Display**: Check that avatars are displayed correctly for both anonymous and authenticated users.
4. **Content Access**: Confirm that content, chapters, and comments are accessible to all users.

## Troubleshooting

If issues persist:

1. Check browser console for errors
2. Verify that RLS policies are correctly applied in Supabase
3. Ensure the avatars bucket is public
4. Test with incognito mode to rule out caching issues 