import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the structure of the chapters table
    console.log("Fetching table information...");
    
    // Method 1: Try to get column information directly (may not be available in all Supabase plans)
    let columnInfo = null;
    try {
      const { data: columnData, error: columnError } = await supabase
        .rpc('get_table_columns', { table_name: 'chapters' });
      
      if (!columnError) {
        columnInfo = columnData;
      }
    } catch (e) {
      console.log("Could not get column info via RPC:", e);
    }
    
    // Method 2: Get a sample row to check the structure
    const { data: sampleData, error: sampleError } = await supabase
      .from("chapters")
      .select("*")
      .limit(1)
      .maybeSingle();
    
    // Method 3: Try to get table definitions from information_schema (may be restricted)
    let schemaInfo = null;
    try {
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'chapters');
      
      if (!schemaError) {
        schemaInfo = schemaData;
      }
    } catch (e) {
      console.log("Could not access information_schema:", e);
    }
    
    // Check if the content table exists and its structure
    const { data: contentSample, error: contentError } = await supabase
      .from("content")
      .select("*")
      .limit(1)
      .maybeSingle();
    
    // Return all the gathered information
    return NextResponse.json({
      message: "Database debug information",
      columnInfo: columnInfo,
      sampleChapter: sampleData || null,
      sampleError: sampleError ? sampleError.message : null,
      schemaInfo: schemaInfo,
      contentSample: contentSample || null,
      contentError: contentError ? contentError.message : null,
    });
    
  } catch (error) {
    console.error("Error fetching debug info:", error);
    return NextResponse.json(
      { error: "Failed to get debug information", details: error.message || String(error) },
      { status: 500 }
    );
  }
} 