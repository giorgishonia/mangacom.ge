-- Migration script to update the content table

-- Rename alt_titles to alternative_titles
ALTER TABLE public.content 
  RENAME COLUMN alt_titles TO alternative_titles;

-- Change alternative_titles type from JSONB to TEXT[]
ALTER TABLE public.content 
  ALTER COLUMN alternative_titles TYPE TEXT[] USING 
    CASE 
      WHEN alternative_titles IS NULL THEN NULL
      WHEN alternative_titles = '[]'::JSONB THEN '{}'::TEXT[]
      ELSE ARRAY(SELECT jsonb_array_elements_text(alternative_titles))
    END;

-- Change status CHECK constraint to include 'hiatus' instead of 'upcoming'
ALTER TABLE public.content 
  DROP CONSTRAINT IF EXISTS content_status_check;
  
ALTER TABLE public.content 
  ADD CONSTRAINT content_status_check 
  CHECK (status IN ('ongoing', 'completed', 'hiatus'));

-- Add season column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='content' AND column_name='season') THEN
    ALTER TABLE public.content ADD COLUMN season TEXT;
  END IF;
END $$;

-- Add anilist_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='content' AND column_name='anilist_id') THEN
    ALTER TABLE public.content ADD COLUMN anilist_id TEXT;
  END IF;
END $$;

-- Add mal_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='content' AND column_name='mal_id') THEN
    ALTER TABLE public.content ADD COLUMN mal_id TEXT;
  END IF;
END $$;

-- Remove episodes_count and chapters_count if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='content' AND column_name='episodes_count') THEN
    ALTER TABLE public.content DROP COLUMN episodes_count;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='content' AND column_name='chapters_count') THEN
    ALTER TABLE public.content DROP COLUMN chapters_count;
  END IF;
END $$; 