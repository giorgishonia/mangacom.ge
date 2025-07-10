import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  console.log("[fix-profiles-schema] Starting schema fix process");
  const supabase = createClient();
  
  try {
    // First check if the profiles table exists
    console.log("[fix-profiles-schema] Checking if profiles table exists");
    const { data, error } = await supabase.from("profiles").select("id").limit(1);
    
    // If there's an error checking the profiles table, try the raw SQL approach
    if (error) {
      console.error("[fix-profiles-schema] Error checking profiles table:", error);
      console.log("[fix-profiles-schema] Falling back to raw SQL endpoint");
      
      try {
        // Construct URL for the raw SQL endpoint
        const rawSqlUrl = new URL("/api/setup/fix-profiles-schema-raw", request.url);
        const rawResponse = await fetch(rawSqlUrl);
        
        if (!rawResponse.ok) {
          const rawError = await rawResponse.json();
          console.error("[fix-profiles-schema] Raw SQL fallback failed:", rawError);
          
          return NextResponse.json({
            success: false,
            message: "Both standard and raw SQL approaches failed to fix profiles schema",
            primaryError: error,
            fallbackError: rawError
          }, { status: 500 });
        }
        
        const rawResult = await rawResponse.json();
        console.log("[fix-profiles-schema] Raw SQL fallback succeeded:", rawResult);
        
        return NextResponse.json({
          success: true,
          message: "Schema fixed using raw SQL fallback",
          result: rawResult
        }, { status: 200 });
      } catch (fetchError) {
        console.error("[fix-profiles-schema] Error calling raw SQL endpoint:", fetchError);
        
        return NextResponse.json({
          success: false,
          message: "Failed to fix schema with both approaches",
          primaryError: error,
          fallbackError: fetchError instanceof Error ? fetchError.message : String(fetchError)
        }, { status: 500 });
      }
    }
    
    // Profiles table exists, check for banner column
    console.log("[fix-profiles-schema] Profiles table exists, checking for banner column");
    
    try {
      const { error: rpcError } = await supabase.rpc("create_banner_column");
      
      if (rpcError) {
        console.error("[fix-profiles-schema] Error creating banner column with RPC:", rpcError);
        console.log("[fix-profiles-schema] Falling back to raw SQL endpoint for column creation");
        
        // Fall back to raw SQL endpoint
        const rawSqlUrl = new URL("/api/setup/fix-profiles-schema-raw", request.url);
        const rawResponse = await fetch(rawSqlUrl);
        
        if (!rawResponse.ok) {
          const rawError = await rawResponse.json();
          console.error("[fix-profiles-schema] Raw SQL fallback failed for column creation:", rawError);
          
          return NextResponse.json({
            success: false,
            message: "Failed to create banner column with both approaches",
            primaryError: rpcError,
            fallbackError: rawError
          }, { status: 500 });
        }
        
        const rawResult = await rawResponse.json();
        console.log("[fix-profiles-schema] Raw SQL fallback succeeded for column creation:", rawResult);
        
        return NextResponse.json({
          success: true,
          message: "Banner column created using raw SQL fallback",
          result: rawResult
        }, { status: 200 });
      }
      
      // Verify the column was added by querying a profile
      console.log("[fix-profiles-schema] Verifying banner column was added");
      const { data: verifyData, error: verifyError } = await supabase
        .from("profiles")
        .select("banner")
        .limit(1);
        
      if (verifyError) {
        console.error("[fix-profiles-schema] Error verifying banner column:", verifyError);
        return NextResponse.json({
          success: false,
          message: "Banner column may have been added but verification failed",
          error: verifyError
        }, { status: 500 });
      }
      
      console.log("[fix-profiles-schema] Schema fix completed successfully");
      return NextResponse.json({
        success: true,
        message: "Banner column added successfully"
      }, { status: 200 });
    } catch (rpcCallError) {
      console.error("[fix-profiles-schema] Error calling create_banner_column RPC:", rpcCallError);
      
      // Fall back to raw SQL endpoint
      try {
        const rawSqlUrl = new URL("/api/setup/fix-profiles-schema-raw", request.url);
        const rawResponse = await fetch(rawSqlUrl);
        const rawResult = await rawResponse.json();
        
        return NextResponse.json({
          success: rawResult.success,
          message: rawResult.success 
            ? "Banner column added using raw SQL fallback after RPC error" 
            : "Failed to add banner column with raw SQL fallback",
          rpcError: rpcCallError instanceof Error ? rpcCallError.message : String(rpcCallError),
          rawResult
        }, { status: rawResult.success ? 200 : 500 });
      } catch (fetchError) {
        console.error("[fix-profiles-schema] Error calling raw SQL endpoint after RPC error:", fetchError);
        
        return NextResponse.json({
          success: false,
          message: "Failed to fix schema with both approaches",
          primaryError: rpcCallError instanceof Error ? rpcCallError.message : String(rpcCallError),
          fallbackError: fetchError instanceof Error ? fetchError.message : String(fetchError)
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error("[fix-profiles-schema] Unexpected error:", error);
    
    return NextResponse.json({
      success: false,
      message: "Unexpected error occurred during schema fix",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
} 