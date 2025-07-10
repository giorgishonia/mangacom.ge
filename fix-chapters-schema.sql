-- Add missing description column to chapters table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'description') THEN
        ALTER TABLE chapters ADD COLUMN description TEXT DEFAULT '';
    END IF;
    
    -- Also add thumbnail if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'thumbnail') THEN
        ALTER TABLE chapters ADD COLUMN thumbnail TEXT DEFAULT '';
    END IF;
    
    -- Add pages column as JSONB if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'pages') THEN
        ALTER TABLE chapters ADD COLUMN pages JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Change pages_count to pages if only pages_count exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'pages_count') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'pages') THEN
        ALTER TABLE chapters ADD COLUMN pages JSONB DEFAULT '[]'::jsonb;
    END IF;
END;
$$; 