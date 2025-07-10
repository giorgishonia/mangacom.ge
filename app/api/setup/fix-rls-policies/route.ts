import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Create a service role client that can bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // SQL to fix RLS policies
    const sql = `
      -- Enable RLS on content table if not already enabled
      ALTER TABLE content ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Public content is viewable by everyone" ON content;
      DROP POLICY IF EXISTS "Authenticated users can view content" ON content;
      
      -- Create policy for anonymous users to read content
      CREATE POLICY "Public content is viewable by everyone" 
      ON content FOR SELECT 
      USING (true);
      
      -- Enable RLS on chapters table if not already enabled
      ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Public chapters are viewable by everyone" ON chapters;
      DROP POLICY IF EXISTS "Authenticated users can view chapters" ON chapters;
      
      -- Create policy for anonymous users to read chapters
      CREATE POLICY "Public chapters are viewable by everyone" 
      ON chapters FOR SELECT 
      USING (true);
      
      -- Make sure profiles table has proper policies for avatar access
      DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
      
      CREATE POLICY "Public profiles are viewable by everyone" 
      ON profiles FOR SELECT 
      USING (true);
    `;

    // Execute the SQL
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });

    if (error) {
      console.error('Error applying RLS policies:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to apply RLS policies', 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'RLS policies applied successfully' 
    });
  } catch (error) {
    console.error('Unexpected error applying RLS policies:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Unexpected error applying RLS policies',
      error: String(error)
    }, { status: 500 });
  }
} 