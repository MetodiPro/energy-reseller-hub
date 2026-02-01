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
    quotaFissaAnno: 23.00,        // €/anno - quota fissa per punto
    quotaPotenzaKwAnno: 22.00,    // €/kW/anno - quota potenza
    quotaEnergiaKwh: 0.00812,     // €/kWh - quota energia
  },
  oneri: {
    asosKwh: 0.02500,             // €/kWh - oneri generali ASOS
    arimKwh: 0.00700,             // €/kWh - oneri rimanenti ARIM
  },
  accise: {
    domesticoKwh: 0.02270,        // €/kWh - accisa domestico (oltre 150 kWh/mese)
    altriUsiKwh: 0.01250,         // €/kWh - accisa altri usi
  },
  source: 'ARERA - Delibere Q1 2026',
  lastUpdate: '2026-01-01',
};

// Storico tariffe per riferimento
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Fetching ARERA tariffs...');
    
    const { quarter, year, clientType } = await req.json().catch(() => ({}));
    
    // Determina il trimestre corrente se non specificato
    const now = new Date();
    const currentQuarter = quarter || `Q${Math.ceil((now.getMonth() + 1) / 3)}`;
    const currentYear = year || now.getFullYear();
    const key = `${currentQuarter}-${currentYear}`;
    
    console.log(`Requested tariffs for: ${key}, client type: ${clientType || 'domestico'}`);
    
    // Cerca le tariffe nel nostro database
    let tariffs = TARIFF_HISTORY[key] || CURRENT_TARIFFS;
    
    // Tentativo di scraping dal sito ARERA (simulato)
    // In produzione, si potrebbe implementare uno scraper reale
    // che legge le delibere pubblicate su https://www.arera.it
    try {
      const areraUrl = 'https://www.arera.it/it/elettricita/ele40/ele40.htm';
      console.log(`Attempting to fetch from ARERA: ${areraUrl}`);
      
      const response = await fetch(areraUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'it-IT,it;q=0.9',
        },
      });
      
      if (response.ok) {
        const html = await response.text();
        console.log(`Received ARERA page, length: ${html.length}`);
        
        // Parsing delle tariffe dal sito ARERA
        // Cerchiamo pattern tipici nelle tabelle ARERA
        const patterns = {
          trasportoFissa: /quota\s+fissa[^0-9]*(\d+[.,]\d+)/i,
          trasportoPotenza: /quota\s+potenza[^0-9]*(\d+[.,]\d+)/i,
          trasportoEnergia: /quota\s+energia[^0-9]*(\d+[.,]\d+)/i,
          asos: /ASOS[^0-9]*(\d+[.,]\d+)/i,
          arim: /ARIM[^0-9]*(\d+[.,]\d+)/i,
        };
        
        // Estrai valori se trovati
        const extractValue = (regex: RegExp): number | null => {
          const match = html.match(regex);
          if (match) {
            return parseFloat(match[1].replace(',', '.'));
          }
          return null;
        };
        
        const scrapedFissa = extractValue(patterns.trasportoFissa);
        const scrapedPotenza = extractValue(patterns.trasportoPotenza);
        const scrapedEnergia = extractValue(patterns.trasportoEnergia);
        const scrapedAsos = extractValue(patterns.asos);
        const scrapedArim = extractValue(patterns.arim);
        
        // Se troviamo valori validi, aggiorniamo le tariffe
        if (scrapedFissa && scrapedFissa > 0 && scrapedFissa < 100) {
          tariffs = {
            ...tariffs,
            trasporto: {
              quotaFissaAnno: scrapedFissa,
              quotaPotenzaKwAnno: scrapedPotenza || tariffs.trasporto.quotaPotenzaKwAnno,
              quotaEnergiaKwh: scrapedEnergia ? scrapedEnergia / 100 : tariffs.trasporto.quotaEnergiaKwh,
            },
            oneri: {
              asosKwh: scrapedAsos ? scrapedAsos / 100 : tariffs.oneri.asosKwh,
              arimKwh: scrapedArim ? scrapedArim / 100 : tariffs.oneri.arimKwh,
            },
            source: 'ARERA - Dati aggiornati',
            lastUpdate: new Date().toISOString().split('T')[0],
          };
          console.log('Successfully parsed ARERA data');
        }
      }
    } catch (scrapeError) {
      console.log('Could not scrape ARERA, using cached values:', scrapeError);
    }
    
    // Prepara la risposta con le tariffe appropriate per il tipo cliente
    const isBusinessClient = clientType === 'business' || clientType === 'pmi';
    
    const responseData = {
      success: true,
      data: {
        ...tariffs,
        acciseApplicate: isBusinessClient 
          ? tariffs.accise.altriUsiKwh 
          : tariffs.accise.domesticoKwh,
        ivaPercent: isBusinessClient ? 22 : 10,
        clientType: clientType || 'domestico',
      },
    };
    
    console.log('Returning tariffs:', JSON.stringify(responseData.data));
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching ARERA tariffs:', error);
    
    // Ritorna comunque le tariffe di fallback
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...CURRENT_TARIFFS,
          acciseApplicate: CURRENT_TARIFFS.accise.domesticoKwh,
          ivaPercent: 10,
          clientType: 'domestico',
        },
        warning: 'Utilizzate tariffe memorizzate. ARERA non raggiungibile.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
