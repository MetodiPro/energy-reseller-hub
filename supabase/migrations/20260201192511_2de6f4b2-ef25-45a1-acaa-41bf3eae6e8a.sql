-- Add churn rate (switch-out) parameter to revenue simulations
ALTER TABLE public.project_revenue_simulations
ADD COLUMN IF NOT EXISTS monthly_churn_rate numeric DEFAULT 1.5;

-- Add comment for documentation
COMMENT ON COLUMN public.project_revenue_simulations.monthly_churn_rate IS 'Percentuale mensile di clienti che effettuano switch-out (abbandono)';