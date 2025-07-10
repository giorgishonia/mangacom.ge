import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // SQL to fix the watchlist table schema
    const sql = `
      -- Check and fix the foreign key relationship for watchlist table
      DO $$
      BEGIN
        -- First, ensure content_id in watchlist has the correct data type
        -- It should be UUID to match the id column in content table
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'watchlist' AND column_name = 'content_id'
        ) THEN
          ALTER TABLE watchlist ALTER COLUMN content_id TYPE UUID USING content_id::UUID;
        END IF;
        
        -- Remove any existing foreign key constraints on watchlist.content_id (if any)
        DO $INNER$
        BEGIN
          EXECUTE (
            SELECT 'ALTER TABLE watchlist DROP CONSTRAINT ' || conname
            FROM pg_constraint 
            WHERE conrelid = 'watchlist'::regclass 
            AND conname LIKE '%content_id%'
            LIMIT 1
          );
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE 'No existing constraint found';
        END $INNER$;
        
        -- Now add the foreign key constraint
        -- First check if the constraint already exists
        IF NOT EXISTS (
          SELECT 1 
          FROM pg_constraint c 
          JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
          WHERE c.conrelid = 'watchlist'::regclass 
          AND a.attname = 'content_id' 
          AND c.contype = 'f'
        ) THEN
          -- Add the constraint
          ALTER TABLE watchlist 
          ADD CONSTRAINT fk_watchlist_content 
          FOREIGN KEY (content_id) 
          REFERENCES content(id) 
          ON DELETE CASCADE;
        END IF;
      END
      $$;
      
      -- Also fix the favorites table
      DO $$
      BEGIN
        -- First, ensure content_id in favorites has the correct data type
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'favorites' AND column_name = 'content_id'
        ) THEN
          ALTER TABLE favorites ALTER COLUMN content_id TYPE UUID USING content_id::UUID;
        END IF;
        
        -- Remove any existing foreign key constraints on favorites.content_id (if any)
        DO $INNER$
        BEGIN
          EXECUTE (
            SELECT 'ALTER TABLE favorites DROP CONSTRAINT ' || conname
            FROM pg_constraint 
            WHERE conrelid = 'favorites'::regclass 
            AND conname LIKE '%content_id%'
            LIMIT 1
          );
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE 'No existing constraint found';
        END $INNER$;
        
        -- Now add the foreign key constraint
        -- First check if the constraint already exists
        IF NOT EXISTS (
          SELECT 1 
          FROM pg_constraint c 
          JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
          WHERE c.conrelid = 'favorites'::regclass 
          AND a.attname = 'content_id' 
          AND c.contype = 'f'
        ) THEN
          -- Add the constraint
          ALTER TABLE favorites 
          ADD CONSTRAINT fk_favorites_content 
          FOREIGN KEY (content_id) 
          REFERENCES content(id) 
          ON DELETE CASCADE;
        END IF;
      END
      $$;
    `;
    
    // Execute the SQL to fix the schema
    console.log("Fixing watchlist and favorites schema...");
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error("Error fixing schema:", error);
      return NextResponse.json({
        success: false,
        message: "Failed to fix schema",
        error: error.message
      }, { status: 500 });
    }
    
    // Verify the fix worked
    const { data: schemaData, error: schemaError } = await supabase.from('watchlist').select('content_id').limit(1);
    
    if (schemaError) {
      console.error("Error verifying schema fix:", schemaError);
      return NextResponse.json({
        success: false,
        message: "Schema might not be fixed completely",
        error: schemaError.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Watchlist and favorites schema fixed successfully"
    });
  } catch (error: any) {
    console.error("Error in fix-watchlist-schema:", error);
    return NextResponse.json(
      { error: "Failed to fix schema", details: error.message || String(error) },
      { status: 500 }
    );
  }
} 