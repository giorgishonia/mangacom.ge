-- VIP membership table
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_recurring BOOLEAN DEFAULT FALSE,
  payment_id VARCHAR(100),
  vip_theme VARCHAR(20) DEFAULT 'purple',
  custom_badge VARCHAR(100),
  discord_connected BOOLEAN DEFAULT FALSE,
  discord_id VARCHAR(100)
);

-- Banner image storage
CREATE TABLE IF NOT EXISTS user_banners (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  banner_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  banner_type VARCHAR(20) DEFAULT 'static'  -- 'static', 'animated'
);

-- Ad management
CREATE TABLE IF NOT EXISTS ads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  placement VARCHAR(50) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

-- Stored procedures to track ad metrics
CREATE OR REPLACE FUNCTION increment_ad_impression(ad_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE ads
  SET impressions = impressions + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_ad_click(ad_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE ads
  SET clicks = clicks + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql;

-- Add VIP status and tier to user profiles table
-- Check if the columns already exist before adding them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'vip_status') THEN
    ALTER TABLE profiles ADD COLUMN vip_status BOOLEAN DEFAULT FALSE;
  END IF;

  -- Remove vip_tier from profiles if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'profiles' AND column_name = 'vip_tier') THEN
    ALTER TABLE profiles DROP COLUMN vip_tier;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'vip_theme') THEN
    ALTER TABLE profiles ADD COLUMN vip_theme VARCHAR(20) DEFAULT 'purple';
  END IF;

  -- Add is_public column to profiles if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'is_public') THEN
    ALTER TABLE profiles ADD COLUMN is_public BOOLEAN DEFAULT true;
  END IF;

  -- Add comment_background_url column to profiles if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'comment_background_url') THEN
    ALTER TABLE profiles ADD COLUMN comment_background_url TEXT;
  END IF;
END$$; 