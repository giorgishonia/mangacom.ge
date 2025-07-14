// Re-export the primary singleton Supabase client used app-wide.
// This avoids instantiating multiple GoTrueClient instances in the browser.

import { supabase } from '@/lib/supabase';

// For backwards compatibility we keep the same helper but make sure it always
// returns the shared instance instead of allocating a new one.
export function createClient() {
  return supabase;
} 