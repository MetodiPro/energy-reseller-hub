ALTER TABLE public.project_revenue_simulations
  ADD COLUMN IF NOT EXISTS churn_month1_pct numeric DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS churn_month2_pct numeric DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS churn_month3_pct numeric DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS churn_decay_factor numeric DEFAULT 0.85;