-- Tabella per i costi personalizzati degli step di processo
CREATE TABLE public.project_step_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  cost_item_id TEXT NOT NULL, -- ID dell'item di costo specifico
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, step_id, cost_item_id)
);

-- Enable RLS
ALTER TABLE public.project_step_costs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Project members can view step costs" 
ON public.project_step_costs 
FOR SELECT 
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can insert step costs" 
ON public.project_step_costs 
FOR INSERT 
WITH CHECK (is_project_member(auth.uid(), project_id) AND created_by = auth.uid());

CREATE POLICY "Project members can update step costs" 
ON public.project_step_costs 
FOR UPDATE 
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can delete step costs" 
ON public.project_step_costs 
FOR DELETE 
USING (is_project_admin(auth.uid(), project_id));

-- Trigger for updated_at
CREATE TRIGGER update_project_step_costs_updated_at
BEFORE UPDATE ON public.project_step_costs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();