import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  console.log("[fix-display-name-schema] Starting schema fix process");
  const supabase = createClient();
  
  try {
    // 1. Check if the display_name column exists
    console.log("[fix-display-name-schema] Checking if display_name column exists");
    const { data: columnCheck, error: columnCheckError } = await supabase.rpc(
      "execute_sql", 
      { 
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name';" 
      }
    );

    // If column already exists, return success
    if (!columnCheckError && Array.isArray(columnCheck) && columnCheck.length > 0) {
      console.log("[fix-display-name-schema] display_name column already exists");
      return NextResponse.json(
        { 
          success: true, 
          message: "display_name column already exists", 
          step: "column_check",
          data: columnCheck
        },
        { status: 200 }
      );
    }

    if (columnCheckError) {
      console.error("[fix-display-name-schema] Error checking for display_name column:", columnCheckError);
      // Continue with the process, as this could be because the column doesn't exist
      console.log("[fix-display-name-schema] Proceeding with column creation despite check error");
    }

    // 2. Add the display_name column if it doesn't exist
    console.log("[fix-display-name-schema] Adding display_name column to profiles table");
    const { data: alterResult, error: alterError } = await supabase.rpc(
      "execute_sql", 
      { 
        query: "ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '';" 
      }
    );

    if (alterError) {
      console.error("[fix-display-name-schema] Error adding display_name column:", alterError);
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to add display_name column", 
          step: "add_column",
          error: alterError 
        },
        { status: 500 }
      );
    }

    // 3. Refresh the schema cache
    console.log("[fix-display-name-schema] Refreshing schema cache");
    const { data: refreshResult, error: refreshError } = await supabase.rpc(
      "execute_sql", 
      { 
        query: "SELECT pg_catalog.pg_reload_conf();" 
      }
    );

    if (refreshError) {
      console.error("[fix-display-name-schema] Error refreshing schema cache:", refreshError);
      // Continue anyway as the column might still be usable
      console.log("[fix-display-name-schema] Proceeding with verification despite refresh error");
    }

    // 4. Verify the column exists after operations
    console.log("[fix-display-name-schema] Verifying display_name column exists in schema");
    const { data: verifyData, error: verifyError } = await supabase.rpc(
      "execute_sql", 
      { 
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name';" 
      }
    );

    if (verifyError || !verifyData || !Array.isArray(verifyData) || verifyData.length === 0) {
      console.error("[fix-display-name-schema] display_name column verification failed:", verifyError || "Column not found");
      return NextResponse.json(
        { 
          success: false, 
          message: "display_name column may have been added but verification failed", 
          step: "verify_column",
          error: verifyError || "Column not found in schema",
          refreshError: refreshError || null
        },
        { status: 500 }
      );
    }

    console.log("[fix-display-name-schema] Schema fix completed successfully");
    return NextResponse.json(
      { 
        success: true, 
        message: "display_name column added to profiles table and schema cache refreshed",
        step: "complete",
        verifyData,
        refreshSuccess: !refreshError
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[fix-display-name-schema] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Unexpected error occurred during schema fix", 
        error: errorMessage,
        stack: errorStack
      },
      { status: 500 }
    );
  }
} 