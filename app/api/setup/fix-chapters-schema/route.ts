import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Simplified approach - directly add the missing columns if they don't exist
    const sql = `
      -- Add missing description column to chapters table if it doesn't exist
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'description') THEN
              ALTER TABLE chapters ADD COLUMN description TEXT DEFAULT '';
          END IF;
          
          -- Also add thumbnail if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'thumbnail') THEN
              ALTER TABLE chapters ADD COLUMN thumbnail TEXT DEFAULT '';
          END IF;
          
          -- Add pages column as JSONB if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'pages') THEN
              ALTER TABLE chapters ADD COLUMN pages JSONB DEFAULT '[]'::jsonb;
          END IF;
      END;
      $$;
    `;
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error("Error fixing chapters schema:", error);
      return NextResponse.json({
        success: false,
        message: "Failed to fix chapters schema",
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Chapters table schema fixed successfully"
    });
  } catch (error) {
    console.error("Error in fix-chapters-schema:", error);
    return NextResponse.json(
      { error: "Failed to fix chapters schema", details: error.message || String(error) },
      { status: 500 }
    );
  }
} 