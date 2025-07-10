## Project Manganime: Implementation Details & Roadmap

This document outlines the technical implementation details, choices made, and a potential roadmap for the Manganime (Manga & Comics) platform.

### Core Features & Implementation Notes:

1.  **Content Display (Manga & Comics):**
    *   Detail pages for individual manga/comics series.
    *   Display metadata: title, cover, banner, description, genres, status, release year, rating, chapters.
    *   Chapter lists with navigation.
    *   **Tech:** Next.js (App Router), Supabase for data, TailwindCSS for styling.

2.  **Manga/Comics Reader:**
    *   Page-by-page reading experience.
    *   Zoom, fit-to-width, full-screen options.
    *   Navigation between chapters.
    *   Progress tracking (current page, last read chapter).
    *   **Tech:** Custom React component, potentially using libraries for image handling/gestures.

3.  **User Library & Progress:**
    *   Users can add manga/comics to their library with statuses (Reading, Completed, Plan to Read, On Hold, Dropped).
    *   Track chapters read for each series.
    *   Display overall progress.
    *   **Tech:** Supabase for storing library items and progress, localStorage for optimistic updates/offline fallback.

4.  **Search & Discovery:**
    *   Search by title.
    *   Filter by genre, status.
    *   Sort by popularity, rating, latest update.
    *   Recommendations (e.g., "related content").
    *   **Tech:** Supabase for querying, potentially a more advanced search solution if needed (e.g., Algolia, Typesense) for larger datasets.

5.  **Comments & Reactions:**
    *   Users can comment on manga/comics and individual chapters.
    *   Emoji reactions on content.
    *   **Tech:** Supabase for storing comments/reactions.

### UI/UX Considerations:

*   **Responsive Design:** Mobile-first approach, ensuring usability across all screen sizes.
*   **Performance:** Optimized image loading (Next/Image), lazy loading, code splitting.
*   **Accessibility:** Semantic HTML, ARIA attributes, keyboard navigation.
*   **Theming:** Dark mode as default, potentially a light mode toggle.

### Potential Future Enhancements (Roadmap):

*   **Advanced Recommendations:** ML-based or collaborative filtering.
*   **Social Features:** User profiles, following users, activity feeds.
*   **Offline Reading:** PWA capabilities for downloading chapters.
*   **More Granular Progress:** Page-level progress within chapters.
*   **Community Features:** Forums, user-created lists.
*   **Notifications:** New chapter releases for subscribed series.
*   **Localization/i18n:** Support for multiple languages.
*   **Enhanced Admin Panel:** More detailed analytics, user management tools.
*   **Ads Integration (Optional):** If monetization is a goal, explore ad zones (e.g., header, sidebar, between reader pages).

### Removed Features (Previously Considered):

*   **Anime Streaming:** Video player, episode lists, anime-specific metadata (this has been explicitly removed from the project scope).

---
This is a living document and will be updated as the project evolves.