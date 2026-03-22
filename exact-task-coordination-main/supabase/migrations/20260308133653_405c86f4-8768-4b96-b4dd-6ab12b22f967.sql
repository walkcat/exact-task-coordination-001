
-- Create role enum
CREATE TYPE public.project_role AS ENUM ('admin', 'project_manager', 'member', 'guest');

-- Create project_roles table
CREATE TABLE public.project_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  role project_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);

-- Enable RLS
ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check project role
CREATE OR REPLACE FUNCTION public.has_project_role(_user_id UUID, _project_id UUID, _role project_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_roles
    WHERE user_id = _user_id
      AND project_id = _project_id
      AND role = _role
  )
$$;

-- Function to get user's role in a project
CREATE OR REPLACE FUNCTION public.get_project_role(_user_id UUID, _project_id UUID)
RETURNS project_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.project_roles
  WHERE user_id = _user_id
    AND project_id = _project_id
  LIMIT 1
$$;

-- RLS: Everyone authenticated can view project roles
CREATE POLICY "Authenticated users can view project roles"
ON public.project_roles
FOR SELECT
TO authenticated
USING (true);

-- RLS: Only admin can insert project roles (use is_admin function for global admin)
CREATE POLICY "Admin can manage project roles"
ON public.project_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR public.has_project_role(auth.uid(), project_id, 'admin')
  OR public.has_project_role(auth.uid(), project_id, 'project_manager')
);

-- RLS: Only admin can update project roles
CREATE POLICY "Admin can update project roles"
ON public.project_roles
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR public.has_project_role(auth.uid(), project_id, 'admin')
);

-- RLS: Only admin can delete project roles
CREATE POLICY "Admin can delete project roles"
ON public.project_roles
FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR public.has_project_role(auth.uid(), project_id, 'admin')
);

-- Update tasks RLS: guests can only view
-- First drop existing policies that allow all authenticated users to modify
DROP POLICY IF EXISTS "Authenticated users can update all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;

-- Recreate with role-based access
-- Insert: admin, project_manager, member can insert
CREATE POLICY "Role-based insert tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.is_admin()
    OR public.get_project_role(auth.uid(), project_id) IN ('admin', 'project_manager', 'member')
    OR public.get_project_role(auth.uid(), project_id) IS NULL
  )
);

-- Update: admin, project_manager can update all; member can update own tasks
CREATE POLICY "Role-based update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR public.get_project_role(auth.uid(), project_id) IN ('admin', 'project_manager')
  OR (public.get_project_role(auth.uid(), project_id) = 'member' AND user_id = auth.uid())
  OR public.get_project_role(auth.uid(), project_id) IS NULL
);

-- Delete: admin, project_manager can delete all; member can delete own tasks
CREATE POLICY "Role-based delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR public.get_project_role(auth.uid(), project_id) IN ('admin', 'project_manager')
  OR (public.get_project_role(auth.uid(), project_id) = 'member' AND user_id = auth.uid())
  OR public.get_project_role(auth.uid(), project_id) IS NULL
);
