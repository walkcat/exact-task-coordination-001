
-- Drop existing restrictive policies on tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

-- Create new policies allowing all authenticated users full access
CREATE POLICY "Authenticated users can view all tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (true);
