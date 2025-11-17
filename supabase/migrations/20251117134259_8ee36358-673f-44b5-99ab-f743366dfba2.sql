-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project members table with roles
CREATE TYPE public.project_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role project_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Create project invites table
CREATE TABLE public.project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role project_role NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- Create step assignments table
CREATE TABLE public.step_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, step_id, assigned_to)
);

-- Create step comments table
CREATE TABLE public.step_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add project_id to step_progress for shared projects
ALTER TABLE public.step_progress 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_comments ENABLE ROW LEVEL SECURITY;

-- Security definer function to check project membership
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id
  );
$$;

-- Security definer function to check project admin/owner
CREATE OR REPLACE FUNCTION public.is_project_admin(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id 
    AND project_id = _project_id 
    AND role IN ('owner', 'admin')
  );
$$;

-- RLS Policies for projects
CREATE POLICY "Users can view projects they are members of"
ON public.projects FOR SELECT
USING (
  owner_id = auth.uid() OR
  public.is_project_member(auth.uid(), id)
);

CREATE POLICY "Users can create their own projects"
ON public.projects FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Project admins can update projects"
ON public.projects FOR UPDATE
USING (public.is_project_admin(auth.uid(), id));

CREATE POLICY "Project owners can delete projects"
ON public.projects FOR DELETE
USING (owner_id = auth.uid());

-- RLS Policies for project_members
CREATE POLICY "Users can view members of their projects"
ON public.project_members FOR SELECT
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can add members"
ON public.project_members FOR INSERT
WITH CHECK (public.is_project_admin(auth.uid(), project_id));

CREATE POLICY "Project admins can update member roles"
ON public.project_members FOR UPDATE
USING (public.is_project_admin(auth.uid(), project_id));

CREATE POLICY "Project admins can remove members"
ON public.project_members FOR DELETE
USING (public.is_project_admin(auth.uid(), project_id));

-- RLS Policies for project_invites
CREATE POLICY "Users can view invites for their projects"
ON public.project_invites FOR SELECT
USING (
  public.is_project_admin(auth.uid(), project_id) OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Project admins can create invites"
ON public.project_invites FOR INSERT
WITH CHECK (public.is_project_admin(auth.uid(), project_id));

CREATE POLICY "Project admins can update invites"
ON public.project_invites FOR UPDATE
USING (public.is_project_admin(auth.uid(), project_id));

CREATE POLICY "Invited users can update their own invites"
ON public.project_invites FOR UPDATE
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Project admins can delete invites"
ON public.project_invites FOR DELETE
USING (public.is_project_admin(auth.uid(), project_id));

-- RLS Policies for step_assignments
CREATE POLICY "Users can view assignments in their projects"
ON public.step_assignments FOR SELECT
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can create assignments"
ON public.step_assignments FOR INSERT
WITH CHECK (public.is_project_admin(auth.uid(), project_id));

CREATE POLICY "Project admins can update assignments"
ON public.step_assignments FOR UPDATE
USING (public.is_project_admin(auth.uid(), project_id));

CREATE POLICY "Project admins can delete assignments"
ON public.step_assignments FOR DELETE
USING (public.is_project_admin(auth.uid(), project_id));

-- RLS Policies for step_comments
CREATE POLICY "Users can view comments in their projects"
ON public.step_comments FOR SELECT
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can create comments"
ON public.step_comments FOR INSERT
WITH CHECK (
  public.is_project_member(auth.uid(), project_id) AND
  user_id = auth.uid()
);

CREATE POLICY "Users can update their own comments"
ON public.step_comments FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON public.step_comments FOR DELETE
USING (user_id = auth.uid());

-- Update step_progress RLS to support shared projects
DROP POLICY IF EXISTS "Users can view own progress" ON public.step_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.step_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.step_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.step_progress;

CREATE POLICY "Users can view own progress or project progress"
ON public.step_progress FOR SELECT
USING (
  user_id = auth.uid() OR
  (project_id IS NOT NULL AND public.is_project_member(auth.uid(), project_id))
);

CREATE POLICY "Users can insert own progress or project progress"
ON public.step_progress FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  (project_id IS NULL OR public.is_project_member(auth.uid(), project_id))
);

CREATE POLICY "Users can update own progress or project progress"
ON public.step_progress FOR UPDATE
USING (
  user_id = auth.uid() OR
  (project_id IS NOT NULL AND public.is_project_member(auth.uid(), project_id))
);

CREATE POLICY "Users can delete own progress or project progress"
ON public.step_progress FOR DELETE
USING (
  user_id = auth.uid() OR
  (project_id IS NOT NULL AND public.is_project_admin(auth.uid(), project_id))
);

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_step_comments_updated_at
BEFORE UPDATE ON public.step_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to automatically add owner as project member
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_project_created
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();