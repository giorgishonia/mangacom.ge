-- Create suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('manga', 'sticker', 'gif', 'comics')),
  image_url TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create RLS policies for suggestions
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to suggestions" 
  ON suggestions 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow authenticated users to create suggestions" 
  ON suggestions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own suggestions" 
  ON suggestions 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own suggestions" 
  ON suggestions 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, suggestion_id)
);

-- Create RLS policies for votes
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read votes" 
  ON votes 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to vote" 
  ON votes 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to remove their own votes" 
  ON votes 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create RLS policies for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to comments" 
  ON comments 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow authenticated users to create comments" 
  ON comments 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own comments" 
  ON comments 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own comments" 
  ON comments 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Create stored procedures to increment and decrement vote counts
CREATE OR REPLACE FUNCTION increment_vote_count(sid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE suggestions
  SET vote_count = vote_count + 1
  WHERE id = sid;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_vote_count(sid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE suggestions
  SET vote_count = vote_count - 1
  WHERE id = sid;
END;
$$;

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_suggestions_timestamp
BEFORE UPDATE ON suggestions
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_comments_timestamp
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TABLE feedback (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp WITH time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('manga', 'sticker', 'gif', 'comics')),
    image_url TEXT,
    vote_count INTEGER NOT NULL DEFAULT 0,
    updated_at timestamp with time zone default now()
); 