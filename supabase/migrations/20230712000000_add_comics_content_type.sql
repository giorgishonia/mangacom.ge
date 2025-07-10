-- Modify the content table to support 'comics' content type
ALTER TABLE "content" DROP CONSTRAINT IF EXISTS "content_type_check";
ALTER TABLE "content" ADD CONSTRAINT "content_type_check" CHECK (type IN ('manga', 'comics'));

-- Add specific policies for comics
CREATE POLICY "Enable read access for comics for all users" ON "content"
FOR SELECT
USING (type = 'comics');

-- Update existing select policy
DROP POLICY IF EXISTS "Enable read access for all users" ON "content";
CREATE POLICY "Enable read access for all users" ON "content"
FOR SELECT
USING (type IN ('manga', 'comics'));

-- Add a comment to the comics type
COMMENT ON COLUMN "content"."type" IS 'Content type: manga or comics';

-- Add a comment to the migration
COMMENT ON DATABASE MIGRATION IS 'Added support for comics content type'; 