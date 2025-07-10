import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // First, let's check the existing structure
    console.log("Checking comments table structure...");
    
    const { data: existingTable, error: tableError } = await supabase
      .from('comments')
      .select('*')
      .limit(1);
    
    if (tableError && !tableError.message.includes('relation "comments" does not exist')) {
      console.log("Error checking comments table:", tableError.message);
    }
    
    // Recreate the comments table
    console.log("Recreating comments table...");
    
    const sql = `
      -- Backup existing comments if any exist
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
          -- Create backup table if it doesn't exist
          CREATE TABLE IF NOT EXISTS comments_backup AS SELECT * FROM comments;
        END IF;
      END $$;
      
      -- Drop existing table
      DROP TABLE IF EXISTS comments;
      
      -- Create comments table from scratch
      CREATE TABLE comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        content_id TEXT NOT NULL,
        content_type TEXT NOT NULL CHECK (content_type IN ('anime', 'manga', 'comics')),
        text TEXT NOT NULL,
        media_url TEXT DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      
      -- Restore data if backup exists
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments_backup') THEN
          INSERT INTO comments (id, user_id, content_id, content_type, text, media_url, created_at, updated_at)
          SELECT id, user_id, content_id, content_type, text, media_url, created_at, updated_at
          FROM comments_backup;
        END IF;
      END $$;
      
      -- Enable Row Level Security
      ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

      -- Create policies for comments
      CREATE POLICY "Comments are viewable by everyone" 
        ON comments FOR SELECT 
        USING (true);

      CREATE POLICY "Users can add comments" 
        ON comments FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own comments" 
        ON comments FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own comments" 
        ON comments FOR DELETE 
        TO authenticated 
        USING (auth.uid() = user_id);
    `;
    
    // Execute the SQL to recreate the table
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error("Error fixing comments table:", error);
      return NextResponse.json({
        success: false,
        message: "Failed to fix comments table",
        error: error.message
      }, { status: 500 });
    }
    
    // Verify the fix worked by checking for the media_url column
    const { data: newTable, error: newTableError } = await supabase
      .from('comments')
      .select('media_url')
      .limit(1);
    
    if (newTableError) {
      console.error("Error verifying comments table fix:", newTableError);
      return NextResponse.json({
        success: false,
        message: "Comments table was recreated but verification failed",
        error: newTableError.message
      }, { status: 500 });
    }
    
    // Force Supabase to refresh the schema cache
    await supabase.rpc('get_schema_cache_validity', {});
    
    return NextResponse.json({
      success: true,
      message: "Comments table fixed successfully"
    });
  } catch (error) {
    console.error("Error in fix-comments-table:", error);
    return NextResponse.json(
      { error: "Failed to fix comments table", details: error.message || String(error) },
      { status: 500 }
    );
  }
} 