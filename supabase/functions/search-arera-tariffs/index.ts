const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    const now = new Date();
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
    const currentYear = now.getFullYear();

    const systemPrompt = `Sei un esperto del mercato energetico italiano. Devi fornire le tariffe ARERA più aggiornate per l'energia elettrica in Italia.

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido, senza markdown, senza commenti, senza testo aggiuntivo.

Il JSON deve avere esattamente questa struttura:
{
  "quarter": "Q${currentQuarter}",
  "year": ${currentYear},
  "delibera": "numero/anno/R/com",
  "effective_date": "YYYY-MM-DD",
  "next_update_date": "YYYY-MM-DD",
  "trasporto": {
    "quotaFissaAnno": 0.00,
    "quotaPotenzaKwAnno": 0.00,
    "quotaEnergiaKwh": 0.00000
  },
  "oneri": {
    "asosKwh": 0.00000,
    "arimKwh": 0.00000,
    "asosFissaAnno": 0.00,
    "asosPotenzaKwAnno": 0.00
  },
  "accise": {
    "domesticoKwh": 0.00000,
    "altriUsiKwh": 0.00000
  },
  "confidence": "high|medium|low",
  "source_description": "descrizione della fonte dei dati"
}

I valori devono essere in euro. Le quote energia in €/kWh, le quote fisse in €/anno, le quote potenza in €/kW/anno.
Le accise sono imposte erariali sull'energia elettrica.
ASOS = oneri generali di sistema, ARIM = oneri rimanenti.
La delibera è il numero dell'atto ARERA che fissa le tariffe per il trimestre.
Il next_update_date è il primo giorno del prossimo trimestre.`;

    const userPrompt = `Fornisci le tariffe ARERA più aggiornate disponibili per il mercato elettrico italiano, trimestre Q${currentQuarter} ${currentYear} o il più recente disponibile. Includi trasporto, oneri di sistema (ASOS e ARIM), e accise. Indica la delibera di riferimento.`;

    console.log(`Requesting ARERA tariffs for Q${currentQuarter} ${currentYear} via Lovable AI...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit superato, riprova tra qualche minuto.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Crediti AI esauriti. Aggiungi crediti in Impostazioni > Workspace > Utilizzo.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const errText = await response.text();
      throw new Error(`AI gateway error ${response.status}: ${errText.substring(0, 300)}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Risposta AI vuota');
    }

    console.log('AI raw response:', content.substring(0, 500));

    // Parse JSON from response - handle markdown code blocks
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const tariffData = JSON.parse(jsonStr);

    // Validate required fields
    if (!tariffData.trasporto || !tariffData.oneri || !tariffData.accise) {
      throw new Error('Dati tariffari incompleti nella risposta AI');
    }

    // Ensure numeric values
    const result = {
      quarter: tariffData.quarter || `Q${currentQuarter}`,
      year: tariffData.year || currentYear,
      delibera: tariffData.delibera || 'N/D',
      effective_date: tariffData.effective_date || `${currentYear}-${String((currentQuarter - 1) * 3 + 1).padStart(2, '0')}-01`,
      next_update_date: tariffData.next_update_date || '',
      trasporto: {
        quotaFissaAnno: Number(tariffData.trasporto.quotaFissaAnno) || 0,
        quotaPotenzaKwAnno: Number(tariffData.trasporto.quotaPotenzaKwAnno) || 0,
        quotaEnergiaKwh: Number(tariffData.trasporto.quotaEnergiaKwh) || 0,
      },
      oneri: {
        asosKwh: Number(tariffData.oneri.asosKwh) || 0,
        arimKwh: Number(tariffData.oneri.arimKwh) || 0,
        asosFissaAnno: Number(tariffData.oneri.asosFissaAnno) || 0,
        asosPotenzaKwAnno: Number(tariffData.oneri.asosPotenzaKwAnno) || 0,
      },
      accise: {
        domesticoKwh: Number(tariffData.accise.domesticoKwh) || 0,
        altriUsiKwh: Number(tariffData.accise.altriUsiKwh) || 0,
      },
      confidence: tariffData.confidence || 'medium',
      source_description: tariffData.source_description || 'Lovable AI',
    };

    console.log('Parsed ARERA tariffs:', JSON.stringify(result));

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('search-arera-tariffs error:', errMsg);

    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
