import { supabase } from '@/integrations/supabase/client';

export interface AreraTariffData {
  quarter: string;
  year: number;
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
  acciseApplicate: number;
  ivaPercent: number;
  clientType: string;
  source: string;
  lastUpdate: string;
}

export interface AreraTariffResponse {
  success: boolean;
  data: AreraTariffData & {
    livePunMwh?: number;
    livePunKwh?: number;
  };
  data_freshness: 'live' | 'cached';
  next_update: string;
  warning?: string;
}

export async function fetchAreraTariffs(
  clientType?: string,
  quarter?: string,
  year?: number
): Promise<AreraTariffResponse> {
  const { data, error } = await supabase.functions.invoke('fetch-arera-tariffs', {
    body: { clientType, quarter, year },
  });

  if (error) {
    console.error('Error fetching ARERA tariffs:', error);
    throw new Error(error.message || 'Impossibile recuperare le tariffe ARERA');
  }

  return data as AreraTariffResponse;
}
