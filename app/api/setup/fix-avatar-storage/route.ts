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

    // Update avatars bucket to be public
    const { error } = await supabaseAdmin.storage.updateBucket(
      'avatars', 
      { 
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      }
    );

    if (error) {
      console.error('Error updating avatars bucket:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to update avatars bucket', 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Avatars bucket updated to public successfully' 
    });
  } catch (error) {
    console.error('Unexpected error updating avatars bucket:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Unexpected error updating avatars bucket',
      error: String(error)
    }, { status: 500 });
  }
} 