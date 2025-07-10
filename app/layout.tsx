import './globals.css'
import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { NextAuthProvider } from '@/providers/auth-provider'
import { SupabaseAuthProvider } from '@/components/supabase-auth-provider'
import { UnifiedAuthProvider } from '@/components/unified-auth-provider'
import { MaintenanceRunner } from '@/components/maintenance-runner'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
})

// Initialize SQL functions asynchronously
const initializeSQLFunctions = async () => {
  try {
    console.log("Initializing SQL helper functions...")
    const response = await fetch('/api/setup/create-sql-functions')
    const result = await response.json()
    
    if (result.success) {
      console.log("SQL functions initialized successfully")
    } else {
      console.error("Failed to initialize SQL functions:", result.message)
    }
  } catch (error) {
    console.error("Error initializing SQL functions:", error)
  }
}

// Don't wait for this to complete - run in background
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setTimeout(() => {
    initializeSQLFunctions()
  }, 2000) // Delay by 2 seconds to let the app start first
}

// Optimize Supabase Realtime usage
// This helps reduce the load on the database by limiting Realtime subscriptions
if (typeof window !== 'undefined') {
  // Check if this is a static page that doesn't need real-time updates
  const staticPages = [
    '/login', 
    '/signup', 
    '/onboarding',
    '/settings',
    '/profile'
  ];
  
  const currentPath = window.location.pathname;
  const isStaticPage = staticPages.some(page => currentPath.startsWith(page));
  
  // Import is inside the condition to prevent server-side execution
  if (isStaticPage) {
    import('@/lib/disable-realtime').then(module => {
      module.disableRealtimeForCurrentPage();
    });
  }
}

export const metadata: Metadata = {
  title: 'manganime',
  description: 'Explore anime and manga content',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" href="/images/manganimelogo.png" type="image/png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <NextAuthProvider>
          <SupabaseAuthProvider>
            <UnifiedAuthProvider>
              <MaintenanceRunner />
              {children}
              <Toaster richColors position="top-right" theme="dark" />
            </UnifiedAuthProvider>
          </SupabaseAuthProvider>
        </NextAuthProvider>
      </body>
    </html>
  )
}
