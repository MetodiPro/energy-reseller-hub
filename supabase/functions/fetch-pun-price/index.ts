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

async function getTernaToken(clientId: string, clientSecret: string): Promise<string> {
  console.log(`OAuth: using key ${clientId.substring(0, 6)}...`);

  const res = await fetch('https://api.terna.it/transparency/oauth/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Terna OAuth ${res.status}: ${body.substring(0, 300)}`);
  }

  const data: TernaTokenResponse = await res.json();
  console.log('Terna token OK');
  return data.access_token;
}

function parsePrices(prices: TernaDailyPrice[], isoDate: string): PunData {
  const values = prices
    .map((p) => parseFloat(String(p.base_price_EURxMWh)))
    .filter((v) => !isNaN(v) && v > 0);

  if (values.length === 0) throw new Error('Nessun valore prezzo valido nella risposta Terna');

  const avg = values.reduce((a, b) => a + b, 0) / values.length;

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

async function fetchTernaPrices(token: string, subscriptionKey: string, refDate: Date): Promise<PunData> {
  const dmyDate = formatDateDMY(refDate);
  const isoDate = formatDateISO(refDate);

  const urls = [
    `https://api.terna.it/transparency/v1.0/daily-prices?dateFrom=${encodeURIComponent(dmyDate)}&dateTo=${encodeURIComponent(dmyDate)}`,
    `https://api.terna.it/transparency/v1.0/daily-prices?dateFrom=${encodeURIComponent(dmyDate)}&dateTo=${encodeURIComponent(dmyDate)}&dataType=Orario`,
  ];

  let lastError = '';

  for (const url of urls) {
    console.log(`Trying: ${url}`);

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const json: TernaPricesResponse = await res.json();
      const prices = json.daily_prices;

      if (!prices || prices.length === 0) {
        lastError = `Risposta vuota da ${url}`;
        console.warn(lastError);
        continue;
      }

      console.log(`OK: ${prices.length} records da ${url}`);
      return parsePrices(prices, isoDate);
    }

    const body = await res.text();
    lastError = `HTTP ${res.status} da ${url}: ${body.substring(0, 400)}`;
    console.error(lastError);
  }

  throw new Error(`Tutti gli endpoint Terna falliti. Ultimo errore: ${lastError}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const clientId = Deno.env.get('TERNA_KEY') ?? '';
  const clientSecret = Deno.env.get('TERNA_SECRET') ?? '';

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  try {
    if (!clientId || !clientSecret) throw new Error('TERNA_KEY o TERNA_SECRET non configurati');

    console.log(`Fetch PUN per ${formatDateISO(yesterday)}...`);

    const token = await getTernaToken(clientId, clientSecret);
    const punData = await fetchTernaPrices(token, clientId, yesterday);

    punData.date = formatDateISO(now);

    return new Response(JSON.stringify({ success: true, data: punData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Terna error:', errMsg);

    const fallback: PunData = {
      ...FALLBACK,
      date: formatDateISO(now),
      reference_date: formatDateISO(yesterday),
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: fallback,
        warning: `Terna non raggiungibile: ${errMsg}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
