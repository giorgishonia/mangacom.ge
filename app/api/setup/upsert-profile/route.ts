import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  console.log("[upsert-profile] Starting profile upsert process");
  const supabase = createClient();
  
  try {
    // Parse the request body
    const requestData = await request.json();
    const { userId, profileData } = requestData;
    
    if (!userId || !profileData) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Missing userId or profileData in request body" 
        },
        { status: 400 }
      );
    }
    
    console.log("[upsert-profile] Upserting profile for user:", userId);
    
    // Extract fields from profileData
    const fields = Object.keys(profileData);
    const values = Object.values(profileData);
    
    // Safely add string values with proper escaping
    const placeholders = values.map((_, index) => `$${index + 2}`);
    
    // Build the SQL query for upsert
    const insertColumns = ['id', ...fields].join(', ');
    const insertValues = ['$1', ...placeholders].join(', ');
    const updateClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `
      INSERT INTO profiles (${insertColumns})
      VALUES (${insertValues})
      ON CONFLICT (id)
      DO UPDATE SET ${updateClause}
      RETURNING *;
    `;
    
    console.log("[upsert-profile] Executing SQL query:", query.replace(/\s+/g, ' ').trim());
    
    // Execute the SQL query
    const { data: result, error } = await supabase.rpc(
      "execute_sql_with_params",
      {
        query,
        params: [userId, ...values]
      }
    );
    
    if (error) {
      console.error("[upsert-profile] Error upserting profile:", error);
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to upsert profile", 
          error
        },
        { status: 500 }
      );
    }
    
    if (!result || !Array.isArray(result) || result.length === 0) {
      console.error("[upsert-profile] No result returned from upsert operation");
      return NextResponse.json(
        { 
          success: false, 
          message: "No result returned from upsert operation"
        },
        { status: 500 }
      );
    }
    
    console.log("[upsert-profile] Profile upserted successfully");
    return NextResponse.json(
      { 
        success: true, 
        message: "Profile upserted successfully",
        profile: result[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[upsert-profile] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Unexpected error occurred during profile upsert", 
        error: errorMessage
      },
      { status: 500 }
    );
  }
} 