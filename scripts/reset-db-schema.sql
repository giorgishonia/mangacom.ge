-- Reset content table
DROP TABLE IF EXISTS content CASCADE;

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  alternative_titles TEXT[] DEFAULT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('manga', 'comics')),
  status TEXT NOT NULL CHECK (status IN ('ongoing', 'completed', 'hiatus')),
  thumbnail TEXT NOT NULL,
  banner_image TEXT DEFAULT NULL,
  genres TEXT[] NOT NULL,
  season TEXT DEFAULT NULL,
  release_year INTEGER DEFAULT NULL,
  rating DECIMAL(3,1) DEFAULT 0,
  anilist_id TEXT DEFAULT NULL,
  mal_id TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reset chapters table
DROP TABLE IF EXISTS chapters CASCADE;

CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  thumbnail TEXT DEFAULT NULL,
  pages TEXT[] NOT NULL,
  release_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, number)
);

-- Create indexes for better performance
CREATE INDEX content_type_idx ON content(type);
CREATE INDEX content_genres_idx ON content USING GIN(genres);
CREATE INDEX chapters_content_id_idx ON chapters(content_id);

-- Remove Episodes table
-- CREATE TABLE episodes (
-- id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
-- content_id UUID REFERENCES content(id) ON DELETE CASCADE,
-- number INTEGER NOT NULL,
-- title TEXT,
-- air_date DATE,
-- duration INTEGER,
-- thumbnail_url TEXT,
-- video_url TEXT,
-- created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

CREATE TABLE watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('manga', 'comics')),
    status TEXT,
    progress INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('manga', 'comics')),
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NULLABLE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('manga', 'comics', 'sticker', 'gif')),
    feedback_type TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
); 