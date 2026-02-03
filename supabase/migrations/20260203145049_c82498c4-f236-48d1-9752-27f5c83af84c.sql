-- Aggiunge lo spread applicato dal grossista al reseller (separato dallo spread applicato al cliente)
ALTER TABLE public.project_revenue_simulations 
ADD COLUMN IF NOT EXISTS spread_grossista_per_kwh numeric DEFAULT 0.008;

-- Commento per chiarezza
COMMENT ON COLUMN public.project_revenue_simulations.spread_grossista_per_kwh IS 'Spread applicato dal grossista al reseller (€/kWh) - è un COSTO per il reseller';
COMMENT ON COLUMN public.project_revenue_simulations.spread_per_kwh IS 'Spread applicato dal reseller al cliente finale (€/kWh) - è un RICAVO per il reseller';