-- Add release_year column to content table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'content'
      AND column_name = 'release_year'
  ) THEN
    ALTER TABLE public.content ADD COLUMN release_year INTEGER;
  END IF;
END $$; 