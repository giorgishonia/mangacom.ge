'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function activateVip(userId: string): Promise<{ success: boolean; error?: string; profile?: any }> {
  if (!userId) {
    return { success: false, error: 'User ID not provided.' };
  }
  const cookieStore = cookies();
  const supabase = createClient();
  console.log(`[VIP ACTION] Activating VIP for user ID: ${userId}`); // Log received userId

  try {
    // --- DEBUGGING START: Explicitly try to select the profile first ---
    const { data: debugProfile, error: debugError } = await supabase
      .from('profiles')
      .select('id, username, vip_status, has_completed_onboarding') // Select a few key fields
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle to handle null without erroring

    if (debugError) {
      console.error(`[VIP ACTION DEBUG] Error fetching profile directly before update for ${userId}:`, debugError.message);
      // Potentially return an error here if this debug select fails, as update will likely also fail
      // return { success: false, error: `Debug: Failed to pre-fetch profile - ${debugError.message}` };
    } else if (!debugProfile) {
      console.warn(`[VIP ACTION DEBUG] No profile found for user ID ${userId} with direct select before update.`);
    } else {
      console.log(`[VIP ACTION DEBUG] Profile found with direct select before update for ${userId}:`, debugProfile);
    }
    // --- DEBUGGING END ---

    if (debugProfile && debugProfile.vip_status === true) {
      console.log(`[VIP ACTION] VIP already active for user ${userId}.`);
      return { success: true, profile: debugProfile };
    }

    const { data: updatedProfiles, error: updateError } = await supabase
      .from('profiles')
      .update({
        vip_status: true,
        // vip_theme: 'purple', // optional default theme
      })
      .eq('id', userId)
      .select();

    if (updateError) {
      console.error(`[VIP ACTION] Error updating profile for VIP status for ${userId}:`, updateError);
      return { success: false, error: updateError.message };
    }

    // Supabase does not return an exact count here unless explicitly requested.
    // Rely on the returned data array to validate the update.
    if (!updatedProfiles || updatedProfiles.length === 0) {
      console.warn(`[VIP ACTION] No profile rows updated for user ID ${userId} with regular client – retrying with service role.`);

      // Retry with service-role client to bypass RLS (requires env SUPABASE_SERVICE_ROLE_KEY)
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } }
        );

        const { data: adminUpdated, error: adminError } = await admin
          .from('profiles')
          .update({ vip_status: true })
          .eq('id', userId)
          .select();

        if (adminError) {
          console.error(`[VIP ACTION] Admin update failed for ${userId}:`, adminError);
          return { success: false, error: adminError.message };
        }

        if (!adminUpdated || adminUpdated.length === 0) {
          console.error(`[VIP ACTION] Admin update affected 0 rows for ${userId}.`);
          return { success: false, error: 'VIP სტატუსის გააქტიურება ვერ მოხერხდა.' };
        }

        console.log(`[VIP ACTION] VIP status activated via admin client for ${userId}.`);
        revalidatePath('/profile');
        revalidatePath('/vip');
        return { success: true, profile: adminUpdated[0] };
      }

      // Service-role key not present
      return { success: false, error: 'VIP სტატუსის გააქტიურება ვერ მოხერხდა.' };
    }

    // If count > 0, the update was successful and updatedProfiles contains the updated record(s).
    // We expect only one profile to be updated.
    
    console.log(`[VIP ACTION] VIP status activated for ${userId}. Profile data:`, updatedProfiles[0]);
    // Revalidate paths to ensure UI updates across the app
    revalidatePath('/profile');
    revalidatePath('/vip');
    // Potentially revalidate other paths where VIP status is crucial

    return { success: true, profile: updatedProfiles[0] }; // Return the first (and expected to be only) updated profile

  } catch (e) {
    const error = e as Error;
    console.error(`[VIP ACTION] Unexpected error activating VIP for ${userId}:`, error);
    return { success: false, error: error.message || 'An unexpected error occurred while activating VIP.' };
  }
} 