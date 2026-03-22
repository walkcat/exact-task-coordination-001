
-- Create admin role check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'email') = '17358716@qq.com'
$$;

-- Replace insert policy: only admin can create projects
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
CREATE POLICY "Only admin can insert projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND auth.uid() = user_id);

-- Replace delete policy: only admin can delete projects
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Only admin can delete projects" ON public.projects
  FOR DELETE TO authenticated
  USING (public.is_admin() AND auth.uid() = user_id);

-- Keep update policy for admin only (rename)
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Only admin can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_admin() AND auth.uid() = user_id);

-- All authenticated users can view all projects (so they can use them)
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Authenticated users can view all projects" ON public.projects
  FOR SELECT TO authenticated
  USING (true);
