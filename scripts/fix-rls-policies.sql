-- Fix RLS policies to ensure content and chapters are readable by anonymous users
-- This script adds policies that allow both authenticated and anonymous users to read content

-- Enable RLS on content table if not already enabled
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public content is viewable by everyone" ON content;
DROP POLICY IF EXISTS "Authenticated users can view content" ON content;

-- Create policy for anonymous users to read content
CREATE POLICY "Public content is viewable by everyone" 
ON content FOR SELECT 
USING (true);

-- Enable RLS on chapters table if not already enabled
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public chapters are viewable by everyone" ON chapters;
DROP POLICY IF EXISTS "Authenticated users can view chapters" ON chapters;

-- Create policy for anonymous users to read chapters
CREATE POLICY "Public chapters are viewable by everyone" 
ON chapters FOR SELECT 
USING (true);

-- Make sure profiles table has proper policies for avatar access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- Make sure comments table has proper policies for anonymous access
DROP POLICY IF EXISTS "Public comments are viewable by everyone" ON comments;

CREATE POLICY "Public comments are viewable by everyone" 
ON comments FOR SELECT 
USING (true);

-- Update storage bucket policies
-- Make avatars bucket public if it exists
DO $$
BEGIN
  -- Check if the storage schema and buckets table exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    -- Update the bucket to be public
    UPDATE storage.buckets 
    SET public = true 
    WHERE name = 'avatars';
    
    -- Log the change
    RAISE NOTICE 'Updated avatars bucket to be public';
  ELSE
    RAISE NOTICE 'Storage schema or buckets table not found - skipping bucket update';
  END IF;
END $$; 