-- Add wholesaler configuration fields to project_revenue_simulations
ALTER TABLE public.project_revenue_simulations
ADD COLUMN IF NOT EXISTS pun_override numeric NULL,
ADD COLUMN IF NOT EXISTS pun_auto_update boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS gestione_pod_per_pod numeric DEFAULT 2.50,
ADD COLUMN IF NOT EXISTS deposito_cauzionale_mesi integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS deposito_percentuale_attivazione numeric DEFAULT 85;

-- Add commodity_type filter to project_costs for filtering
ALTER TABLE public.project_costs
ADD COLUMN IF NOT EXISTS commodity_filter text NULL;

-- Add commodity_type filter to project_revenues
ALTER TABLE public.project_revenues
ADD COLUMN IF NOT EXISTS commodity_filter text NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_project_costs_commodity_filter ON public.project_costs(commodity_filter);
CREATE INDEX IF NOT EXISTS idx_project_revenues_commodity_filter ON public.project_revenues(commodity_filter);

-- Add comments for documentation
COMMENT ON COLUMN public.project_revenue_simulations.pun_override IS 'User override for PUN price (€/MWh)';
COMMENT ON COLUMN public.project_revenue_simulations.pun_auto_update IS 'Whether to auto-update PUN from GME';
COMMENT ON COLUMN public.project_revenue_simulations.gestione_pod_per_pod IS 'Gestione POD fee per active POD (€/month)';
COMMENT ON COLUMN public.project_revenue_simulations.deposito_cauzionale_mesi IS 'Months for wholesaler security deposit (3 or 6)';
COMMENT ON COLUMN public.project_revenue_simulations.deposito_percentuale_attivazione IS 'Expected activation rate for deposit calculation';
COMMENT ON COLUMN public.project_costs.commodity_filter IS 'Filter: luce, gas, or null for both';
COMMENT ON COLUMN public.project_revenues.commodity_filter IS 'Filter: luce, gas, or null for both';