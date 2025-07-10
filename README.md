# Manganime - Manga & Comics Platform

A modern manga and comics platform built with Next.js, Supabase, and Framer Motion.

## Features

- 🖼️ **Beautiful & Modern UI**: Clean, intuitive, and responsive design.
- 🚀 **Fast & Performant**: Optimized for speed and smooth user experience.
- 📚 **Custom Manga/Comics Library**: Manage your reading list, track progress, and discover new titles.
- 📖 **Integrated Reader**: Read manga and comics directly in the app.
- 💬 **Discussion & Comments**: Engage with other users by commenting on content.
- 🏆 **Emoji Reactions**: React to content with emojis.
- 🔍 **Advanced Search & Filtering**: Easily find manga and comics by title, genre, etc.
- 🌓 **Dark/Light Mode**: Switch between themes for comfortable reading.
- 👤 **User Authentication**: Secure user accounts with Supabase Auth.
- ⚙️ **Admin Dashboard**: Manage content, users, and site settings.
- 📱 **PWA Support**: Installable as a Progressive Web App.

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: Zustand, React Context/Hooks
- **Forms**: React Hook Form, Zod
- **UI Components**: Shadcn/ui
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Supabase account and project

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/manganime.git
    cd manganime
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root directory and add your Supabase project URL and anon key:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
    SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key # If needed for admin actions
    ```

4.  **Set up Supabase database:**
    - Go to your Supabase project dashboard.
    - Use the SQL Editor to run the schema definitions from `supabase/schema.sql` or apply migrations.
    - Ensure you have tables for `content`, `chapters`, `users`, `comments`, `watchlist`, etc.

5.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/manganime
├── app/                    # Next.js App Router (pages, layouts, API routes)
│   ├── (main)/             # Main app routes (e.g., home, manga, comics)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── comics/[id]/        # Comics detail pages
│   │   └── page.tsx
│   ├── manga/[id]/         # Manga detail pages
│   │   └── page.tsx
│   ├── admin/              # Admin dashboard pages
│   └── api/                # API routes
├── components/             # React components (UI, shared, specific)
│   ├── ui/                 # Shadcn/ui components
│   ├── admin/              # Admin-specific components
│   └── ...                 # Other components (e.g., reader, comment-section)
├── lib/                    # Helper functions, Supabase client, utilities
├── public/                 # Static assets (images, fonts, etc.)
│   ├── images/
│   └── stickers/
├── store/                  # Zustand stores (if any)
├── styles/                 # Global styles, Tailwind CSS config
├── supabase/               # Supabase schema, migrations, functions
│   ├── functions/
│   └── migrations/
├── types/                  # TypeScript type definitions
├── .env.local              # Environment variables (local)
├── next.config.js          # Next.js configuration
├── postcss.config.js       # PostCSS configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── README.md
```

## Admin Features

To access admin features, a user must have `is_admin` set to `true` in the `profiles` table (or your equivalent user metadata table) in Supabase.

### Adding Manga/Comics Content

1.  Log in as an admin user.
2.  Navigate to the admin dashboard (e.g., `/admin/content`).
3.  Add new manga or comics content with all required metadata (title, description, genres, chapters, etc.).
4.  Upload cover images and chapter pages.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature`).
6.  Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

*This README is a template and should be updated to reflect the actual state of the project.* 