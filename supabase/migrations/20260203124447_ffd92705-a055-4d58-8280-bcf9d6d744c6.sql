-- Add VAT payment regime configuration to project_revenue_simulations
ALTER TABLE public.project_revenue_simulations
ADD COLUMN IF NOT EXISTS iva_payment_regime text DEFAULT 'monthly' CHECK (iva_payment_regime IN ('monthly', 'quarterly'));

-- Add comment for documentation
COMMENT ON COLUMN public.project_revenue_simulations.iva_payment_regime IS 'IVA payment regime: monthly for large taxpayers, quarterly for small businesses';