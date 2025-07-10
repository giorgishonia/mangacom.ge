import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  console.log("[add-column] Starting column addition process");
  const supabase = createClient();
  
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Failed to parse request body as JSON",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 400 });
  }
  
  const { table, column, dataType, defaultValue, constraints } = body;
  
  // Validate required parameters
  if (!table || !column || !dataType) {
    return NextResponse.json({
      success: false,
      message: "Missing required parameters: table, column, and dataType are required",
    }, { status: 400 });
  }
  
  try {
    console.log(`[add-column] Attempting to add column '${column}' to table '${table}'`);
    
    // Build the SQL query with optional default value and constraints
    let sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${dataType}`;
    
    if (defaultValue !== undefined) {
      sql += ` DEFAULT ${defaultValue}`;
    }
    
    if (constraints) {
      sql += ` ${constraints}`;
    }
    
    sql += ';';
    
    // Execute the SQL query to add the column
    const { data: addColumnData, error: addColumnError } = await supabase.rpc(
      "execute_sql", 
      { query: sql }
    );

    if (addColumnError) {
      console.error("[add-column] Error adding column:", addColumnError);
      return NextResponse.json({
        success: false,
        message: `Failed to add column '${column}' to table '${table}'`,
        error: addColumnError.message || String(addColumnError)
      }, { status: 500 });
    }
    
    // Refresh the schema cache
    console.log("[add-column] Refreshing schema cache");
    const { error: refreshError } = await supabase.rpc(
      "execute_sql", 
      { query: "SELECT pg_catalog.pg_reload_conf();" }
    );

    if (refreshError) {
      console.warn("[add-column] Error refreshing schema cache:", refreshError);
      // Continue despite cache refresh error
    }
    
    // Verify the column was added successfully
    console.log(`[add-column] Verifying column '${column}' was added to table '${table}'`);
    const { data: verifyData, error: verifyError } = await supabase.rpc(
      "execute_sql", 
      { query: `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}';` }
    );

    if (verifyError) {
      console.error("[add-column] Error verifying column addition:", verifyError);
      return NextResponse.json({
        success: false,
        message: `Column might be added but verification failed`,
        addedColumn: true,
        verificationFailed: true,
        error: verifyError.message || String(verifyError)
      }, { status: 500 });
    }

    const columnExists = Array.isArray(verifyData) && verifyData.length > 0;
    
    if (!columnExists) {
      console.error(`[add-column] Column '${column}' was not found in table '${table}' after addition attempt`);
      return NextResponse.json({
        success: false,
        message: `Column '${column}' was not added to table '${table}' despite no errors`,
        addedColumn: false,
        verificationFailed: false
      }, { status: 500 });
    }
    
    console.log(`[add-column] Successfully added column '${column}' to table '${table}'`);
    return NextResponse.json({
      success: true,
      message: `Successfully added column '${column}' to table '${table}'`,
      data: verifyData
    }, { status: 200 });
  } catch (error) {
    console.error("[add-column] Unexpected error:", error);
    
    return NextResponse.json({
      success: false,
      message: "Unexpected error occurred while adding column",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
} 