import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  console.log("[update-onboarding-status] Starting update process");
  const supabase = createClient();
  
  try {
    // First make sure the has_completed_onboarding column exists
    console.log("[update-onboarding-status] Ensuring has_completed_onboarding column exists");
    const { error: columnError } = await supabase.rpc(
      "execute_sql",
      {
        query: `
          ALTER TABLE profiles 
          ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;
        `
      }
    );
    
    if (columnError) {
      console.error("[update-onboarding-status] Error ensuring column:", columnError);
      return NextResponse.json(
        { success: false, error: columnError.message },
        { status: 500 }
      );
    }
    
    // Update profiles where onboarding field is NULL but the profile has core fields filled
    console.log("[update-onboarding-status] Updating onboarding status based on profile data");
    const { data: updateResult, error: updateError } = await supabase.rpc(
      "execute_sql",
      {
        query: `
          UPDATE profiles
          SET has_completed_onboarding = true
          WHERE 
            (has_completed_onboarding IS NULL OR has_completed_onboarding = false)
            AND username IS NOT NULL 
            -- If the profile has first_name, or interests, consider it complete
            AND (
              first_name IS NOT NULL 
              OR interests IS NOT NULL AND array_length(interests, 1) > 0 
              OR bio IS NOT NULL
            )
          RETURNING id, username;
        `
      }
    );
    
    if (updateError) {
      console.error("[update-onboarding-status] Error updating profiles:", updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }
    
    const updatedCount = updateResult ? updateResult.length : 0;
    console.log(`[update-onboarding-status] Updated ${updatedCount} profile(s)`);
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} profile(s) with onboarding status`,
      updatedProfiles: updateResult
    });
    
  } catch (error) {
    console.error("[update-onboarding-status] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
} 