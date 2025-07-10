-- Script to add banner column to profiles table

-- Check if banner column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'banner'
  ) THEN
    -- Add the banner column
    ALTER TABLE profiles ADD COLUMN banner TEXT DEFAULT '';
    RAISE NOTICE 'Banner column added to profiles table';
  ELSE
    RAISE NOTICE 'Banner column already exists in profiles table';
  END IF;
  
  -- Force a schema cache refresh (only works on Supabase)
  NOTIFY pgrst, 'reload schema';
END $$;

-- Verify the column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'banner'; 