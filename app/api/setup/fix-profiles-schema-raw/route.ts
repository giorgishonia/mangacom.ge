import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  console.log("[fix-profiles-schema-raw] Starting raw SQL schema fix process");
  const supabase = createClient();
  
  try {
    // 1. Check if the banner column exists
    console.log("[fix-profiles-schema-raw] Checking if banner column exists");
    const { data: columnCheck, error: columnCheckError } = await supabase.rpc(
      "execute_sql", 
      { 
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'banner';" 
      }
    );

    // If column already exists, return success
    if (!columnCheckError && Array.isArray(columnCheck) && columnCheck.length > 0) {
      console.log("[fix-profiles-schema-raw] Banner column already exists");
      return NextResponse.json(
        { 
          success: true, 
          message: "Banner column already exists", 
          step: "column_check",
          data: columnCheck
        },
        { status: 200 }
      );
    }

    if (columnCheckError) {
      console.error("[fix-profiles-schema-raw] Error checking for banner column:", columnCheckError);
      // Continue with the process, as this could be because the column doesn't exist
      console.log("[fix-profiles-schema-raw] Proceeding with column creation despite check error");
    }

    // 2. Add the banner column if it doesn't exist
    console.log("[fix-profiles-schema-raw] Adding banner column to profiles table");
    const { data: alterResult, error: alterError } = await supabase.rpc(
      "execute_sql", 
      { 
        query: "ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS banner TEXT DEFAULT '';" 
      }
    );

    if (alterError) {
      console.error("[fix-profiles-schema-raw] Error adding banner column:", alterError);
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to add banner column", 
          step: "add_column",
          error: alterError 
        },
        { status: 500 }
      );
    }

    // 3. Refresh the schema cache
    console.log("[fix-profiles-schema-raw] Refreshing schema cache");
    const { data: refreshResult, error: refreshError } = await supabase.rpc(
      "execute_sql", 
      { 
        query: "SELECT citus_update_table_statistics('profiles');" 
      }
    );

    if (refreshError) {
      console.error("[fix-profiles-schema-raw] Error refreshing schema cache:", refreshError);
      // Continue anyway as the column might still be usable
      console.log("[fix-profiles-schema-raw] Proceeding with verification despite refresh error");
    }

    // 4. Verify the column exists after operations
    console.log("[fix-profiles-schema-raw] Verifying banner column exists in schema");
    const { data: verifyData, error: verifyError } = await supabase.rpc(
      "execute_sql", 
      { 
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'banner';" 
      }
    );

    if (verifyError || !verifyData || !Array.isArray(verifyData) || verifyData.length === 0) {
      console.error("[fix-profiles-schema-raw] Banner column verification failed:", verifyError || "Column not found");
      return NextResponse.json(
        { 
          success: false, 
          message: "Banner column may have been added but verification failed", 
          step: "verify_column",
          error: verifyError || "Column not found in schema",
          refreshError: refreshError || null
        },
        { status: 500 }
      );
    }

    console.log("[fix-profiles-schema-raw] Schema fix completed successfully");
    return NextResponse.json(
      { 
        success: true, 
        message: "Banner column added to profiles table and schema cache refreshed",
        step: "complete",
        verifyData,
        refreshSuccess: !refreshError
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[fix-profiles-schema-raw] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Unexpected error occurred during raw schema fix", 
        error: errorMessage,
        stack: errorStack
      },
      { status: 500 }
    );
  }
} 