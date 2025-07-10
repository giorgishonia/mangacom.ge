-- Fix ALL RLS issues across the database
-- This script enables RLS on all tables and adds appropriate policies

-- 1. Fix episodes table
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public episodes are viewable by everyone" ON episodes;
DROP POLICY IF EXISTS "Allow authenticated users to read episodes" ON episodes;

-- Create policy for anonymous users to read episodes
CREATE POLICY "Public episodes are viewable by everyone" 
ON episodes FOR SELECT 
USING (true);

-- 2. Fix feedback table
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous users to read feedback
CREATE POLICY "Public feedback is viewable by everyone" 
ON feedback FOR SELECT 
USING (true);

-- Create policy for authenticated users to create feedback
CREATE POLICY "Authenticated users can create feedback" 
ON feedback FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Fix suggestions table
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous users to read suggestions
CREATE POLICY "Public suggestions are viewable by everyone" 
ON suggestions FOR SELECT 
USING (true);

-- Create policy for authenticated users to create suggestions
CREATE POLICY "Authenticated users can create suggestions" 
ON suggestions FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Fix votes table
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous users to read votes
CREATE POLICY "Public votes are viewable by everyone" 
ON votes FOR SELECT 
USING (true);

-- Create policy for authenticated users to manage their own votes
CREATE POLICY "Authenticated users can manage their own votes" 
ON votes FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Fix user_memberships table
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read memberships
CREATE POLICY "Users can view all memberships" 
ON user_memberships FOR SELECT 
USING (true);

-- Create policy for users to manage their own memberships
CREATE POLICY "Users can manage their own memberships" 
ON user_memberships FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Fix user_banners table
ALTER TABLE user_banners ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read banners
CREATE POLICY "Users can view all banners" 
ON user_banners FOR SELECT 
USING (true);

-- Create policy for users to manage their own banners
CREATE POLICY "Users can manage their own banners" 
ON user_banners FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7. Fix ads table
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Create policy for everyone to view ads
CREATE POLICY "Everyone can view ads" 
ON ads FOR SELECT 
USING (true);

-- Create policy for admins to manage ads
CREATE POLICY "Admins can manage ads" 
ON ads FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 8. Original RLS fixes for core tables

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

-- Update storage bucket policies if the storage schema exists
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