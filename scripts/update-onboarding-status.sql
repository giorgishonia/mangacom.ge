-- Script to update has_completed_onboarding field based on profile data

-- Update profiles where onboarding field is NULL but the profile has core fields filled
UPDATE profiles
SET has_completed_onboarding = true
WHERE 
  (has_completed_onboarding IS NULL OR has_completed_onboarding = false)
  AND username IS NOT NULL 
  -- If the profile has first_name, or interests, consider it complete
  AND (
    first_name IS NOT NULL 
    OR interests IS NOT NULL AND array_length(interests, 1) > 0 
    OR bio IS NOT NULL
  );

-- Log the number of profiles updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '% profile(s) had their onboarding status updated', updated_count;
END $$; 