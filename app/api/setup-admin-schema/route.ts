import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }
    
    // Check if the role column exists
    const { data: columnExists, error: columnCheckError } = await supabase
      .rpc('column_exists', { 
        _table: 'profiles', 
        _column: 'role' 
      });
      
    // If the RPC function doesn't exist, try a different approach
    if (columnCheckError) {
      console.log("Couldn't check column with RPC, attempting to alter table directly");
      
      // Add role column if it doesn't exist
      const { error: alterTableError } = await supabase
        .from('_temp_alter_table')
        .select('*')
        .limit(1)
        .csv();
        
      if (alterTableError?.message.includes('relation "_temp_alter_table" does not exist')) {
        // Execute raw SQL to add the column
        const { error: addColumnError } = await supabase
          .rpc('exec_sql', {
            sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT \'user\''
          });
          
        if (addColumnError) {
          // Use direct SQL through Postgres extension as a last resort
          const { error: rawSqlError } = await supabase.pg
            .query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT \'user\'');
            
          if (rawSqlError) {
            return NextResponse.json(
              { error: "Failed to add role column, please do it manually through the dashboard", details: rawSqlError },
              { status: 500 }
            );
          }
        }
      }
    }
    
    // Update the current user to be an admin
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', session.user.id);
      
    if (updateError) {
      return NextResponse.json(
        { error: "Failed to set admin role", details: updateError },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Schema updated and admin role set",
      userId: session.user.id
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Failed to set up admin schema", details: error },
      { status: 500 }
    );
  }
} 