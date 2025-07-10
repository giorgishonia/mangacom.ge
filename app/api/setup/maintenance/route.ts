import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  console.log("[maintenance] Starting database maintenance tasks");
  const supabase = createClient();
  
  try {
    const operations = [];
    
    // Operation 1: Ensure has_completed_onboarding column exists
    console.log("[maintenance] Checking if has_completed_onboarding column exists");
    const { data: columnExistsResult, error: columnCheckError } = await supabase.rpc(
      "execute_sql",
      {
        query: `
          SELECT to_json(EXISTS (
            SELECT 1
            FROM information_schema.columns 
            WHERE table_name = 'profiles' AND table_schema = 'public' AND column_name = 'has_completed_onboarding'
          )) AS result;
        `
      }
    );
    const onboardingColumnExists = columnExistsResult && columnExistsResult[0]?.result;

    if (columnCheckError) {
      console.error("[maintenance] Error checking column:", columnCheckError);
      operations.push({
        operation: "check_has_completed_onboarding",
        success: false,
        error: columnCheckError.message
      });
    } else if (!onboardingColumnExists) {
      console.log("[maintenance] Column not found, adding has_completed_onboarding column");
      const { error: addColumnError } = await supabase.rpc(
        "execute_sql",
        { query: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;" }
      );
      if (addColumnError) {
        console.error("[maintenance] Error adding column:", addColumnError);
        operations.push({ operation: "add_has_completed_onboarding", success: false, error: addColumnError.message });
      } else {
        console.log("[maintenance] Column added successfully");
        operations.push({ operation: "add_has_completed_onboarding", success: true, message: "Column added" });
        await supabase.rpc("execute_sql", { query: "NOTIFY pgrst, 'reload schema';" });
      }
    } else {
      console.log("[maintenance] has_completed_onboarding column already exists");
      operations.push({ operation: "check_has_completed_onboarding", success: true, message: "Column already exists" });
    }
    
    // Operation 2: Ensure first_name and last_name columns exist
    console.log("[maintenance] Checking if first_name and last_name columns exist");
    const { data: nameColumnsResult, error: nameColumnCheckError } = await supabase.rpc(
      "execute_sql",
      {
        query: `
          SELECT json_agg(t.column_name) AS result
          FROM (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profiles' AND table_schema = 'public' AND column_name IN ('first_name', 'last_name')
          ) t;
        `
      }
    );
    const existingNameColumns: string[] = (nameColumnsResult && nameColumnsResult[0]?.result) || [];

    if (nameColumnCheckError) {
      console.error("[maintenance] Error checking name columns:", nameColumnCheckError);
      operations.push({ operation: "check_name_columns", success: false, error: nameColumnCheckError.message });
    } else {
      const columnsToAdd = ['first_name', 'last_name'].filter(col => !existingNameColumns.includes(col));
      if (columnsToAdd.length > 0) {
        console.log(`[maintenance] Adding missing name columns: ${columnsToAdd.join(', ')}`);
        const addColumnsQuery = columnsToAdd.map(col => `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ${col} TEXT;`).join('\n');
        const { error: addColumnsError } = await supabase.rpc("execute_sql", { query: addColumnsQuery });
        if (addColumnsError) {
          console.error("[maintenance] Error adding name columns:", addColumnsError);
          operations.push({ operation: "add_name_columns", success: false, error: addColumnsError.message });
        } else {
          console.log("[maintenance] Name columns added successfully");
          operations.push({ operation: "add_name_columns", success: true, message: `Added columns: ${columnsToAdd.join(', ')}` });
          await supabase.rpc("execute_sql", { query: "NOTIFY pgrst, 'reload schema';" });
        }
      } else {
        console.log("[maintenance] All name columns already exist");
        operations.push({ operation: "check_name_columns", success: true, message: "All columns already exist" });
      }
    }
    
    // Operation 3: Ensure interests column exists as TEXT[]
    console.log("[maintenance] Checking if interests column exists and is TEXT[]");
    const { data: interestsColumnResult, error: interestsColumnCheckError } = await supabase.rpc(
      "execute_sql",
      {
        query: `
          SELECT to_json(EXISTS (
            SELECT 1
            FROM information_schema.columns 
            WHERE table_name = 'profiles' AND table_schema = 'public' AND column_name = 'interests' AND data_type = 'ARRAY' AND udt_name = '_text'
          )) AS result;
        `
      }
    );
    const interestsColumnIsCorrectType = interestsColumnResult && interestsColumnResult[0]?.result;

    if (interestsColumnCheckError) {
      console.error("[maintenance] Error checking interests column:", interestsColumnCheckError);
      operations.push({ operation: "check_interests_column", success: false, error: interestsColumnCheckError.message });
    } else if (!interestsColumnIsCorrectType) {
      console.log("[maintenance] Interests column not found or not TEXT[], ensuring it is TEXT[]");
      const { error: addOrAlterError } = await supabase.rpc("execute_sql", {
        query: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT NULL;`
      });
      if (addOrAlterError) {
        console.error("[maintenance] Error ensuring interests column is TEXT[]:", addOrAlterError);
        operations.push({ operation: "ensure_interests_column_type", success: false, error: addOrAlterError.message });
      } else {
        console.log("[maintenance] Interests column ensured as TEXT[]");
        operations.push({ operation: "ensure_interests_column_type", success: true, message: "Interests column ensured as TEXT[]" });
        await supabase.rpc("execute_sql", { query: "NOTIFY pgrst, 'reload schema';" });
      }
    } else {
      console.log("[maintenance] Interests column already exists and is TEXT[]");
      operations.push({ operation: "check_interests_column", success: true, message: "Interests column is correctly TEXT[]" });
    }
    
    // Operation 4: Update onboarding status for profiles with data
    console.log("[maintenance] Updating onboarding status based on profile data");
    const { data: updateResultData, error: updateError } = await supabase.rpc(
      "execute_sql",
      {
        query: `
          WITH updated_ids AS (
            UPDATE public.profiles
            SET has_completed_onboarding = true
            WHERE 
              (has_completed_onboarding IS NULL OR has_completed_onboarding = false)
              AND username IS NOT NULL 
              AND (
                first_name IS NOT NULL 
                OR interests IS NOT NULL AND array_length(interests, 1) > 0 
                OR bio IS NOT NULL
              )
            RETURNING id
          )
          SELECT json_agg(json_build_object('id', id)) AS result FROM updated_ids;
        `
      }
    );
    const updatedProfiles = (updateResultData && updateResultData[0]?.result) || [];

    if (updateError) {
      console.error("[maintenance] Error updating onboarding status:", updateError);
      operations.push({ operation: "update_onboarding_status", success: false, error: updateError.message });
    } else {
      const updatedCount = updatedProfiles.length;
      console.log(`[maintenance] Updated ${updatedCount} profile(s) with onboarding status`);
      operations.push({ operation: "update_onboarding_status", success: true, message: `Updated ${updatedCount} profile(s)` });
    }
    
    return NextResponse.json({
      success: true,
      operations,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("[maintenance] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
} 