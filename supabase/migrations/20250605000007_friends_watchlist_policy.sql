-- Migration: Allow friends to view each other's watchlist

ALTER TABLE IF EXISTS public.watchlist ENABLE ROW LEVEL SECURITY;

-- Policy so a user can view their own rows OR rows of accepted friends

-- First drop any existing copy to prevent conflicts during reruns
DROP POLICY IF EXISTS friends_watchlist_select ON public.watchlist;

CREATE POLICY friends_watchlist_select ON public.watchlist
FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.friends f
    WHERE f.status = 'accepted'
      AND (
        (f.user_id = auth.uid() AND f.friend_id = user_id) OR
        (f.user_id = user_id AND f.friend_id = auth.uid())
      )
  )
); 