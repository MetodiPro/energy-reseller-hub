
-- 1. Table for persisting notification read state
CREATE TABLE public.user_notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_id text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification reads"
ON public.user_notification_reads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification reads"
ON public.user_notification_reads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification reads"
ON public.user_notification_reads FOR DELETE
USING (auth.uid() = user_id);

-- 2. Table for persisting pre-launch manual checks per project
CREATE TABLE public.prelaunch_manual_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  check_id text NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  checked_by uuid NOT NULL,
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, check_id)
);

ALTER TABLE public.prelaunch_manual_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view manual checks"
ON public.prelaunch_manual_checks FOR SELECT
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can insert manual checks"
ON public.prelaunch_manual_checks FOR INSERT
WITH CHECK (is_project_member(auth.uid(), project_id) AND checked_by = auth.uid());

CREATE POLICY "Project members can update manual checks"
ON public.prelaunch_manual_checks FOR UPDATE
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can delete manual checks"
ON public.prelaunch_manual_checks FOR DELETE
USING (is_project_admin(auth.uid(), project_id));
