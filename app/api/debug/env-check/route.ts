import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  return NextResponse.json({
    env_check: {
      has_supabase_url: !!supabaseUrl,
      has_service_role_key: !!serviceRoleKey,
      supabase_url_length: supabaseUrl?.length || 0,
      service_role_key_length: serviceRoleKey?.length || 0,
      supabase_url_prefix: supabaseUrl?.substring(0, 30) + '...' || 'not set',
      service_role_key_prefix: serviceRoleKey?.substring(0, 10) + '...' || 'not set',
      node_env: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV
    }
  });
} 