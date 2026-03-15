
CREATE TABLE public.compliance_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'da_verificare',
  last_verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  verified_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (project_id, check_id)
);

ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view compliance checks"
  ON public.compliance_checks FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can insert compliance checks"
  ON public.compliance_checks FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can update compliance checks"
  ON public.compliance_checks FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can delete compliance checks"
  ON public.compliance_checks FOR DELETE
  USING (is_project_admin(auth.uid(), project_id));
