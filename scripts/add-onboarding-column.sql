-- Script to add has_completed_onboarding column to profiles table

-- Check if has_completed_onboarding column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'has_completed_onboarding'
  ) THEN
    -- Add the has_completed_onboarding column
    ALTER TABLE profiles ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT false;
    RAISE NOTICE 'has_completed_onboarding column added to profiles table';
  ELSE
    RAISE NOTICE 'has_completed_onboarding column already exists in profiles table';
  END IF;
  
  -- Force a schema cache refresh (only works on Supabase)
  NOTIFY pgrst, 'reload schema';
END $$;

-- Verify the column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'has_completed_onboarding'; 