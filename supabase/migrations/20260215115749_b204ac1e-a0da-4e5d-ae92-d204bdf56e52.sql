-- Add gas-specific simulation parameters to project_revenue_simulations
ALTER TABLE public.project_revenue_simulations
  ADD COLUMN IF NOT EXISTS commodity_type text DEFAULT 'luce',
  ADD COLUMN IF NOT EXISTS psv_per_smc numeric DEFAULT 0.45,
  ADD COLUMN IF NOT EXISTS spread_gas_per_smc numeric DEFAULT 0.03,
  ADD COLUMN IF NOT EXISTS spread_grossista_gas_per_smc numeric DEFAULT 0.015,
  ADD COLUMN IF NOT EXISTS avg_monthly_consumption_gas numeric DEFAULT 80,
  ADD COLUMN IF NOT EXISTS trasporto_gas_quota_fissa_anno numeric DEFAULT 65.00,
  ADD COLUMN IF NOT EXISTS trasporto_gas_quota_energia_smc numeric DEFAULT 0.04,
  ADD COLUMN IF NOT EXISTS oneri_gas_re_smc numeric DEFAULT 0.015,
  ADD COLUMN IF NOT EXISTS oneri_gas_ug_smc numeric DEFAULT 0.008,
  ADD COLUMN IF NOT EXISTS accise_gas_smc numeric DEFAULT 0.186,
  ADD COLUMN IF NOT EXISTS addizionale_regionale_gas_smc numeric DEFAULT 0.02,
  ADD COLUMN IF NOT EXISTS iva_percent_gas numeric DEFAULT 10,
  ADD COLUMN IF NOT EXISTS ccv_gas_monthly numeric DEFAULT 6.50,
  ADD COLUMN IF NOT EXISTS potenza_impegnata_gas_smc_giorno numeric DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS gestione_pdr_per_pdr numeric DEFAULT 2.50;