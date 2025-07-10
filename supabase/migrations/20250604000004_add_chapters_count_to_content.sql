-- Add chapters_count column to content table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'content'
      AND column_name = 'chapters_count'
  ) THEN
    ALTER TABLE public.content ADD COLUMN chapters_count INTEGER DEFAULT 0;
  END IF;
END $$; 