-- 20250602000001_add_profiles_insert_policy.sql
-- Adds RLS policy allowing authenticated users to insert their own profile row

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY IF NOT EXISTS "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id); 