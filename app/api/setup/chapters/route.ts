import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is admin
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Must be logged in" },
        { status: 401 }
      );
    }
    
    // Get user profile to check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }
    
    // Check if chapters table exists
    const { error: tableCheckError } = await supabase
      .from('chapters')
      .select('id')
      .limit(1);
    
    if (tableCheckError && tableCheckError.message.includes('relation "chapters" does not exist')) {
      // Table doesn't exist, create it
      console.log("Creating chapters table...");
      
      // Use SQL to create the table (requires admin rights or service_role)
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Create chapters table with all required fields
          CREATE TABLE IF NOT EXISTS chapters (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            content_id UUID NOT NULL REFERENCES content(id),
            number INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            thumbnail TEXT DEFAULT '',
            pages JSONB NOT NULL,
            release_date TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
          
          -- Create index on content_id
          CREATE INDEX IF NOT EXISTS chapters_content_id_idx ON chapters(content_id);
          
          -- If table already exists but missing columns, add them
          DO $$
          BEGIN
              -- Check and add missing columns with proper casing
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'description') THEN
                  ALTER TABLE chapters ADD COLUMN description TEXT DEFAULT '';
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'thumbnail') THEN
                  ALTER TABLE chapters ADD COLUMN thumbnail TEXT DEFAULT '';
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'release_date') THEN
                  ALTER TABLE chapters ADD COLUMN release_date TIMESTAMP;
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'pages') THEN
                  ALTER TABLE chapters ADD COLUMN pages JSONB DEFAULT '[]'::jsonb;
              END IF;
          END;
          $$;
        `
      });
      
      if (createError) {
        console.error("Error creating chapters table:", createError);
        return NextResponse.json({
          success: false,
          message: "Failed to create chapters table",
          error: createError.message
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: "Chapters table created successfully"
      });
    } else {
      // Table exists, check and update the schema if needed
      console.log("Chapters table exists, no schema update needed");
      
      return NextResponse.json({
        success: true,
        message: "Chapters table exists, using content_id field only"
      });
    }
  } catch (error) {
    console.error("Error in chapters setup:", error);
    return NextResponse.json(
      { error: "Failed to set up chapters table", details: error.message || String(error) },
      { status: 500 }
    );
  }
} 