import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  console.log("[direct-profile-update] Starting direct profile update process");
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
    
    console.log("[direct-profile-update] Updating profile for user:", userId);
    
    // First check if the profile exists
    const checkQuery = `
      SELECT id FROM profiles WHERE id = '${userId}' LIMIT 1;
    `;
    
    const { data: existingProfile, error: checkError } = await supabase.rpc(
      "execute_sql",
      { query: checkQuery }
    );
    
    let query;
    let message;
    
    // Depending on whether profile exists, do an insert or update
    if (checkError || !existingProfile || !Array.isArray(existingProfile) || existingProfile.length === 0) {
      console.log("[direct-profile-update] Profile doesn't exist, creating new profile");
      
      // Get user email from auth if possible
      const { data: userData } = await supabase.auth.getUser(userId);
      const userEmail = userData?.user?.email || '';
      
      // Prepare insert fields
      const fields = ['id', ...Object.keys(profileData)];
      const values = [`'${userId}'`];
      
      // Add profile data values
      Object.values(profileData).forEach(value => {
        if (value === null) {
          values.push('NULL');
        } else if (typeof value === 'number') {
          values.push(value.toString());
        } else {
          values.push(`'${value.toString().replace(/'/g, "''")}'`);
        }
      });
      
      // Build insert query
      query = `
        INSERT INTO profiles (${fields.join(', ')})
        VALUES (${values.join(', ')})
        RETURNING *;
      `;
      
      message = "Profile created successfully";
    } else {
      console.log("[direct-profile-update] Profile exists, updating");
      
      // Prepare update fields
      const setClauses = [];
      
      for (const [field, value] of Object.entries(profileData)) {
        if (value === null) {
          setClauses.push(`${field} = NULL`);
        } else if (typeof value === 'number') {
          setClauses.push(`${field} = ${value}`);
        } else {
          setClauses.push(`${field} = '${value.toString().replace(/'/g, "''")}'`);
        }
      }
      
      // Build update query
      query = `
        UPDATE profiles 
        SET ${setClauses.join(', ')}
        WHERE id = '${userId}'
        RETURNING *;
      `;
      
      message = "Profile updated successfully";
    }
    
    console.log("[direct-profile-update] Executing SQL query:", query.replace(/\s+/g, ' ').trim());
    
    // Execute the query
    const { data: result, error } = await supabase.rpc(
      "execute_sql",
      { query }
    );
    
    if (error) {
      console.error("[direct-profile-update] Error executing SQL:", error);
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to update profile", 
          error
        },
        { status: 500 }
      );
    }
    
    if (!result || !Array.isArray(result) || result.length === 0) {
      console.error("[direct-profile-update] No result returned from operation");
      return NextResponse.json(
        { 
          success: false, 
          message: "No result returned from operation"
        },
        { status: 500 }
      );
    }
    
    console.log(`[direct-profile-update] ${message}`);
    return NextResponse.json(
      { 
        success: true, 
        message,
        profile: result[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[direct-profile-update] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Unexpected error occurred during profile update", 
        error: errorMessage
      },
      { status: 500 }
    );
  }
} 