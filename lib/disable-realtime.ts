import { supabase } from './supabase';

/**
 * Temporarily disables Realtime subscriptions for the current page
 * Use this on pages where real-time updates are not needed
 * to reduce server load and improve performance
 */
export function disableRealtimeForCurrentPage(): void {
  try {
    // Disconnect all existing channels
    supabase.removeAllChannels();
    
    // Disable realtime for this page session
    (supabase as any).realtime.setConfig({
      enabled: false
    });
    
    console.log('Realtime disabled for current page');
  } catch (err) {
    console.error('Error disabling Realtime:', err);
  }
}

/**
 * Re-enables Realtime subscriptions
 * Call this when navigating to pages that need real-time updates
 */
export function enableRealtime(): void {
  try {
    // Re-enable realtime
    (supabase as any).realtime.setConfig({
      enabled: true
    });
    
    console.log('Realtime re-enabled');
  } catch (err) {
    console.error('Error enabling Realtime:', err);
  }
} 