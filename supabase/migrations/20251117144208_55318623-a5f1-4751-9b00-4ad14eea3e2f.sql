-- Create business_plans table
CREATE TABLE public.business_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  executive_summary TEXT,
  company_description TEXT,
  market_analysis TEXT,
  organization TEXT,
  products_services TEXT,
  marketing_strategy TEXT,
  financial_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;

-- Project members can view business plans
CREATE POLICY "Project members can view business plans"
ON public.business_plans
FOR SELECT
USING (is_project_member(auth.uid(), project_id));

-- Project members can create business plans
CREATE POLICY "Project members can create business plans"
ON public.business_plans
FOR INSERT
WITH CHECK (is_project_member(auth.uid(), project_id));

-- Project members can update business plans
CREATE POLICY "Project members can update business plans"
ON public.business_plans
FOR UPDATE
USING (is_project_member(auth.uid(), project_id));

-- Project admins can delete business plans
CREATE POLICY "Project admins can delete business plans"
ON public.business_plans
FOR DELETE
USING (is_project_admin(auth.uid(), project_id));

-- Add trigger for updated_at
CREATE TRIGGER update_business_plans_updated_at
BEFORE UPDATE ON public.business_plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
