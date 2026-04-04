import { supabase } from '@/integrations/supabase/client';

export interface AreraTariffData {
  quarter: string;
  year: number;
  effective_date: string;
  delibera: string;
  trasporto: {
    quotaFissaAnno: number;
    quotaPotenzaKwAnno: number;
    quotaEnergiaKwh: number;
  };
  oneri: {
    asosKwh: number;
    arimKwh: number;
    asosFissaAnno?: number;
    asosPotenzaKwAnno?: number;
  };
  accise: {
    domesticoKwh: number;
    altriUsiKwh: number;
  };
  next_update_date: string;
  last_updated_at: string;
  updated_by: string;
  acciseApplicate: number;
  ivaPercent: number;
  clientType: string;
}

export interface AreraTariffResponse {
  success: boolean;
  data: AreraTariffData;
  data_freshness: 'storage' | 'default_init';
  next_update: string;
  days_until_update: number;
  requires_update: boolean;
  warning?: string;
  error?: string;
}

export async function fetchAreraTariffs(clientType?: string): Promise<AreraTariffResponse> {
  const { data, error } = await supabase.functions.invoke('fetch-arera-tariffs', {
    body: { _action: 'read', clientType: clientType ?? 'domestico' },
  });
  if (error) throw new Error(error.message || 'Impossibile recuperare le tariffe ARERA');
  if (data?.error) throw new Error(data.error);
  return data as AreraTariffResponse;
}

export async function updateAreraTariffs(tariffs: Partial<AreraTariffData>): Promise<AreraTariffResponse> {
  const payload = {
    _action: 'write',
    quarter: tariffs.quarter,
    year: tariffs.year,
    effective_date: tariffs.effective_date,
    delibera: tariffs.delibera,
    trasporto: tariffs.trasporto,
    oneri: tariffs.oneri,
    accise: tariffs.accise,
    next_update_date: tariffs.next_update_date,
  };
  const { data, error } = await supabase.functions.invoke('fetch-arera-tariffs', {
    body: payload,
  });
  if (error) throw new Error(error.message || 'Impossibile aggiornare le tariffe ARERA');
  if (data?.success === false) throw new Error(data?.error || 'Salvataggio fallito lato server');
  return data as AreraTariffResponse;
}
