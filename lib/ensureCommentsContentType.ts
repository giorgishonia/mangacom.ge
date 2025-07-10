import { supabase } from './supabase';

/**
 * This function ensures the content_type column in the comments table 
 * accepts both uppercase and lowercase values by updating the check constraint.
 */
export async function ensureCommentsContentTypeConstraint(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // First check if this migration has already been applied
    const { data: migrationData, error: migrationError } = await supabase
      .from('_migration_history')
      .select('*')
      .eq('migration_name', 'fix_comments_content_type_constraint')
      .single();
    
    if (!migrationError && migrationData) {
      console.log('Content type constraint migration already applied');
      return { success: true, message: 'Content type constraint already fixed' };
    }
    
    // Call an RPC that we will create to handle the constraint modification
    const { error } = await supabase.rpc('drop_and_recreate_content_type_constraint');
    
    if (error) {
      console.error('Error fixing content type constraint:', error);
      
      if (error.message.includes('function "drop_and_recreate_content_type_constraint" does not exist')) {
        // Call the API endpoint that will create the function and apply the fix
        try {
          const response = await fetch('/api/db/fix-content-type-constraint', {
            method: 'POST',
          });
          const result = await response.json();
          
          if (!result.success) {
            return { success: false, message: result.message || 'Failed to apply constraint fix through API' };
          }
          
          // Record this migration
          await supabase
            .from('_migration_history')
            .insert({
              migration_name: 'fix_comments_content_type_constraint',
              applied_at: new Date().toISOString(),
              details: 'Fixed content_type constraint to accept both uppercase and lowercase values'
            });
          
          return { success: true, message: 'Content type constraint fixed successfully via API' };
        } catch (apiError) {
          console.error('Error calling fix API:', apiError);
          return { success: false, message: 'Failed to call constraint fix API' };
        }
      }
      
      return { success: false, message: `Failed to fix content type constraint: ${error.message}` };
    }
    
    // Record this migration
    await supabase
      .from('_migration_history')
      .insert({
        migration_name: 'fix_comments_content_type_constraint',
        applied_at: new Date().toISOString(),
        details: 'Fixed content_type constraint to accept both uppercase and lowercase values'
      });
    
    return { success: true, message: 'Content type constraint fixed successfully' };
  } catch (error) {
    console.error('Error ensuring content type constraint:', error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'Unknown error fixing content type constraint' };
  }
}

/**
 * This function normalizes existing content_type values in the database
 * to ensure they all use the same case (uppercase).
 */
export async function normalizeCommentsContentType(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Call the API endpoint that will update existing entries
    try {
      const response = await fetch('/api/db/normalize-content-types', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (!result.success) {
        return { success: false, message: result.message || 'Failed to normalize content types through API' };
      }
      
      return { success: true, message: 'Content types normalized successfully via API' };
    } catch (apiError) {
      console.error('Error calling normalize API:', apiError);
      return { success: false, message: 'Failed to call normalize content types API' };
    }
  } catch (error) {
    console.error('Error normalizing content types:', error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'Unknown error normalizing content types' };
  }
}

/**
 * Function to call from a component to ensure everything is fixed
 */
export async function fixCommentsTable(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // First ensure the constraint is correctly set
    const constraintResult = await ensureCommentsContentTypeConstraint();
    if (!constraintResult.success) {
      return constraintResult;
    }
    
    // Then normalize existing values
    const normalizeResult = await normalizeCommentsContentType();
    if (!normalizeResult.success) {
      return { 
        success: false, 
        message: `Constraint fixed but failed to normalize values: ${normalizeResult.message}` 
      };
    }
    
    return { success: true, message: 'Comments table content_type issues fixed successfully' };
  } catch (error) {
    console.error('Error fixing comments table:', error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'Unknown error fixing comments table' };
  }
} 