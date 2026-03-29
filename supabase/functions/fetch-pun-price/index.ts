const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TernaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface TernaDailyPrice {
  base_price_EURxMWh: string | number;
    macrozone?: string;
    [key: string]: unknown;
}

interface TernaPricesResponse {
  daily_prices: TernaDailyPrice[];
}

interface PunData {
  date: string;
  averagePrice: number;
  averagePriceKwh: number;
  minPrice: number;
  maxPrice: number;
  source: string;
  data_freshness: 'live' | 'fallback';
  reference_date: string;
}

const FALLBACK: PunData = {
  date: '',
  averagePrice: 147.78,
  averagePriceKwh: 0.14778,
  minPrice: 125.00,
  maxPrice: 175.00,
  source: 'Fallback stimato',
  data_freshness: 'fallback',
  reference_date: '',
};

function formatDateDMY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatDateISO(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

async function getTernaToken(): Promise<string> {
  const clientId = Deno.env.get('TERNA_KEY');
  const clientSecret = Deno.env.get('TERNA_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('TERNA_KEY or TERNA_SECRET not configured');
  }

  console.log(`Using TERNA_KEY: ${clientId.substring(0, 6)}...`);

  const res = await fetch('https://api.terna.it/transparency/oauth/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Terna OAuth failed: ${res.status} - ${body}`);
  }

  const data: TernaTokenResponse = await res.json();
  console.log('Terna OAuth token obtained successfully');
  return data.access_token;
}

function parsePrices(prices: TernaDailyPrice[], isoDate: string): PunData {
  const values = prices
    .map((p) => parseFloat(String(p.base_price_EURxMWh)))
    .filter((v) => !isNaN(v) && v > 0);

  if (values.length === 0) {
    throw new Error('No valid price values in Terna response');
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;

  return {
    date: isoDate,
    averagePrice: Math.round(avg * 100) / 100,
    averagePriceKwh: Math.round((avg / 1000) * 100000) / 100000,
    minPrice: Math.round(Math.min(...values) * 100) / 100,
    maxPrice: Math.round(Math.max(...values) * 100) / 100,
    source: 'Terna API',
    data_freshness: 'live',
    reference_date: isoDate,
  };
}

async function fetchTernaPrices(token: string, refDate: Date): Promise<PunData> {
  const dmyDate = formatDateDMY(refDate);
  const isoDate = formatDateISO(refDate);

  const endpoints = [
    `https://api.terna.it/fees/v1.0/daily-prices?dateFrom=${encodeURIComponent(dmyDate)}&dateTo=${encodeURIComponent(dmyDate)}&dataType=Orario`,
    `https://api.terna.it/market-and-fees/v1.0/daily-prices?dateFrom=${encodeURIComponent(dmyDate)}&dateTo=${encodeURIComponent(dmyDate)}&dataType=Orario`,
  ];

  let lastError = '';
  for (const url of endpoints) {
    console.log(`Trying Terna endpoint: ${url.split('?')[0]}`);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const json: TernaPricesResponse = await res.json();
      const prices = json.daily_prices;

      if (!prices || prices.length === 0) {
        lastError = `No price data from ${url.split('?')[0]}`;
        continue;
      }

      console.log(`Success from ${url.split('?')[0]}, got ${prices.length} records`);
      return parsePrices(prices, isoDate);
    }

    const body = await res.text();
    lastError = `${url.split('?')[0]} returned ${res.status}: ${body.substring(0, 200)}`;
    console.warn(lastError);
  }

  throw new Error(`All Terna endpoints failed. Last: ${lastError}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { date } = await req.json().catch(() => ({}));

    // Use yesterday (Terna publishes day-after)
    let refDate: Date;
    if (date) {
      refDate = new Date(date);
      refDate.setDate(refDate.getDate() - 1);
    } else {
      refDate = new Date();
      refDate.setDate(refDate.getDate() - 1);
    }

    console.log(`Fetching PUN for ${formatDateISO(refDate)} via Terna API...`);

    const token = await getTernaToken();
    const punData = await fetchTernaPrices(token, refDate);

    // Set the response date to the originally requested date
    const requestedDate = date ? new Date(date) : new Date();
    punData.date = formatDateISO(requestedDate);

    return new Response(JSON.stringify({ success: true, data: punData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Terna API error, using fallback:', error);

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const fallback: PunData = {
      ...FALLBACK,
      date: formatDateISO(now),
      reference_date: formatDateISO(yesterday),
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: fallback,
        warning: 'Terna API non raggiungibile. Utilizzati valori di stima aggiornati a marzo 2026.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
