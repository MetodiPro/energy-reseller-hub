ALTER TABLE public.project_revenue_simulations 
ADD COLUMN IF NOT EXISTS perdite_rete_pct numeric DEFAULT 10.2;