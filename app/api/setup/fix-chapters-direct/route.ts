import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Add missing columns to chapters table if they don't exist
    // First try to add the description column
    const { error: descriptionError } = await supabase
      .from('chapters')
      .select('description')
      .limit(1)
      .single();
    
    if (descriptionError && descriptionError.message.includes('does not exist')) {
      console.log("Description column missing, attempting to add it");
      
      // Try to directly add the column
      try {
        // Using raw query since the exec_sql RPC might not be available
        const { error } = await supabase.from('_manual_migration').select().sql(`
          ALTER TABLE chapters ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
        `);
        
        if (error) {
          throw error;
        }
      } catch (alterError) {
        console.error("Error adding description column:", alterError);
        return NextResponse.json({
          success: false,
          message: "Failed to add description column",
          error: alterError.message || String(alterError)
        }, { status: 500 });
      }
    }
    
    // For debugging, check what columns we have now
    const { data: columnsData, error: columnsError } = await supabase
      .from('chapters')
      .select()
      .limit(1);
    
    return NextResponse.json({
      success: true,
      message: "Fix attempted - check logs for details",
      columnsData,
      columnsError: columnsError ? columnsError.message : null
    });
  } catch (error) {
    console.error("Error in fix-chapters-direct:", error);
    return NextResponse.json(
      { error: "Failed to fix chapters schema", details: error.message || String(error) },
      { status: 500 }
    );
  }
} 