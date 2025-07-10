import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  console.log("[check-column-exists] Starting column check process");
  const supabase = createClient();
  
  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const table = searchParams.get('table');
  const column = searchParams.get('column');
  
  // Validate input parameters
  if (!table || !column) {
    return NextResponse.json({
      success: false,
      message: "Missing required parameters: table and column are required",
    }, { status: 400 });
  }
  
  try {
    console.log(`[check-column-exists] Checking if column '${column}' exists in table '${table}'`);
    const { data, error } = await supabase.rpc(
      "execute_sql", 
      { 
        query: `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}';` 
      }
    );

    if (error) {
      console.error("[check-column-exists] Error checking column existence:", error);
      return NextResponse.json({
        success: false,
        message: `Failed to check if column '${column}' exists in table '${table}'`,
        error: error.message || String(error)
      }, { status: 500 });
    }

    const exists = Array.isArray(data) && data.length > 0;
    
    console.log(`[check-column-exists] Column '${column}' ${exists ? 'exists' : 'does not exist'} in table '${table}'`);
    return NextResponse.json({
      success: true,
      exists,
      message: `Column '${column}' ${exists ? 'exists' : 'does not exist'} in table '${table}'`,
      data
    }, { status: 200 });
  } catch (error) {
    console.error("[check-column-exists] Unexpected error:", error);
    
    return NextResponse.json({
      success: false,
      message: "Unexpected error occurred while checking column existence",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
} 