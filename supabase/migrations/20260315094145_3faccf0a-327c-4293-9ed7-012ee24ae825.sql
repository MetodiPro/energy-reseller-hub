
-- Create crm_clients table
CREATE TABLE public.crm_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  pod_pdr_code TEXT,
  contract_status TEXT NOT NULL DEFAULT 'attivo',
  activation_date DATE,
  annual_consumption_kwh NUMERIC DEFAULT 0,
  monthly_margin NUMERIC DEFAULT 0,
  contract_expiry_date DATE,
  commodity_type TEXT DEFAULT 'luce',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Project members can view crm clients"
  ON public.crm_clients FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can insert crm clients"
  ON public.crm_clients FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id) AND created_by = auth.uid());

CREATE POLICY "Project members can update crm clients"
  ON public.crm_clients FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can delete crm clients"
  ON public.crm_clients FOR DELETE
  USING (is_project_admin(auth.uid(), project_id));
