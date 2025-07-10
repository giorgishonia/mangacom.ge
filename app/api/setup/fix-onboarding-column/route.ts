import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(request: NextRequest) {
  console.log("[fix-onboarding-column] Starting schema fix process");
  const supabase = createClient();
  
  try {
    // First check if the has_completed_onboarding column exists in the profiles table
    console.log("[fix-onboarding-column] Checking if has_completed_onboarding column exists");
    const { data: columnExists, error: columnCheckError } = await supabase.rpc(
      "execute_sql",
      {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'profiles' AND column_name = 'has_completed_onboarding'
        `
      }
    );
    
    if (columnCheckError) {
      console.error("[fix-onboarding-column] Error checking column:", columnCheckError);
      return NextResponse.json(
        { success: false, error: columnCheckError.message },
        { status: 500 }
      );
    }
    
    // If column doesn't exist, add it
    if (!columnExists || columnExists.length === 0) {
      console.log("[fix-onboarding-column] Column not found, adding has_completed_onboarding column");
      
      const { error: addColumnError } = await supabase.rpc(
        "execute_sql",
        {
          query: `
            ALTER TABLE profiles 
            ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;
          `
        }
      );
      
      if (addColumnError) {
        console.error("[fix-onboarding-column] Error adding column:", addColumnError);
        return NextResponse.json(
          { success: false, error: addColumnError.message },
          { status: 500 }
        );
      }
      
      console.log("[fix-onboarding-column] Column added successfully");
      
      // Force a schema cache refresh
      await supabase.rpc(
        "execute_sql",
        { query: "NOTIFY pgrst, 'reload schema';" }
      );
      
      return NextResponse.json({
        success: true,
        message: "has_completed_onboarding column added to profiles table"
      });
    }
    
    // Column already exists
    return NextResponse.json({
      success: true,
      message: "has_completed_onboarding column already exists in profiles table"
    });
    
  } catch (error) {
    console.error("[fix-onboarding-column] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
} 