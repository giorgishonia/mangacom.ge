Manga Reader Platform - Language Support Enhancement
Overview
This document outlines the enhancements made to support multiple languages (Georgian and English) in our manga reader platform. The implementation allows users to read manga in their preferred language without duplicating manga entries, keeping data lightweight and query-efficient.

Table of Contents
Database Enhancements

User Language Preference

Admin Workflow Updates

Chapter Fetching and Auto-Update

Reader UI Modifications

Comment System Updates

Performance Optimizations

User Features and UI Badges

Testing and Edge Cases

Database Enhancements
Step 1.1: Add language column to chapters table
What: Added language column (TEXT) with CHECK constraint ('ge' or 'en'), default 'ge', NOT NULL

Why: Distinguish GE (manual uploads) from EN (MangaDex) chapters under same content_id

How:

bash
curl.exe -X POST http://localhost:3000/api/setup/add-column -H "Content-Type: application/json" -d '{"table": "chapters", "column": "language", "dataType": "TEXT", "constraints": "DEFAULT \'ge\' CHECK (language IN (\'ge\', \'en\')) NOT NULL"}'
Added index: CREATE INDEX idx_chapters_language ON chapters(language);

Status: Completed ✅

Step 1.2: Add preferred_language column to profiles table
What: Added preferred_language column (TEXT) with default 'ge', CHECK ('ge' or 'en')

Why: Store user's language preference for comments and reader defaults

How:

bash
curl.exe -X POST http://localhost:3000/api/setup/add-column -H "Content-Type: application/json" -d '{"table": "profiles", "column": "preferred_language", "dataType": "TEXT", "constraints": "DEFAULT \'ge\' CHECK (preferred_language IN (\'ge\', \'en\'))"}'
Status: Completed ✅

Step 1.3: Add language column to comments table
What: Added language column (TEXT) with default 'ge', CHECK ('ge' or 'en'), NOT NULL

Why: Enable language-specific comments

How:

bash
curl.exe -X POST http://localhost:3000/api/setup/add-column -H "Content-Type: application/json" -d '{"table": "comments", "column": "language", "dataType": "TEXT", "constraints": "DEFAULT \'ge\' CHECK (language IN (\'ge\', \'en\')) NOT NULL"}'
Added index: CREATE INDEX idx_comments_language ON comments(language);

Status: Completed ✅

Step 1.4: Create server-side cache for MangaDex chapters
What: Created mangadex_chapter_cache table with columns:

mangadex_id (TEXT, FK to content.mangadex_id)

chapter_data (JSONB)

last_updated (TIMESTAMP)

expires_at (TIMESTAMP)

Why: Cache EN chapter metadata to reduce API calls and handle rate limits

How:

sql
CREATE TABLE mangadex_chapter_cache (
  id UUID PRIMARY KEY,
  mangadex_id TEXT REFERENCES content(mangadex_id),
  chapter_data JSONB,
  last_updated TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
Status: Completed ✅

User Language Preference
Step 2.1: Update Onboarding Page
What: Added language selector ("ქართული (GE)" / "English (EN)")

Why: Set initial user language preference

How: Modified app/onboarding/page.tsx to include language selection

Status: Working on 🔄

Step 2.2: Update Settings Page
What: Added language preference section

Why: Allow post-onboarding preference changes

How: Modified app/settings/page.tsx with debounced saves

Status: Pending

Step 2.3: Create usePreferredLanguage Hook
What: Hook to fetch user's preferred language

Why: Centralized access to language preference

How: Created hooks/use-preferred-language.ts

Status: Pending

Admin Workflow Updates
Step 3.1: Update Content Form
What: Added "Enable English" toggle and MangaDex ID input

Why: Control EN support per manga

How: Modified components/content-form.tsx

Status: Pending

Step 3.2: Update Chapter Form
What: Added language dropdown and conditional inputs

Why: Handle manual GE vs linked EN chapters

How: Modified components/admin/chapter-form.tsx

Status: Pending

Chapter Fetching and Auto-Update
Step 4.1: Modify getChapters Function
What: Fetch local + MangaDex chapters with cache check

Why: Unified chapter list with languages

How: Updated lib/content.ts to merge GE + EN chapters

Status: Pending

Step 4.2: Create Auto-Update Cron
What: Daily cache refresh for expired chapters

Why: Automatic EN chapter updates

How: Created supabase/functions/update-mangadex-cache.ts

Status: Pending

Reader UI Modifications
Step 5.1: Add Language Switcher
What: Language tabs in manga page and reader

Why: Easy language switching

How: Updated app/manga/[id]/page.tsx and components/manga-reader.tsx

Status: Pending

Step 5.2: Dynamic Page Loading for EN
What: Fetch EN pages from MangaDex on demand

Why: Handle remote English chapters

How: Extended reader to fetch pages when language='en'

Status: Pending

Comment System Updates
Step 6.1: Modify Comment Insertion
What: Set comment language to user's preference

Why: Language-specific comments

How: Updated components/comment-section.tsx

Status: Pending

Step 6.2: Filter Comments by Language
What: Fetch only relevant language comments

Why: Show users appropriate comments

How: Added language filter to comment queries

Status: Pending

Performance Optimizations
Step 7.1: Client-Side Chapter Caching
What: localStorage cache for chapter lists (1-hour expiry)

Why: Reduce frequent fetches

How: Implemented in getChapters function

Status: Pending

Step 7.2: Priority Server-Side Caching
What: Popular manga get cache priority

Why: Reduce API calls for high-traffic content

How: Added popularity metric to cache table

Status: Pending

User Features and UI Badges
Step 8.1: Availability Badges
What: "EN Available" badge on manga cards

Why: Indicate language options

How: Updated components/content-card.tsx

Status: Pending

Step 8.2: Cross-Navigation
What: "View EN Version" button

Why: Alternative navigation option

How: Conditional button in manga page

Status: Pending

Testing and Edge Cases
Step 9.1: Unit/Integration Tests
What: Test chapter merging, comment filtering, caching

Why: Ensure robustness

How: Added Jest tests in tests/

Status: Pending

Step 9.2: Handle Edge Cases
What: "EN not available" fallbacks

Why: Graceful degradation

How: Added UI conditionals and error handling

Status: Pending

Note: Implementation statuses reflect current progress (✅ = completed, 🔄 = in progress)