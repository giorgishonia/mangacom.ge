import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // Only allow in development mode for safety
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment) {
      return NextResponse.json({
        success: false,
        message: "This endpoint is only available in development mode"
      }, { status: 403 });
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get SQL query from request body
    const body = await request.json();
    const { sql } = body;
    
    if (!sql) {
      return NextResponse.json({
        success: false,
        message: "No SQL query provided"
      }, { status: 400 });
    }
    
    // Execute SQL query
    const { data, error } = await supabase
      .from('_dummy')
      .select('*')
      .limit(1)
      .then(() => {
        // This is a workaround to execute raw SQL
        // The .then() is called after the previous query completes
        return supabase.rpc('exec_sql', { sql });
      })
      .catch(error => ({ data: null, error }));
    
    if (error) {
      return NextResponse.json({
        success: false,
        message: "SQL execution failed",
        error: error.message || String(error)
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "SQL executed successfully",
      data
    });
  } catch (error) {
    console.error("Error in execute-sql:", error);
    return NextResponse.json(
      { error: "Failed to execute SQL", details: error.message || String(error) },
      { status: 500 }
    );
  }
} 