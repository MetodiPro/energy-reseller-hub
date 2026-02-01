-- Create table for revenue simulation configuration per project
CREATE TABLE public.project_revenue_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Start date
  start_date DATE NOT NULL DEFAULT '2026-01-01',
  
  -- Monthly contracts target (12 months as JSONB array)
  monthly_contracts JSONB NOT NULL DEFAULT '[30, 40, 50, 60, 70, 80, 90, 100, 100, 100, 100, 100]',
  
  -- Consumption params
  avg_monthly_consumption NUMERIC NOT NULL DEFAULT 200,
  activation_rate NUMERIC NOT NULL DEFAULT 85,
  
  -- Price components
  ccv_monthly NUMERIC NOT NULL DEFAULT 8.50,
  spread_per_kwh NUMERIC NOT NULL DEFAULT 0.015,
  other_services_monthly NUMERIC NOT NULL DEFAULT 0,
  
  -- Collection rates
  collection_month_0 NUMERIC NOT NULL DEFAULT 70,
  collection_month_1 NUMERIC NOT NULL DEFAULT 18,
  collection_month_2 NUMERIC NOT NULL DEFAULT 7,
  collection_month_3_plus NUMERIC NOT NULL DEFAULT 3,
  uncollectible_rate NUMERIC NOT NULL DEFAULT 2,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One config per project
  CONSTRAINT unique_project_simulation UNIQUE (project_id)
);

-- Enable RLS
ALTER TABLE public.project_revenue_simulations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Project members can view simulations"
ON public.project_revenue_simulations
FOR SELECT
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can insert simulations"
ON public.project_revenue_simulations
FOR INSERT
WITH CHECK (is_project_member(auth.uid(), project_id) AND created_by = auth.uid());

CREATE POLICY "Project members can update simulations"
ON public.project_revenue_simulations
FOR UPDATE
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can delete simulations"
ON public.project_revenue_simulations
FOR DELETE
USING (is_project_admin(auth.uid(), project_id));

-- Trigger for updated_at
CREATE TRIGGER update_project_revenue_simulations_updated_at
BEFORE UPDATE ON public.project_revenue_simulations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();