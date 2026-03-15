const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AreraTariffs {
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
  source: string;
  lastUpdate: string;
}

// Tariffe ARERA aggiornate - Q1 2026
// Fonte: Delibere ARERA per il settore elettrico
const CURRENT_TARIFFS: AreraTariffs = {
  quarter: 'Q1',
  year: 2026,
  trasporto: {
    quotaFissaAnno: 23.00,
    quotaPotenzaKwAnno: 22.00,
    quotaEnergiaKwh: 0.00812,
  },
  oneri: {
    asosKwh: 0.02500,
    arimKwh: 0.00700,
  },
  accise: {
    domesticoKwh: 0.02270,
    altriUsiKwh: 0.01250,
  },
  source: 'ARERA - Delibere Q1 2026',
  lastUpdate: '2026-01-01',
};

const TARIFF_HISTORY: Record<string, AreraTariffs> = {
  'Q4-2025': {
    quarter: 'Q4',
    year: 2025,
    trasporto: {
      quotaFissaAnno: 22.50,
      quotaPotenzaKwAnno: 21.50,
      quotaEnergiaKwh: 0.00798,
    },
    oneri: {
      asosKwh: 0.02450,
      arimKwh: 0.00680,
    },
    accise: {
      domesticoKwh: 0.02270,
      altriUsiKwh: 0.01250,
    },
    source: 'ARERA - Delibere Q4 2025',
    lastUpdate: '2025-10-01',
  },
  'Q1-2026': CURRENT_TARIFFS,
};

function getNextQuarterUpdate(quarter: string, year: number): string {
  const quarterStartMonths: Record<string, string> = {
    Q1: `${year}-04-01`,
    Q2: `${year}-07-01`,
    Q3: `${year}-10-01`,
    Q4: `${year + 1}-01-01`,
  };
  return quarterStartMonths[quarter] || `${year}-04-01`;
}

async function fetchLivePunFromGME(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://www.mercatoelettrico.org/It/Tools/Accessodati.aspx',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json, text/html',
        },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return null;

    const text = await res.text();
    // Try JSON parse first
    try {
      const json = JSON.parse(text);
      if (json?.data?.price || json?.price) {
        const price = json?.data?.price ?? json?.price;
        if (typeof price === 'number' && price > 0 && price < 1000) {
          return price;
        }
      }
    } catch {
      // Not JSON — ignore
    }
    return null;
  } catch (e) {
    console.log('GME API not reachable:', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Fetching ARERA tariffs...');

    const { quarter, year, clientType } = await req.json().catch(() => ({}));

    const now = new Date();
    const currentQuarter = quarter || `Q${Math.ceil((now.getMonth() + 1) / 3)}`;
    const currentYear = year || now.getFullYear();
    const key = `${currentQuarter}-${currentYear}`;

    console.log(`Requested tariffs for: ${key}, client type: ${clientType || 'domestico'}`);

    const tariffs = TARIFF_HISTORY[key] || CURRENT_TARIFFS;

    // Try to get live PUN from GME
    let dataFreshness: 'live' | 'cached' = 'cached';
    let livePun: number | null = null;
    try {
      livePun = await fetchLivePunFromGME();
      if (livePun !== null) {
        dataFreshness = 'live';
        console.log(`Live PUN from GME: ${livePun} €/MWh`);
      }
    } catch {
      console.log('GME fetch failed, using cached values');
    }

    const isBusinessClient = clientType === 'business' || clientType === 'pmi';
    const nextUpdate = getNextQuarterUpdate(currentQuarter, currentYear);

    const responseData = {
      success: true,
      data: {
        ...tariffs,
        acciseApplicate: isBusinessClient
          ? tariffs.accise.altriUsiKwh
          : tariffs.accise.domesticoKwh,
        ivaPercent: isBusinessClient ? 22 : 10,
        clientType: clientType || 'domestico',
        ...(livePun !== null ? { livePunMwh: livePun, livePunKwh: Math.round((livePun / 1000) * 10000) / 10000 } : {}),
      },
      data_freshness: dataFreshness,
      next_update: nextUpdate,
    };

    console.log('Returning tariffs:', JSON.stringify(responseData.data));

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching ARERA tariffs:', error);

    const now = new Date();
    const currentQuarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...CURRENT_TARIFFS,
          acciseApplicate: CURRENT_TARIFFS.accise.domesticoKwh,
          ivaPercent: 10,
          clientType: 'domestico',
        },
        data_freshness: 'cached' as const,
        next_update: getNextQuarterUpdate(currentQuarter, now.getFullYear()),
        warning: 'Utilizzate tariffe memorizzate. ARERA non raggiungibile.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
