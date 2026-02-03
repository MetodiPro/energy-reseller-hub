-- Create table for sales channels configuration per project
CREATE TABLE public.project_sales_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  channel_type TEXT NOT NULL DEFAULT 'custom', -- 'predefined' or 'custom'
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  commission_type TEXT NOT NULL DEFAULT 'per_activation', -- 'per_contract' or 'per_activation'
  activation_rate NUMERIC NOT NULL DEFAULT 85, -- % of contracts that activate for this channel
  contract_share NUMERIC NOT NULL DEFAULT 0, -- % of total contracts from this channel
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure channel names are unique per project
  UNIQUE(project_id, channel_name)
);

-- Enable RLS
ALTER TABLE public.project_sales_channels ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Project members can view sales channels"
  ON public.project_sales_channels
  FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can insert sales channels"
  ON public.project_sales_channels
  FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id) AND created_by = auth.uid());

CREATE POLICY "Project members can update sales channels"
  ON public.project_sales_channels
  FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can delete sales channels"
  ON public.project_sales_channels
  FOR DELETE
  USING (is_project_admin(auth.uid(), project_id));

-- Create trigger for updated_at using existing function
CREATE TRIGGER update_project_sales_channels_updated_at
  BEFORE UPDATE ON public.project_sales_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();