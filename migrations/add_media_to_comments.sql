-- Add media_url column to comments table
ALTER TABLE comments
ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Create an index for faster querying of comments with media
CREATE INDEX IF NOT EXISTS idx_comments_with_media 
ON comments (content_id, content_type) 
WHERE media_url IS NOT NULL; 