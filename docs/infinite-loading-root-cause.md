# Infinite Loading in Production – Root Cause & Fix

This document explains **why** the app appears to be stuck in a permanent loading state in production and **how** to resolve it.

---

## What the UI is actually doing

1. When a logged-in reader turns a page, the **Manga-reader** component:
   - `upsert`s the current progress into the `reading_history` table so the session can be resumed later.
   - Fetches or posts user **comments** for the same chapter.
2. Both operations are simple REST calls made by the Supabase JS client:
   - `POST …/rest/v1/reading_history`
   - `POST …/rest/v1/comments`
3. The component awaits both promises before it leaves its React `<Suspense>` fallback.

---

## What is wrong in production

| Call | Problem | PostgREST response |
|------|---------|--------------------|
| `reading_history` | The table **does not exist** | **404 Not Found** |
| `comments`        | Table exists but **RLS / policies are incorrect** for the current user | **403 Forbidden** |

The Supabase client resolves these with `{ data: null, error: … }`, **but the surrounding React code expects a successful response**. Because the promise never resolves, the Suspense boundary never re-renders → the whole reader page looks “stuck loading…”.

---

## Why it only shows up after ~1 minute of browsing

• As long as you are browsing the catalogue, no `reading_history` call is made – everything feels normal.

• The first time you open a chapter, the initial **upsert** fails → the hook stalls → the UI stops progressing.

• Every retry piles up; if Realtime is enabled each failed insert also spawns subscription traffic, quickly exhausting DB CPU – but the **root cause remains the 404 / 403** above.

---

## The real fix (no front-end patch needed)

1. **Create the missing `reading_history` table** (schema identical to staging / dev).
2. **Add correct RLS policies** for both `reading_history` and `comments` so authenticated users can read & write.
3. Re-deploy / run the migration on the production Supabase project.

Once the REST endpoints return 200, the promises resolve instantly and the reader leaves its loading state as expected.

---

### TL;DR for teammates

Missing DB objects → REST **404 / 403** → unresolved promises → React Suspense never settles → "infinite loading". Deploy the migration and the problem disappears. 