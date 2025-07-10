-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- Reference to auth.users but without a foreign key constraint
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('anime', 'manga', 'comics')),
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups by content
CREATE INDEX IF NOT EXISTS idx_comments_content ON comments(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- Create row level security policies
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy for selecting (everyone can read)
CREATE POLICY select_comments ON comments 
  FOR SELECT USING (true);

-- Policy for inserting (authenticated users can add comments)
CREATE POLICY insert_comments ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for updating (only the comment author can update)
CREATE POLICY update_comments ON comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy for deleting (only the comment author can delete)
CREATE POLICY delete_comments ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp when comments are updated
CREATE TRIGGER set_comment_timestamp
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_timestamp(); 