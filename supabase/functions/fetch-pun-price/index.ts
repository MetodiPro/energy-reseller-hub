const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PunData {
  date: string;
  averagePrice: number; // €/MWh
  averagePriceKwh: number; // €/kWh (divided by 1000)
  minPrice: number;
  maxPrice: number;
  source: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Fetching PUN price from GME...');
    
    // Get the date from request or use today
    const { date } = await req.json().catch(() => ({}));
    const targetDate = date ? new Date(date) : new Date();
    
    // Format date for GME URL (DD/MM/YYYY)
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    const isoDate = `${year}-${month}-${day}`;
    
    console.log(`Target date: ${formattedDate}`);
    
    // Fetch the GME PUN page
    const gmeUrl = `https://gme.mercatoelettrico.org/en-us/Home/Results/Electricity/MGP/Results/PUN`;
    
    const response = await fetch(gmeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    
    if (!response.ok) {
      throw new Error(`GME request failed with status ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Received HTML of length: ${html.length}`);
    
    // Parse the HTML to extract PUN values
    // Look for the table rows with price data (format: | Date | Hour | Period | €/MWh |)
    const priceMatches: number[] = [];
    
    // Try to extract prices from the HTML using regex
    // The GME page shows prices in a table format with €/MWh values
    const priceRegex = /\|\s*\d{2}\/\d{2}\/\d{4}\s*\|\s*\d+\s*\|\s*\d+\s*\|\s*([\d.]+)\s*\|/g;
    let match;
    
    while ((match = priceRegex.exec(html)) !== null) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && price > 0 && price < 1000) {
        priceMatches.push(price);
      }
    }
    
    // Alternative pattern for different HTML structures
    if (priceMatches.length === 0) {
      const altPriceRegex = /<td[^>]*>(\d+\.\d{6})<\/td>/g;
      while ((match = altPriceRegex.exec(html)) !== null) {
        const price = parseFloat(match[1]);
        if (!isNaN(price) && price > 0 && price < 1000) {
          priceMatches.push(price);
        }
      }
    }
    
    // Try yet another pattern - look for values that appear to be MWh prices
    if (priceMatches.length === 0) {
      const numericRegex = /(\d{2,3}\.\d{2,6})/g;
      const allNumbers: number[] = [];
      while ((match = numericRegex.exec(html)) !== null) {
        const num = parseFloat(match[1]);
        // PUN prices are typically between 50 and 300 €/MWh
        if (num >= 50 && num <= 500) {
          allNumbers.push(num);
        }
      }
      // Take unique values that look like prices
      const uniquePrices = [...new Set(allNumbers)];
      if (uniquePrices.length > 10) {
        priceMatches.push(...uniquePrices);
      }
    }
    
    console.log(`Found ${priceMatches.length} price values`);
    
    let punData: PunData;
    
    if (priceMatches.length > 0) {
      // Calculate statistics
      const sum = priceMatches.reduce((a, b) => a + b, 0);
      const avg = sum / priceMatches.length;
      const min = Math.min(...priceMatches);
      const max = Math.max(...priceMatches);
      
      punData = {
        date: isoDate,
        averagePrice: Math.round(avg * 100) / 100, // €/MWh rounded to 2 decimals
        averagePriceKwh: Math.round((avg / 1000) * 10000) / 10000, // €/kWh rounded to 4 decimals
        minPrice: Math.round(min * 100) / 100,
        maxPrice: Math.round(max * 100) / 100,
        source: 'GME - Mercato Elettrico',
      };
    } else {
      // Fallback: use typical current market values
      // Updated for 2026 market conditions
      console.log('Could not parse GME data, using fallback values');
      punData = {
        date: isoDate,
        averagePrice: 135.00, // Typical value €/MWh
        averagePriceKwh: 0.135, // €/kWh
        minPrice: 110.00,
        maxPrice: 165.00,
        source: 'Stima di mercato (GME non raggiungibile)',
      };
    }
    
    console.log('PUN data:', JSON.stringify(punData));
    
    return new Response(
      JSON.stringify({
        success: true,
        data: punData,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching PUN price:', error);
    
    // Return fallback data on error
    const today = new Date();
    const isoDate = today.toISOString().split('T')[0];
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          date: isoDate,
          averagePrice: 135.00,
          averagePriceKwh: 0.135,
          minPrice: 110.00,
          maxPrice: 165.00,
          source: 'Stima di mercato (errore connessione GME)',
        },
        warning: 'Utilizzati valori di stima. GME non raggiungibile.',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
