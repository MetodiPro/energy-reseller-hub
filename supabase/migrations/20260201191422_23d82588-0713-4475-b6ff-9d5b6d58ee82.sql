-- Aggiungi nuove colonne per modello fattura energia completo
-- Componenti passanti e parametri fiscali

ALTER TABLE public.project_revenue_simulations
ADD COLUMN IF NOT EXISTS pun_per_kwh numeric DEFAULT 0.12,
ADD COLUMN IF NOT EXISTS dispacciamento_per_kwh numeric DEFAULT 0.01,
ADD COLUMN IF NOT EXISTS trasporto_quota_fissa_anno numeric DEFAULT 23.00,
ADD COLUMN IF NOT EXISTS trasporto_quota_potenza_kw_anno numeric DEFAULT 22.00,
ADD COLUMN IF NOT EXISTS trasporto_quota_energia_kwh numeric DEFAULT 0.008,
ADD COLUMN IF NOT EXISTS potenza_impegnata_kw numeric DEFAULT 3.0,
ADD COLUMN IF NOT EXISTS oneri_asos_kwh numeric DEFAULT 0.025,
ADD COLUMN IF NOT EXISTS oneri_arim_kwh numeric DEFAULT 0.007,
ADD COLUMN IF NOT EXISTS accise_kwh numeric DEFAULT 0.0227,
ADD COLUMN IF NOT EXISTS iva_percent numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'domestico';

-- Commenti per documentazione
COMMENT ON COLUMN public.project_revenue_simulations.pun_per_kwh IS 'Prezzo Unico Nazionale energia - valore medio €/kWh';
COMMENT ON COLUMN public.project_revenue_simulations.dispacciamento_per_kwh IS 'Costo dispacciamento energia €/kWh';
COMMENT ON COLUMN public.project_revenue_simulations.trasporto_quota_fissa_anno IS 'Trasporto/distribuzione - quota fissa €/anno per cliente';
COMMENT ON COLUMN public.project_revenue_simulations.trasporto_quota_potenza_kw_anno IS 'Trasporto/distribuzione - quota potenza €/kW/anno';
COMMENT ON COLUMN public.project_revenue_simulations.trasporto_quota_energia_kwh IS 'Trasporto/distribuzione - quota energia €/kWh';
COMMENT ON COLUMN public.project_revenue_simulations.potenza_impegnata_kw IS 'Potenza impegnata media per cliente kW';
COMMENT ON COLUMN public.project_revenue_simulations.oneri_asos_kwh IS 'Oneri di sistema ASOS (rinnovabili) €/kWh';
COMMENT ON COLUMN public.project_revenue_simulations.oneri_arim_kwh IS 'Oneri di sistema ARIM (rimanenti) €/kWh';
COMMENT ON COLUMN public.project_revenue_simulations.accise_kwh IS 'Accise energia €/kWh';
COMMENT ON COLUMN public.project_revenue_simulations.iva_percent IS 'Aliquota IVA %';
COMMENT ON COLUMN public.project_revenue_simulations.client_type IS 'Tipologia cliente: domestico, business, pmi';