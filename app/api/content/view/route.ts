import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase' // Use standard client for now

export async function POST(req: NextRequest) {
  try {
    const { contentId } = await req.json();

    if (!contentId || typeof contentId !== 'string') {
      return NextResponse.json({ error: 'Invalid contentId provided' }, { status: 400 });
    }

    // Call the database function to increment the view count
    const { error: rpcError } = await supabase.rpc('increment_view_count', { 
      content_id_param: contentId 
    });

    if (rpcError) {
      console.error('Supabase RPC error incrementing view count:', rpcError);
      // Check for specific errors if needed, e.g., content not found (might depend on your function setup)
      return NextResponse.json({ error: 'Failed to update view count', details: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'View count updated' }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/content/view:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message || 'Unknown error' }, { status: 500 });
  }
}

// Optional: Add OPTIONS handler for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust as needed for security
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 