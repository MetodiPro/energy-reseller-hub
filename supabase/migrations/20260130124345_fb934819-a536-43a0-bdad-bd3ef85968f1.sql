-- Add new columns to project_costs for hypothesis tracking and calculation parameters
ALTER TABLE public.project_costs 
ADD COLUMN IF NOT EXISTS calculation_basis TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS calculation_params JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_passthrough BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS passthrough_recipient TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.project_costs.calculation_basis IS 'Human-readable explanation of how this cost was calculated (e.g., "500 clienti x €8/cliente/mese")';
COMMENT ON COLUMN public.project_costs.calculation_params IS 'Structured calculation parameters: num_clients, price_per_client, price_per_kwh, etc.';
COMMENT ON COLUMN public.project_costs.is_passthrough IS 'True if this cost is passed through to wholesaler (not affecting operator margin)';
COMMENT ON COLUMN public.project_costs.passthrough_recipient IS 'Entity receiving passthrough payments: grossista, distributore, erario, etc.';

-- Create a new table for taxes and levies specific to energy resellers
CREATE TABLE IF NOT EXISTS public.project_taxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tax_type TEXT NOT NULL, -- accise_energia, accise_gas, addizionali_comunali, addizionali_regionali, iva, csea, arera, oneri_sistema
  name TEXT NOT NULL,
  description TEXT,
  recipient TEXT NOT NULL, -- ADM, Comune, Regione, Erario, CSEA, ARERA, Distributore
  
  -- Calculation parameters
  rate_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, per_unit, fixed
  rate_value NUMERIC NOT NULL DEFAULT 0,
  rate_unit TEXT, -- %, €/kWh, €/Smc, €/cliente, €
  base_amount NUMERIC DEFAULT 0, -- Base for calculation (estimated consumption, revenue, etc.)
  base_unit TEXT, -- kWh, Smc, €, clienti
  
  -- Calculated or manual amount
  calculated_amount NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN rate_type = 'percentage' THEN (base_amount * rate_value / 100)
      WHEN rate_type = 'per_unit' THEN (base_amount * rate_value)
      WHEN rate_type = 'fixed' THEN rate_value
      ELSE 0
    END
  ) STORED,
  
  -- Periods and recurrence
  is_recurring BOOLEAN DEFAULT true,
  recurrence_period TEXT DEFAULT 'monthly', -- monthly, quarterly, yearly
  due_day INTEGER, -- Day of month/quarter when due
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  calculation_hypothesis TEXT, -- Explanation of how estimates were made
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_taxes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Project members can view taxes"
  ON public.project_taxes FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can insert taxes"
  ON public.project_taxes FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id) AND created_by = auth.uid());

CREATE POLICY "Project members can update taxes"
  ON public.project_taxes FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can delete taxes"
  ON public.project_taxes FOR DELETE
  USING (is_project_admin(auth.uid(), project_id));

-- Add hypothesis fields to revenues as well
ALTER TABLE public.project_revenues
ADD COLUMN IF NOT EXISTS calculation_basis TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS calculation_params JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS margin_type TEXT DEFAULT 'fixed'; -- fixed, per_client, per_kwh, percentage

COMMENT ON COLUMN public.project_revenues.calculation_basis IS 'Human-readable explanation (e.g., "500 clienti x €8 margine medio/mese")';
COMMENT ON COLUMN public.project_revenues.calculation_params IS 'Structured params: num_clients, margin_per_client, margin_per_kwh, etc.';
COMMENT ON COLUMN public.project_revenues.margin_type IS 'Type of margin calculation: fixed, per_client, per_kwh, percentage';