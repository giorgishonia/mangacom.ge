-- Create suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('anime', 'manga', 'sticker', 'gif')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS suggestion_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Add unique constraint to prevent duplicate votes
  UNIQUE(suggestion_id, user_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS suggestion_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to increment vote count
CREATE OR REPLACE FUNCTION increment_vote_count(suggestion_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE suggestions
  SET vote_count = vote_count + 1
  WHERE id = suggestion_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to decrement vote count
CREATE OR REPLACE FUNCTION decrement_vote_count(suggestion_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE suggestions
  SET vote_count = GREATEST(0, vote_count - 1)
  WHERE id = suggestion_id;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for the suggestions table
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Everyone can read suggestions
CREATE POLICY suggestion_read_policy ON suggestions
  FOR SELECT USING (true);

-- Only authenticated users can insert suggestions
CREATE POLICY suggestion_insert_policy ON suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update or delete their own suggestions
CREATE POLICY suggestion_update_policy ON suggestions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY suggestion_delete_policy ON suggestions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for the votes table
ALTER TABLE suggestion_votes ENABLE ROW LEVEL SECURITY;

-- Everyone can read votes
CREATE POLICY vote_read_policy ON suggestion_votes
  FOR SELECT USING (true);

-- Only authenticated users can insert votes and only for themselves
CREATE POLICY vote_insert_policy ON suggestion_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own votes
CREATE POLICY vote_delete_policy ON suggestion_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for the comments table
ALTER TABLE suggestion_comments ENABLE ROW LEVEL SECURITY;

-- Everyone can read comments
CREATE POLICY comment_read_policy ON suggestion_comments
  FOR SELECT USING (true);

-- Only authenticated users can insert comments and only for themselves
CREATE POLICY comment_insert_policy ON suggestion_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update or delete their own comments
CREATE POLICY comment_update_policy ON suggestion_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY comment_delete_policy ON suggestion_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_suggestions_type ON suggestions(type);
CREATE INDEX idx_suggestions_vote_count ON suggestions(vote_count DESC);
CREATE INDEX idx_suggestion_votes_suggestion_id ON suggestion_votes(suggestion_id);
CREATE INDEX idx_suggestion_votes_user_id ON suggestion_votes(user_id);
CREATE INDEX idx_suggestion_comments_suggestion_id ON suggestion_comments(suggestion_id); 