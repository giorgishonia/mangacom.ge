import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // SQL to create reading_history table
    const sql = `
      -- Create reading_history table if not exists
      CREATE TABLE IF NOT EXISTS reading_history (
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        manga_id TEXT NOT NULL,
        chapter_id TEXT NOT NULL,
        chapter_number NUMERIC NOT NULL,
        page_number INTEGER NOT NULL DEFAULT 1,
        last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, manga_id)
      );
      
      -- Enable Row Level Security
      ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;

      -- Create policies
      CREATE POLICY "Users can view their own reading history" 
        ON reading_history FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own reading history" 
        ON reading_history FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own reading history" 
        ON reading_history FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own reading history" 
        ON reading_history FOR DELETE 
        TO authenticated 
        USING (auth.uid() = user_id);

      -- Create index for faster queries
      CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_reading_history_manga ON reading_history(manga_id);
    `;
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error("Error creating reading_history table:", error);
      return NextResponse.json({
        success: false,
        message: "Failed to create reading_history table",
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "reading_history table created successfully with proper RLS policies"
    });
  } catch (error) {
    console.error("Error in create-reading-history-table:", error);
    return NextResponse.json(
      { error: "Failed to create table", details: error.message || String(error) },
      { status: 500 }
    );
  }
} 