import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  console.log("[create-sql-functions] Starting to create SQL helper functions");
  const supabase = createClient();
  
  try {
    // Create the execute_sql_with_params function
    console.log("[create-sql-functions] Creating execute_sql_with_params function");
    const createParamsFunctionQuery = `
      CREATE OR REPLACE FUNCTION execute_sql_with_params(query text, params jsonb)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result jsonb;
      BEGIN
        EXECUTE query INTO result USING (SELECT array_agg(value) FROM jsonb_array_elements(params));
        RETURN result;
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'error', jsonb_build_object(
            'message', SQLERRM,
            'detail', SQLSTATE,
            'query', query
          )
        );
      END;
      $$;
    `;
    
    // Create an alternative version that supports simple array parameters
    const createSimpleParamsFunctionQuery = `
      CREATE OR REPLACE FUNCTION execute_sql_with_params(query text, params text[])
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result jsonb;
      BEGIN
        EXECUTE query INTO result USING params;
        RETURN result;
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'error', jsonb_build_object(
            'message', SQLERRM,
            'detail', SQLSTATE,
            'query', query
          )
        );
      END;
      $$;
    `;
    
    // Create a function for profile upsert
    const createProfileUpsertFunctionQuery = `
      CREATE OR REPLACE FUNCTION upsert_profile(
        p_user_id uuid,
        p_profile jsonb
      )
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result jsonb;
        field_names text[] := ARRAY[]::text[];
        field_values text[] := ARRAY[]::text[];
        update_clause text := '';
        insert_clause text := 'id';
        values_clause text := 'p_user_id';
        field_name text;
        field_value text;
      BEGIN
        -- Extract field names and values from the JSON
        FOR field_name, field_value IN 
          SELECT key, value::text FROM jsonb_each_text(p_profile)
        LOOP
          field_names := array_append(field_names, field_name);
          field_values := array_append(field_values, field_value);
          
          IF update_clause <> '' THEN
            update_clause := update_clause || ', ';
          END IF;
          update_clause := update_clause || field_name || ' = ' || quote_literal(field_value);
          
          insert_clause := insert_clause || ', ' || field_name;
          values_clause := values_clause || ', ' || quote_literal(field_value);
        END LOOP;
        
        -- Build and execute the upsert query
        EXECUTE 'INSERT INTO profiles (' || insert_clause || ') 
                 VALUES (' || values_clause || ') 
                 ON CONFLICT (id) 
                 DO UPDATE SET ' || update_clause || ' 
                 RETURNING row_to_json(profiles)::jsonb'
        INTO result
        USING p_user_id;
        
        RETURN result;
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'error', jsonb_build_object(
            'message', SQLERRM,
            'detail', SQLSTATE
          )
        );
      END;
      $$;
    `;
    
    // Execute the function creation queries
    const { error: paramsFunctionError } = await supabase.rpc(
      "execute_sql",
      { query: createParamsFunctionQuery }
    );
    
    if (paramsFunctionError) {
      console.error("[create-sql-functions] Error creating execute_sql_with_params function:", paramsFunctionError);
      // Continue anyway to try the other functions
    }
    
    const { error: simpleParamsFunctionError } = await supabase.rpc(
      "execute_sql",
      { query: createSimpleParamsFunctionQuery }
    );
    
    if (simpleParamsFunctionError) {
      console.error("[create-sql-functions] Error creating simple execute_sql_with_params function:", simpleParamsFunctionError);
      // Continue anyway
    }
    
    const { error: profileUpsertFunctionError } = await supabase.rpc(
      "execute_sql",
      { query: createProfileUpsertFunctionQuery }
    );
    
    if (profileUpsertFunctionError) {
      console.error("[create-sql-functions] Error creating upsert_profile function:", profileUpsertFunctionError);
      // Continue anyway
    }
    
    // Verify the functions were created by checking their existence
    const { data: functionsList, error: functionsListError } = await supabase.rpc(
      "execute_sql",
      { query: "SELECT proname FROM pg_proc WHERE proname IN ('execute_sql_with_params', 'upsert_profile');" }
    );
    
    if (functionsListError || !functionsList || !Array.isArray(functionsList) || functionsList.length === 0) {
      console.error("[create-sql-functions] Error verifying functions were created:", functionsListError || "No functions found");
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to verify SQL functions were created", 
          error: functionsListError || "No functions found in result",
          creationErrors: {
            paramsFunctionError,
            simpleParamsFunctionError,
            profileUpsertFunctionError
          }
        },
        { status: 500 }
      );
    }
    
    console.log("[create-sql-functions] SQL functions created successfully");
    return NextResponse.json(
      { 
        success: true, 
        message: "SQL functions created successfully",
        functionsCreated: functionsList
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[create-sql-functions] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Unexpected error occurred while creating SQL functions", 
        error: errorMessage
      },
      { status: 500 }
    );
  }
} 