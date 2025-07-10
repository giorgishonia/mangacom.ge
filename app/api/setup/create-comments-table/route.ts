import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // SQL to create the comments table if it doesn't exist
    const sql = `
      -- Create comments table if it doesn't exist
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        content_id TEXT NOT NULL,
        content_type TEXT NOT NULL CHECK (content_type IN ('anime', 'manga', 'comics')),
        text TEXT NOT NULL,
        media_url TEXT DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Enable Row Level Security
      ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

      -- Create policies for comments
      DO $$
      BEGIN
        -- Public read access for all comments
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Comments are viewable by everyone'
        ) THEN
          CREATE POLICY "Comments are viewable by everyone" 
            ON comments FOR SELECT 
            USING (true);
        END IF;

        -- Users can add comments
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can add comments'
        ) THEN
          CREATE POLICY "Users can add comments" 
            ON comments FOR INSERT 
            TO authenticated 
            WITH CHECK (auth.uid() = user_id);
        END IF;

        -- Users can edit their own comments
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can update their own comments'
        ) THEN
          CREATE POLICY "Users can update their own comments" 
            ON comments FOR UPDATE 
            TO authenticated 
            USING (auth.uid() = user_id);
        END IF;

        -- Users can delete their own comments
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can delete their own comments'
        ) THEN
          CREATE POLICY "Users can delete their own comments" 
            ON comments FOR DELETE 
            TO authenticated 
            USING (auth.uid() = user_id);
        END IF;
      END;
      $$;
    `;
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error("Error creating comments table:", error);
      return NextResponse.json({
        success: false,
        message: "Failed to create comments table",
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Comments table created or verified successfully"
    });
  } catch (error) {
    console.error("Error in create-comments-table:", error);
    return NextResponse.json(
      { error: "Failed to create comments table", details: error.message || String(error) },
      { status: 500 }
    );
  }
} 