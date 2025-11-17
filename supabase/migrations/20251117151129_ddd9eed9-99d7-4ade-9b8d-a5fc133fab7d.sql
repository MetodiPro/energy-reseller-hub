-- Create marketing_plans table
CREATE TABLE public.marketing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  target_market TEXT,
  acquisition_strategy TEXT,
  pricing_strategy TEXT,
  competitive_positioning TEXT,
  communication_channels TEXT,
  budget_allocation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_plans ENABLE ROW LEVEL SECURITY;

-- Project members can view marketing plans
CREATE POLICY "Project members can view marketing plans"
ON public.marketing_plans
FOR SELECT
USING (is_project_member(auth.uid(), project_id));

-- Project members can create marketing plans
CREATE POLICY "Project members can create marketing plans"
ON public.marketing_plans
FOR INSERT
WITH CHECK (is_project_member(auth.uid(), project_id));

-- Project members can update marketing plans
CREATE POLICY "Project members can update marketing plans"
ON public.marketing_plans
FOR UPDATE
USING (is_project_member(auth.uid(), project_id));

-- Project admins can delete marketing plans
CREATE POLICY "Project admins can delete marketing plans"
ON public.marketing_plans
FOR DELETE
USING (is_project_admin(auth.uid(), project_id));

-- Add trigger for updated_at
CREATE TRIGGER update_marketing_plans_updated_at
BEFORE UPDATE ON public.marketing_plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();