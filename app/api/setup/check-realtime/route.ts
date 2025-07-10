import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Create a service role client that can bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Query to check realtime subscription load
    const realtimeQuery = `
      SELECT rolname, query, calls, total_time, 
             round(total_time * 100 / sum(total_time) OVER (), 1) as prop_total_time
      FROM pg_stat_statements
      JOIN pg_roles ON userid = pg_roles.oid
      WHERE query LIKE '%realtime.list_changes%'
      ORDER BY total_time DESC
      LIMIT 10;
    `;

    // Execute the query
    const { data: realtimeStats, error: realtimeError } = await supabaseAdmin.rpc(
      'exec_sql_with_return',
      { sql: realtimeQuery }
    );

    if (realtimeError) {
      console.error('Error checking realtime stats:', realtimeError);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to check realtime stats', 
        error: realtimeError.message 
      }, { status: 500 });
    }

    // Query to check overall database load
    const overallQuery = `
      SELECT rolname, query, calls, total_time, 
             round(total_time * 100 / sum(total_time) OVER (), 1) as prop_total_time
      FROM pg_stat_statements
      JOIN pg_roles ON userid = pg_roles.oid
      ORDER BY total_time DESC
      LIMIT 10;
    `;

    // Execute the query
    const { data: overallStats, error: overallError } = await supabaseAdmin.rpc(
      'exec_sql_with_return',
      { sql: overallQuery }
    );

    if (overallError) {
      console.error('Error checking overall stats:', overallError);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to check overall stats', 
        error: overallError.message,
        realtimeStats
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database stats retrieved',
      realtimeStats,
      overallStats
    });
  } catch (error: any) {
    console.error('Unexpected error checking database stats:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Unexpected error checking database stats',
      error: error.message || String(error)
    }, { status: 500 });
  }
} 