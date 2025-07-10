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
    
    // First, try to drop the existing constraint
    const { error: dropError } = await supabaseAdmin.rpc('drop_comments_content_type_constraint');
    
    if (dropError) {
      console.error('Error dropping content_type constraint:', dropError);
      
      // If the error is that the RPC doesn't exist, we need to create it first
      if (dropError.message.includes('does not exist')) {
        // Create the RPC functions first
        // This would require direct SQL access which is not available in the Edge runtime
        // We would need to implement this in a server-side context with direct database access
        
        return res.status(500).json({
          success: false,
          message: 'Could not drop content_type constraint: SQL function not found'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: `Failed to drop content_type constraint: ${dropError.message}`
      });
    }
    
    // Now add the new constraint that accepts both upper and lowercase values
    const { error: addError } = await supabaseAdmin.rpc('add_comments_content_type_constraint');
    
    if (addError) {
      console.error('Error adding new content_type constraint:', addError);
      return res.status(500).json({
        success: false,
        message: `Failed to add new content_type constraint: ${addError.message}`
      });
    }
    
    // Success
    return res.status(200).json({
      success: true,
      message: 'Content type constraint updated successfully'
    });
  } catch (error) {
    console.error('Error in fix-content-type-constraint endpoint:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 