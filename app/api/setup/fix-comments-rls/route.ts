import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Create admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing Supabase environment variables' 
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    const sql = `
      -- Ensure RLS is enabled
      ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies to avoid conflicts
      DROP POLICY IF EXISTS "Users can create their own comments" ON comments;
      DROP POLICY IF EXISTS "Users can view all comments" ON comments;
      DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
      DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
      DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
      DROP POLICY IF EXISTS "Users can add comments" ON comments;
      
      -- Create new policies with proper authentication checks
      CREATE POLICY "Anyone can view comments" 
        ON comments FOR SELECT 
        USING (true);
      
      CREATE POLICY "Authenticated users can create comments" 
        ON comments FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
      
      CREATE POLICY "Users can update their own comments" 
        ON comments FOR UPDATE 
        USING (auth.uid() = user_id);
      
      CREATE POLICY "Users can delete their own comments" 
        ON comments FOR DELETE 
        USING (auth.uid() = user_id);
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error executing SQL:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'RLS policies updated successfully' 
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 