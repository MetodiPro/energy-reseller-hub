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
}

export async function fetchAreraTariffs(
  clientType?: string,
): Promise<AreraTariffResponse> {
  const { data, error } = await supabase.functions.invoke('fetch-arera-tariffs', {
    body: { clientType },
  });

  if (error) {
    console.error('Error fetching ARERA tariffs:', error);
    throw new Error(error.message || 'Impossibile recuperare le tariffe ARERA');
  }

  return data as AreraTariffResponse;
}

export async function updateAreraTariffs(
  tariffs: Partial<AreraTariffData>,
): Promise<AreraTariffResponse> {
  const { data, error } = await supabase.functions.invoke('fetch-arera-tariffs', {
    body: tariffs,
  });

  if (error) {
    console.error('Error updating ARERA tariffs:', error);
    throw new Error(error.message || 'Impossibile aggiornare le tariffe ARERA');
  }

  return data as AreraTariffResponse;
}
