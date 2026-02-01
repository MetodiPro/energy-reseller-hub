import { supabase } from '@/integrations/supabase/client';

export interface PunPriceData {
  date: string;
  averagePrice: number; // €/MWh
  averagePriceKwh: number; // €/kWh
  minPrice: number;
  maxPrice: number;
  source: string;
}

export interface PunPriceResponse {
  success: boolean;
  data: PunPriceData;
  warning?: string;
}

export async function fetchCurrentPunPrice(date?: Date): Promise<PunPriceResponse> {
  const { data, error } = await supabase.functions.invoke('fetch-pun-price', {
    body: date ? { date: date.toISOString() } : {},
  });

  if (error) {
    console.error('Error fetching PUN price:', error);
    throw new Error(error.message || 'Impossibile recuperare il prezzo PUN');
  }

  return data as PunPriceResponse;
}
