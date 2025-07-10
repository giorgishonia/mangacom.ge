-- Migration: Enable RLS on friends table and allow users to view their own friendships

-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.friends (
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  friend_id uuid REFERENCES auth.users ON DELETE CASCADE,
  status text CHECK (status IN ('pending','accepted','blocked')) NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Policy: a user can see rows where they are either the requester or recipient
DROP POLICY IF EXISTS friends_select ON public.friends;
CREATE POLICY friends_select ON public.friends
FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = friend_id
); 