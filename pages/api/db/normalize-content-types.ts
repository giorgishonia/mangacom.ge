import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Initialize admin client
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: Missing environment variables'
      });
    }
    
    // Update comics entries (both 'comics' and 'comic')
    const { error: comicsError } = await supabaseAdmin.rpc('normalize_content_type', {
      old_type: 'comics',
      new_type: 'COMICS'
    });
    
    if (comicsError && !comicsError.message.includes('no rows')) {
      console.error('Error normalizing comics content type:', comicsError);
      return res.status(500).json({
        success: false,
        message: `Failed to normalize comics content type: ${comicsError.message}`
      });
    }
    
    // Also try 'comic' singular
    const { error: comicError } = await supabaseAdmin.rpc('normalize_content_type', {
      old_type: 'comic',
      new_type: 'COMICS'
    });
    
    if (comicError && !comicError.message.includes('no rows')) {
      console.error('Error normalizing comic content type:', comicError);
    }
    
    // Update manga entries
    const { error: mangaError } = await supabaseAdmin.rpc('normalize_content_type', {
      old_type: 'manga',
      new_type: 'MANGA'
    });
    
    if (mangaError && !mangaError.message.includes('no rows')) {
      console.error('Error normalizing manga content type:', mangaError);
      return res.status(500).json({
        success: false,
        message: `Failed to normalize manga content type: ${mangaError.message}`
      });
    }
    
    // Success
    return res.status(200).json({
      success: true,
      message: 'Content types normalized successfully'
    });
  } catch (error) {
    console.error('Error in normalize-content-types endpoint:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 