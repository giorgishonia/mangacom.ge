import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''

if (!url || !serviceKey) {
  console.error('Supabase admin env vars missing')
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  // Disable realtime subscriptions to prevent loop issues in production
  realtime: {
    params: {
      eventsPerSecond: 0 // Setting to 0 disables realtime subscriptions
    }
  }
}) 