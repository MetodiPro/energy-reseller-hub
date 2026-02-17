
-- Allow project teammates to view each other's profiles
CREATE POLICY "Project teammates can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.project_members pm1
    JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = auth.uid() AND pm2.user_id = profiles.id
  )
);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create team_activity_log table for tracking team changes
CREATE TABLE public.team_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  target_name text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view activity log"
ON public.team_activity_log
FOR SELECT
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can insert activity log"
ON public.team_activity_log
FOR INSERT
WITH CHECK (is_project_member(auth.uid(), project_id) AND user_id = auth.uid());

CREATE INDEX idx_team_activity_log_project ON public.team_activity_log(project_id, created_at DESC);
