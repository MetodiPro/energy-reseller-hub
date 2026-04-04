// PUN price is now manually entered by the user.
// This file only exports the types used across the app.

export interface PunPriceData {
  date: string;
  averagePrice: number; // €/MWh
  averagePriceKwh: number; // €/kWh
  minPrice: number;
  maxPrice: number;
  source: string;
  data_freshness: 'live' | 'fallback' | 'manual';
  reference_date: string;
}

export const GME_URL = 'https://www.mercatoelettrico.org/it/Statistiche/ME/DatiSintesi.aspx';
