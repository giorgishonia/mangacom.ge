-- Add banner_image column to content table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'content'
      AND column_name = 'banner_image'
  ) THEN
    ALTER TABLE public.content ADD COLUMN banner_image TEXT;
  END IF;
END $$; 