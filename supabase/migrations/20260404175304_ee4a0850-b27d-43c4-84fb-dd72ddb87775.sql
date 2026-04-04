ALTER TABLE public.project_revenue_simulations
ADD COLUMN IF NOT EXISTS churn_month0_pct numeric DEFAULT 0;

UPDATE public.project_revenue_simulations
SET churn_month0_pct = 0
WHERE churn_month0_pct IS NULL;

NOTIFY pgrst, 'reload schema';