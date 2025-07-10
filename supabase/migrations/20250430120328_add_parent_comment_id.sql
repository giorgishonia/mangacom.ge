-- Add parent_comment_id column to comments table
ALTER TABLE comments
ADD COLUMN parent_comment_id UUID REFERENCES comments(id) NULL;

-- Create an index for better performance when querying replies
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);

-- Remove existing policies if they exist
DO $$ 
BEGIN
    -- Drop policies if they exist
    BEGIN
        DROP POLICY IF EXISTS "Users can create their own comments" ON comments;
    EXCEPTION
        WHEN undefined_object THEN
            NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can view all comments" ON comments;
    EXCEPTION
        WHEN undefined_object THEN
            NULL;
    END;
END $$;

-- Create policies for comments table
CREATE POLICY "Users can create their own comments" ON comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all comments" ON comments 
FOR SELECT 
USING (true);

-- Add update policy to allow users to update their own comments
CREATE POLICY "Users can update their own comments" ON comments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add delete policy to allow users to delete their own comments
CREATE POLICY "Users can delete their own comments" ON comments 
FOR DELETE 
USING (auth.uid() = user_id);
